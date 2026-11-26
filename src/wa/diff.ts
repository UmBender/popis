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

/** Exact LCS line diff between original buggy code and fixed code (T41 AC-1, AC-4). */
export function diffCode(code: string, fixed: string): readonly DiffLine[] {
  const a = code.split("\n");
  const b = fixed.split("\n");
  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) {
      out.push({ kind: "context", oldLine: i + 1, newLine: j + 1, text: a[i]! });
      i += 1;
      j += 1;
    } else if (i < m && (j === n || dp[i + 1]![j]! >= dp[i]![j + 1]!)) {
      out.push({ kind: "removed", oldLine: i + 1, newLine: null, text: a[i]! });
      i += 1;
    } else {
      out.push({ kind: "added", oldLine: null, newLine: j + 1, text: b[j]! });
      j += 1;
    }
  }
  return out;
}

/** Groups contiguous removed/added diff lines into hunks with 1-based line ranges. */
export function changedHunks(code: string, fixed: string): readonly DiffHunk[] {
  const diff = diffCode(code, fixed);
  const hunks: DiffHunk[] = [];
  let lastOld = 0;
  let lastNew = 0;
  let idx = 0;

  while (idx < diff.length) {
    const line = diff[idx]!;
    if (line.kind === "context") {
      lastOld = line.oldLine!;
      lastNew = line.newLine!;
      idx += 1;
      continue;
    }

    const lines: DiffLine[] = [];
    let oldStart = lastOld + 1;
    let oldEnd = lastOld + 1;
    let newStart = lastNew + 1;
    let newEnd = lastNew + 1;
    let removedCount = 0;
    let addedCount = 0;

    while (idx < diff.length && diff[idx]!.kind !== "context") {
      const cur = diff[idx]!;
      lines.push(cur);
      if (cur.kind === "removed") {
        if (removedCount === 0) oldStart = cur.oldLine!;
        oldEnd = cur.oldLine!;
        lastOld = cur.oldLine!;
        removedCount += 1;
      } else {
        if (addedCount === 0) newStart = cur.newLine!;
        newEnd = cur.newLine!;
        lastNew = cur.newLine!;
        addedCount += 1;
      }
      idx += 1;
    }

    hunks.push({ oldStart, oldEnd, newStart, newEnd, removedCount, addedCount, lines });
  }

  return hunks;
}

/** Compact diff lines around edits with `context` surrounding unchanged lines. */
export function diffSnippet(code: string, fixed: string, context = 1): readonly DiffLine[] {
  const diff = diffCode(code, fixed);
  const changedIndices: number[] = [];
  for (let i = 0; i < diff.length; i++) {
    if (diff[i]!.kind !== "context") changedIndices.push(i);
  }
  if (changedIndices.length === 0) return [];
  return diff.filter((_, idx) => changedIndices.some((c) => Math.abs(idx - c) <= context));
}
