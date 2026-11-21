import type { TrainingEvent } from "../stats/event";
import { commandDescription, lessonForHelpKey } from "./curriculum";
import type { EditTarget } from "./drills/edit";
import { pressEditKey } from "./edit";
import { pressKey } from "./engine";
import { formatKeys, parseKeys, type Key } from "./keys";
import type { Level } from "./levels";
import { recalculateOptimal } from "./optimal";
import { readCount } from "./parse";
import { createState, type Pos, type VimState } from "./state";

export const PREVIEW_MODES = ["off", "always", "stuck", "auto"] as const;
export type PreviewMode = (typeof PREVIEW_MODES)[number];

export const PREVIEW_MODE_LABELS: Readonly<Record<PreviewMode, string>> = {
  off: "Desligada",
  always: "Sempre",
  stuck: "Ao travar",
  auto: "Automática",
};

/** Efficiency threshold (Wilson et al., 2019) above which Auto fades to Stuck. */
export const AUTO_EFFICIENCY_THRESHOLD = 0.85;
/** Number of recent targets per command required before Auto fades to Stuck. */
export const AUTO_WINDOW = 20;
/** Extra keys beyond optimal that trigger Stuck preview. */
export const STUCK_EXTRA_KEYS = 2;
/** Idle time in ms without progress that triggers Stuck preview. */
export const STUCK_IDLE_MS = 5000;

export type PreviewBlock = {
  readonly text: string;
  readonly keys: readonly Key[];
  readonly helpKey: string;
  readonly commandKey: string;
  readonly description: string | null;
  readonly lessonId: string | null;
  readonly startKeyIndex: number;
  readonly endKeyIndex: number;
};

export type CommandSample = {
  readonly solution: string;
  readonly efficiency: number;
};

export type PreviewVisibilityInput = {
  readonly mode: PreviewMode;
  readonly solution: string;
  readonly minimum: number;
  readonly keysTyped: number;
  readonly idleMs: number;
  readonly peeked: boolean;
  readonly history: readonly CommandSample[];
};

export type AssistedSplit = {
  readonly withPreview: number;
  readonly withoutPreview: number;
  readonly anyAssisted: boolean;
};

const OPERATORS = new Set<string>(["d", "c", "y", ">", "<"]);
const INSERT_COMMANDS = new Set<string>(["i", "a", "I", "A", "o", "O", "s", "S", "C"]);
const SIMPLE_EDIT_COMMANDS = new Set<string>([
  "x",
  "X",
  "D",
  "~",
  "p",
  "P",
  "Y",
  "u",
  "<C-r>",
  ".",
  "J",
  "<C-a>",
  "<C-x>",
]);
const FIND_COMMANDS = new Set<string>(["f", "F", "t", "T"]);
const MOTION_COMMAND_KEYS = new Set<string>([..."hjklwbeWBE0^$G{}%;,nN*#fFtT/?", "ge", "gg"]);

const OBJECT_MAP: Readonly<Record<string, string>> = {
  iw: "iw",
  aw: "aw",
  iW: "iw",
  aW: "aw",
  "i(": "i(",
  "i)": "i(",
  ib: "i(",
  "a(": "a(",
  "a)": "a(",
  ab: "a(",
  "i[": "i[",
  "i]": "i[",
  "a[": "i[",
  "a]": "i[",
  "i{": "i{",
  "i}": "i{",
  iB: "i{",
  "a{": "i{",
  "a}": "i{",
  aB: "i{",
  "i<": "i<",
  "i>": "i<",
  "a<": "i<",
  "a>": "i<",
  'i"': 'i"',
  'a"': 'i"',
  "i'": "i'",
  "a'": "i'",
  "i`": "i`",
  "a`": "i`",
};

const CMD_HELP_ALIAS: Readonly<Record<string, string>> = {
  C: "D",
  S: "s",
  X: "x",
  P: "p",
  "<": ">",
};

function normalizeObject(obj: string): string {
  return OBJECT_MAP[obj] ?? "iw";
}

function normalizeRegisterHelp(reg: string): string {
  if (/^[a-z]$/.test(reg)) return '"a';
  if (/^[A-Z]$/.test(reg)) return '"A';
  if (/^[1-9]$/.test(reg)) return '"1';
  return `"${reg}`;
}

function cmdlineHelpKey(text: string): string {
  if (text.startsWith(":%s")) return ":%s";
  if (text.startsWith(":s")) return ":s";
  return ":noh";
}

function motionExtent(
  keys: readonly Key[],
  at: number,
): {
  readonly end: number;
  readonly name: string;
} {
  const k = keys[at] as Key;
  if (FIND_COMMANDS.has(k) && at + 1 < keys.length) {
    return { end: at + 2, name: k };
  }
  if (k === "g" && at + 1 < keys.length) {
    return { end: at + 2, name: `g${keys[at + 1] as Key}` };
  }
  if (k === "/" || k === "?") {
    const cr = keys.indexOf("<CR>", at + 1);
    return { end: cr >= 0 ? cr + 1 : keys.length, name: k };
  }
  return { end: at + 1, name: k };
}

function motionHelpKey(name: string, hasCount: boolean): string {
  if (FIND_COMMANDS.has(name)) return `${name}{c}`;
  if (name === "G" && hasCount) return "{n}G";
  return name;
}

/** Splits any Vim motion or edit solution into logical command blocks (T21 AC-2, AC-6). */
export function parseSolutionBlocks(solution: string): readonly PreviewBlock[] {
  const keys = parseKeys(solution);
  const blocks: PreviewBlock[] = [];
  let i = 0;
  let mode: "normal" | "insert" | "visual" = "normal";
  let visualKind: "char" | "line" | "block" = "char";
  let recording = false;

  const emit = (
    start: number,
    end: number,
    helpKey: string,
    commandKey: string,
    fallbackDesc?: string,
  ) => {
    const slice = keys.slice(start, end);
    const description =
      (helpKey !== "" ? commandDescription(helpKey) : undefined) ?? fallbackDesc ?? null;
    const lessonId = helpKey !== "" ? (lessonForHelpKey(helpKey)?.id ?? null) : null;
    blocks.push({
      text: formatKeys(slice),
      keys: slice,
      helpKey,
      commandKey,
      description,
      lessonId,
      startKeyIndex: start,
      endKeyIndex: end,
    });
    i = end;
  };

  while (i < keys.length) {
    if (mode === "insert") {
      if (keys[i] === "<C-r>" && i + 1 < keys.length) {
        emit(i, i + 2, "i_<C-r>", "i_<C-r>");
        continue;
      }
      let end = i;
      while (end < keys.length && keys[end] !== "<Esc>" && keys[end] !== "<C-r>") end++;
      if (keys[end] === "<Esc>") {
        emit(i, end + 1, "", "", "digita o texto e volta ao modo normal com Esc");
        mode = "normal";
      } else {
        emit(i, end, "", "", "digita o texto no modo de inserção");
      }
      continue;
    }

    const start = i;

    if (mode === "visual") {
      const count = readCount(keys, i);
      const k = keys[count.next] as Key;
      if (k === ":") {
        const cr = keys.indexOf("<CR>", count.next + 1);
        const end = cr >= 0 ? cr + 1 : keys.length;
        const text = formatKeys(keys.slice(start, end));
        emit(start, end, cmdlineHelpKey(text), ":s");
        mode = "normal";
        continue;
      }
      if (k === "I" || k === "A") {
        const helpKey = visualKind === "block" ? `<C-v>${k}` : k;
        emit(start, count.next + 1, helpKey, helpKey);
        mode = "insert";
        continue;
      }
      if ((k === "i" || k === "a") && count.next + 1 < keys.length) {
        const obj = normalizeObject(`${k}${keys[count.next + 1] as Key}`);
        emit(start, count.next + 2, obj, obj);
        continue;
      }
      if (OPERATORS.has(k) || k === "x" || k === "~" || k === "J") {
        const helpKey = CMD_HELP_ALIAS[k] ?? k;
        emit(start, count.next + 1, helpKey, k);
        mode = k === "c" ? "insert" : "normal";
        continue;
      }
      const { end, name } = motionExtent(keys, count.next);
      emit(start, end, motionHelpKey(name, count.count !== null), name);
      continue;
    }

    // Normal mode: optional register prefix.
    let afterReg = i;
    let regHelp: string | null = null;
    if (keys[i] === '"' && i + 1 < keys.length) {
      regHelp = normalizeRegisterHelp(keys[i + 1] as Key);
      afterReg = i + 2;
    }
    const count = readCount(keys, afterReg);
    const k = keys[count.next] as Key;

    if (k === ":") {
      const cr = keys.indexOf("<CR>", count.next + 1);
      const end = cr >= 0 ? cr + 1 : keys.length;
      const text = formatKeys(keys.slice(start, end));
      const helpKey = cmdlineHelpKey(text);
      emit(start, end, helpKey, helpKey);
      continue;
    }

    if (k === "q") {
      if (recording) {
        recording = false;
        emit(start, count.next + 1, "q", "q");
      } else {
        recording = true;
        emit(start, Math.min(keys.length, count.next + 2), "q", "q");
      }
      continue;
    }

    if (k === "@" && count.next + 1 < keys.length) {
      const arg = keys[count.next + 1] as Key;
      const helpKey = count.count !== null ? "9@a" : arg === "@" ? "@@" : "@a";
      emit(start, count.next + 2, helpKey, "@");
      continue;
    }

    if (k === "v" || k === "V" || k === "<C-v>") {
      emit(start, count.next + 1, k, k);
      mode = "visual";
      visualKind = k === "<C-v>" ? "block" : k === "V" ? "line" : "char";
      continue;
    }

    if (OPERATORS.has(k) && count.next + 1 < keys.length) {
      const inner = readCount(keys, count.next + 1);
      const targetKey = keys[inner.next] as Key;
      if (targetKey === k) {
        const doubled = k === ">" ? ">>" : k === "<" ? "<<" : "dd";
        emit(start, inner.next + 1, regHelp ?? doubled, `${k}${k}`);
      } else if ((targetKey === "i" || targetKey === "a") && inner.next + 1 < keys.length) {
        const obj = normalizeObject(`${targetKey}${keys[inner.next + 1] as Key}`);
        emit(start, inner.next + 2, regHelp ?? obj, `${k}${obj}`);
      } else {
        const { end } = motionExtent(keys, inner.next);
        emit(start, end, regHelp ?? CMD_HELP_ALIAS[k] ?? k, k);
      }
      if (k === "c") mode = "insert";
      continue;
    }

    if (k === "r" && count.next + 1 < keys.length) {
      emit(start, count.next + 2, "r{c}", "r");
      continue;
    }

    if (INSERT_COMMANDS.has(k)) {
      emit(start, count.next + 1, regHelp ?? CMD_HELP_ALIAS[k] ?? k, k);
      mode = "insert";
      continue;
    }

    if (SIMPLE_EDIT_COMMANDS.has(k)) {
      emit(start, count.next + 1, regHelp ?? CMD_HELP_ALIAS[k] ?? k, k);
      continue;
    }

    const { end, name } = motionExtent(keys, count.next);
    emit(start, end, motionHelpKey(name, count.count !== null), name);
  }

  return blocks;
}

/** Unique command keys of a solution, ignoring literal insert-text blocks. */
export function commandKeysOf(solution: string): readonly string[] {
  const seen = new Set<string>();
  for (const block of parseSolutionBlocks(solution)) {
    if (block.commandKey !== "") seen.add(block.commandKey);
  }
  return [...seen];
}

/** Mean efficiency over the last `windowSize` targets for each command. */
export function commandEfficiencies(
  history: readonly CommandSample[],
  windowSize: number = AUTO_WINDOW,
): ReadonlyMap<string, { readonly count: number; readonly mean: number }> {
  const buckets = new Map<string, number[]>();
  for (const sample of history) {
    const eff = Math.max(0, Math.min(1, sample.efficiency));
    for (const cmd of commandKeysOf(sample.solution)) {
      let list = buckets.get(cmd);
      if (list === undefined) {
        list = [];
        buckets.set(cmd, list);
      }
      list.push(eff);
    }
  }
  const stats = new Map<string, { readonly count: number; readonly mean: number }>();
  for (const [cmd, list] of buckets) {
    const recent = list.slice(-windowSize);
    const mean = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    stats.set(cmd, { count: recent.length, mean });
  }
  return stats;
}

/** Decides whether the optimal preview should currently be visible (T21 AC-1, AC-5). */
export function shouldShowPreview(input: PreviewVisibilityInput): boolean {
  if (input.peeked) return true;
  if (input.mode === "off") return false;
  if (input.mode === "always") return true;
  const stuck =
    input.keysTyped >= input.minimum + STUCK_EXTRA_KEYS || input.idleMs >= STUCK_IDLE_MS;
  if (input.mode === "stuck") return stuck;
  const cmds = commandKeysOf(input.solution);
  const eff = commandEfficiencies(input.history);
  const mastered =
    cmds.length > 0 &&
    cmds.every((cmd) => {
      const stat = eff.get(cmd);
      return (
        stat !== undefined &&
        stat.count >= AUTO_WINDOW &&
        stat.mean + 1e-9 >= AUTO_EFFICIENCY_THRESHOLD
      );
    });
  return mastered ? stuck : true;
}

/** Intermediate cursor positions along the remaining motion blocks, excluding cursor and target. */
export function motionWaypoints(
  state: VimState,
  blocks: readonly PreviewBlock[],
  startBlockIndex: number,
  target: Pos,
  level: Level,
): readonly Pos[] {
  const points: Pos[] = [];
  const seen = new Set<string>();
  const keyOf = (p: Pos) => `${String(p.line)}:${String(p.col)}`;
  seen.add(keyOf(state.cursor));
  seen.add(keyOf(target));

  let cur: VimState = state.pending.length === 0 ? state : { ...state, pending: [] };
  for (let b = startBlockIndex; b < blocks.length; b++) {
    const block = blocks[b] as PreviewBlock;
    for (const key of block.keys) cur = pressKey(cur, key, level).state;
    const id = keyOf(cur.cursor);
    if (!seen.has(id)) {
      seen.add(id);
      points.push(cur.cursor);
    }
  }
  return points;
}

const sameLines = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((line, i) => line === b[i]);

const MAX_UNDO_RECOVERY = 6;

/** Recalculates an edit preview path from an off-path state (T21 AC-2, AC-3). */
export function recalculateEditPreview(state: VimState, target: EditTarget): string {
  const blocks = parseSolutionBlocks(target.reference);
  let leadingMotions = 0;
  let editStartState = createState(target.lines, target.start);
  while (leadingMotions < blocks.length) {
    const block = blocks[leadingMotions] as PreviewBlock;
    if (!MOTION_COMMAND_KEYS.has(block.commandKey) || block.text.startsWith('"')) break;
    for (const key of block.keys) editStartState = pressEditKey(editStartState, key);
    leadingMotions++;
  }
  const editStartPos = editStartState.cursor;
  const editSuffix = blocks
    .slice(leadingMotions)
    .map((b) => b.text)
    .join("");

  const fromOriginal = (normal: VimState): string =>
    `${recalculateOptimal(normal, editStartPos, 7).keys}${editSuffix}`;

  const prefix = state.mode !== "normal" ? "<Esc>" : "";
  let cur = state.mode !== "normal" ? pressEditKey(state, "<Esc>") : state;

  if (sameLines(cur.lines, target.lines)) {
    return `${prefix}${fromOriginal(cur)}`;
  }

  for (let undos = 1; undos <= MAX_UNDO_RECOVERY; undos++) {
    cur = pressEditKey(cur, "u");
    if (sameLines(cur.lines, target.lines)) {
      return `${prefix}${"u".repeat(undos)}${fromOriginal(cur)}`;
    }
  }

  return target.reference;
}

/** Splits reached targets/edits into assisted vs unassisted counts (T21 AC-4). */
export function assistedSplit(
  results: readonly { readonly skipped: boolean; readonly assisted?: boolean }[],
): AssistedSplit {
  let withPreview = 0;
  let withoutPreview = 0;
  let anyAssisted = false;
  for (const r of results) {
    if (r.assisted === true) anyAssisted = true;
    if (r.skipped) continue;
    if (r.assisted === true) withPreview++;
    else withoutPreview++;
  }
  return { withPreview, withoutPreview, anyAssisted };
}

/** Converts stored T22 training events into per-target efficiency samples for Auto mode. */
export function eventsToSamples(
  events: readonly TrainingEvent[],
  drill: "vim.motion" | "vim.edit",
): CommandSample[] {
  const samples: CommandSample[] = [];
  for (const event of events) {
    if (event.drill !== drill) continue;
    const extra = event.extra as {
      readonly sol?: unknown;
      readonly keys?: unknown;
      readonly min?: unknown;
      readonly skipped?: unknown;
    };
    if (
      typeof extra.sol !== "string" ||
      typeof extra.keys !== "number" ||
      typeof extra.min !== "number"
    ) {
      continue;
    }
    const efficiency =
      extra.skipped === true || extra.keys === 0 ? 0 : Math.min(1, extra.min / extra.keys);
    samples.push({ solution: extra.sol, efficiency });
  }
  return samples;
}
