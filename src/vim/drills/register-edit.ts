import type { Rng } from "../../core/rng";
import type { Pos } from "../state";

/** The kinds of edit that use registers, macros and `<C-a>` (T16 AC-5). */
export const REGISTER_KINDS = [
  "number-lines",
  "copy-block",
  "array-initializer",
  "declarations-to-cin",
  "swap-columns",
  "delete-debug-line",
  "paste-saved-text",
  "increment-indexes",
] as const;

export type RegisterKind = (typeof REGISTER_KINDS)[number];

/** What the checkbox of each kind says, in Portuguese. */
export const REGISTER_KIND_LABELS: Readonly<Record<RegisterKind, string>> = {
  "number-lines": "gerar as linhas 1…n com uma macro",
  "copy-block": "copiar um bloco n vezes",
  "array-initializer": "transformar números num inicializador",
  "declarations-to-cin": "trocar declarações por leituras com cin",
  "swap-columns": "trocar a ordem de duas colunas",
  "delete-debug-line": "apagar a linha de debug sem perder a cópia",
  "paste-saved-text": "colar um trecho guardado em dois lugares",
  "increment-indexes": "incrementar os índices de um bloco",
};

/** An edit before the generator adds its identity. */
export type RegisterDraft = {
  readonly lines: readonly string[];
  readonly start: Pos;
  readonly after: readonly string[];
  readonly reference: string;
};

type RegisterBuilder = (rng: Rng) => RegisterDraft;

const START: Pos = { line: 0, col: 0 };

/** A count in front of a command; 1 is left out. */
const countKey = (n: number): string => (n === 1 ? "" : String(n));

const TYPES = ["int", "long", "double", "char", "string", "bool"];
const NAMES = ["a", "b", "c", "n", "m", "k", "x", "y", "s", "t", "p", "q"];
const STATEMENTS = [
  "int n;",
  "cin >> n;",
  "sort(a, a + n);",
  "ans += a[i];",
  "cout << ans;",
  "i++;",
  "x = y + 1;",
  "long long s = 0;",
  "vector<int> v(n);",
  "return 0;",
];

/** `count` different items, in random order. */
function distinct<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const left = [...items];
  return Array.from({ length: count }, () => left.splice(rng.int(0, left.length - 1), 1)[0] as T);
}

const repeat = <T>(items: readonly T[], times: number): T[] =>
  Array.from({ length: times }, () => items).flat();

export const REGISTER_BUILDERS: Readonly<Record<RegisterKind, RegisterBuilder>> = {
  // Copy the line, paste it, add one to it; the macro does it again.
  "number-lines": (rng) => {
    const n = rng.int(4, 9);
    return {
      lines: ["1"],
      start: START,
      after: Array.from({ length: n }, (_, i) => String(i + 1)),
      reference: `qayyp<C-a>q${countKey(n - 2)}@a`,
    };
  },
  // Yank a two-line test case into "a and paste it `copies` times below.
  "copy-block": (rng) => {
    const count = rng.int(2, 5);
    const block = [String(count), Array.from({ length: count }, () => rng.int(1, 9)).join(" ")];
    const copies = rng.int(1, 3);
    return {
      lines: block,
      start: START,
      after: repeat(block, copies + 1),
      reference: `"a2yyj${countKey(copies)}"ap`,
    };
  },
  "array-initializer": (rng) => {
    const values = Array.from({ length: rng.int(3, 7) }, () => rng.int(1, 9));
    const line = values.join(" ");
    return {
      lines: [line],
      start: { line: 0, col: rng.int(0, line.length - 1) },
      after: [`{${values.join(", ")}}`],
      reference: ":s/ /, /g<CR>I{<Esc>A}<Esc>",
    };
  },
  // Change the first word of a line to "cin >>", then let a macro do the other lines.
  "declarations-to-cin": (rng) => {
    const names = distinct(rng, NAMES, rng.int(2, 5));
    return {
      lines: names.map((name) => `${rng.pick(TYPES)} ${name};`),
      start: { line: 0, col: rng.int(0, 2) },
      after: names.map((name) => `cin >> ${name};`),
      reference: `qa0cwcin >><Esc>jq${countKey(names.length - 1)}@a`,
    };
  },
  // Delete the first word, and put it back at the end of the line from the register.
  "swap-columns": (rng) => {
    const rows = Array.from({ length: rng.int(3, 5) }, () => {
      const word = () => String(rng.int(1, 99)) + rng.pick(NAMES);
      return [word(), word()] as const;
    });
    return {
      lines: rows.map(([left, right]) => `${left} ${right}`),
      start: { line: 0, col: rng.int(0, 1) },
      after: rows.map(([left, right]) => `${right} ${left}`),
      reference: `qa0dwA <C-r>"<BS><Esc>j0q${countKey(rows.length - 1)}@a`,
    };
  },
  // Yank a line, remove the debug print with the black hole register, paste the yank.
  "delete-debug-line": (rng) => {
    const size = rng.int(4, 6);
    const lines = distinct(rng, STATEMENTS, size);
    const at = rng.int(1, size - 1);
    lines[at] = `cerr << ${rng.pick(NAMES)} << endl;`;
    const rest = lines.filter((_, i) => i !== at);
    // After the delete the cursor is on the line that followed, or on the last one.
    const cursor = at < size - 1 ? at : size - 2;
    const after = [...rest.slice(0, cursor + 1), lines[0] as string, ...rest.slice(cursor + 1)];
    return { lines, start: START, after, reference: `yy${countKey(at)}j"_ddp` };
  },
  // Keep a line in "a, delete another, and paste the kept line in two places.
  "paste-saved-text": (rng) => {
    const lines = distinct(rng, STATEMENTS, rng.int(4, 6)) as [string, string, string, string];
    const [saved, , third, fourth] = lines;
    return {
      lines,
      start: START,
      after: [saved, third, saved, fourth, saved, ...lines.slice(4)],
      reference: '"ayyjdd"apj"ap',
    };
  },
  // Add one to the index of the first line; `.` does it for the others.
  "increment-indexes": (rng) => {
    const rows = Array.from({ length: rng.int(3, 5) }, () => ({
      name: rng.pick(NAMES),
      index: rng.int(0, 8),
      value: rng.int(0, 9),
    }));
    const text = (index: number, row: (typeof rows)[number]): string =>
      `${row.name}[${String(index)}] = ${String(row.value)};`;
    return {
      lines: rows.map((row) => text(row.index, row)),
      start: START,
      after: rows.map((row) => text(row.index + 1, row)),
      reference: `<C-a>${"j.".repeat(rows.length - 1)}`,
    };
  },
};
