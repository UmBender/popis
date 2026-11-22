export type LineTarget = {
  readonly id: string;
  readonly line: number;
  readonly label: string;
  readonly match: string;
};

export type FunctionTarget = {
  readonly name: string;
  readonly line: number;
  readonly params: readonly string[];
};

export type GdbProgram = {
  readonly id: string;
  readonly file: string;
  readonly title: string;
  readonly tags: readonly string[];
  readonly lines: readonly string[];
  readonly stdin?: string;
  readonly functions: readonly FunctionTarget[];
  readonly targets: readonly LineTarget[];
};

export const PROGRAMS: readonly GdbProgram[] = [];

export function programById(_id: string): GdbProgram {
  throw new Error("todo");
}
