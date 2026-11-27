import {
  formatShell,
  parseShell,
  wordDisplay,
  wordText,
  type ArithBinaryOp,
  type ArithExpr,
  type DqPart,
  type ListOp,
  type TestExpr,
  type Redirection,
  type ShellNode,
  type SimpleCommand,
  type Word,
  type WordPart,
} from "./parse";

export type ShellCommandRef = {
  readonly key: string;
  readonly text: string;
};

/** Reference table of contest bash commands (AC-2, AC-5, AC-6). */
export const SHELL_COMMAND_TABLE: readonly ShellCommandRef[] = [
  { key: "ls", text: "lista arquivos da pasta (-la, -lh)" },
  { key: "cd", text: "muda de pasta (cd - volta para a anterior)" },
  { key: "mkdir", text: "cria pastas (-p cria intermediárias)" },
  { key: "cp", text: "copia arquivos ou pastas (-r recursivo)" },
  { key: "mv", text: "move ou renomeia arquivos" },
  { key: "cat", text: "imprime o conteúdo de um arquivo" },
  { key: "rm", text: "remove arquivos ou pastas (-f força, -r recursivo)" },
  { key: "g++", text: "compila C++ (-O2 -std=gnu++20, avisos, sanitizers)" },
  { key: "tee", text: "mostra na tela e grava no arquivo ao mesmo tempo" },
  { key: "time", text: "mede o tempo real, de usuário e de sistema" },
  { key: "timeout", text: "mata o comando se passar do limite de segundos" },
  { key: "diff", text: "compara saídas linha a linha (-Z fim de linha, -w espaços)" },
  { key: "cmp", text: "compara dois arquivos byte a byte (-s silencioso)" },
  { key: "seq", text: "gera a sequência de inteiros de 1 até N" },
  { key: "for", text: "repete comandos sobre uma lista (stress test)" },
  { key: "while", text: "repete enquanto a condição retornar zero" },
  { key: "ulimit", text: "mostra ou ajusta limites de pilha (-s) e memória (-v)" },
  { key: "head", text: "mostra as primeiras N linhas (-n N)" },
  { key: "tail", text: "mostra as últimas N linhas (-n N)" },
  { key: "wc", text: "conta linhas (-l), palavras (-w) e bytes (-c)" },
  { key: "sort", text: "ordena linhas (-n numérico, -r reverso, -u único)" },
  { key: "uniq", text: "remove duplicatas adjacentes (-c conta ocorrências)" },
  { key: "grep", text: "filtra linhas por padrão (-n número, -i sem maiúsculas)" },
  { key: "alias", text: "cria atalho curto para um comando frequente" },
  { key: "source", text: "carrega o ~/.bashrc no terminal atual (atalho .)" },
  { key: "chmod", text: "muda permissões; chmod +x deixa o script executável" },
  { key: "bash", text: "roda um script com o bash, mesmo sem chmod +x" },
  { key: "echo", text: "imprime texto e variáveis (use aspas duplas)" },
  { key: "exit", text: "termina o script com um código: 0 deu certo, 1 falhou" },
  { key: "if", text: "roda um bloco só quando o teste dá certo" },
  { key: "case", text: "escolhe um bloco pelo valor de uma palavra" },
  { key: "local", text: "cria uma variável que só existe dentro da função" },
  { key: "set", text: "liga opções do bash, como set -euo pipefail" },
];

export type CheckOptions = {
  /** When true, `;` and `&&` are treated as equivalent list separators (AC-2). */
  readonly allowSemicolon?: boolean;
  /** Optional fallback hint when a command does not match. */
  readonly hint?: string;
  /** When true, double quotes around an expansion are required (`"$1"` is not `$1`, T54 AC-2). */
  readonly strictQuotes?: boolean;
  /** When true, `for f in ./in*` differs from `for f in in*` (the objective shows the name). */
  readonly exactPaths?: boolean;
};

export type ShellExpected = {
  readonly accepted: readonly string[];
  readonly options?: CheckOptions;
};

export type CheckResult = { readonly ok: true } | { readonly ok: false; readonly reason: string };

type FlagSpec = {
  readonly longMap: Readonly<Record<string, string>>;
  readonly shortAlias?: Readonly<Record<string, string>>;
  readonly valueFlags?: ReadonlySet<string>;
  readonly numericDashFlag?: string;
};

const FLAG_SPECS: Readonly<Record<string, FlagSpec>> = {
  ls: {
    longMap: { "--all": "-a", "--human-readable": "-h" },
  },
  mkdir: {
    longMap: { "--parents": "-p" },
  },
  cp: {
    longMap: { "--recursive": "-r", "--force": "-f", "--interactive": "-i" },
    shortAlias: { "-R": "-r" },
  },
  mv: {
    longMap: { "--force": "-f", "--interactive": "-i" },
  },
  rm: {
    longMap: { "--force": "-f", "--recursive": "-r" },
    shortAlias: { "-R": "-r" },
  },
  cat: {
    longMap: { "--number": "-n" },
  },
  tee: {
    longMap: { "--append": "-a" },
  },
  diff: {
    longMap: {
      "--ignore-trailing-space": "-Z",
      "--ignore-all-space": "-w",
      "--ignore-space-change": "-b",
      "--brief": "-q",
      "--unified": "-u",
      "--side-by-side": "-y",
    },
  },
  cmp: {
    longMap: { "--silent": "-s", "--quiet": "-s" },
  },
  head: {
    longMap: { "--lines": "-n" },
    valueFlags: new Set(["-n"]),
    numericDashFlag: "-n",
  },
  tail: {
    longMap: { "--lines": "-n" },
    valueFlags: new Set(["-n"]),
    numericDashFlag: "-n",
  },
  wc: {
    longMap: { "--lines": "-l", "--words": "-w", "--bytes": "-c" },
  },
  sort: {
    longMap: { "--numeric-sort": "-n", "--reverse": "-r", "--unique": "-u" },
  },
  uniq: {
    longMap: { "--count": "-c", "--repeated": "-d", "--unique": "-u" },
  },
  grep: {
    longMap: {
      "--line-number": "-n",
      "--ignore-case": "-i",
      "--count": "-c",
      "--invert-match": "-v",
      "--extended-regexp": "-E",
      "--fixed-strings": "-F",
    },
  },
  ulimit: {
    longMap: {},
    valueFlags: new Set(["-s", "-v", "-t", "-n"]),
  },
};

function litWord(value: string): Word {
  return { parts: [{ type: "text", value }] };
}

function normalizeDqPart(part: DqPart, options?: CheckOptions): DqPart {
  return part.type === "cmdsub"
    ? { type: "cmdsub", node: normalizeShell(part.node, options) }
    : part;
}

function mergeTexts(parts: readonly WordPart[]): WordPart[] {
  const out: WordPart[] = [];
  for (const part of parts) {
    const prev = out[out.length - 1];
    if (part.type === "text" && prev?.type === "text") {
      out[out.length - 1] = { type: "text", value: prev.value + part.value };
    } else {
      out.push(part);
    }
  }
  return out;
}

/** Normalizes substitutions inside a word; double quotes drop unless `strictQuotes` (T54 AC-2). */
function normalizeWord(word: Word, options?: CheckOptions): Word {
  const parts = word.parts.flatMap((part): WordPart[] => {
    if (part.type === "cmdsub") {
      return [{ type: "cmdsub", node: normalizeShell(part.node, options) }];
    }
    if (part.type === "procsub") {
      return [{ type: "procsub", dir: "<", node: normalizeShell(part.node, options) }];
    }
    if (part.type === "dq") {
      const inner = part.parts.map((p) => normalizeDqPart(p, options));
      return options?.strictQuotes ? [{ type: "dq", parts: inner }] : inner;
    }
    return [part];
  });
  return { parts: mergeTexts(parts) };
}

/** `./in*` reads as `in*` in a for list unless the objective shows the name (`exactPaths`). */
function normalizeForItem(word: Word, options?: CheckOptions): Word {
  const norm = normalizeWord(word, options);
  const first = norm.parts[0];
  if (options?.exactPaths || first?.type !== "text" || !first.value.startsWith("./")) return norm;
  if (first.value.length <= 2) return norm;
  return { parts: [{ type: "text", value: first.value.slice(2) }, ...norm.parts.slice(1)] };
}

const NUMERIC_TEST_OPS: Readonly<Record<string, ArithBinaryOp>> = {
  "-eq": "==",
  "-ne": "!=",
  "-lt": "<",
  "-le": "<=",
  "-gt": ">",
  "-ge": ">=",
};

function wordToArith(word: Word): ArithExpr | null {
  if (word.parts.length !== 1) return null;
  const part = word.parts[0]!;
  const single = part.type === "dq" && part.parts.length === 1 ? part.parts[0]! : part;
  if (single.type === "text" && /^\d+$/.test(single.value)) {
    return { type: "num", value: Number(single.value) };
  }
  if (single.type === "var" && single.fallback === undefined) {
    return { type: "name", name: single.name };
  }
  return null;
}

/** `[[ $n -lt 5 ]]` and `(( n < 5 ))` compare the same numbers (T54 AC-2). */
function testToArith(expr: TestExpr): ArithExpr | null {
  switch (expr.type) {
    case "binary": {
      const op = NUMERIC_TEST_OPS[expr.op];
      const left = wordToArith(expr.left);
      const right = wordToArith(expr.right);
      return op !== undefined && left !== null && right !== null
        ? { type: "binary", op, left, right }
        : null;
    }
    case "not": {
      const arg = testToArith(expr.expr);
      return arg !== null ? { type: "unary", op: "!", arg } : null;
    }
    case "and":
    case "or": {
      const left = testToArith(expr.left);
      const right = testToArith(expr.right);
      return left !== null && right !== null
        ? { type: "binary", op: expr.type === "and" ? "&&" : "||", left, right }
        : null;
    }
    case "unary":
      return null;
  }
}

function normalizeTest(expr: TestExpr, options?: CheckOptions): TestExpr {
  switch (expr.type) {
    case "unary":
      return { type: "unary", op: expr.op, arg: normalizeWord(expr.arg, options) };
    case "binary":
      return {
        type: "binary",
        op: expr.op,
        left: normalizeWord(expr.left, options),
        right: normalizeWord(expr.right, options),
      };
    case "not":
      return { type: "not", expr: normalizeTest(expr.expr, options) };
    case "and":
    case "or":
      return {
        type: expr.type,
        left: normalizeTest(expr.left, options),
        right: normalizeTest(expr.right, options),
      };
  }
}

function normalizeRedirs(redirs: readonly Redirection[], options?: CheckOptions): Redirection[] {
  const mapped: Redirection[] = redirs.map((r) =>
    r.op === "2>&1" ? r : { op: r.op, target: normalizeWord(r.target, options) },
  );

  // Merge `> file 2>&1` into `&> file` (preserving `2>&1 > file` as distinct!).
  const merged: Redirection[] = [];
  for (let i = 0; i < mapped.length; i++) {
    const cur = mapped[i]!;
    const next = mapped[i + 1];
    if (cur.op === ">" && next?.op === "2>&1") {
      merged.push({ op: "&>", target: cur.target });
      i += 1;
    } else {
      merged.push(cur);
    }
  }

  const hasOrderSensitiveDup = merged.some((r) => r.op === "2>&1");
  if (hasOrderSensitiveDup) {
    // Only `<` is completely independent of `2>&1`; keep stdout/stderr redirs in order.
    const inputs = merged.filter((r) => r.op === "<").sort(compareRedir);
    const rest = merged.filter((r) => r.op !== "<");
    return [...inputs, ...rest];
  }

  return [...merged].sort(compareRedir);
}

function compareRedir(a: Redirection, b: Redirection): number {
  return redirKey(a).localeCompare(redirKey(b));
}

function redirKey(r: Redirection): string {
  return r.op === "2>&1" ? "2>&1" : `${r.op}:${wordDisplay(r.target)}`;
}

function normalizeGppArgs(args: readonly Word[]): Word[] {
  const flagUnits: string[][] = [];
  const positionals: Word[] = [];

  for (let i = 0; i < args.length; i++) {
    const w = args[i]!;
    const txt = wordText(w);
    if (txt === null) {
      positionals.push(w);
      continue;
    }
    if (txt === "-o" || txt === "-x") {
      const val = args[i + 1];
      if (val !== undefined) {
        flagUnits.push([txt, wordDisplay(val)]);
        i += 1;
      } else {
        flagUnits.push([txt]);
      }
    } else if (txt.startsWith("-o") && txt.length > 2) {
      flagUnits.push(["-o", txt.slice(2)]);
    } else if (txt.startsWith("-fsanitize=")) {
      const list = txt.slice("-fsanitize=".length).split(",").sort().join(",");
      flagUnits.push([`-fsanitize=${list}`]);
    } else if (txt.startsWith("-") && txt.length > 1) {
      flagUnits.push([txt]);
    } else {
      positionals.push(w);
    }
  }

  flagUnits.sort((a, b) => a.join(" ").localeCompare(b.join(" ")));
  const out: Word[] = [];
  for (const unit of flagUnits) {
    for (const piece of unit) {
      const parsed = parseShell(`echo ${piece}`);
      if (parsed.ok && parsed.node.kind === "command" && parsed.node.words[1] !== undefined) {
        out.push(parsed.node.words[1]);
      } else {
        out.push(litWord(piece));
      }
    }
  }
  return [...out, ...positionals];
}

function normalizeFlagCommand(args: readonly Word[], spec: FlagSpec): Word[] {
  const flagUnits: { readonly key: string; readonly words: readonly Word[] }[] = [];
  const positionals: Word[] = [];
  const valueFlags = spec.valueFlags ?? new Set<string>();
  const shortAlias = spec.shortAlias ?? {};
  let afterDoubleDash = false;

  for (let i = 0; i < args.length; i++) {
    const w = args[i]!;
    const txt = wordText(w);
    if (afterDoubleDash || txt === null || !txt.startsWith("-") || txt === "-") {
      positionals.push(w);
      continue;
    }
    if (txt === "--") {
      afterDoubleDash = true;
      continue;
    }

    // `--long=value`
    const eqIdx = txt.indexOf("=");
    if (txt.startsWith("--") && eqIdx > 2) {
      const flag = txt.slice(0, eqIdx);
      const val = txt.slice(eqIdx + 1);
      const mapped = spec.longMap[flag] ?? flag;
      flagUnits.push({ key: `${mapped} ${val}`, words: [litWord(mapped), litWord(val)] });
      continue;
    }

    // `--long`
    if (txt.startsWith("--")) {
      const mapped = spec.longMap[txt] ?? txt;
      if (valueFlags.has(mapped) && args[i + 1] !== undefined) {
        const val = args[i + 1]!;
        i += 1;
        flagUnits.push({
          key: `${mapped} ${wordDisplay(val)}`,
          words: [litWord(mapped), val],
        });
      } else {
        flagUnits.push({ key: mapped, words: [litWord(mapped)] });
      }
      continue;
    }

    // Numeric shorthand like `head -10` / `tail -20`
    if (spec.numericDashFlag !== undefined && /^-\d+$/.test(txt)) {
      const num = txt.slice(1);
      flagUnits.push({
        key: `${spec.numericDashFlag} ${num}`,
        words: [litWord(spec.numericDashFlag), litWord(num)],
      });
      continue;
    }

    // Attached value flag like `-n10`
    if (txt.length > 2 && valueFlags.has(txt.slice(0, 2))) {
      const flag = txt.slice(0, 2);
      const val = txt.slice(2);
      flagUnits.push({ key: `${flag} ${val}`, words: [litWord(flag), litWord(val)] });
      continue;
    }

    // Single short flag with value
    if (txt.length === 2 && valueFlags.has(txt)) {
      const next = args[i + 1];
      if (next !== undefined) {
        i += 1;
        flagUnits.push({ key: `${txt} ${wordDisplay(next)}`, words: [litWord(txt), next] });
      } else {
        flagUnits.push({ key: txt, words: [litWord(txt)] });
      }
      continue;
    }

    // Grouped short flags `-la` -> `-a`, `-l`
    for (const ch of txt.slice(1)) {
      const raw = `-${ch}`;
      const mapped = shortAlias[raw] ?? raw;
      flagUnits.push({ key: mapped, words: [litWord(mapped)] });
    }
  }

  flagUnits.sort((a, b) => a.key.localeCompare(b.key));
  const out: Word[] = [];
  for (const u of flagUnits) out.push(...u.words);
  return [...out, ...positionals];
}

function normalizeCommandWords(words: readonly Word[], options?: CheckOptions): Word[] {
  const normWords = words.map((w) => normalizeWord(w, options));
  const head = wordText(normWords[0]!);
  if (head === null) return normWords;

  if (head === ".") {
    return [litWord("source"), ...normWords.slice(1)];
  }
  if (head === ":") {
    return [litWord("true")];
  }
  if (head === "seq") {
    const a1 = normWords[1] !== undefined ? wordText(normWords[1]) : null;
    const a2 = normWords[2] !== undefined ? wordText(normWords[2]) : null;
    if (normWords.length === 3 && a1 === "1" && a2 !== null && /^\d+$/.test(a2)) {
      return [litWord("seq"), litWord(a2)];
    }
    return normWords;
  }
  if (head === "time" && normWords.length >= 2) {
    return [litWord("time"), ...normalizeCommandWords(normWords.slice(1), options)];
  }
  if (head === "timeout" && normWords.length >= 2) {
    const durWord = normWords[1]!;
    const durTxt = wordText(durWord);
    const normDur =
      durTxt !== null && /^\d+s$/.test(durTxt) ? litWord(durTxt.slice(0, -1)) : durWord;
    const rest = normWords.slice(2);
    const normRest = rest.length > 0 ? normalizeCommandWords(rest, options) : [];
    return [litWord("timeout"), normDur, ...normRest];
  }
  if (head === "g++") {
    return [litWord("g++"), ...normalizeGppArgs(normWords.slice(1))];
  }
  if (head === "alias" && normWords.length === 2) {
    const raw = wordText(normWords[1]!);
    const eq = raw !== null ? raw.indexOf("=") : -1;
    if (raw !== null && eq > 0) {
      const name = raw.slice(0, eq);
      const rhs = raw.slice(eq + 1);
      const inner = parseShell(rhs);
      if (inner.ok) {
        const normInner = formatShell(normalizeShell(inner.node, options));
        return [litWord("alias"), litWord(`${name}=${normInner}`)];
      }
    }
    return normWords;
  }

  const spec = FLAG_SPECS[head];
  if (spec !== undefined) {
    return [litWord(head), ...normalizeFlagCommand(normWords.slice(1), spec)];
  }
  return normWords;
}

/** Normalizes a shell AST for effect-based equivalence comparison (AC-2). */
export function normalizeShell(node: ShellNode, options?: CheckOptions): ShellNode {
  switch (node.kind) {
    case "command":
      return {
        kind: "command",
        words: normalizeCommandWords(node.words, options),
        redirs: normalizeRedirs(node.redirs, options),
      };
    case "pipeline":
      return {
        kind: "pipeline",
        stages: node.stages.map((s) => normalizeShell(s, options)),
      };
    case "list": {
      const mapOp = (op: ListOp): ListOp => (options?.allowSemicolon && op === ";" ? "&&" : op);
      return {
        kind: "list",
        first: normalizeShell(node.first, options),
        rest: node.rest.map((r) => ({ op: mapOp(r.op), node: normalizeShell(r.node, options) })),
      };
    }
    case "for": {
      const items = node.items.map((item) => {
        const txt = wordText(item);
        const brace = txt !== null ? /^\{1\.\.(\d+)\}$/.exec(txt) : null;
        if (brace !== null) {
          const seqNode: SimpleCommand = {
            kind: "command",
            words: [litWord("seq"), litWord(brace[1]!)],
            redirs: [],
          };
          return { parts: [{ type: "cmdsub" as const, node: seqNode }] };
        }
        return normalizeForItem(item, options);
      });
      return {
        kind: "for",
        variable: node.variable,
        items,
        body: normalizeShell(node.body, options),
      };
    }
    case "while":
      return {
        kind: "while",
        condition: normalizeShell(node.condition, options),
        body: normalizeShell(node.body, options),
      };
    case "funcdef":
      return {
        kind: "funcdef",
        name: node.name,
        body: normalizeShell(node.body, options),
      };
    case "if":
      return {
        kind: "if",
        branches: node.branches.map((b) => ({
          condition: normalizeShell(b.condition, options),
          body: normalizeShell(b.body, options),
        })),
        elseBody: node.elseBody !== null ? normalizeShell(node.elseBody, options) : null,
      };
    case "until":
      return {
        kind: "until",
        condition: normalizeShell(node.condition, options),
        body: normalizeShell(node.body, options),
      };
    case "case":
      return {
        kind: "case",
        word: normalizeWord(node.word, options),
        arms: node.arms.map((arm) => ({
          patterns: arm.patterns.map((p) => normalizeWord(p, options)),
          body: arm.body !== null ? normalizeShell(arm.body, options) : null,
        })),
      };
    case "forarith":
      return { ...node, body: normalizeShell(node.body, options) };
    case "test": {
      const expr = normalizeTest(node.expr, options);
      const arith = testToArith(expr);
      return arith !== null ? { kind: "arith", expr: arith } : { kind: "test", expr };
    }
    case "arith":
      return node;
    case "group":
      return { kind: "group", body: normalizeShell(node.body, options) };
    case "redirect":
      return {
        kind: "redirect",
        body: normalizeShell(node.body, options),
        redirs: normalizeRedirs(node.redirs, options),
      };
  }
}

/** Direct child nodes of a node, in source order. */
function childNodes(node: ShellNode): ShellNode[] {
  switch (node.kind) {
    case "command":
    case "test":
    case "arith":
      return [];
    case "pipeline":
      return [...node.stages];
    case "list":
      return [node.first, ...node.rest.map((r) => r.node)];
    case "for":
    case "forarith":
    case "funcdef":
    case "group":
    case "redirect":
      return [node.body];
    case "while":
    case "until":
      return [node.condition, node.body];
    case "if":
      return [
        ...node.branches.flatMap((b) => [b.condition, b.body]),
        ...(node.elseBody !== null ? [node.elseBody] : []),
      ];
    case "case":
      return node.arms.flatMap((a) => (a.body !== null ? [a.body] : []));
  }
}

function allNodes(node: ShellNode): ShellNode[] {
  return [node, ...childNodes(node).flatMap(allNodes)];
}

function commandsOf(node: ShellNode): SimpleCommand[] {
  return allNodes(node).filter((n): n is SimpleCommand => n.kind === "command");
}

function flatTest(e: TestExpr): TestExpr[] {
  if (e.type === "not") return [e, ...flatTest(e.expr)];
  if (e.type === "and" || e.type === "or") return [e, ...flatTest(e.left), ...flatTest(e.right)];
  return [e];
}

function testExprsOf(node: ShellNode): TestExpr[] {
  return allNodes(node).flatMap((n) => (n.kind === "test" ? flatTest(n.expr) : []));
}

function wordsOf(node: ShellNode): Word[] {
  return allNodes(node).flatMap((n): Word[] => {
    switch (n.kind) {
      case "command":
        return [...n.words, ...n.redirs.flatMap((r) => (r.op === "2>&1" ? [] : [r.target]))];
      case "for":
        return [...n.items];
      case "case":
        return [n.word];
      case "test":
        return flatTest(n.expr).flatMap((e) =>
          e.type === "unary" ? [e.arg] : e.type === "binary" ? [e.left, e.right] : [],
        );
      default:
        return [];
    }
  });
}

/** Variable names expanded inside double quotes (`inQuotes`) or outside them. */
function varNames(node: ShellNode, inQuotes: boolean): Set<string> {
  const names = new Set<string>();
  for (const word of wordsOf(node)) {
    for (const part of word.parts) {
      if (part.type === "dq" && inQuotes) {
        for (const p of part.parts) if (p.type === "var") names.add(p.name);
      } else if (part.type === "var" && !inQuotes) {
        names.add(part.name);
      }
    }
  }
  return names;
}

function describeNode(node: ShellNode): string {
  switch (node.kind) {
    case "command":
      return wordText(node.words[0]!) ?? wordDisplay(node.words[0]!);
    case "list":
      return describeNode(node.first);
    case "pipeline":
      return describeNode(node.stages[0]!);
    case "redirect":
      return describeNode(node.body);
    case "forarith":
      return "for";
    case "test":
      return "[[ ]]";
    case "arith":
      return "(( ))";
    case "group":
      return "{ }";
    case "funcdef":
      return "uma função";
    default:
      return node.kind;
  }
}

function hasDottedForItem(node: ShellNode): boolean {
  return allNodes(node).some(
    (n) =>
      n.kind === "for" &&
      n.items.some((w) => w.parts[0]?.type === "text" && w.parts[0].value.startsWith("./")),
  );
}

/** Script-specific near misses (T54 AC-2), found anywhere in the typed script. */
function diagnoseScript(
  typed: ShellNode,
  expected: ShellNode,
  options?: CheckOptions,
): string | null {
  const expCmds = commandsOf(expected);
  const gotCmds = commandsOf(typed);

  const assigned = new Set(
    expCmds.flatMap((c) => {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(wordText(c.words[0]!) ?? "");
      return m !== null ? [m[1]!] : [];
    }),
  );
  const spaced = gotCmds.find(
    (c) =>
      assigned.has(wordText(c.words[0]!) ?? "") &&
      c.words[1] !== undefined &&
      wordText(c.words[1]) === "=",
  );
  if (spaced !== undefined) {
    const name = wordText(spaced.words[0]!) ?? "";
    return `tire os espaços em volta do =: escreva ${name}=valor (com espaço, o bash roda um comando chamado ${name})`;
  }

  const textCompare = (e: TestExpr) => e.type === "binary" && (e.op === "<" || e.op === ">");
  if (testExprsOf(typed).some(textCompare) && !testExprsOf(expected).some(textCompare)) {
    return "dentro de [[ ]], < e > comparam texto (10 < 9 dá verdadeiro); para números use -lt e -gt, ou (( ))";
  }

  if (options?.strictQuotes) {
    const quoted = varNames(expected, true);
    const bare = [...varNames(typed, false)].find((name) => quoted.has(name));
    if (bare !== undefined) {
      return `coloque aspas: "$${bare}" (sem aspas, um nome com espaço vira duas palavras)`;
    }
  }

  const failsWithCode = expCmds.some(
    (c) => wordText(c.words[0]!) === "exit" && c.words.length > 1 && wordText(c.words[1]!) !== "0",
  );
  const bareExit = gotCmds.some((c) => wordText(c.words[0]!) === "exit" && c.words.length === 1);
  if (failsWithCode && bareExit) {
    return "exit sem código devolve o código do último comando; use exit 1 para indicar falha";
  }

  if (options?.exactPaths && hasDottedForItem(typed) && !hasDottedForItem(expected)) {
    return "o objetivo mostra o nome do arquivo: use o padrão sem ./ na frente";
  }
  return null;
}

/** First differing child pair of two nodes with the same shape, for a deeper diagnosis. */
function firstDifferingChildren(
  typed: ShellNode,
  expected: ShellNode,
): readonly [ShellNode, ShellNode] | null {
  if (typed.kind !== expected.kind) return null;
  const a = childNodes(typed);
  const b = childNodes(expected);
  if (a.length !== b.length) return null;
  for (let i = 0; i < a.length; i++) {
    if (!nodesEqual(a[i]!, b[i]!)) return [a[i]!, b[i]!];
  }
  return null;
}

/** Structural equality of two normalized shell ASTs. */
export function nodesEqual(a: ShellNode, b: ShellNode): boolean {
  return formatShell(a) === formatShell(b);
}

function hasBreak(node: ShellNode): boolean {
  if (node.kind === "command") return wordText(node.words[0]!) === "break";
  if (node.kind === "list") return hasBreak(node.first) || node.rest.some((r) => hasBreak(r.node));
  if (node.kind === "pipeline") return node.stages.some(hasBreak);
  return false;
}

function diagnoseMismatch(typed: ShellNode, expected: ShellNode, options?: CheckOptions): string {
  // Loop missing || break
  if (
    (expected.kind === "for" || expected.kind === "while") &&
    typed.kind === expected.kind &&
    hasBreak(expected.body) &&
    !hasBreak(typed.body)
  ) {
    return "faltou || break no laço para parar no primeiro caso que difere";
  }

  // Semicolon when && is required
  if (expected.kind === "list" && typed.kind === "list" && !options?.allowSemicolon) {
    const semiForAnd = expected.rest.some((r, i) => r.op === "&&" && typed.rest[i]?.op === ";");
    if (semiForAnd) {
      return "use && no lugar de ; para só continuar se o comando anterior der certo";
    }
  }

  const scriptReason = diagnoseScript(typed, expected, options);
  if (scriptReason !== null) return scriptReason;

  if (expected.kind === "command" && typed.kind === "command") {
    const expCmd = wordText(expected.words[0]!);
    const gotCmd = wordText(typed.words[0]!);

    if (expCmd !== gotCmd) {
      return `esperado ${expCmd ?? wordDisplay(expected.words[0]!)}, mas você usou ${gotCmd ?? wordDisplay(typed.words[0]!)}`;
    }

    // Redirection direction swap (> instead of <)
    const expHasIn = expected.redirs.some((r) => r.op === "<");
    const gotHasIn = typed.redirs.some((r) => r.op === "<");
    const expHasOut = expected.redirs.some((r) => r.op === ">");
    const gotHasOut = typed.redirs.some((r) => r.op === ">");
    if (expHasIn && !gotHasIn && gotHasOut && !expHasOut) {
      return "usou > (saída) no lugar de < (entrada)";
    }
    if (expHasOut && !gotHasOut && gotHasIn && !expHasIn) {
      return "usou < (entrada) no lugar de > (saída)";
    }

    // Wrong 2>&1 order (2>&1 > file vs > file 2>&1)
    if (
      expected.redirs.some((r) => r.op === "&>") &&
      typed.redirs.some((r) => r.op === "2>&1") &&
      typed.redirs.some((r) => r.op === ">")
    ) {
      return "coloque > arquivo antes de 2>&1 (ou use &> arquivo)";
    }

    const expArgs = expected.words.slice(1).map(wordDisplay);
    const gotArgs = typed.words.slice(1).map(wordDisplay);

    if (expCmd === "diff") {
      if (expArgs.includes("-Z") && !gotArgs.includes("-Z")) {
        return gotArgs.includes("-w")
          ? "use -Z (espaço no fim da linha) em vez de -w (todos os espaços)"
          : "faltou -Z no diff para ignorar espaço no fim da linha";
      }
      if (expArgs.includes("-w") && !gotArgs.includes("-w")) {
        return "faltou -w no diff para ignorar todos os espaços";
      }
    }
    if (expCmd === "ulimit") {
      if (expArgs.length > gotArgs.length) {
        return "ulimit precisa de um valor após a flag (ex.: ulimit -s unlimited ou KB)";
      }
    }
    if (expCmd === "g++") {
      if (expArgs.includes("-O2") && !gotArgs.includes("-O2")) {
        return "faltou -O2 para compilar com otimização igual ao juiz";
      }
      if (expArgs.includes("-D_GLIBCXX_DEBUG") && !gotArgs.includes("-D_GLIBCXX_DEBUG")) {
        return "faltou -D_GLIBCXX_DEBUG para checar limites da STL";
      }
    }
    if (expCmd === "mkdir" && expArgs.includes("-p") && !gotArgs.includes("-p")) {
      return "faltou -p no mkdir para criar pastas intermediárias";
    }
    if (expCmd === "sort" && expArgs.includes("-n") && !gotArgs.includes("-n")) {
      return "faltou -n no sort para ordenar numericamente";
    }
    if (expCmd === "timeout") {
      return "verifique o tempo limite e o executável passado ao timeout";
    }
  }

  if (options?.hint !== undefined) return options.hint;

  if (typed.kind !== expected.kind) {
    const want = describeNode(expected);
    const got = describeNode(typed);
    if (want !== got) return `esperado ${want}, mas você usou ${got}`;
  }

  const inner = typed.kind !== "command" ? firstDifferingChildren(typed, expected) : null;
  if (inner !== null) return diagnoseMismatch(inner[0], inner[1], options);

  return "comando ou flags diferentes do esperado";
}

/** Checks a typed bash command against expected canonical/accepted forms (AC-2). */
export function checkShellCommand(typed: string, expected: ShellExpected): CheckResult {
  const parsedTyped = parseShell(typed);
  if (!parsedTyped.ok) {
    return { ok: false, reason: parsedTyped.error };
  }
  const normTyped = normalizeShell(parsedTyped.node, expected.options);

  let firstExpected: ShellNode | null = null;
  for (const cand of expected.accepted) {
    const parsedCand = parseShell(cand);
    if (!parsedCand.ok) continue;
    const normCand = normalizeShell(parsedCand.node, expected.options);
    firstExpected ??= normCand;
    if (nodesEqual(normTyped, normCand)) {
      return { ok: true };
    }
  }

  const reason =
    firstExpected !== null
      ? diagnoseMismatch(normTyped, firstExpected, expected.options)
      : "comando diferente do esperado";
  return { ok: false, reason };
}

/** Generates deterministic equivalent surface variants from a canonical command (AC-2, AC-4). */
export function equivalentForms(canonical: string, options?: CheckOptions): readonly string[] {
  const variants = new Set<string>();
  const add = (candidate: string) => {
    const trimmed = candidate.trim();
    if (trimmed !== canonical.trim()) {
      const check = checkShellCommand(trimmed, { accepted: [canonical], options });
      if (check.ok) variants.add(trimmed);
    }
  };

  // Long/short flag swaps
  const swaps: readonly (readonly [RegExp, string])[] = [
    [/\bdiff -Z\b/, "diff --ignore-trailing-space"],
    [/\bdiff -w\b/, "diff --ignore-all-space"],
    [/\bdiff -u\b/, "diff --unified"],
    [/\bcmp -s\b/, "cmp --silent"],
    [/\bmkdir -p\b/, "mkdir --parents"],
    [/\bls -la\b/, "ls -a -l"],
    [/\bls -lh\b/, "ls --human-readable -l"],
    [/\bcp -r\b/, "cp --recursive"],
    [/\brm -rf\b/, "rm -f -r"],
    [/\brm -f\b/, "rm --force"],
    [/\bwc -l\b/, "wc --lines"],
    [/\bsort -n\b/, "sort --numeric-sort"],
    [/\bsort -nr\b/, "sort -r -n"],
    [/\buniq -c\b/, "uniq --count"],
    [/\bgrep -n\b/, "grep --line-number"],
    [/\bhead -n (\d+)\b/, "head -$1"],
    [/\btail -n (\d+)\b/, "tail --lines=$1"],
    [/\btimeout (\d+) /, "timeout $1s "],
    [/^source /, ". "],
    [/\$\(seq 1 (\d+)\)/, "$(seq $1)"],
    [/\$\(seq 1 (\d+)\)/, "{1..$1}"],
    [/^while true;/, "while :;"],
    // Script forms (T54 AC-2, AC-5).
    [/"\$1"/, '"${1}"'],
    [/for \(\( i = 1; i <= (\d+); i\+\+ \)\)/, "for ((i=1; i<=$1; i++))"],
    [/^if (\[\[ .* \]\]); then /, "if $1\nthen "],
  ];

  for (const [re, rep] of swaps) {
    if (re.test(canonical)) {
      add(canonical.replace(re, rep));
    }
  }

  // g++ flag permutation & `-o bin` placement
  if (canonical.startsWith("g++ ")) {
    const parsed = parseShell(canonical);
    if (parsed.ok && parsed.node.kind === "command") {
      const args = parsed.node.words.slice(1).map(wordDisplay);
      const oIdx = args.indexOf("-o");
      if (oIdx >= 0 && oIdx + 1 < args.length) {
        const outPair = args.slice(oIdx, oIdx + 2);
        const rest = [...args.slice(0, oIdx), ...args.slice(oIdx + 2)].reverse();
        add(`g++ ${[...outPair, ...rest].join(" ")}`);
      }
      const sanIdx = args.findIndex((a) => a === "-fsanitize=address,undefined");
      if (sanIdx >= 0) {
        const swapped = [...args];
        swapped[sanIdx] = "-fsanitize=undefined,address";
        add(`g++ ${swapped.join(" ")}`);
      }
    }
  }

  // Redirection order/spacing swap (`./a < in > out` -> `./a >out <in`)
  const redirPair = /^(\S+)\s+<\s*(\S+)\s+>\s*(\S+)$/.exec(canonical);
  if (redirPair !== null) {
    add(`${redirPair[1]!} >${redirPair[3]!} <${redirPair[2]!}`);
  }
  const singleIn = /^(.+)\s+<\s*(\S+)$/.exec(canonical);
  if (singleIn !== null && !canonical.includes(">") && !canonical.includes("|")) {
    add(`${singleIn[1]!} <${singleIn[2]!}`);
  }
  if (canonical.includes(" > ") && canonical.endsWith(" 2>&1")) {
    add(canonical.replace(/ > (\S+) 2>&1$/, " &> $1"));
  }

  if (options?.allowSemicolon && canonical.includes(" && ")) {
    add(canonical.replaceAll(" && ", "; "));
  }

  return [...variants];
}
