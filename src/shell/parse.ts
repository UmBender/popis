export type RedirOp = "<" | ">" | ">>" | "2>" | "2>&1" | "&>";

export type Redirection =
  { readonly op: "2>&1" } | { readonly op: Exclude<RedirOp, "2>&1">; readonly target: Word };

export type ArithBinaryOp =
  "||" | "&&" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "+" | "-" | "*" | "/" | "%";

export type ArithAssignOp = "=" | "+=" | "-=" | "*=" | "/=" | "%=";

/** Integer arithmetic of `$(( … ))`, `(( … ))` and `for (( … ))` (T54 AC-1). */
export type ArithExpr =
  | { readonly type: "num"; readonly value: number }
  /** A variable; `$n` and `n` are the same name, positional and special names keep no `$`. */
  | { readonly type: "name"; readonly name: string }
  | { readonly type: "unary"; readonly op: "-" | "!"; readonly arg: ArithExpr }
  | {
      readonly type: "binary";
      readonly op: ArithBinaryOp;
      readonly left: ArithExpr;
      readonly right: ArithExpr;
    }
  | {
      readonly type: "assign";
      readonly op: ArithAssignOp;
      readonly name: string;
      readonly value: ArithExpr;
    }
  | {
      readonly type: "incdec";
      readonly op: "++" | "--";
      readonly prefix: boolean;
      readonly name: string;
    };

export type VarPart = {
  readonly type: "var";
  readonly name: string;
  /** Value of `${name:-fallback}` when the variable is unset or empty. */
  readonly fallback?: string;
};

/** A part that may appear inside double quotes. */
export type DqPart =
  | { readonly type: "text"; readonly value: string }
  | VarPart
  | { readonly type: "cmdsub"; readonly node: ShellNode }
  | { readonly type: "arith"; readonly expr: ArithExpr };

export type WordPart =
  | DqPart
  | { readonly type: "procsub"; readonly dir: "<"; readonly node: ShellNode }
  /** Double quotes around at least one expansion; quotes around text only stay text. */
  | { readonly type: "dq"; readonly parts: readonly DqPart[] };

export type Word = {
  readonly parts: readonly WordPart[];
};

export type SimpleCommand = {
  readonly kind: "command";
  readonly words: readonly Word[];
  readonly redirs: readonly Redirection[];
};

export type PipelineNode = {
  readonly kind: "pipeline";
  readonly stages: readonly ShellNode[];
};

export type ListOp = "&&" | "||" | ";";

export type ListNode = {
  readonly kind: "list";
  readonly first: ShellNode;
  readonly rest: readonly { readonly op: ListOp; readonly node: ShellNode }[];
};

export type ForNode = {
  readonly kind: "for";
  readonly variable: string;
  readonly items: readonly Word[];
  readonly body: ShellNode;
};

export type WhileNode = {
  readonly kind: "while";
  readonly condition: ShellNode;
  readonly body: ShellNode;
};

export type FuncDefNode = {
  readonly kind: "funcdef";
  readonly name: string;
  readonly body: ShellNode;
};

export type TestUnaryOp = "-f" | "-d" | "-e" | "-s" | "-x" | "-z" | "-n";
export type TestBinaryOp = "==" | "!=" | "<" | ">" | "-eq" | "-ne" | "-lt" | "-le" | "-gt" | "-ge";

/** Expression inside `[[ … ]]`; `=` reads as `==` and a bare word as `-n word`. */
export type TestExpr =
  | { readonly type: "unary"; readonly op: TestUnaryOp; readonly arg: Word }
  | {
      readonly type: "binary";
      readonly op: TestBinaryOp;
      readonly left: Word;
      readonly right: Word;
    }
  | { readonly type: "not"; readonly expr: TestExpr }
  | { readonly type: "and" | "or"; readonly left: TestExpr; readonly right: TestExpr };

export type IfNode = {
  readonly kind: "if";
  readonly branches: readonly { readonly condition: ShellNode; readonly body: ShellNode }[];
  readonly elseBody: ShellNode | null;
};

export type UntilNode = {
  readonly kind: "until";
  readonly condition: ShellNode;
  readonly body: ShellNode;
};

export type CaseArm = {
  readonly patterns: readonly Word[];
  readonly body: ShellNode | null;
};

export type CaseNode = {
  readonly kind: "case";
  readonly word: Word;
  readonly arms: readonly CaseArm[];
};

export type ArithForNode = {
  readonly kind: "forarith";
  readonly init: ArithExpr | null;
  readonly condition: ArithExpr | null;
  readonly step: ArithExpr | null;
  readonly body: ShellNode;
};

export type TestNode = { readonly kind: "test"; readonly expr: TestExpr };
export type ArithNode = { readonly kind: "arith"; readonly expr: ArithExpr };
export type GroupNode = { readonly kind: "group"; readonly body: ShellNode };

/** A compound command with redirections, as in `done < in1`. */
export type RedirectNode = {
  readonly kind: "redirect";
  readonly body: ShellNode;
  readonly redirs: readonly Redirection[];
};

export type ShellNode =
  | SimpleCommand
  | PipelineNode
  | ListNode
  | ForNode
  | WhileNode
  | FuncDefNode
  | IfNode
  | UntilNode
  | CaseNode
  | ArithForNode
  | TestNode
  | ArithNode
  | GroupNode
  | RedirectNode;

export type ParseResult =
  { readonly ok: true; readonly node: ShellNode } | { readonly ok: false; readonly error: string };

/** Keywords outside the subset (ADR-T39-1, ADR-T54-1). */
const UNSUPPORTED_KEYWORDS = new Set(["select"]);
/** Builtins outside the subset when they start a command (ADR-T54-1). */
const UNSUPPORTED_COMMANDS = new Set(["select", "trap", "getopts", "eval"]);
/** Words that close a block; after `;` or a newline they end the current list. */
const CLOSERS = new Set(["then", "do", "done", "fi", "elif", "else", "esac", "}"]);
const RESERVED_WORDS = new Set([
  "for",
  "while",
  "do",
  "done",
  "in",
  "case",
  "esac",
  "if",
  "then",
  "else",
  "elif",
  "fi",
  "until",
  "select",
  "[[",
  "]]",
  "{",
  "}",
  "trap",
  "getopts",
  "eval",
]);

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SAFE_UNQUOTED_RE = /^[A-Za-z0-9_./+:=,@~!*-]+$/;
const SPECIAL_VARS = new Set(["#", "@", "?"]);

const TEST_UNARY_OPS: ReadonlySet<string> = new Set(["-f", "-d", "-e", "-s", "-x", "-z", "-n"]);
const TEST_BINARY_WORD_OPS: ReadonlySet<string> = new Set([
  "==",
  "=",
  "!=",
  "-eq",
  "-ne",
  "-lt",
  "-le",
  "-gt",
  "-ge",
]);
/** Plain words that `[[ ]]` reads as operators, so operands with this text must be quoted. */
const TEST_TOKENS: ReadonlySet<string> = new Set([
  ...TEST_UNARY_OPS,
  ...TEST_BINARY_WORD_OPS,
  "!",
  "(",
  ")",
  "&&",
  "||",
  "<",
  ">",
  "]]",
]);

class ParseFailure extends Error {
  constructor(message: string) {
    super(message);
  }
}

type WordToken = {
  readonly word: Word;
  readonly quoted: boolean;
  readonly plainText: string | null;
};

function pushText<T extends { readonly type: string }>(parts: (T | DqPart)[], value: string): void {
  if (value.length === 0) return;
  const last = parts[parts.length - 1];
  if (last !== undefined && last.type === "text") {
    parts[parts.length - 1] = {
      type: "text",
      value: (last as { readonly value: string }).value + value,
    };
  } else {
    parts.push({ type: "text", value });
  }
}

function isSpace(ch: string | undefined): boolean {
  return ch === " " || ch === "\t" || ch === "\r";
}

function isWordStop(src: string, pos: number): boolean {
  const ch = src[pos];
  if (ch === undefined || isSpace(ch) || ch === "\n") return true;
  if (ch === "|" || ch === "&" || ch === ";" || ch === ">" || ch === ")") return true;
  if (ch === "<") return src[pos + 1] !== "(";
  if (ch === "(") return true;
  return false;
}

function isSpecialName(name: string): boolean {
  return /^\d+$/.test(name) || SPECIAL_VARS.has(name);
}

// ---------------------------------------------------------------------------
// Arithmetic (`$(( … ))`, `(( … ))`, `for (( … ))`)
// ---------------------------------------------------------------------------

type ArithToken =
  | { readonly t: "num"; readonly v: number }
  | { readonly t: "name"; readonly v: string }
  | { readonly t: "op"; readonly v: string };

const ARITH_TWO = ["++", "--", "+=", "-=", "*=", "/=", "%=", "||", "&&", "==", "!=", "<=", ">="];
const ARITH_ONE = "+-*/%<>!=()";
const ARITH_PREC: Readonly<Record<ArithBinaryOp, number>> = {
  "||": 1,
  "&&": 2,
  "==": 3,
  "!=": 3,
  "<": 4,
  "<=": 4,
  ">": 4,
  ">=": 4,
  "+": 5,
  "-": 5,
  "*": 6,
  "/": 6,
  "%": 6,
};
const ASSIGN_OPS: ReadonlySet<string> = new Set(["=", "+=", "-=", "*=", "/=", "%="]);

function arithError(detail: string): ParseFailure {
  return new ParseFailure(`expressão aritmética inválida: ${detail}`);
}

function tokenizeArith(src: string): ArithToken[] {
  const tokens: ArithToken[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (isSpace(ch) || ch === "\n") {
      i += 1;
    } else if (/[0-9]/.test(ch)) {
      const m = /^\d+/.exec(src.slice(i))![0];
      tokens.push({ t: "num", v: Number(m) });
      i += m.length;
    } else if (ch === "$") {
      const rest = src.slice(i + 1);
      const m =
        /^\{([A-Za-z_][A-Za-z0-9_]*|\d+|[#?])\}/.exec(rest) ??
        /^([A-Za-z_][A-Za-z0-9_]*|\d|[#?])/.exec(rest);
      if (m === null) throw arithError(`perto de ${src.slice(i, i + 6)}`);
      tokens.push({ t: "name", v: m[1]! });
      i += 1 + m[0].length;
    } else if (/[A-Za-z_]/.test(ch)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))![0];
      tokens.push({ t: "name", v: m });
      i += m.length;
    } else {
      const two = src.slice(i, i + 2);
      if (ARITH_TWO.includes(two)) {
        tokens.push({ t: "op", v: two });
        i += 2;
      } else if (ARITH_ONE.includes(ch)) {
        tokens.push({ t: "op", v: ch });
        i += 1;
      } else {
        throw arithError(`perto de ${src.slice(i, i + 6)}`);
      }
    }
  }
  return tokens;
}

class ArithParser {
  readonly tokens: readonly ArithToken[];
  i = 0;

  constructor(tokens: readonly ArithToken[]) {
    this.tokens = tokens;
  }

  peek(): ArithToken | undefined {
    return this.tokens[this.i];
  }

  isOp(v: string, offset = 0): boolean {
    const tok = this.tokens[this.i + offset];
    return tok?.t === "op" && tok.v === v;
  }

  parseAssign(): ArithExpr {
    const tok = this.peek();
    const next = this.tokens[this.i + 1];
    if (tok?.t === "name" && next?.t === "op" && ASSIGN_OPS.has(next.v)) {
      this.i += 2;
      return {
        type: "assign",
        op: next.v as ArithAssignOp,
        name: tok.v,
        value: this.parseAssign(),
      };
    }
    return this.parseBinary(1);
  }

  parseBinary(minPrec: number): ArithExpr {
    let left = this.parseUnary();
    while (true) {
      const tok = this.peek();
      if (tok?.t !== "op" || !(tok.v in ARITH_PREC)) break;
      const op = tok.v as ArithBinaryOp;
      const prec = ARITH_PREC[op];
      if (prec < minPrec) break;
      this.i += 1;
      const right = this.parseBinary(prec + 1);
      left = { type: "binary", op, left, right };
    }
    return left;
  }

  parseUnary(): ArithExpr {
    const tok = this.peek();
    if (tok?.t === "op" && (tok.v === "-" || tok.v === "!")) {
      this.i += 1;
      return { type: "unary", op: tok.v, arg: this.parseUnary() };
    }
    if (tok?.t === "op" && (tok.v === "++" || tok.v === "--")) {
      const name = this.tokens[this.i + 1];
      if (name?.t !== "name") throw arithError(`${tok.v} precisa de uma variável`);
      this.i += 2;
      return { type: "incdec", op: tok.v, prefix: true, name: name.v };
    }
    const primary = this.parsePrimary();
    if (primary.type === "name" && (this.isOp("++") || this.isOp("--"))) {
      const op = (this.peek() as { readonly v: "++" | "--" }).v;
      this.i += 1;
      return { type: "incdec", op, prefix: false, name: primary.name };
    }
    return primary;
  }

  parsePrimary(): ArithExpr {
    const tok = this.peek();
    if (tok === undefined) throw arithError("faltou um valor no fim da conta");
    this.i += 1;
    if (tok.t === "num") return { type: "num", value: tok.v };
    if (tok.t === "name") return { type: "name", name: tok.v };
    if (tok.v === "(") {
      const inner = this.parseAssign();
      if (!this.isOp(")")) throw arithError("faltou )");
      this.i += 1;
      return inner;
    }
    throw arithError(`${tok.v} inesperado`);
  }
}

function parseArith(src: string): ArithExpr {
  const tokens = tokenizeArith(src);
  if (tokens.length === 0) throw arithError("conta vazia");
  const parser = new ArithParser(tokens);
  const expr = parser.parseAssign();
  const rest = parser.peek();
  if (rest !== undefined) {
    throw arithError(`${rest.t === "op" ? rest.v : String(rest.v)} inesperado`);
  }
  return expr;
}

function arithPrec(expr: ArithExpr): number {
  switch (expr.type) {
    case "assign":
      return 0;
    case "binary":
      return ARITH_PREC[expr.op];
    case "unary":
      return 7;
    default:
      return 8;
  }
}

/** Formats an arithmetic expression with the fewest parentheses that keep its tree (T54 AC-1). */
export function formatArith(expr: ArithExpr): string {
  switch (expr.type) {
    case "num":
      return String(expr.value);
    case "name":
      return isSpecialName(expr.name) ? `$${expr.name}` : expr.name;
    case "unary": {
      const arg = formatArith(expr.arg);
      const simple = expr.arg.type === "num" || expr.arg.type === "name";
      return simple ? `${expr.op}${arg}` : `${expr.op}(${arg})`;
    }
    case "binary": {
      const prec = ARITH_PREC[expr.op];
      const l = formatArith(expr.left);
      const r = formatArith(expr.right);
      const left = arithPrec(expr.left) < prec ? `(${l})` : l;
      const right = arithPrec(expr.right) <= prec ? `(${r})` : r;
      return `${left} ${expr.op} ${right}`;
    }
    case "assign":
      return `${expr.name} ${expr.op} ${formatArith(expr.value)}`;
    case "incdec":
      return expr.prefix ? `${expr.op}${expr.name}` : `${expr.name}${expr.op}`;
  }
}

// ---------------------------------------------------------------------------
// Shell parser
// ---------------------------------------------------------------------------

class Parser {
  readonly src: string;
  pos = 0;

  constructor(src: string) {
    this.src = src;
  }

  atWordStart(pos: number): boolean {
    const prev = this.src[pos - 1];
    return prev === undefined || isSpace(prev) || "\n;&|()".includes(prev);
  }

  /** Skips spaces, tabs and a `#` comment up to (not including) the newline. */
  skipSpaces(): void {
    while (true) {
      while (isSpace(this.src[this.pos])) this.pos += 1;
      if (this.src[this.pos] === "#" && this.atWordStart(this.pos)) {
        while (this.pos < this.src.length && this.src[this.pos] !== "\n") this.pos += 1;
      } else {
        return;
      }
    }
  }

  /** Skips spaces, comments and newlines (where bash allows a line break). */
  skipBlank(): void {
    while (true) {
      this.skipSpaces();
      if (this.src[this.pos] === "\n") this.pos += 1;
      else return;
    }
  }

  peekChar(): string | undefined {
    return this.src[this.pos];
  }

  startsWith(s: string): boolean {
    return this.src.startsWith(s, this.pos);
  }

  peekUnquotedWord(): string | null {
    const saved = this.pos;
    this.skipSpaces();
    const start = this.pos;
    while (this.pos < this.src.length && !isWordStop(this.src, this.pos)) {
      const ch = this.src[this.pos]!;
      if (ch === "'" || ch === '"' || ch === "\\" || ch === "$" || ch === "`") {
        this.pos = saved;
        return null;
      }
      this.pos += 1;
    }
    const text = this.src.slice(start, this.pos);
    this.pos = saved;
    return text.length > 0 ? text : null;
  }

  expectKeyword(kw: string, message: string): void {
    this.skipSpaces();
    if (this.peekUnquotedWord() !== kw) throw new ParseFailure(message);
    this.skipSpaces();
    this.pos += kw.length;
  }

  parseList(stopWords: ReadonlySet<string>, stopParen: boolean): ShellNode {
    this.skipBlank();
    const first = this.parsePipeline(stopWords, stopParen);
    const rest: { readonly op: ListOp; readonly node: ShellNode }[] = [];

    while (true) {
      this.skipSpaces();
      if (this.pos >= this.src.length) break;
      if (stopParen && this.peekChar() === ")") break;
      if (this.startsWith(";;")) break;

      let op: ListOp;
      if (this.startsWith("&&")) {
        op = "&&";
        this.pos += 2;
      } else if (this.startsWith("||")) {
        op = "||";
        this.pos += 2;
      } else if (this.peekChar() === ";" || this.peekChar() === "\n") {
        op = ";";
        this.pos += 1;
      } else if (this.peekChar() === "&" && !this.startsWith("&>")) {
        throw new ParseFailure("o treino não entende execução em segundo plano (&)");
      } else {
        break;
      }

      this.skipBlank();
      if (op === ";") {
        if (this.pos >= this.src.length) break;
        if (stopParen && this.peekChar() === ")") break;
        if (this.startsWith(";;")) break;
        const kw = this.peekUnquotedWord();
        if (kw !== null && (stopWords.has(kw) || CLOSERS.has(kw))) break;
      }

      const next = this.parsePipeline(stopWords, stopParen);
      rest.push({ op, node: next });
    }

    return rest.length === 0 ? first : { kind: "list", first, rest };
  }

  parsePipeline(stopWords: ReadonlySet<string>, stopParen: boolean): ShellNode {
    this.skipSpaces();
    const first = this.parseStage(stopWords, stopParen);
    const stages: ShellNode[] = [first];

    while (true) {
      this.skipSpaces();
      if (this.peekChar() === "|" && !this.startsWith("||")) {
        this.pos += 1;
        this.skipBlank();
        stages.push(this.parseStage(stopWords, stopParen));
      } else {
        break;
      }
    }

    return stages.length === 1 ? first : { kind: "pipeline", stages };
  }

  parseStage(stopWords: ReadonlySet<string>, stopParen: boolean): ShellNode {
    this.skipSpaces();
    if (this.pos >= this.src.length) {
      throw new ParseFailure("esperado um comando");
    }
    if (this.startsWith("((")) {
      return { kind: "arith", expr: parseArith(this.readArithInner()) };
    }
    if (this.startsWith("<<<")) {
      throw new ParseFailure("o treino não entende here-string (<<<)");
    }
    if (this.startsWith("<<")) {
      throw new ParseFailure("o treino não entende here-doc (<<)");
    }
    if (this.startsWith("[[") && !isWordStop(this.src, this.pos + 2)) {
      throw new ParseFailure("coloque espaço depois de [[ e antes de ]]");
    }

    const kw = this.peekUnquotedWord();
    if (kw !== null) {
      if (stopWords.has(kw)) {
        throw new ParseFailure(`esperado um comando antes de ${kw}`);
      }
      if (UNSUPPORTED_KEYWORDS.has(kw)) {
        throw new ParseFailure(`o treino não entende ${kw}`);
      }
      switch (kw) {
        case "for":
          return this.withRedirs(this.parseFor());
        case "while":
        case "until":
          return this.withRedirs(this.parseLoop(kw));
        case "if":
          return this.withRedirs(this.parseIf());
        case "case":
          return this.withRedirs(this.parseCase());
        case "{":
          return this.withRedirs(this.parseGroup());
        case "[[":
          return this.parseTest();
      }
    }

    // Function definition: `name() { body; }`
    if (kw !== null && IDENT_RE.test(kw)) {
      const saved = this.pos;
      this.pos += kw.length;
      this.skipSpaces();
      if (this.startsWith("()")) {
        this.pos += 2;
        return this.parseFuncBody(kw);
      }
      this.pos = saved;
    }

    return this.parseSimpleCommand(stopWords, stopParen);
  }

  /** Wraps a compound command in a redirect node when redirections follow it (`done < in1`). */
  withRedirs(node: ShellNode): ShellNode {
    const redirs: Redirection[] = [];
    while (true) {
      this.skipSpaces();
      if (this.startsWith("<<")) break;
      const redir = this.tryReadRedir();
      if (redir === null) break;
      redirs.push(redir);
    }
    return redirs.length === 0 ? node : { kind: "redirect", body: node, redirs };
  }

  /** Reads `(( … ))` at the current position and returns the text between the parentheses. */
  readArithInner(): string {
    this.pos += 2; // consume ((
    const start = this.pos;
    let depth = 0;
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos]!;
      if (ch === "(") {
        depth += 1;
      } else if (ch === ")") {
        if (depth === 0) {
          if (this.src[this.pos + 1] !== ")") break;
          const inner = this.src.slice(start, this.pos);
          this.pos += 2;
          return inner;
        }
        depth -= 1;
      }
      this.pos += 1;
    }
    throw new ParseFailure("faltou )) para fechar a conta");
  }

  parseFor(): ShellNode {
    this.pos += 3; // consume "for"
    this.skipSpaces();
    if (this.startsWith("((")) return this.parseArithFor();
    const varName = this.peekUnquotedWord();
    if (varName === null || !IDENT_RE.test(varName)) {
      throw new ParseFailure("esperado nome de variável após for");
    }
    this.pos += varName.length;
    this.skipSpaces();
    if (this.peekUnquotedWord() !== "in") {
      throw new ParseFailure("esperado in no laço for");
    }
    this.pos += 2;

    const items: Word[] = [];
    while (true) {
      this.skipSpaces();
      if (this.pos >= this.src.length) {
        throw new ParseFailure("laço for incompleto: faltou ; do ...; done");
      }
      if (this.peekChar() === ";" || this.peekChar() === "\n") {
        this.pos += 1;
        break;
      }
      if (this.peekUnquotedWord() === "do") break;
      items.push(this.readWord().word);
    }
    if (items.length === 0) {
      throw new ParseFailure("esperada a lista de valores após in no laço for");
    }

    const body = this.parseDoDone("for");
    return { kind: "for", variable: varName, items, body };
  }

  parseArithFor(): ArithForNode {
    const parts = this.readArithInner().split(";");
    if (parts.length !== 3) {
      throw new ParseFailure("for (( )) precisa de três partes separadas por ;");
    }
    const [init, condition, step] = parts.map((p) =>
      p.trim().length === 0 ? null : parseArith(p),
    ) as [ArithExpr | null, ArithExpr | null, ArithExpr | null];
    this.skipSpaces();
    if (this.peekChar() === ";") this.pos += 1;
    const body = this.parseDoDone("for");
    return { kind: "forarith", init, condition, step, body };
  }

  /** Reads `do … done` after a loop header. */
  parseDoDone(loop: string): ShellNode {
    this.skipBlank();
    if (this.peekUnquotedWord() !== "do") {
      throw new ParseFailure(`faltou do no laço ${loop}`);
    }
    this.pos += 2;
    const body = this.parseList(new Set(["done"]), false);
    this.skipSpaces();
    if (this.peekUnquotedWord() !== "done") {
      throw new ParseFailure(`faltou done para fechar o laço ${loop}`);
    }
    this.skipSpaces();
    this.pos += 4;
    return body;
  }

  parseLoop(kw: "while" | "until"): WhileNode | UntilNode {
    this.pos += kw.length;
    const condition = this.parseList(new Set(["do"]), false);
    const body = this.parseDoDone(kw);
    return { kind: kw, condition, body };
  }

  parseIf(): IfNode {
    this.pos += 2; // consume "if"
    const branches: { readonly condition: ShellNode; readonly body: ShellNode }[] = [];
    let elseBody: ShellNode | null = null;
    while (true) {
      const condition = this.parseList(new Set(["then"]), false);
      this.expectKeyword("then", "faltou then no if");
      const body = this.parseList(new Set(["elif", "else", "fi"]), false);
      branches.push({ condition, body });
      this.skipSpaces();
      const kw = this.peekUnquotedWord();
      this.skipSpaces();
      if (kw === "elif") {
        this.pos += 4;
        continue;
      }
      if (kw === "else") {
        this.pos += 4;
        elseBody = this.parseList(new Set(["fi"]), false);
        this.expectKeyword("fi", "faltou fi para fechar o if");
        break;
      }
      if (kw === "fi") {
        this.pos += 2;
        break;
      }
      throw new ParseFailure("faltou fi para fechar o if");
    }
    return { kind: "if", branches, elseBody };
  }

  parseCase(): CaseNode {
    this.pos += 4; // consume "case"
    this.skipSpaces();
    if (this.pos >= this.src.length || isWordStop(this.src, this.pos)) {
      throw new ParseFailure("esperada a palavra do case");
    }
    const word = this.readWord().word;
    this.skipBlank();
    if (this.peekUnquotedWord() !== "in") throw new ParseFailure("faltou in no case");
    this.skipSpaces();
    this.pos += 2;

    const arms: CaseArm[] = [];
    while (true) {
      this.skipBlank();
      if (this.pos >= this.src.length) throw new ParseFailure("faltou esac para fechar o case");
      if (this.peekUnquotedWord() === "esac") {
        this.skipSpaces();
        this.pos += 4;
        break;
      }
      if (this.peekChar() === "(") this.pos += 1;
      const patterns: Word[] = [];
      while (true) {
        this.skipSpaces();
        if (this.pos >= this.src.length || isWordStop(this.src, this.pos)) {
          throw new ParseFailure("esperado um padrão antes de ) no case");
        }
        patterns.push(this.readWord().word);
        this.skipSpaces();
        if (this.peekChar() === "|") {
          this.pos += 1;
        } else if (this.peekChar() === ")") {
          this.pos += 1;
          break;
        } else {
          throw new ParseFailure("faltou ) depois do padrão do case");
        }
      }
      this.skipBlank();
      let body: ShellNode | null = null;
      if (!this.startsWith(";;") && this.peekUnquotedWord() !== "esac") {
        body = this.parseList(new Set(["esac"]), false);
        this.skipBlank();
      }
      if (this.startsWith(";;")) {
        this.pos += 2;
      } else if (this.peekUnquotedWord() !== "esac") {
        throw new ParseFailure("faltou ;; no fim da opção do case");
      }
      arms.push({ patterns, body });
    }
    return { kind: "case", word, arms };
  }

  parseGroup(): GroupNode {
    this.skipSpaces();
    this.pos += 1; // consume {
    const body = this.parseList(new Set(["}"]), false);
    this.skipSpaces();
    if (this.peekUnquotedWord() !== "}") {
      throw new ParseFailure("faltou } para fechar o grupo { }");
    }
    this.skipSpaces();
    this.pos += 1;
    return { kind: "group", body };
  }

  // --- [[ … ]] ---

  parseTest(): TestNode {
    this.skipSpaces();
    this.pos += 2; // consume [[
    if (this.atTestEnd()) throw new ParseFailure("teste [[ ]] vazio");
    const expr = this.parseTestOr();
    this.skipSpaces();
    if (!this.atTestEnd()) {
      throw new ParseFailure("faltou ]] (com espaço antes) para fechar o teste");
    }
    this.pos += 2;
    return { kind: "test", expr };
  }

  atTestEnd(): boolean {
    this.skipSpaces();
    return this.startsWith("]]") && isWordStop(this.src, this.pos + 2);
  }

  atTestOp(op: string): boolean {
    this.skipSpaces();
    if (!this.startsWith(op)) return false;
    if (op === "<" || op === ">") return !this.startsWith(`${op}(`);
    return true;
  }

  parseTestOr(): TestExpr {
    let left = this.parseTestAnd();
    while (this.atTestOp("||")) {
      this.pos += 2;
      left = { type: "or", left, right: this.parseTestAnd() };
    }
    return left;
  }

  parseTestAnd(): TestExpr {
    let left = this.parseTestNot();
    while (this.atTestOp("&&")) {
      this.pos += 2;
      left = { type: "and", left, right: this.parseTestNot() };
    }
    return left;
  }

  parseTestNot(): TestExpr {
    if (this.peekUnquotedWord() === "!") {
      this.skipSpaces();
      this.pos += 1;
      return { type: "not", expr: this.parseTestNot() };
    }
    return this.parseTestPrimary();
  }

  readTestOperand(): Word {
    this.skipSpaces();
    if (
      this.pos >= this.src.length ||
      this.atTestEnd() ||
      isWordStop(this.src, this.pos) ||
      this.startsWith("&&") ||
      this.startsWith("||")
    ) {
      throw new ParseFailure("faltou um valor no teste [[ ]]");
    }
    return this.readWord().word;
  }

  parseTestPrimary(): TestExpr {
    this.skipSpaces();
    if (this.peekChar() === "(") {
      this.pos += 1;
      const inner = this.parseTestOr();
      this.skipSpaces();
      if (this.peekChar() !== ")") throw new ParseFailure("faltou ) no teste [[ ]]");
      this.pos += 1;
      return inner;
    }
    const first = this.readTestWordToken();
    if (!first.quoted && first.plainText !== null && TEST_UNARY_OPS.has(first.plainText)) {
      return {
        type: "unary",
        op: first.plainText as TestUnaryOp,
        arg: this.readTestOperand(),
      };
    }
    this.skipSpaces();
    if (!this.atTestEnd() && (this.atTestOp("<") || this.atTestOp(">"))) {
      const op = this.peekChar() as "<" | ">";
      this.pos += 1;
      return { type: "binary", op, left: first.word, right: this.readTestOperand() };
    }
    const opWord = this.peekUnquotedWord();
    if (opWord !== null && TEST_BINARY_WORD_OPS.has(opWord) && !this.atTestEnd()) {
      this.skipSpaces();
      this.pos += opWord.length;
      const op = (opWord === "=" ? "==" : opWord) as TestBinaryOp;
      return { type: "binary", op, left: first.word, right: this.readTestOperand() };
    }
    return { type: "unary", op: "-n", arg: first.word };
  }

  readTestWordToken(): WordToken {
    this.skipSpaces();
    if (
      this.pos >= this.src.length ||
      this.atTestEnd() ||
      isWordStop(this.src, this.pos) ||
      this.startsWith("&&") ||
      this.startsWith("||")
    ) {
      throw new ParseFailure("faltou um valor no teste [[ ]]");
    }
    return this.readWord();
  }

  parseFuncBody(name: string): FuncDefNode {
    this.skipBlank();
    if (this.peekUnquotedWord() !== "{") {
      throw new ParseFailure(`faltou { no corpo da função ${name}`);
    }
    this.skipSpaces();
    this.pos += 1;
    const body = this.parseList(new Set(["}"]), false);
    this.skipSpaces();
    if (this.peekUnquotedWord() !== "}") {
      throw new ParseFailure(`faltou } para fechar a função ${name}`);
    }
    this.skipSpaces();
    this.pos += 1;
    return { kind: "funcdef", name, body };
  }

  parseSimpleCommand(stopWords: ReadonlySet<string>, stopParen: boolean): SimpleCommand {
    const words: Word[] = [];
    const redirs: Redirection[] = [];

    while (true) {
      this.skipSpaces();
      if (this.pos >= this.src.length) break;
      const ch = this.peekChar()!;
      if (ch === "|" || ch === ";" || ch === "\n") break;
      if (ch === ")" && stopParen) break;
      if (ch === "&" && !this.startsWith("&>")) break;
      if (this.startsWith("<<<")) {
        throw new ParseFailure("o treino não entende here-string (<<<)");
      }
      if (this.startsWith("<<")) {
        throw new ParseFailure("o treino não entende here-doc (<<)");
      }

      const kw = this.peekUnquotedWord();
      if (kw !== null && stopWords.has(kw)) break;

      const redir = this.tryReadRedir();
      if (redir !== null) {
        redirs.push(redir);
        continue;
      }

      if (ch === "(" || ch === ")") {
        const prev = words[words.length - 1];
        const prevText = prev !== undefined ? wordText(prev) : null;
        if (ch === "(" && prevText !== null && /^[A-Za-z_][A-Za-z0-9_]*=$/.test(prevText)) {
          throw new ParseFailure("o treino não entende arrays");
        }
        throw new ParseFailure(`parêntese inesperado ${ch}`);
      }

      const tok = this.readWord();
      if (words.length === 0 && !tok.quoted && tok.plainText !== null) {
        if (UNSUPPORTED_COMMANDS.has(tok.plainText)) {
          throw new ParseFailure(`o treino não entende ${tok.plainText}`);
        }
      }
      words.push(tok.word);
    }

    if (words.length === 0) {
      throw new ParseFailure("esperado um comando");
    }
    return { kind: "command", words, redirs };
  }

  tryReadRedir(): Redirection | null {
    if (this.startsWith("2>&1")) {
      const next = this.src[this.pos + 4];
      if (next === undefined || isWordStop(this.src, this.pos + 4)) {
        this.pos += 4;
        return { op: "2>&1" };
      }
    }
    let op: Exclude<RedirOp, "2>&1"> | null = null;
    if (this.startsWith("2>")) {
      op = "2>";
      this.pos += 2;
    } else if (this.startsWith("&>")) {
      op = "&>";
      this.pos += 2;
    } else if (this.startsWith(">>")) {
      op = ">>";
      this.pos += 2;
    } else if (this.peekChar() === ">") {
      op = ">";
      this.pos += 1;
    } else if (this.peekChar() === "<" && !this.startsWith("<(")) {
      op = "<";
      this.pos += 1;
    }
    if (op === null) return null;

    this.skipSpaces();
    if (this.pos >= this.src.length || isWordStop(this.src, this.pos)) {
      throw new ParseFailure(`faltou o arquivo de destino após ${op}`);
    }
    const target = this.readWord().word;
    return { op, target };
  }

  /** Reads `$(…)` (after `$(`) or a backtick body into a command substitution node. */
  readCmdSub(): ShellNode {
    this.pos += 2;
    const node = this.parseList(new Set(), true);
    this.skipBlank();
    if (this.peekChar() !== ")") {
      throw new ParseFailure("substituição de comando $(...) sem fechar )");
    }
    this.pos += 1;
    return node;
  }

  readBacktick(): ShellNode {
    const end = this.src.indexOf("`", this.pos + 1);
    if (end < 0) throw new ParseFailure("crase sem fechar");
    const inner = this.src.slice(this.pos + 1, end);
    this.pos = end + 1;
    const res = parseShell(inner);
    if (!res.ok) throw new ParseFailure(res.error);
    return res.node;
  }

  readWord(): WordToken {
    const parts: WordPart[] = [];
    let quoted = false;

    while (this.pos < this.src.length && !isWordStop(this.src, this.pos)) {
      const ch = this.src[this.pos]!;
      if (ch === "'") {
        quoted = true;
        this.pos += 1;
        const start = this.pos;
        while (this.pos < this.src.length && this.src[this.pos] !== "'") {
          this.pos += 1;
        }
        if (this.pos >= this.src.length) {
          throw new ParseFailure("aspas simples sem fechar");
        }
        pushText(parts, this.src.slice(start, this.pos));
        this.pos += 1;
      } else if (ch === '"') {
        quoted = true;
        this.readDoubleQuoted(parts);
      } else if (ch === "\\") {
        quoted = true;
        this.pos += 1;
        if (this.pos >= this.src.length) {
          throw new ParseFailure("barra invertida no fim da linha");
        }
        pushText(parts, this.src[this.pos]!);
        this.pos += 1;
      } else if (ch === "`") {
        parts.push({ type: "cmdsub", node: this.readBacktick() });
      } else if (this.startsWith("$((")) {
        this.pos += 1;
        parts.push({ type: "arith", expr: parseArith(this.readArithInner()) });
      } else if (this.startsWith("$(")) {
        parts.push({ type: "cmdsub", node: this.readCmdSub() });
      } else if (this.startsWith("<(")) {
        this.pos += 2;
        const node = this.parseList(new Set(), true);
        this.skipSpaces();
        if (this.peekChar() !== ")") {
          throw new ParseFailure("substituição de processo <(...) sem fechar )");
        }
        this.pos += 1;
        parts.push({ type: "procsub", dir: "<", node });
      } else if (ch === "$") {
        const part = this.readDollar();
        if (part.type === "text") pushText(parts, part.value);
        else parts.push(part);
      } else {
        pushText(parts, ch);
        this.pos += 1;
      }
    }

    if (parts.length === 0) {
      parts.push({ type: "text", value: "" });
    }
    const plainText = parts.length === 1 && parts[0]?.type === "text" ? parts[0].value : null;
    return { word: { parts }, quoted, plainText };
  }

  readDoubleQuoted(parts: WordPart[]): void {
    this.pos += 1; // consume opening "
    const inner: DqPart[] = [];
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos]!;
      if (ch === '"') {
        this.pos += 1;
        if (inner.every((p) => p.type === "text")) {
          pushText(parts, inner.map((p) => (p as { readonly value: string }).value).join(""));
        } else {
          parts.push({ type: "dq", parts: inner });
        }
        return;
      }
      if (ch === "\\") {
        const next = this.src[this.pos + 1];
        if (next === undefined) throw new ParseFailure("aspas duplas sem fechar");
        if (next === '"' || next === "\\" || next === "$" || next === "`") {
          pushText(inner, next);
        } else {
          pushText(inner, `\\${next}`);
        }
        this.pos += 2;
      } else if (ch === "`") {
        inner.push({ type: "cmdsub", node: this.readBacktick() });
      } else if (this.startsWith("$((")) {
        this.pos += 1;
        inner.push({ type: "arith", expr: parseArith(this.readArithInner()) });
      } else if (this.startsWith("$(")) {
        inner.push({ type: "cmdsub", node: this.readCmdSub() });
      } else if (ch === "$") {
        const part = this.readDollar();
        if (part.type === "text") pushText(inner, part.value);
        else inner.push(part);
      } else {
        pushText(inner, ch);
        this.pos += 1;
      }
    }
    throw new ParseFailure("aspas duplas sem fechar");
  }

  /** Reads `$name`, `${name}`, `${name:-x}`, `$1`, `$#`, `$@` or `$?`; a lone `$` stays text. */
  readDollar(): VarPart | { readonly type: "text"; readonly value: string } {
    this.pos += 1; // consume $
    if (this.peekChar() === "{") {
      this.pos += 1;
      const start = this.pos;
      while (this.pos < this.src.length && this.src[this.pos] !== "}") {
        this.pos += 1;
      }
      if (this.pos >= this.src.length) {
        throw new ParseFailure("expansão ${...} sem fechar }");
      }
      const body = this.src.slice(start, this.pos);
      this.pos += 1;
      if (body.includes("[")) throw new ParseFailure("o treino não entende arrays");
      const m = /^([A-Za-z_][A-Za-z0-9_]*|\d+|[#@?])(?::-([^]*))?$/.exec(body);
      if (m === null) {
        throw new ParseFailure(`variável inválida em \${${body}}`);
      }
      return m[2] !== undefined
        ? { type: "var", name: m[1]!, fallback: m[2] }
        : { type: "var", name: m[1]! };
    }

    const first = this.peekChar();
    if (first !== undefined && (/^[0-9]$/.test(first) || SPECIAL_VARS.has(first))) {
      this.pos += 1;
      return { type: "var", name: first };
    }
    if (first !== undefined && /^[A-Za-z_]$/.test(first)) {
      const start = this.pos;
      while (this.pos < this.src.length && /^[A-Za-z0-9_]$/.test(this.src[this.pos]!)) {
        this.pos += 1;
      }
      return { type: "var", name: this.src.slice(start, this.pos) };
    }

    return { type: "text", value: "$" };
  }
}

/** Parses a bash script or command of the contest subset into an AST without throwing (AC-1). */
export function parseShell(input: string): ParseResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "comando vazio" };
  }
  try {
    const parser = new Parser(trimmed);
    const node = parser.parseList(new Set(), false);
    parser.skipBlank();
    if (parser.pos < parser.src.length) {
      const rest = parser.src.slice(parser.pos, parser.pos + 12);
      return { ok: false, error: `sintaxe inesperada perto de ${rest}` };
    }
    return { ok: true, node };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ParseFailure ? err.message : "erro de sintaxe no comando",
    };
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function quoteLiteral(value: string, forceQuote: boolean): string {
  if (value.length === 0) return "''";
  if (!forceQuote && SAFE_UNQUOTED_RE.test(value)) {
    return value;
  }
  if (!value.includes("'")) {
    return `'${value}'`;
  }
  const escaped = value.replace(/[\\"$`]/g, "\\$&");
  return `"${escaped}"`;
}

function formatVar(part: VarPart, next: WordPart | undefined): string {
  if (part.fallback !== undefined) return `\${${part.name}:-${part.fallback}}`;
  const needsBraces =
    (part.name.length > 1 && /^\d+$/.test(part.name)) ||
    (next?.type === "text" && /^[A-Za-z0-9_]/.test(next.value));
  return needsBraces ? `\${${part.name}}` : `$${part.name}`;
}

function formatDq(parts: readonly DqPart[]): string {
  const inner = parts
    .map((part, idx) => {
      switch (part.type) {
        case "text":
          return part.value.replace(/[\\"$`]/g, "\\$&");
        case "var":
          return formatVar(part, parts[idx + 1]);
        case "cmdsub":
          return `$(${formatShell(part.node)})`;
        case "arith":
          return `$((${formatArith(part.expr)}))`;
      }
    })
    .join("");
  return `"${inner}"`;
}

function formatWord(word: Word): string {
  if (word.parts.length === 1 && word.parts[0]?.type === "text") {
    const val = word.parts[0].value;
    return quoteLiteral(val, RESERVED_WORDS.has(val));
  }
  return word.parts
    .map((part, idx) => {
      switch (part.type) {
        case "text":
          return quoteLiteral(part.value, false);
        case "var":
          return formatVar(part, word.parts[idx + 1]);
        case "cmdsub":
          return `$(${formatShell(part.node)})`;
        case "procsub":
          return `<(${formatShell(part.node)})`;
        case "arith":
          return `$((${formatArith(part.expr)}))`;
        case "dq":
          return formatDq(part.parts);
      }
    })
    .join("");
}

function formatTestWord(word: Word): string {
  const text = wordText(word);
  if (text !== null && TEST_TOKENS.has(text)) return quoteLiteral(text, true);
  return formatWord(word);
}

function formatTest(expr: TestExpr): string {
  const paren = (e: TestExpr, wrap: boolean) => (wrap ? `( ${formatTest(e)} )` : formatTest(e));
  switch (expr.type) {
    case "unary":
      return `${expr.op} ${formatTestWord(expr.arg)}`;
    case "binary":
      return `${formatTestWord(expr.left)} ${expr.op} ${formatTestWord(expr.right)}`;
    case "not":
      return `! ${paren(expr.expr, expr.expr.type === "and" || expr.expr.type === "or")}`;
    case "and":
      return `${paren(expr.left, expr.left.type === "or")} && ${paren(
        expr.right,
        expr.right.type === "and" || expr.right.type === "or",
      )}`;
    case "or":
      return `${formatTest(expr.left)} || ${paren(expr.right, expr.right.type === "or")}`;
  }
}

function formatRedir(redir: Redirection): string {
  if (redir.op === "2>&1") return "2>&1";
  return `${redir.op} ${formatWord(redir.target)}`;
}

/** Formats a parsed shell AST back to one-line bash source (round-trips with `parseShell`, AC-1). */
export function formatShell(node: ShellNode): string {
  switch (node.kind) {
    case "command":
      return [...node.words.map(formatWord), ...node.redirs.map(formatRedir)].join(" ");
    case "pipeline":
      return node.stages.map(formatShell).join(" | ");
    case "list": {
      let out = formatShell(node.first);
      for (const item of node.rest) {
        const piece = formatShell(item.node);
        out += item.op === ";" ? `; ${piece}` : ` ${item.op} ${piece}`;
      }
      return out;
    }
    case "for":
      return `for ${node.variable} in ${node.items.map(formatWord).join(" ")}; do ${formatShell(node.body)}; done`;
    case "while":
    case "until":
      return `${node.kind} ${formatShell(node.condition)}; do ${formatShell(node.body)}; done`;
    case "funcdef":
      return `${node.name}() { ${formatShell(node.body)}; }`;
    case "if": {
      const branches = node.branches
        .map(
          (b, i) =>
            `${i === 0 ? "if" : "elif"} ${formatShell(b.condition)}; then ${formatShell(b.body)};`,
        )
        .join(" ");
      const elsePart = node.elseBody !== null ? ` else ${formatShell(node.elseBody)};` : "";
      return `${branches}${elsePart} fi`;
    }
    case "case": {
      const arms = node.arms
        .map(
          (arm) =>
            `${arm.patterns.map(formatWord).join(" | ")}) ${arm.body !== null ? formatShell(arm.body) : ""};;`,
        )
        .join(" ");
      return `case ${formatWord(node.word)} in ${arms} esac`;
    }
    case "forarith": {
      const parts = [node.init, node.condition, node.step].map((e) =>
        e !== null ? formatArith(e) : "",
      );
      return `for (( ${parts.join("; ")} )); do ${formatShell(node.body)}; done`;
    }
    case "test":
      return `[[ ${formatTest(node.expr)} ]]`;
    case "arith":
      return `(( ${formatArith(node.expr)} ))`;
    case "group":
      return `{ ${formatShell(node.body)}; }`;
    case "redirect":
      return `${formatShell(node.body)} ${node.redirs.map(formatRedir).join(" ")}`;
  }
}

/** Returns the literal string of a word if it has no variables or substitutions, else null. */
export function wordText(word: Word): string | null {
  if (word.parts.length === 1 && word.parts[0]?.type === "text") {
    return word.parts[0].value;
  }
  return null;
}

/** Formats a single word for display. */
export function wordDisplay(word: Word): string {
  return formatWord(word);
}
