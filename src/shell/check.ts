import {
  formatShell,
  parseShell,
  wordDisplay,
  wordText,
  type ListOp,
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

function normalizeWord(word: Word, options?: CheckOptions): Word {
  return {
    parts: word.parts.map((part): WordPart => {
      if (part.type === "cmdsub") {
        return { type: "cmdsub", node: normalizeShell(part.node, options) };
      }
      if (part.type === "procsub") {
        return { type: "procsub", dir: "<", node: normalizeShell(part.node, options) };
      }
      return part;
    }),
  };
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
        return normalizeWord(item, options);
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
    case "until":
    case "case":
    case "forarith":
    case "test":
    case "arith":
    case "group":
    case "redirect":
      throw new Error("todo");
  }
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
    const expHasAnd = expected.rest.some((r) => r.op === "&&");
    const gotHasSemi = typed.rest.some((r) => r.op === ";");
    if (expHasAnd && gotHasSemi) {
      return "use && no lugar de ; para só continuar se o comando anterior der certo";
    }
  }

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

  return options?.hint ?? "comando ou flags diferentes do esperado";
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
