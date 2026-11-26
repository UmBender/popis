export type DiffLine = {
  readonly kind: "context" | "removed" | "added";
  readonly oldLine: number | null;
  readonly newLine: number | null;
  readonly text: string;
};

export type DiffHunk = {
  readonly oldStart: number;
  readonly oldEnd: number;
  readonly newStart: number;
  readonly newEnd: number;
  readonly removedCount: number;
  readonly addedCount: number;
  readonly lines: readonly DiffLine[];
};

export function diffCode(_code: string, _fixed: string): readonly DiffLine[] {
  throw new Error("todo");
}

export function changedHunks(_code: string, _fixed: string): readonly DiffHunk[] {
  throw new Error("todo");
}

export function diffSnippet(_code: string, _fixed: string, _context = 1): readonly DiffLine[] {
  throw new Error("todo");
}
