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
  | { readonly ok: true; readonly command: string }
  | { readonly ok: false; readonly error: string };

export type ParseResult =
  | { readonly ok: true; readonly action: GdbAction }
  | { readonly ok: false; readonly error: string };

export const COMMAND_TABLE: readonly CommandEntry[] = [];

export function resolveCommandName(_word: string): ResolveResult {
  throw new Error("todo");
}

export function parseCommand(_text: string): ParseResult {
  throw new Error("todo");
}
