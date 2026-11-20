import { createRng, deriveSeed, type Rng } from "../../core/rng";
import { CORPUS, type Language } from "../../typing/corpus";
import { parseKeys } from "../keys";
import type { Pos } from "../state";

/** The kinds of edit a round can ask for (AC-6). */
export const EDIT_KINDS = [
  "delete-word",
  "change-word",
  "change-parens",
  "change-brackets",
  "change-braces",
  "change-quotes",
  "delete-to-char",
  "delete-to-end",
  "delete-line",
  "duplicate-line",
  "swap-lines",
  "append-semicolon",
  "comment-line",
  "change-operator",
  "open-line",
  "change-type",
  "fix-index",
  "replace-digit",
] as const;

export type EditKind = (typeof EDIT_KINDS)[number];

/** What the checkbox of each kind says, in Portuguese. */
export const EDIT_KIND_LABELS: Readonly<Record<EditKind, string>> = {
  "delete-word": "apagar uma palavra",
  "change-word": "trocar uma palavra",
  "change-parens": "trocar o conteúdo de ( )",
  "change-brackets": "trocar o conteúdo de [ ]",
  "change-braces": "trocar o conteúdo de { }",
  "change-quotes": "trocar o conteúdo de aspas",
  "delete-to-char": "apagar até um caractere",
  "delete-to-end": "apagar até o fim da linha",
  "delete-line": "apagar uma linha",
  "duplicate-line": "duplicar uma linha",
  "swap-lines": "trocar duas linhas",
  "append-semicolon": "acrescentar ; no fim",
  "comment-line": "comentar uma linha",
  "change-operator": "trocar um operador",
  "open-line": "abrir uma linha abaixo",
  "change-type": "trocar int por long long",
  "fix-index": "corrigir um índice",
  "replace-digit": "trocar um dígito",
};

/** One edit of a round (AC-6). */
export type EditTarget = {
  readonly index: number;
  /** `deriveSeed(roundSeed, index)`. */
  readonly seed: number;
  readonly kind: EditKind;
  readonly snippetId: string;
  /** The buffer before. */
  readonly lines: readonly string[];
  readonly start: Pos;
  /** The buffer the player must reach. */
  readonly after: readonly string[];
  /** The reference solution in Vim notation, starting in normal mode. */
  readonly reference: string;
  /** Keys of the reference. */
  readonly referenceKeys: number;
};

/** An edit before the generator adds its identity: what a kind builds from a snippet. */
type Draft = {
  readonly lines: readonly string[];
  readonly start: Pos;
  readonly after: readonly string[];
  readonly reference: string;
};

type Builder = (rng: Rng, lines: readonly string[], language: Language) => Draft | null;

/** A key sequence for text typed in insert mode: `<` is `<lt>` in Vim notation. */
const typed = (text: string): string => text.replace(/</g, "<lt>");

type Hit = { readonly line: number; readonly col: number; readonly match: RegExpExecArray };

/** Every match of `pattern` in the lines. */
function findAll(lines: readonly string[], pattern: RegExp): Hit[] {
  const hits: Hit[] = [];
  lines.forEach((text, line) => {
    for (const match of text.matchAll(new RegExp(pattern, "g"))) {
      hits.push({ line, col: match.index, match });
    }
  });
  return hits;
}

const withLine = (lines: readonly string[], at: number, text: string): string[] =>
  lines.map((l, i) => (i === at ? text : l));

/** The text of line `at` with `length` characters from `col` replaced. */
function spliceLine(
  lines: readonly string[],
  at: number,
  col: number,
  length: number,
  text: string,
) {
  const old = lines[at] as string;
  return withLine(lines, at, old.slice(0, col) + text + old.slice(col + length));
}

const WORDS = /(?<!\w)[A-Za-z_]\w*/;
const NEW_WORDS = ["tmp", "val", "cnt", "res", "idx", "acc", "len", "key"];

/** Replaces the content of a pair of delimiters, with the cursor somewhere inside it. */
function changeInside(pattern: RegExp, object: string, replacements: readonly string[]): Builder {
  return (rng, lines) => {
    const hits = findAll(lines, pattern).filter((h) => (h.match[1] as string).length > 0);
    if (hits.length === 0) return null;
    const hit = rng.pick(hits);
    const content = hit.match[1] as string;
    const text = rng.pick(replacements.filter((r) => r !== content));
    const start = { line: hit.line, col: hit.col + rng.int(1, content.length) };
    return {
      lines,
      start,
      after: spliceLine(lines, hit.line, hit.col + 1, content.length, text),
      reference: `${object}${typed(text)}<Esc>`,
    };
  };
}

/** Quote pairs on lines where the quotes pair up from the line start. */
function changeQuotes(rng: Rng, lines: readonly string[]): Draft | null {
  const hits = findAll(lines, /(["'])([^"'\\]+)\1/).filter((h) => {
    const quote = h.match[1] as string;
    const before = (lines[h.line] as string).slice(0, h.col);
    return (before.split(quote).length - 1) % 2 === 0;
  });
  if (hits.length === 0) return null;
  const hit = rng.pick(hits);
  const quote = hit.match[1] as string;
  const content = hit.match[2] as string;
  const text = rng.pick(["x", "yes", "ok", "NO"].filter((r) => r !== content));
  return {
    lines,
    start: { line: hit.line, col: hit.col + rng.int(1, content.length) },
    after: spliceLine(lines, hit.line, hit.col + 1, content.length, text),
    reference: `ci${quote}${text}<Esc>`,
  };
}

const BUILDERS: Readonly<Record<EditKind, Builder>> = {
  "delete-word": (rng, lines) => {
    // A word followed by blanks and more text: dw takes the word and the blanks.
    const hits = findAll(lines, /(?<!\w)[A-Za-z_]\w*( +)(?=\S)/);
    if (hits.length === 0) return null;
    const hit = rng.pick(hits);
    const word = hit.match[0].trimEnd();
    const inside = word.length > 2 && rng.next() < 0.5;
    return {
      lines,
      start: { line: hit.line, col: hit.col + (inside ? rng.int(1, word.length - 1) : 0) },
      after: spliceLine(lines, hit.line, hit.col, hit.match[0].length, ""),
      reference: inside ? "daw" : "dw",
    };
  },
  "change-word": (rng, lines) => {
    const hits = findAll(lines, WORDS);
    if (hits.length === 0) return null;
    const hit = rng.pick(hits);
    const word = hit.match[0];
    const text = rng.pick(NEW_WORDS.filter((w) => w !== word));
    return {
      lines,
      start: { line: hit.line, col: hit.col + rng.int(0, word.length - 1) },
      after: spliceLine(lines, hit.line, hit.col, word.length, text),
      reference: `ciw${text}<Esc>`,
    };
  },
  "change-parens": changeInside(/\(([^()]+)\)/, "ci(", [
    "n",
    "i + 1",
    "x, y",
    "a[i]",
    "0",
    "lo, hi",
  ]),
  "change-brackets": changeInside(/\[([^[\]]+)\]/, "ci[", ["i", "i + 1", "n - 1", "0", "j"]),
  "change-braces": changeInside(/\{([^{}]+)\}/, "ci{", [" return 0; ", " x++; ", " break; "]),
  "change-quotes": changeQuotes,
  "delete-to-char": (rng, lines) => {
    const line = rng.int(0, lines.length - 1);
    const text = lines[line] as string;
    const target = rng.pick([",", ")", ";", "]"]);
    const starts = [...text].flatMap((_, col) => {
      const end = text.indexOf(target, col + 1);
      return end - col >= 2 ? [{ col, end }] : [];
    });
    if (starts.length === 0) return null;
    const { col, end } = rng.pick(starts);
    return {
      lines,
      start: { line, col },
      after: spliceLine(lines, line, col, end - col, ""),
      reference: `dt${target}`,
    };
  },
  "delete-to-end": (rng, lines) => {
    const line = rng.int(0, lines.length - 1);
    const text = lines[line] as string;
    if (text.length < 6) return null;
    const col = rng.int(3, text.length - 2);
    return {
      lines,
      start: { line, col },
      after: withLine(lines, line, text.slice(0, col)),
      reference: "D",
    };
  },
  "delete-line": (rng, lines) => {
    if (lines.length < 3) return null;
    const line = rng.int(0, lines.length - 1);
    const text = lines[line] as string;
    return {
      lines,
      start: { line, col: rng.int(0, text.length - 1) },
      after: lines.filter((_, i) => i !== line),
      reference: "dd",
    };
  },
  "duplicate-line": (rng, lines) => {
    const line = rng.int(0, lines.length - 1);
    const text = lines[line] as string;
    return {
      lines,
      start: { line, col: rng.int(0, text.length - 1) },
      after: [...lines.slice(0, line + 1), text, ...lines.slice(line + 1)],
      reference: "yyp",
    };
  },
  "swap-lines": (rng, lines) => {
    const line = rng.int(0, lines.length - 2);
    const [a, b] = [lines[line] as string, lines[line + 1] as string];
    if (a === b) return null;
    return {
      lines,
      start: { line, col: rng.int(0, Math.max(0, a.length - 1)) },
      after: [...lines.slice(0, line), b, a, ...lines.slice(line + 2)],
      reference: "ddp",
    };
  },
  "append-semicolon": (rng, lines, language) => {
    if (language !== "cpp") return null;
    const hits = findAll(lines, /\S;$/);
    if (hits.length === 0) return null;
    const hit = rng.pick(hits);
    const text = lines[hit.line] as string;
    const broken = text.slice(0, -1);
    return {
      lines: withLine(lines, hit.line, broken),
      start: { line: hit.line, col: rng.int(0, broken.length - 1) },
      after: lines,
      reference: "A;<Esc>",
    };
  },
  "comment-line": (rng, lines, language) => {
    const candidates = lines.flatMap((text, line) => (text.trim() === "" ? [] : [line]));
    const line = rng.pick(candidates);
    const text = lines[line] as string;
    const indent = text.length - text.trimStart().length;
    const mark = language === "cpp" ? "// " : "# ";
    return {
      lines,
      start: { line, col: rng.int(0, text.length - 1) },
      after: withLine(lines, line, text.slice(0, indent) + mark + text.slice(indent)),
      reference: `I${typed(mark)}<Esc>`,
    };
  },
  "change-operator": (rng, lines) => {
    const hits = findAll(lines, / ([<>+*-]) /);
    if (hits.length === 0) return null;
    const hit = rng.pick(hits);
    const op = hit.match[1] as string;
    const col = hit.col + 1;
    const [text, reference] =
      op === "<" || op === ">"
        ? [`${op}=`, `s${typed(`${op}=`)}<Esc>`]
        : op === "-"
          ? ["+", "r+"]
          : ["-", "r-"];
    return {
      lines,
      start: { line: hit.line, col },
      after: spliceLine(lines, hit.line, col, 1, text),
      reference,
    };
  },
  "open-line": (rng, lines, language) => {
    const line = rng.int(0, lines.length - 1);
    const text = lines[line] as string;
    const code = rng.pick(
      language === "cpp"
        ? ["cnt++;", "ans = max(ans, x);", "x %= mod;", "cerr << x;"]
        : ["cnt += 1", "ans = max(ans, x)", "x %= mod", "print(x)"],
    );
    const indent = " ".repeat(text.length - text.trimStart().length + (/[{:]$/.test(text) ? 4 : 0));
    return {
      lines,
      start: { line, col: rng.int(0, Math.max(0, text.length - 1)) },
      after: [...lines.slice(0, line + 1), indent + code, ...lines.slice(line + 1)],
      reference: `o${typed(indent + code)}<Esc>`,
    };
  },
  "change-type": (rng, lines, language) => {
    if (language !== "cpp") return null;
    const hits = findAll(lines, /(?<!\w)int(?!\w)/);
    if (hits.length === 0) return null;
    const hit = rng.pick(hits);
    return {
      lines,
      start: { line: hit.line, col: hit.col + rng.int(0, 2) },
      after: spliceLine(lines, hit.line, hit.col, 3, "long long"),
      reference: "ciwlong long<Esc>",
    };
  },
  "fix-index": (rng, lines) => {
    const hits = findAll(lines, /\[([A-Za-z_]\w*)\]/);
    if (hits.length === 0) return null;
    const hit = rng.pick(hits);
    const name = hit.match[1] as string;
    return {
      lines,
      start: { line: hit.line, col: hit.col + rng.int(0, name.length) },
      after: spliceLine(lines, hit.line, hit.col + 1, name.length, `${name} + 1`),
      reference: "f]i + 1<Esc>",
    };
  },
  "replace-digit": (rng, lines) => {
    const hits = findAll(lines, /\d/);
    if (hits.length === 0) return null;
    const hit = rng.pick(hits);
    const digit = rng.pick([..."0123456789"].filter((d) => d !== hit.match[0]));
    return {
      lines,
      start: { line: hit.line, col: hit.col },
      after: spliceLine(lines, hit.line, hit.col, 1, digit),
      reference: `r${digit}`,
    };
  },
};

const ATTEMPTS = 300;

/** The snippets that fit a round: at most 15 lines. */
const ELIGIBLE = CORPUS.map((snippet) => ({
  id: snippet.id,
  language: snippet.language,
  lines: snippet.text.split("\n"),
})).filter((s) => s.lines.length <= 15);

/** The `index`-th edit of the round with `seed`, of one of the `kinds`. */
export function generateEdit(seed: number, index: number, kinds: readonly EditKind[]): EditTarget {
  if (kinds.length === 0) throw new Error("no edit kinds to choose from");
  const targetSeed = deriveSeed(seed, index);
  const rng = createRng(targetSeed);
  const kind = rng.pick(kinds);
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const snippet = rng.pick(ELIGIBLE);
    const draft = BUILDERS[kind](rng, snippet.lines, snippet.language);
    if (draft === null) continue;
    return {
      index,
      seed: targetSeed,
      kind,
      snippetId: snippet.id,
      lines: draft.lines,
      start: draft.start,
      after: draft.after,
      reference: draft.reference,
      referenceKeys: parseKeys(draft.reference).length,
    };
  }
  throw new Error(`no ${kind} edit found in ${String(ATTEMPTS)} attempts`);
}
