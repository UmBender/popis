import { createRng, deriveSeed, retry, type Rng } from "../../core/rng";
import { CORPUS, type Language } from "../../typing/corpus";
import { joinLines, shiftLine } from "../buffer";
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
  "comment-block",
  "uncomment-block",
  "rename-variable",
  "rename-in-function",
  "indent-block",
  "dedent-block",
  "indent-lines",
  "join-lines",
  "append-semicolons",
  "replace-endl",
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
  "comment-block": "comentar um bloco de linhas",
  "uncomment-block": "descomentar um bloco de linhas",
  "rename-variable": "renomear uma variável no trecho",
  "rename-in-function": "renomear dentro de uma função",
  "indent-block": "indentar o conteúdo de { }",
  "dedent-block": "desindentar o conteúdo de { }",
  "indent-lines": "indentar linhas selecionadas",
  "join-lines": "juntar duas linhas",
  "append-semicolons": "acrescentar ; em várias linhas",
  "replace-endl": "trocar endl por '\\n'",
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
    const hit = rng.pick(findAll(lines, /(?<!\w)[A-Za-z_]\w*( +)(?=\S)/));
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
    const hit = rng.pick(findAll(lines, WORDS));
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
    // No snippet has two equal lines in a row (a test checks it).
    const [a, b] = [lines[line] as string, lines[line + 1] as string];
    return {
      lines,
      start: { line, col: rng.int(0, Math.max(0, a.length - 1)) },
      after: [...lines.slice(0, line), b, a, ...lines.slice(line + 2)],
      reference: "ddp",
    };
  },
  "append-semicolon": (rng, lines, language) => {
    if (language !== "cpp") return null;
    const hit = rng.pick(findAll(lines, /\S;$/));
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
    // No snippet has a blank line.
    const line = rng.int(0, lines.length - 1);
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
  // Every snippet of the corpus has at least 3 lines, so the block kinds always fit.
  "comment-block": (rng, lines, language) => {
    const count = rng.int(3, Math.min(6, lines.length));
    const line = rng.int(0, lines.length - count);
    const mark = language === "cpp" ? "// " : "# ";
    return {
      lines,
      start: { line, col: rng.int(0, (lines[line] as string).length - 1) },
      after: lines.map((text, i) => (i >= line && i < line + count ? mark + text : text)),
      reference: `0<C-v>${String(count - 1)}jI${typed(mark)}<Esc>`,
    };
  },
  "uncomment-block": (rng, lines, language) => {
    const count = rng.int(3, Math.min(6, lines.length));
    const line = rng.int(0, lines.length - count);
    const mark = language === "cpp" ? "// " : "# ";
    const commented = lines.map((text, i) => (i >= line && i < line + count ? mark + text : text));
    return {
      lines: commented,
      start: { line, col: rng.int(0, (commented[line] as string).length - 1) },
      after: lines,
      reference: `0<C-v>${String(count - 1)}j${"l".repeat(mark.length - 1)}d`,
    };
  },
  "rename-variable": (rng, lines) => {
    // Every snippet repeats some short name.
    const text = lines.join("\n");
    const old = rng.pick(renamable(text));
    const name = rng.pick(RENAMES.filter((n) => !wordIn(text, n)));
    const line = rng.int(0, lines.length - 1);
    return {
      lines,
      start: { line, col: rng.int(0, (lines[line] as string).length - 1) },
      after: lines.map((l) => renameWord(l, old, name)),
      reference: `:%s/\\<lt>${old}\\>/${name}/g<CR>`,
    };
  },
  "rename-in-function": (rng, lines) => {
    const site = pickBlock(rng, lines);
    if (site === null) return null;
    const inner = lines.slice(site.open + 1, site.close);
    const names = renamable(lines.join("\n")).filter((n) => inner.some((l) => wordIn(l, n)));
    if (names.length === 0) return null;
    const old = rng.pick(names);
    const name = rng.pick(RENAMES.filter((n) => !wordIn(lines.join("\n"), n)));
    return {
      lines,
      start: site.start,
      after: lines.map((l, i) => (i > site.open && i < site.close ? renameWord(l, old, name) : l)),
      reference: `vi{:s/\\<lt>${old}\\>/${name}/g<CR>`,
    };
  },
  "indent-block": (rng, lines) => {
    const site = pickBlock(rng, lines);
    if (site === null) return null;
    return {
      lines,
      start: site.start,
      after: lines.map((l, i) => (i > site.open && i < site.close ? shiftLine(l, ">", 1) : l)),
      reference: ">i{",
    };
  },
  "dedent-block": (rng, lines) => {
    const site = pickBlock(rng, lines);
    if (site === null) return null;
    const inBlock = (i: number): boolean => i > site.open && i < site.close;
    return {
      lines: lines.map((l, i) => (inBlock(i) ? shiftLine(l, ">", 1) : l)),
      start: site.start,
      after: lines,
      reference: "<lt>i{",
    };
  },
  "indent-lines": (rng, lines) => {
    const count = rng.int(1, Math.min(4, lines.length - 1));
    const line = rng.int(0, lines.length - 1 - count);
    return {
      lines,
      start: { line, col: rng.int(0, (lines[line] as string).length - 1) },
      after: lines.map((l, i) => (i >= line && i <= line + count ? shiftLine(l, ">", 1) : l)),
      reference: `V${count === 1 ? "" : String(count)}j>`,
    };
  },
  "join-lines": (rng, lines) => {
    const line = rng.int(0, lines.length - 2);
    return {
      lines,
      start: { line, col: rng.int(0, (lines[line] as string).length - 1) },
      after: joinLines(lines, line, 2).lines,
      reference: "J",
    };
  },
  "append-semicolons": (rng, lines, language) => {
    if (language !== "cpp") return null;
    const runs: { line: number; room: number }[] = [];
    const ends = (i: number): boolean => /[^;];$/.test(lines[i] ?? "");
    for (let line = 0; line < lines.length; line++) {
      let room = 0;
      while (ends(line + room)) room++;
      if (room >= 2 && !ends(line - 1)) runs.push({ line, room });
    }
    if (runs.length === 0) return null;
    const run = rng.pick(runs);
    const count = rng.int(2, Math.min(5, run.room));
    const broken = lines.map((l, i) =>
      i >= run.line && i < run.line + count ? l.slice(0, -1) : l,
    );
    return {
      lines: broken,
      start: { line: run.line, col: rng.int(0, (broken[run.line] as string).length - 1) },
      after: lines,
      reference: `<C-v>${count === 2 ? "" : String(count - 1)}j$A;<Esc>`,
    };
  },
  "replace-endl": (rng, lines, language) => {
    if (language !== "cpp" || !lines.some((l) => l.includes("'\\n'"))) return null;
    const before = lines.map((l) => l.replaceAll("'\\n'", "endl"));
    const line = rng.int(0, lines.length - 1);
    return {
      lines: before,
      start: { line, col: rng.int(0, (before[line] as string).length - 1) },
      after: lines,
      reference: ":%s/endl/'\\\\n'/g<CR>",
    };
  },
};

const RENAMES = ["cnt", "val", "tmp", "idx", "acc", "res", "pos", "cur"];
const NOT_VARIABLES = new Set(
  "int for if else def in not and or is as try auto max min len sum map set pop abs str end".split(
    " ",
  ),
);

const wordIn = (text: string, word: string): boolean => new RegExp(`\\b${word}\\b`).test(text);

const renameWord = (text: string, from: string, to: string): string =>
  text.replace(new RegExp(`\\b${from}\\b`, "g"), to);

/** Short names that appear at least twice as whole words: candidates for a rename. */
function renamable(text: string): string[] {
  const seen = new Map<string, number>();
  for (const [word] of text.matchAll(/\b[A-Za-z_]\w{0,2}\b/g)) {
    seen.set(word, (seen.get(word) ?? 0) + 1);
  }
  return [...seen].filter(([w, n]) => n >= 2 && !NOT_VARIABLES.has(w)).map(([w]) => w);
}

type Block = { readonly open: number; readonly close: number; readonly start: Pos };

/**
 * A block with `{` ending a line and `}` starting one, and a cursor inside it,
 * on a line with no braces and not inside a block nested in it.
 */
function pickBlock(rng: Rng, lines: readonly string[]): Block | null {
  const stack: number[] = [];
  const pairs: { open: number; close: number }[] = [];
  lines.forEach((text, line) => {
    [...text].forEach((ch, col) => {
      if (ch === "{") stack.push(text.length - 1 === col ? line : -1);
      if (ch === "}") {
        const open = stack.pop();
        if (open !== undefined && open >= 0 && text.trimStart().startsWith("}")) {
          pairs.push({ open, close: line });
        }
      }
    });
  });
  const sites = pairs
    .map((pair) => {
      const nested = pairs.filter((p) => p.open > pair.open && p.close < pair.close);
      const cursorLines = lines
        .map((text, line) => ({ text, line }))
        .filter(
          ({ text, line }) =>
            line > pair.open &&
            line < pair.close &&
            !/[{}]/.test(text) &&
            !nested.some((p) => line > p.open && line < p.close),
        );
      return { pair, cursorLines };
    })
    .filter((site) => site.cursorLines.length > 0);
  if (sites.length === 0) return null;
  const site = rng.pick(sites);
  const at = rng.pick(site.cursorLines);
  return {
    open: site.pair.open,
    close: site.pair.close,
    start: { line: at.line, col: rng.int(0, at.text.length - 1) },
  };
}

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
  // Most snippets fit a kind; the others have no site for it and are skipped.
  const found = retry(
    () => {
      const snippet = rng.pick(ELIGIBLE);
      return { snippet, draft: BUILDERS[kind](rng, snippet.lines, snippet.language) };
    },
    (candidate) => candidate.draft !== null,
    ATTEMPTS,
  );
  const draft = found.draft as Draft;
  return {
    index,
    seed: targetSeed,
    kind,
    snippetId: found.snippet.id,
    lines: draft.lines,
    start: draft.start,
    after: draft.after,
    reference: draft.reference,
    referenceKeys: parseKeys(draft.reference).length,
  };
}
