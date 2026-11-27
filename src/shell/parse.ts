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

const UNSUPPORTED_KEYWORDS = new Set(["case", "if", "until", "select", "[["]);
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
]);

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SAFE_UNQUOTED_RE = /^[A-Za-z0-9_./+:=,@~!-]+$/;

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

function pushText(parts: WordPart[], value: string): void {
  if (value.length === 0) return;
  const last = parts[parts.length - 1];
  if (last?.type === "text") {
    parts[parts.length - 1] = { type: "text", value: last.value + value };
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

class Parser {
  readonly src: string;
  pos = 0;

  constructor(src: string) {
    this.src = src;
  }

  skipSpaces(): void {
    while (isSpace(this.src[this.pos])) this.pos += 1;
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

  parseList(stopWords: ReadonlySet<string>, stopParen: boolean): ShellNode {
    this.skipSpaces();
    const first = this.parsePipeline(stopWords, stopParen);
    const rest: { readonly op: ListOp; readonly node: ShellNode }[] = [];

    while (true) {
      this.skipSpaces();
      if (this.pos >= this.src.length) break;
      if (stopParen && this.peekChar() === ")") break;

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

      this.skipSpaces();
      if (op === ";") {
        if (this.pos >= this.src.length) break;
        if (stopParen && this.peekChar() === ")") break;
        const kw = this.peekUnquotedWord();
        if (kw !== null && stopWords.has(kw)) break;
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
        this.skipSpaces();
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
      throw new ParseFailure("o treino não entende ((");
    }
    if (this.startsWith("<<<")) {
      throw new ParseFailure("o treino não entende here-string (<<<)");
    }
    if (this.startsWith("<<")) {
      throw new ParseFailure("o treino não entende here-doc (<<)");
    }

    const kw = this.peekUnquotedWord();
    if (kw !== null) {
      if (stopWords.has(kw)) {
        throw new ParseFailure(`esperado um comando antes de ${kw}`);
      }
      if (UNSUPPORTED_KEYWORDS.has(kw)) {
        throw new ParseFailure(`o treino não entende ${kw}`);
      }
      if (kw === "for") return this.parseFor();
      if (kw === "while") return this.parseWhile();
    }

    // Check function definition: `name() { body; }`
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

  parseFor(): ForNode {
    this.pos += 3; // consume "for"
    this.skipSpaces();
    if (this.startsWith("((")) {
      throw new ParseFailure("o treino não entende for ((...)) — use for i in $(seq 1 N)");
    }
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

    this.skipSpaces();
    if (this.peekUnquotedWord() !== "do") {
      throw new ParseFailure("faltou do no laço for");
    }
    this.pos += 2;

    const body = this.parseList(new Set(["done"]), false);
    this.skipSpaces();
    if (this.peekUnquotedWord() !== "done") {
      throw new ParseFailure("faltou done para fechar o laço for");
    }
    this.pos += 4;
    return { kind: "for", variable: varName, items, body };
  }

  parseWhile(): WhileNode {
    this.pos += 5; // consume "while"
    const condition = this.parseList(new Set(["do"]), false);
    this.skipSpaces();
    if (this.peekUnquotedWord() !== "do") {
      throw new ParseFailure("faltou do no laço while");
    }
    this.pos += 2;
    const body = this.parseList(new Set(["done"]), false);
    this.skipSpaces();
    if (this.peekUnquotedWord() !== "done") {
      throw new ParseFailure("faltou done para fechar o laço while");
    }
    this.pos += 4;
    return { kind: "while", condition, body };
  }

  parseFuncBody(name: string): FuncDefNode {
    this.skipSpaces();
    if (this.peekUnquotedWord() !== "{") {
      throw new ParseFailure(`faltou { no corpo da função ${name}`);
    }
    this.pos += 1;
    const body = this.parseList(new Set(["}"]), false);
    this.skipSpaces();
    if (this.peekUnquotedWord() !== "}") {
      throw new ParseFailure(`faltou } para fechar a função ${name}`);
    }
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
        throw new ParseFailure(`parêntese inesperado ${ch}`);
      }

      const tok = this.readWord();
      if (words.length === 0 && !tok.quoted && tok.plainText !== null) {
        if (UNSUPPORTED_KEYWORDS.has(tok.plainText)) {
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
        throw new ParseFailure("use $(...) no lugar de crases");
      } else if (this.startsWith("$(")) {
        this.pos += 2;
        const node = this.parseList(new Set(), true);
        this.skipSpaces();
        if (this.peekChar() !== ")") {
          throw new ParseFailure("substituição de comando $(...) sem fechar )");
        }
        this.pos += 1;
        parts.push({ type: "cmdsub", node });
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
        this.readDollar(parts);
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
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos]!;
      if (ch === '"') {
        this.pos += 1;
        return;
      }
      if (ch === "\\") {
        const next = this.src[this.pos + 1];
        if (next === undefined) throw new ParseFailure("aspas duplas sem fechar");
        if (next === '"' || next === "\\" || next === "$" || next === "`") {
          pushText(parts, next);
          this.pos += 2;
        } else {
          pushText(parts, `\\${next}`);
          this.pos += 2;
        }
      } else if (ch === "`") {
        throw new ParseFailure("use $(...) no lugar de crases");
      } else if (this.startsWith("$(")) {
        this.pos += 2;
        const node = this.parseList(new Set(), true);
        this.skipSpaces();
        if (this.peekChar() !== ")") {
          throw new ParseFailure("substituição de comando $(...) sem fechar )");
        }
        this.pos += 1;
        parts.push({ type: "cmdsub", node });
      } else if (ch === "$") {
        this.readDollar(parts);
      } else {
        pushText(parts, ch);
        this.pos += 1;
      }
    }
    throw new ParseFailure("aspas duplas sem fechar");
  }

  readDollar(parts: WordPart[]): void {
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
      const name = this.src.slice(start, this.pos);
      this.pos += 1;
      if (!IDENT_RE.test(name) && !/^\d+$/.test(name)) {
        throw new ParseFailure(`variável inválida em \${${name}}`);
      }
      parts.push({ type: "var", name });
      return;
    }

    const first = this.peekChar();
    if (first !== undefined && /^[0-9]$/.test(first)) {
      this.pos += 1;
      parts.push({ type: "var", name: first });
      return;
    }
    if (first !== undefined && /^[A-Za-z_]$/.test(first)) {
      const start = this.pos;
      while (this.pos < this.src.length && /^[A-Za-z0-9_]$/.test(this.src[this.pos]!)) {
        this.pos += 1;
      }
      parts.push({ type: "var", name: this.src.slice(start, this.pos) });
      return;
    }

    pushText(parts, "$");
  }
}

/** Parses a contest bash subset line into a normalized AST without throwing (AC-1). */
export function parseShell(input: string): ParseResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "comando vazio" };
  }
  try {
    const parser = new Parser(trimmed);
    const node = parser.parseList(new Set(), false);
    parser.skipSpaces();
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

function formatWord(word: Word): string {
  if (word.parts.length === 1 && word.parts[0]?.type === "text") {
    const val = word.parts[0].value;
    const isKeyword = RESERVED_WORDS.has(val);
    return quoteLiteral(val, isKeyword);
  }
  return word.parts
    .map((part, idx) => {
      switch (part.type) {
        case "text":
          return quoteLiteral(part.value, false);
        case "var": {
          const next = word.parts[idx + 1];
          const needsBraces =
            part.name.length > 1 && /^\d+$/.test(part.name)
              ? true
              : next?.type === "text" && /^[A-Za-z0-9_]/.test(next.value);
          return needsBraces ? `\${${part.name}}` : `$${part.name}`;
        }
        case "cmdsub":
          return `$(${formatShell(part.node)})`;
        case "procsub":
          return `<(${formatShell(part.node)})`;
      }
    })
    .join("");
}

function formatRedir(redir: Redirection): string {
  if (redir.op === "2>&1") return "2>&1";
  return `${redir.op} ${formatWord(redir.target)}`;
}

/** Formats a parsed shell AST back to bash source (round-trips with `parseShell`, AC-1). */
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
      return `while ${formatShell(node.condition)}; do ${formatShell(node.body)}; done`;
    case "funcdef":
      return `${node.name}() { ${formatShell(node.body)}; }`;
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

/** Formats an arithmetic expression with the fewest parentheses that keep its tree (T54 AC-1). */
export function formatArith(_expr: ArithExpr): string {
  throw new Error("todo");
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
