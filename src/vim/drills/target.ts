import { createRng, deriveSeed, retry, type Rng } from "../../core/rng";
import { CORPUS } from "../../typing/corpus";
import { pressKey } from "../engine";
import { formatKeys, parseKeys } from "../keys";
import { commandLevel, type Level } from "../levels";
import { optimalSolution } from "../optimal";
import { createState, type Pos, type VimState } from "../state";

/** One target of a round (AC-6). */
export type VimTarget = {
  readonly index: number;
  /** `deriveSeed(roundSeed, index)`. */
  readonly seed: number;
  readonly level: Level;
  readonly snippetId: string;
  readonly lines: readonly string[];
  readonly start: Pos;
  readonly target: Pos;
  /** Keys of the optimal solution. */
  readonly minimum: number;
  /** The optimal solution in Vim notation. */
  readonly solution: string;
};

const MAX_LINES = 15;
const ATTEMPTS = 2000;
/**
 * The snippets with their lines. The arrays are shared by every target, so
 * the search caches keyed on a buffer last from one target to the next.
 */
const ELIGIBLE = CORPUS.map((snippet) => ({ snippet, lines: snippet.text.split("\n") })).filter(
  (c) => c.lines.length <= MAX_LINES,
);

/**
 * Fewest and most optimal keys a target of the level may need. The smaller
 * maximum above level 1 forces the new movement instead of many `l`.
 */
export function targetLimits(level: Level): { readonly min: number; readonly max: number } {
  return { min: 2, max: level === 1 ? 6 : 4 };
}

/** Commands (as keys) that a level adds; a target of the level needs one of them. */
const NEW_COMMANDS: Readonly<Record<Level, readonly string[]>> = {
  1: ["h", "j", "k", "l"],
  2: ["w", "b", "e", "W", "B", "E", "ge"],
  3: ["0", "^", "$"],
  4: ["f", "F", "t", "T", ";", ","],
  5: ["2", "3", "4", "5", "6", "7", "8", "9"],
  6: ["gg", "G", "{", "}", "%"],
  7: ["/", "?", "n", "N", "*", "#"],
};

const POOL = [
  ...["h", "j", "k", "l", "w", "b", "e", "W", "B", "E", "ge", "0", "^", "$"],
  ...["f", "F", "t", "T", ";", ",", "gg", "G", "{", "}", "%", "/", "?", "n", "N", "*", "#"],
];

/** Keys of one random command of a level, using characters of the buffer. */
function randomCommand(
  rng: Rng,
  level: Level,
  names: readonly string[],
  lines: readonly string[],
): string {
  const usable = (n: string) =>
    /^[2-9]$/.test(n) ? level >= 5 : (commandLevel(n) as Level) <= level;
  const allowed = names.filter(usable);
  const name = rng.pick(allowed);
  const text = rng.pick(lines);
  const char = text.charAt(rng.int(0, Math.max(0, text.length - 1)));
  if (name === "f" || name === "F" || name === "t" || name === "T") {
    return `${name}${formatKeys([char])}`;
  }
  if (name === "/" || name === "?") {
    const from = rng.int(0, Math.max(0, text.length - 1));
    const word = text.slice(from, from + rng.int(1, 2)).replace(/[\\/?.*[\]~^$]/g, "a");
    return `${name}${formatKeys([...word])}<CR>`;
  }
  if (/^[2-9]$/.test(name))
    return `${name}${rng.pick(["w", "b", "e", "j", "k", "l", "h", "G", "W", "B"])}`;
  return name;
}

/** The cursor after typing the keys at the level, or null when a key is blocked. */
function walk(state: VimState, keys: string, level: Level): Pos | null {
  let s = state;
  for (const key of parseKeys(keys)) {
    const r = pressKey(s, key, level);
    if (r.blocked !== null) return null;
    s = r.state;
  }
  // Every command the walk types is complete, so nothing is left pending.
  return s.cursor;
}

/** The `index`-th target of the round with `seed`. */
export function generateTarget(seed: number, index: number, level: Level): VimTarget {
  const targetSeed = deriveSeed(seed, index);
  const rng = createRng(targetSeed);
  const { snippet, lines } = rng.pick(ELIGIBLE);
  const { min, max } = targetLimits(level);

  /** A random walk of the level's keys, kept when it makes a good target. */
  const attempt = (): VimTarget | null => {
    const line = rng.int(0, lines.length - 1);
    const text = lines[line] as string;
    const start = createState(lines, { line, col: rng.int(0, Math.max(0, text.length - 1)) });

    let keys = "";
    if (level === 1) {
      for (let n = rng.int(min, max); n > 0; n--) keys += rng.pick(NEW_COMMANDS[1]);
    } else {
      const commands = rng.int(1, 2);
      const withNew = rng.int(0, commands - 1);
      for (let c = 0; c < commands; c++) {
        const names = c === withNew || rng.next() < 0.3 ? NEW_COMMANDS[level] : POOL;
        keys += randomCommand(rng, level, names, lines);
      }
    }

    const end = walk(start, keys, level);
    if (end === null || (end.line === line && end.col === start.cursor.col)) return null;
    // Too easy: within reach of fewer keys than the minimum (cheap to check).
    if (optimalSolution(start, end, level, min - 1) !== null) return null;
    // Without the new movements the target must take longer (or be out of
    // reach), so the best solution uses a movement of the level itself.
    const lower = level > 1 ? optimalSolution(start, end, (level - 1) as Level, max) : null;
    const best = optimalSolution(start, end, level, lower === null ? max : lower.cost - 1);
    if (best === null) return null;
    return {
      index,
      seed: targetSeed,
      level,
      snippetId: snippet.id,
      lines,
      start: start.cursor,
      target: end,
      minimum: best.cost,
      solution: best.keys,
    };
  };

  return retry(attempt, (found) => found !== null, ATTEMPTS) as VimTarget;
}
