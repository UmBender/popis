export type RedirOp = "<" | ">" | ">>" | "2>" | "2>&1" | "&>";

export type Redirection =
  | { readonly op: "2>&1" }
  | { readonly op: Exclude<RedirOp, "2>&1">; readonly target: Word };

export type WordPart =
  | { readonly type: "text"; readonly value: string }
  | { readonly type: "var"; readonly name: string }
  | { readonly type: "cmdsub"; readonly node: ShellNode }
  | { readonly type: "procsub"; readonly dir: "<"; readonly node: ShellNode };

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

export type ShellNode =
  | SimpleCommand
  | PipelineNode
  | ListNode
  | ForNode
  | WhileNode
  | FuncDefNode;

export type ParseResult =
  | { readonly ok: true; readonly node: ShellNode }
  | { readonly ok: false; readonly error: string };

export function parseShell(_input: string): ParseResult {
  throw new Error("todo");
}

export function formatShell(_node: ShellNode): string {
  throw new Error("todo");
}

export function wordText(_word: Word): string | null {
  throw new Error("todo");
}

export function wordDisplay(_word: Word): string {
  throw new Error("todo");
}
