export type Location =
  | { readonly kind: "line"; readonly file?: string; readonly line: number }
  | { readonly kind: "func"; readonly file?: string; readonly func: string };

export type GdbAction =
  | { readonly kind: "launch"; readonly program: string }
  | { readonly kind: "run"; readonly inputFile?: string }
  | { readonly kind: "start" }
  | { readonly kind: "kill" }
  | { readonly kind: "quit" }
  | {
      readonly kind: "break";
      readonly at: Location;
      readonly cond?: string;
      readonly temporary: boolean;
    }
  | { readonly kind: "condition"; readonly id: number; readonly cond: string }
  | { readonly kind: "ignore"; readonly id: number; readonly count: number }
  | { readonly kind: "info"; readonly topic: "breakpoints" | "locals" | "args" | "display" }
  | {
      readonly kind: "bp-op";
      readonly op: "delete" | "disable" | "enable";
      readonly ids: readonly number[];
    }
  | { readonly kind: "step"; readonly mode: "next" | "step"; readonly count: number }
  | { readonly kind: "continue"; readonly count: number }
  | { readonly kind: "finish" }
  | { readonly kind: "until"; readonly at?: Location }
  | { readonly kind: "advance"; readonly at: Location }
  | { readonly kind: "repeat" }
  | { readonly kind: "print"; readonly expr: string }
  | { readonly kind: "display"; readonly expr: string }
  | { readonly kind: "undisplay"; readonly ids: readonly number[] }
  | { readonly kind: "list"; readonly at?: Location }
  | { readonly kind: "backtrace"; readonly count?: number }
  | { readonly kind: "frame"; readonly index: number }
  | { readonly kind: "frame-shift"; readonly dir: "up" | "down"; readonly count: number }
  | {
      readonly kind: "watch";
      readonly mode: "watch" | "rwatch" | "awatch";
      readonly location: boolean;
      readonly expr: string;
    }
  | { readonly kind: "set-var"; readonly target: string; readonly expr: string }
  | { readonly kind: "call"; readonly expr: string }
  | { readonly kind: "catch"; readonly event: "throw" };

export type CommandEntry = {
  readonly key: string;
  readonly syntax: string;
  readonly aliases: readonly string[];
  readonly text: string;
};

export type ResolveResult =
  { readonly ok: true; readonly command: string } | { readonly ok: false; readonly error: string };

export type ParseResult =
  | { readonly ok: true; readonly action: GdbAction }
  | { readonly ok: false; readonly error: string };

/** Reference table of commands taught and drilled in T25 (one lesson per entry). */
export const COMMAND_TABLE: readonly CommandEntry[] = [
  { key: "gdb", syntax: "gdb ./sol", aliases: [], text: "abre o executável no gdb" },
  {
    key: "run",
    syntax: "run [< in.txt]",
    aliases: ["r"],
    text: "executa o programa desde o início",
  },
  { key: "start", syntax: "start", aliases: [], text: "inicia e para na entrada de main" },
  { key: "kill", syntax: "kill", aliases: ["k"], text: "encerra o processo atual sem sair do gdb" },
  { key: "quit", syntax: "quit", aliases: ["q", "exit"], text: "sai do gdb" },
  {
    key: "break",
    syntax: "break <alvo>",
    aliases: ["b", "br", "bre", "brea"],
    text: "cria ponto de parada em linha, função ou arquivo:linha",
  },
  {
    key: "tbreak",
    syntax: "tbreak <alvo>",
    aliases: ["tb"],
    text: "cria ponto de parada temporário (remove ao parar)",
  },
  {
    key: "info breakpoints",
    syntax: "info breakpoints",
    aliases: ["i b", "info b"],
    text: "lista os pontos de parada e vigias",
  },
  { key: "delete", syntax: "delete [N]", aliases: ["d", "del"], text: "apaga pontos de parada" },
  {
    key: "disable",
    syntax: "disable [N]",
    aliases: ["dis", "disa"],
    text: "desativa pontos de parada sem apagar",
  },
  { key: "enable", syntax: "enable [N]", aliases: ["en"], text: "reativa pontos de parada" },
  {
    key: "next",
    syntax: "next [N]",
    aliases: ["n"],
    text: "avança linha pulando chamadas de função",
  },
  { key: "step", syntax: "step [N]", aliases: ["s"], text: "avança entrando na função chamada" },
  {
    key: "continue",
    syntax: "continue [N]",
    aliases: ["c", "fg"],
    text: "retoma a execução até a próxima parada",
  },
  {
    key: "finish",
    syntax: "finish",
    aliases: ["fin"],
    text: "executa até a função atual retornar",
  },
  {
    key: "until",
    syntax: "until [linha]",
    aliases: ["u"],
    text: "avança até sair do laço ou chegar à linha no frame atual",
  },
  {
    key: "advance",
    syntax: "advance <alvo>",
    aliases: ["adv"],
    text: "continua até a linha ou função alvo (para se sair do frame)",
  },
  { key: "print", syntax: "print <expr>", aliases: ["p"], text: "avalia e imprime uma expressão" },
  {
    key: "display",
    syntax: "display <expr>",
    aliases: ["disp"],
    text: "imprime a expressão automaticamente a cada parada",
  },
  {
    key: "undisplay",
    syntax: "undisplay [N]",
    aliases: ["und"],
    text: "remove expressão da lista de display",
  },
  {
    key: "info locals",
    syntax: "info locals",
    aliases: ["i lo"],
    text: "mostra as variáveis locais do frame atual",
  },
  {
    key: "info args",
    syntax: "info args",
    aliases: ["i ar"],
    text: "mostra os argumentos da função no frame atual",
  },
  {
    key: "list",
    syntax: "list [alvo]",
    aliases: ["l"],
    text: "mostra o código-fonte ao redor da parada ou do alvo",
  },
  {
    key: "backtrace",
    syntax: "backtrace [N]",
    aliases: ["bt", "where"],
    text: "mostra a pilha de chamadas atual",
  },
  { key: "frame", syntax: "frame <N>", aliases: ["f"], text: "seleciona o frame N da pilha" },
  { key: "up", syntax: "up [N]", aliases: [], text: "sobe N frames em direção ao chamador" },
  {
    key: "down",
    syntax: "down [N]",
    aliases: ["do", "dow"],
    text: "desce N frames em direção à função chamada",
  },
  {
    key: "break if",
    syntax: "break <alvo> if <cond>",
    aliases: ["b <alvo> if <cond>"],
    text: "cria ponto de parada condicional",
  },
  {
    key: "condition",
    syntax: "condition <N> <cond>",
    aliases: ["cond"],
    text: "define ou troca a condição de um breakpoint existente",
  },
  {
    key: "ignore",
    syntax: "ignore <N> <cont>",
    aliases: ["ig"],
    text: "ignora as próximas cont passagens do breakpoint N",
  },
  {
    key: "watch",
    syntax: "watch <expr>",
    aliases: ["wa"],
    text: "para quando o valor de uma expressão mudar",
  },
  {
    key: "rwatch",
    syntax: "rwatch <expr>",
    aliases: ["rw"],
    text: "para quando a expressão for lida",
  },
  {
    key: "awatch",
    syntax: "awatch <expr>",
    aliases: ["aw"],
    text: "para quando a expressão for lida ou escrita",
  },
  {
    key: "watch -l",
    syntax: "watch -l <expr>",
    aliases: ["watch -location"],
    text: "vigia diretamente o endereço de memória da expressão",
  },
  {
    key: "set var",
    syntax: "set var <v> = <expr>",
    aliases: ["print <v> = <expr>"],
    text: "altera o valor de uma variável durante a parada",
  },
  {
    key: "call",
    syntax: "call <fn(...)>",
    aliases: ["cal"],
    text: "chama uma função do programa durante a parada",
  },
  {
    key: "catch throw",
    syntax: "catch throw",
    aliases: ["cat t"],
    text: "para assim que uma exceção C++ é lançada",
  },
];

/** Exact built-in aliases in GNU gdb 18.1 mapped to their canonical command. */
const ALIAS_TO_CANONICAL: Readonly<Record<string, string>> = {
  b: "break",
  br: "break",
  bre: "break",
  brea: "break",
  break: "break",
  tb: "tbreak",
  tbreak: "tbreak",
  c: "continue",
  fg: "continue",
  continue: "continue",
  n: "next",
  next: "next",
  s: "step",
  step: "step",
  fin: "finish",
  finish: "finish",
  u: "until",
  until: "until",
  advance: "advance",
  p: "print",
  inspect: "print",
  print: "print",
  display: "display",
  undisplay: "undisplay",
  l: "list",
  list: "list",
  bt: "backtrace",
  where: "backtrace",
  backtrace: "backtrace",
  f: "frame",
  frame: "frame",
  up: "up",
  do: "down",
  dow: "down",
  down: "down",
  i: "info",
  inf: "info",
  info: "info",
  d: "delete",
  del: "delete",
  delete: "delete",
  dis: "disable",
  disa: "disable",
  disable: "disable",
  en: "enable",
  enable: "enable",
  condition: "condition",
  ignore: "ignore",
  watch: "watch",
  rwatch: "rwatch",
  awatch: "awatch",
  set: "set",
  call: "call",
  catch: "catch",
  r: "run",
  run: "run",
  start: "start",
  k: "kill",
  kill: "kill",
  q: "quit",
  exit: "quit",
  quit: "quit",
};

/**
 * Top-level command vocabulary of GNU gdb 18.1 (used so unique-prefix
 * resolution and ambiguity messages match real gdb 18.1).
 */
const GDB_TOP_LEVEL_WORDS: readonly string[] = [
  "actions",
  "add-auto-load-safe-path",
  "add-auto-load-scripts-directory",
  "add-inferior",
  "add-symbol-file",
  "add-symbol-file-from-memory",
  "advance",
  "agent-printf",
  "alias",
  "append",
  "apropos",
  "attach",
  "awatch",
  "b",
  "backtrace",
  "bookmark",
  "br",
  "bre",
  "brea",
  "break",
  "break-range",
  "bt",
  "c",
  "call",
  "catch",
  "cd",
  "checkpoint",
  "cl",
  "clear",
  "clone-inferior",
  "collect",
  "commands",
  "compare-sections",
  "compile",
  "complete",
  "condition",
  "continue",
  "core-file",
  "d",
  "define",
  "define-prefix",
  "del",
  "delete",
  "demangle",
  "detach",
  "directory",
  "dis",
  "disa",
  "disable",
  "disassemble",
  "disconnect",
  "display",
  "do",
  "document",
  "dont-repeat",
  "dow",
  "down",
  "down-silently",
  "dprintf",
  "dump",
  "echo",
  "edit",
  "en",
  "enable",
  "end",
  "essential",
  "eval",
  "exec-file",
  "exit",
  "explore",
  "expression",
  "f",
  "faas",
  "fg",
  "file",
  "files",
  "fin",
  "find",
  "finish",
  "flash-erase",
  "fo",
  "focus",
  "forward-search",
  "frame",
  "fs",
  "ftrace",
  "function",
  "generate-core-file",
  "goto-bookmark",
  "gr",
  "gu",
  "guile",
  "guile-repl",
  "h",
  "handle",
  "hbreak",
  "help",
  "i",
  "if",
  "ignore",
  "inf",
  "inferior",
  "info",
  "init-if-undefined",
  "inspect",
  "internals",
  "interpreter-exec",
  "interrupt",
  "j",
  "jit-reader-load",
  "jit-reader-unload",
  "jump",
  "k",
  "kill",
  "l",
  "layout",
  "list",
  "load",
  "macro",
  "maintenance",
  "make",
  "mem",
  "memory-tag",
  "monitor",
  "mt",
  "n",
  "new-ui",
  "next",
  "nexti",
  "ni",
  "nosharedlibrary",
  "output",
  "ov",
  "overlay",
  "ovly",
  "p",
  "passcount",
  "path",
  "pi",
  "pipe",
  "po",
  "print",
  "print-object",
  "printf",
  "ptype",
  "pwd",
  "py",
  "python",
  "python-interactive",
  "q",
  "queue-signal",
  "quit",
  "r",
  "rbreak",
  "rc",
  "rec",
  "record",
  "refresh",
  "remote",
  "remove-inferiors",
  "remove-symbol-file",
  "restart",
  "restore",
  "return",
  "rev",
  "reverse-continue",
  "reverse-finish",
  "reverse-next",
  "reverse-nexti",
  "reverse-search",
  "reverse-step",
  "reverse-stepi",
  "rni",
  "rsi",
  "run",
  "rwatch",
  "s",
  "save",
  "search",
  "section",
  "select-frame",
  "set",
  "sharedlibrary",
  "shell",
  "show",
  "si",
  "signal",
  "skip",
  "source",
  "stack",
  "start",
  "starti",
  "status",
  "step",
  "stepi",
  "stepping",
  "stop",
  "strace",
  "symbol-file",
  "t",
  "taas",
  "target",
  "task",
  "tb",
  "tbreak",
  "tcatch",
  "tdump",
  "teval",
  "tfaas",
  "tfind",
  "thbreak",
  "thread",
  "tp",
  "tr",
  "tra",
  "trac",
  "trace",
  "tsave",
  "tstart",
  "tstatus",
  "tstop",
  "tty",
  "tui",
  "tvariable",
  "u",
  "undisplay",
  "unset",
  "until",
  "up",
  "up-silently",
  "update",
  "w",
  "watch",
  "wh",
  "whatis",
  "where",
  "while",
  "while-stepping",
  "winheight",
  "winwidth",
  "with",
  "ws",
  "x",
];

const GDB_INFO_WORDS: readonly string[] = [
  "address",
  "all-registers",
  "args",
  "auto-load",
  "auto-load-scripts",
  "auxv",
  "b",
  "bookmarks",
  "breakpoints",
  "checkpoints",
  "classes",
  "common",
  "connections",
  "copying",
  "dcache",
  "display",
  "dll",
  "exceptions",
  "extensions",
  "f",
  "files",
  "float",
  "frame",
  "frame-filter",
  "functions",
  "gu",
  "guile",
  "handle",
  "inferiors",
  "line",
  "linker-namespaces",
  "locals",
  "macro",
  "macros",
  "main",
  "mem",
  "missing-debug-handlers",
  "missing-objfile-handlers",
  "module",
  "modules",
  "os",
  "pretty-printer",
  "probes",
  "proc",
  "program",
  "r",
  "rec",
  "record",
  "registers",
  "rpm-suggestions",
  "scope",
  "selectors",
  "set",
  "sharedlibrary",
  "signals",
  "skip",
  "source",
  "sources",
  "stack",
  "static-tracepoint-markers",
  "symbol",
  "target",
  "tasks",
  "terminal",
  "threads",
  "tracepoints",
  "tvariables",
  "type-printers",
  "types",
  "unwinder",
  "variables",
  "vector",
  "vtbl",
  "warranty",
  "watchpoints",
  "win",
  "xmethod",
];

const GDB_SET_V_WORDS: readonly string[] = ["var", "variable", "varsize-limit", "verbose"];

const GDB_CATCH_WORDS: readonly string[] = [
  "assert",
  "catch",
  "exception",
  "exec",
  "fork",
  "handlers",
  "load",
  "rethrow",
  "signal",
  "syscall",
  "throw",
  "unload",
  "vfork",
];

function formatAmbiguous(kindLabel: string, word: string, matches: readonly string[]): string {
  const shown: string[] = [];
  let len = 0;
  let truncated = false;
  for (const m of matches) {
    if (shown.length >= 4 && len + m.length + 2 > 80) {
      truncated = true;
      break;
    }
    shown.push(m);
    len += m.length + 2;
  }
  const suffix = truncated ? "..." : ".";
  return `Ambiguous ${kindLabel} "${word}": ${shown.join(", ")}${suffix}`;
}

/** Resolves a top-level gdb command word using GNU gdb 18.1's exact prefix rules. */
export function resolveCommandName(word: string): ResolveResult {
  const exact = ALIAS_TO_CANONICAL[word];
  if (exact !== undefined) return { ok: true, command: exact };
  if (GDB_TOP_LEVEL_WORDS.includes(word)) return { ok: true, command: word };

  const matches = GDB_TOP_LEVEL_WORDS.filter((w) => w.startsWith(word));
  if (matches.length === 0) {
    return { ok: false, error: `Undefined command: "${word}".  Try "help".` };
  }
  if (matches.length === 1) {
    const only = matches[0] as string;
    return { ok: true, command: ALIAS_TO_CANONICAL[only] ?? only };
  }
  return { ok: false, error: formatAmbiguous("command", word, matches) };
}

function resolveSubcommand(
  parent: string,
  word: string,
  vocab: readonly string[],
  aliases: Readonly<Record<string, string>>,
): ResolveResult {
  const exact = aliases[word];
  if (exact !== undefined) return { ok: true, command: exact };
  if (vocab.includes(word)) return { ok: true, command: word };

  const matches = vocab.filter((w) => w.startsWith(word));
  if (matches.length === 0) {
    return { ok: false, error: `Undefined ${parent} command: "${word}".  Try "help ${parent}".` };
  }
  if (matches.length === 1) {
    const only = matches[0] as string;
    return { ok: true, command: aliases[only] ?? only };
  }
  return { ok: false, error: formatAmbiguous(`${parent} command`, word, matches) };
}

function stripOuterParens(raw: string): string {
  let s = raw.trim();
  while (s.startsWith("(") && s.endsWith(")")) {
    let depth = 0;
    let wrapsWhole = true;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "(") depth += 1;
      else if (s[i] === ")") depth -= 1;
      if (depth === 0 && i < s.length - 1) {
        wrapsWhole = false;
        break;
      }
    }
    if (!wrapsWhole) break;
    s = s.slice(1, -1).trim();
  }
  return s;
}

const TOKEN_RE = /==|!=|<=|>=|&&|\|\||->|::|<<|>>|\d+|[a-zA-Z_]\w*|[+\-*/%<>=!&|^~.,[\]():]/g;

function tokenizeExpr(expr: string): string[] | null {
  const trimmed = expr.trim();
  if (trimmed.length === 0) return null;
  const tokens: string[] = [];
  let pos = 0;
  for (const m of trimmed.matchAll(TOKEN_RE)) {
    const idx = m.index;
    if (trimmed.slice(pos, idx).trim().length > 0) return null;
    tokens.push(m[0]);
    pos = idx + m[0].length;
  }
  if (trimmed.slice(pos).trim().length > 0) return null;
  return tokens;
}

const BINARY_OPS = new Set([
  "==",
  "!=",
  "<",
  "<=",
  ">",
  ">=",
  "&&",
  "||",
  "+",
  "-",
  "*",
  "/",
  "%",
  "=",
  "&",
  "|",
  "^",
  "<<",
  ">>",
]);

const UNARY_PREFIX_PREV = new Set([
  "",
  "(",
  "[",
  ",",
  "==",
  "!=",
  "<",
  "<=",
  ">",
  ">=",
  "&&",
  "||",
  "+",
  "-",
  "*",
  "/",
  "%",
  "=",
  "!",
  "~",
  "&",
]);

function formatTokens(tokens: readonly string[]): string {
  let out = "";
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i] as string;
    const prev = i > 0 ? (tokens[i - 1] as string) : "";
    const isUnary =
      (tok === "-" || tok === "+" || tok === "*" || tok === "&" || tok === "!" || tok === "~") &&
      UNARY_PREFIX_PREV.has(prev);
    if (isUnary) {
      out += tok;
    } else if (BINARY_OPS.has(tok)) {
      out += ` ${tok} `;
    } else if (tok === ",") {
      out += ", ";
    } else {
      out += tok;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

function normalizeExpr(raw: string): string | null {
  const tokens = tokenizeExpr(stripOuterParens(raw));
  if (tokens === null || tokens.length === 0) return null;
  return formatTokens(tokens);
}

/** Finds index of a top-level (depth 0) operator in `tokens`, or -1. */
function findTopLevel(tokens: readonly string[], targets: ReadonlySet<string>): number {
  let depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i] as string;
    if (tok === "(" || tok === "[") depth += 1;
    else if (tok === ")" || tok === "]") depth -= 1;
    else if (depth === 0 && targets.has(tok)) return i;
  }
  return -1;
}

const COMPARE_OPS = new Set(["==", "!=", "<", "<=", ">", ">="]);

function normalizeSingleCondition(tokens: readonly string[]): string | null {
  if (tokens.length === 0) return null;

  const cmpIdx = findTopLevel(tokens, COMPARE_OPS);
  if (cmpIdx < 0) return formatTokens(tokens);
  if (cmpIdx === 0 || cmpIdx === tokens.length - 1) return null;

  const op = tokens[cmpIdx] as string;
  const lhs = normalizeExpr(formatTokens(tokens.slice(0, cmpIdx)));
  const rhs = normalizeExpr(formatTokens(tokens.slice(cmpIdx + 1)));
  if (lhs === null || rhs === null) return null;

  if (op === "==" || op === "!=") {
    return lhs <= rhs ? `${lhs} ${op} ${rhs}` : `${rhs} ${op} ${lhs}`;
  }
  if (op === ">") return `${rhs} < ${lhs}`;
  if (op === ">=") return `${rhs} <= ${lhs}`;
  return `${lhs} ${op} ${rhs}`;
}

/**
 * Normalizes a C++ boolean condition (used in `break … if` and `condition`).
 * Rejects bare `=` assignment inside conditions (T25 AC-2).
 */
export function normalizeCondition(raw: string): string | null {
  const stripped = stripOuterParens(raw);
  const tokens = tokenizeExpr(stripped);
  if (tokens === null || tokens.length === 0) return null;
  if (tokens.includes("=")) return null;

  const splitTop = (toks: readonly string[], sep: string): string[][] => {
    const parts: string[][] = [];
    let cur: string[] = [];
    let depth = 0;
    for (const t of toks) {
      if (t === "(" || t === "[") depth += 1;
      else if (t === ")" || t === "]") depth -= 1;
      if (depth === 0 && t === sep) {
        parts.push(cur);
        cur = [];
      } else {
        cur.push(t);
      }
    }
    parts.push(cur);
    return parts;
  };

  const orParts = splitTop(tokens, "||");
  const normOr: string[] = [];
  for (const orToks of orParts) {
    const unwrappedOr = tokenizeExpr(stripOuterParens(formatTokens(orToks)));
    if (unwrappedOr === null) return null;
    const andParts = splitTop(unwrappedOr, "&&");
    const normAnd: string[] = [];
    for (const part of andParts) {
      const inner = tokenizeExpr(stripOuterParens(formatTokens(part)));
      if (inner === null) return null;
      const norm = normalizeSingleCondition(inner);
      if (norm === null) return null;
      normAnd.push(norm);
    }
    normOr.push(normAnd.join(" && "));
  }
  return normOr.join(" || ");
}

function parsePositiveInt(token: string): number | null {
  if (!/^\d+$/.test(token)) return null;
  const n = Number(token);
  return Number.isSafeInteger(n) && n >= 1 ? n : null;
}

function parseNonNegativeInt(token: string): number | null {
  if (!/^\d+$/.test(token)) return null;
  const n = Number(token);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

function parseLocation(token: string): Location | null {
  const colonIdx = token.lastIndexOf(":");
  if (colonIdx > 0 && colonIdx < token.length - 1) {
    const file = token.slice(0, colonIdx);
    const target = token.slice(colonIdx + 1);
    if (!/^[\w./-]+$/.test(file)) return null;
    const line = parsePositiveInt(target);
    if (line !== null) return { kind: "line", file, line };
    const cleanFunc = target.replace(/\(\)$/, "");
    if (/^[a-zA-Z_]\w*$/.test(cleanFunc)) return { kind: "func", file, func: cleanFunc };
    return null;
  }
  const line = parsePositiveInt(token);
  if (line !== null) return { kind: "line", line };
  const cleanFunc = token.replace(/\(\)$/, "");
  if (/^[a-zA-Z_]\w*$/.test(cleanFunc)) return { kind: "func", func: cleanFunc };
  return null;
}

function parseIdList(tokens: readonly string[]): readonly number[] | null {
  const ids: number[] = [];
  for (const tok of tokens) {
    const n = parsePositiveInt(tok);
    if (n === null) return null;
    ids.push(n);
  }
  return ids;
}

function parseAssignment(raw: string): { target: string; expr: string } | null {
  const tokens = tokenizeExpr(raw);
  if (tokens === null) return null;
  const eqIdx = findTopLevel(tokens, new Set(["="]));
  if (eqIdx <= 0 || eqIdx === tokens.length - 1) return null;
  const target = formatTokens(tokens.slice(0, eqIdx));
  const expr = normalizeExpr(formatTokens(tokens.slice(eqIdx + 1)));
  if (expr === null) return null;
  return { target, expr };
}

function parseBreak(rest: string, temporary: boolean): ParseResult {
  const trimmed = rest.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Informe a linha ou função do ponto de parada." };
  }
  const ifMatch = /^(.*?)\s+if\s+(.+)$/.exec(trimmed);
  const locText = (ifMatch !== null ? (ifMatch[1] ?? "") : trimmed).trim();
  const at = parseLocation(locText);
  if (at === null) {
    return { ok: false, error: `Alvo inválido para breakpoint: "${locText}".` };
  }
  if (ifMatch !== null) {
    const condRaw = ifMatch[2] ?? "";
    const cond = normalizeCondition(condRaw);
    if (cond === null) {
      return {
        ok: false,
        error: condRaw.includes("=")
          ? "Condição inválida: use == para comparar em vez de =."
          : `Condição inválida: "${condRaw}".`,
      };
    }
    return { ok: true, action: { kind: "break", at, cond, temporary } };
  }
  return { ok: true, action: { kind: "break", at, temporary } };
}

function parseInfo(rest: string): ParseResult {
  const parts = rest.trim().split(/\s+/).filter(Boolean);
  const sub = parts[0];
  if (sub === undefined || parts.length > 1) {
    return { ok: false, error: "Informe o subcomando de info (ex.: breakpoints, locals, args)." };
  }
  const resolved = resolveSubcommand("info", sub, GDB_INFO_WORDS, {
    b: "breakpoints",
    breakpoints: "breakpoints",
    locals: "locals",
    args: "args",
    display: "display",
  });
  if (!resolved.ok) return resolved;
  const topic = resolved.command;
  if (topic === "breakpoints" || topic === "locals" || topic === "args" || topic === "display") {
    return { ok: true, action: { kind: "info", topic } };
  }
  return { ok: false, error: `Subcomando "info ${topic}" não faz parte deste treino.` };
}

function parseSet(rest: string): ParseResult {
  const trimmed = rest.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Use set var <variável> = <valor>." };
  }
  const parts = trimmed.split(/\s+/);
  const first = parts[0] as string;
  const afterFirst = trimmed.slice(first.length).trim();

  if (!first.includes("=") && afterFirst.length > 0 && !afterFirst.startsWith("=")) {
    if (first === "v" || first === "va") {
      const matches = GDB_SET_V_WORDS.filter((w) => w.startsWith(first));
      return { ok: false, error: formatAmbiguous("set command", first, matches) };
    }
    if (first === "var" || "variable".startsWith(first)) {
      const assigned = parseAssignment(afterFirst);
      if (assigned === null) {
        return { ok: false, error: "Atribuição inválida. Use: set var <variável> = <valor>." };
      }
      return { ok: true, action: { kind: "set-var", ...assigned } };
    }
  }

  const assigned = parseAssignment(trimmed);
  if (assigned !== null) {
    return { ok: true, action: { kind: "set-var", ...assigned } };
  }
  return { ok: false, error: "Atribuição inválida. Use: set var <variável> = <valor>." };
}

function parseWatch(mode: "watch" | "rwatch" | "awatch", rest: string): ParseResult {
  let body = rest.trim();
  let location = false;
  if (body.startsWith("-location ") || body.startsWith("-l ")) {
    location = true;
    body = body.replace(/^-l(?:ocation)?\s+/, "").trim();
  }
  const expr = normalizeExpr(body);
  if (expr === null) {
    return { ok: false, error: `Informe a expressão para ${mode}.` };
  }
  return { ok: true, action: { kind: "watch", mode, location, expr } };
}

/** Parses one gdb command line into a normalized `GdbAction`. */
export function parseCommand(text: string): ParseResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: true, action: { kind: "repeat" } };

  const spaceIdx = trimmed.search(/\s/);
  const head = spaceIdx < 0 ? trimmed : trimmed.slice(0, spaceIdx);
  const rest = spaceIdx < 0 ? "" : trimmed.slice(spaceIdx + 1).trim();

  if (head === "gdb") {
    const parts = rest.split(/\s+/).filter(Boolean);
    if (parts.length !== 1) return { ok: false, error: "Use: gdb ./<executável>." };
    const prog = (parts[0] as string).replace(/^\.\//, "");
    if (!/^[\w./-]+$/.test(prog)) return { ok: false, error: "Nome de executável inválido." };
    return { ok: true, action: { kind: "launch", program: prog } };
  }

  const resolved = resolveCommandName(head);
  if (!resolved.ok) return resolved;

  switch (resolved.command) {
    case "run": {
      if (rest.length === 0) return { ok: true, action: { kind: "run" } };
      const redir = /^<\s*([\w./-]+)$/.exec(rest);
      if (redir !== null) return { ok: true, action: { kind: "run", inputFile: redir[1] } };
      return { ok: false, error: "Formato inválido para run (ex.: run ou run < in.txt)." };
    }
    case "start":
      return rest.length === 0
        ? { ok: true, action: { kind: "start" } }
        : { ok: false, error: "start não recebe argumentos neste treino." };
    case "kill":
      return rest.length === 0
        ? { ok: true, action: { kind: "kill" } }
        : { ok: false, error: "kill não recebe argumentos." };
    case "quit":
      return rest.length === 0
        ? { ok: true, action: { kind: "quit" } }
        : { ok: false, error: "quit não recebe argumentos." };
    case "break":
      return parseBreak(rest, false);
    case "tbreak":
      return parseBreak(rest, true);
    case "info":
      return parseInfo(rest);
    case "delete":
    case "disable":
    case "enable": {
      const ids = rest.length === 0 ? [] : parseIdList(rest.split(/\s+/));
      if (ids === null) {
        return { ok: false, error: `Número de breakpoint inválido em ${resolved.command}.` };
      }
      return { ok: true, action: { kind: "bp-op", op: resolved.command, ids } };
    }
    case "condition": {
      const m = /^(\d+)\s+(.+)$/.exec(rest);
      if (m === null) return { ok: false, error: "Use: condition <N> <condição>." };
      const id = parsePositiveInt(m[1] as string);
      const condRaw = m[2] as string;
      const cond = normalizeCondition(condRaw);
      if (id === null || cond === null) {
        return {
          ok: false,
          error: condRaw.includes("=")
            ? "Condição inválida: use == para comparar em vez de =."
            : "Use: condition <N> <condição>.",
        };
      }
      return { ok: true, action: { kind: "condition", id, cond } };
    }
    case "ignore": {
      const parts = rest.split(/\s+/).filter(Boolean);
      if (parts.length !== 2) return { ok: false, error: "Use: ignore <N> <contagem>." };
      const id = parsePositiveInt(parts[0] as string);
      const count = parseNonNegativeInt(parts[1] as string);
      if (id === null || count === null) {
        return { ok: false, error: "Use números válidos em ignore <N> <contagem>." };
      }
      return { ok: true, action: { kind: "ignore", id, count } };
    }
    case "next":
    case "step": {
      if (rest.length === 0) {
        return { ok: true, action: { kind: "step", mode: resolved.command, count: 1 } };
      }
      const count = parsePositiveInt(rest);
      if (count === null) {
        return { ok: false, error: `Contagem inválida para ${resolved.command}.` };
      }
      return { ok: true, action: { kind: "step", mode: resolved.command, count } };
    }
    case "continue": {
      if (rest.length === 0) return { ok: true, action: { kind: "continue", count: 1 } };
      const count = parsePositiveInt(rest);
      if (count === null) return { ok: false, error: "Contagem inválida para continue." };
      return { ok: true, action: { kind: "continue", count } };
    }
    case "finish":
      return rest.length === 0
        ? { ok: true, action: { kind: "finish" } }
        : { ok: false, error: "finish não recebe argumentos." };
    case "until": {
      if (rest.length === 0) return { ok: true, action: { kind: "until" } };
      const at = parseLocation(rest);
      return at !== null
        ? { ok: true, action: { kind: "until", at } }
        : { ok: false, error: `Alvo inválido para until: "${rest}".` };
    }
    case "advance": {
      const at = parseLocation(rest);
      return at !== null
        ? { ok: true, action: { kind: "advance", at } }
        : { ok: false, error: "Informe a linha ou função para advance." };
    }
    case "print": {
      const assigned = parseAssignment(rest);
      if (assigned !== null) {
        return { ok: true, action: { kind: "set-var", ...assigned } };
      }
      const expr = normalizeExpr(rest);
      return expr !== null
        ? { ok: true, action: { kind: "print", expr } }
        : { ok: false, error: "Informe uma expressão válida para print." };
    }
    case "display": {
      const expr = normalizeExpr(rest);
      return expr !== null
        ? { ok: true, action: { kind: "display", expr } }
        : { ok: false, error: "Informe uma expressão válida para display." };
    }
    case "undisplay": {
      const ids = rest.length === 0 ? [] : parseIdList(rest.split(/\s+/));
      if (ids === null) return { ok: false, error: "Número de display inválido." };
      return { ok: true, action: { kind: "undisplay", ids } };
    }
    case "list": {
      if (rest.length === 0) return { ok: true, action: { kind: "list" } };
      const at = parseLocation(rest);
      return at !== null
        ? { ok: true, action: { kind: "list", at } }
        : { ok: false, error: `Alvo inválido para list: "${rest}".` };
    }
    case "backtrace": {
      if (rest.length === 0) return { ok: true, action: { kind: "backtrace" } };
      const count = parsePositiveInt(rest);
      return count !== null
        ? { ok: true, action: { kind: "backtrace", count } }
        : { ok: false, error: "Contagem inválida para backtrace." };
    }
    case "frame": {
      const index = parseNonNegativeInt(rest);
      return index !== null
        ? { ok: true, action: { kind: "frame", index } }
        : { ok: false, error: "Informe o número do frame (0, 1, 2...)." };
    }
    case "up":
    case "down": {
      if (rest.length === 0) {
        return { ok: true, action: { kind: "frame-shift", dir: resolved.command, count: 1 } };
      }
      const count = parsePositiveInt(rest);
      return count !== null
        ? { ok: true, action: { kind: "frame-shift", dir: resolved.command, count } }
        : { ok: false, error: `Contagem inválida para ${resolved.command}.` };
    }
    case "watch":
    case "rwatch":
    case "awatch":
      return parseWatch(resolved.command, rest);
    case "set":
      return parseSet(rest);
    case "call": {
      const expr = normalizeExpr(rest);
      return expr !== null
        ? { ok: true, action: { kind: "call", expr } }
        : { ok: false, error: "Informe a chamada de função para call." };
    }
    case "catch": {
      const parts = rest.split(/\s+/).filter(Boolean);
      const sub = parts[0];
      if (sub === undefined || parts.length > 1) {
        return { ok: false, error: "Use: catch throw." };
      }
      const subRes = resolveSubcommand("catch", sub, GDB_CATCH_WORDS, {});
      if (!subRes.ok) return subRes;
      if (subRes.command === "throw") {
        return { ok: true, action: { kind: "catch", event: "throw" } };
      }
      return {
        ok: false,
        error: `Subcomando "catch ${subRes.command}" não faz parte deste treino.`,
      };
    }
    default:
      return {
        ok: false,
        error: `Comando "${resolved.command}" existe no gdb, mas não é o esperado aqui.`,
      };
  }
}
