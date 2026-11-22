import type { CheckContext } from "./check";
import type { GdbAction } from "./commands";

export const GDB_CMD_KINDS = [
  "iniciar",
  "break-linha",
  "break-funcao",
  "tbreak",
  "break-cond",
  "condition",
  "gerir",
  "ignore",
  "andar",
  "olhar",
  "pilha",
  "vigia",
  "mudar",
  "crash",
] as const;

export type GdbCmdKind = (typeof GDB_CMD_KINDS)[number];

export const GDB_CMD_KIND_LABELS: Readonly<Record<GdbCmdKind, string>> = {
  iniciar: "Iniciar (run, start, kill)",
  "break-linha": "Break em linha",
  "break-funcao": "Break em função",
  tbreak: "Break temporário (tbreak)",
  "break-cond": "Break condicional (if)",
  condition: "Condição (condition)",
  gerir: "Gerir breakpoints",
  ignore: "Ignorar passagens (ignore)",
  andar: "Andar (next, step, finish, until)",
  olhar: "Olhar (print, display, info, list)",
  pilha: "Pilha (bt, frame, up, down)",
  vigia: "Vigias (watch, rwatch, awatch)",
  mudar: "Mudar estado (set var, call)",
  crash: "Crash e exceções (bt, catch throw)",
};

export type BreakpointMark = {
  readonly id: number;
  readonly line: number;
  readonly enabled: boolean;
  readonly temporary?: boolean;
  readonly cond?: string;
  readonly ignore?: number;
};

export type DisplayMark = {
  readonly id: number;
  readonly expr: string;
};

export type StackFrame = {
  readonly index: number;
  readonly func: string;
  readonly file: string;
  readonly line: number | null;
  readonly args?: string;
  readonly isUser: boolean;
};

export type StopState = {
  readonly line: number | null;
  readonly running: boolean;
  readonly breakpoints: readonly BreakpointMark[];
  readonly displays: readonly DisplayMark[];
  readonly frames: readonly StackFrame[];
  readonly currentFrame: number;
  readonly signal?: "SIGSEGV" | "SIGFPE" | "SIGABRT";
  readonly sessionLines: readonly string[];
};

export type GdbCommandItem = {
  readonly seed: number;
  readonly index: number;
  readonly kind: GdbCmdKind;
  readonly kc: `gdb.cmd.${GdbCmdKind}`;
  readonly programId: string;
  readonly file: string;
  readonly lines: readonly string[];
  readonly stop: StopState;
  readonly prompt: string;
  readonly canonical: string;
  readonly alternatives: readonly string[];
  readonly expected: GdbAction;
  readonly context: CheckContext;
  readonly setupCommands: readonly string[];
  readonly oracleProbe: readonly string[];
};

export function generateCommandItem(
  _seed: number,
  _index: number,
  _kinds: readonly GdbCmdKind[],
): GdbCommandItem {
  throw new Error("todo");
}
