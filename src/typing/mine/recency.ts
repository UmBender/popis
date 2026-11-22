export const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

export function parseTimestampMs(_iso: string): number {
  throw new Error("todo");
}

export function formatDate(_iso: string): string {
  throw new Error("todo");
}

export function extractContestNumber(_path: string): number | null {
  throw new Error("todo");
}

export function compareCodePoints(_a: string, _b: string): number {
  throw new Error("todo");
}

export function compareRecency(
  _a: { readonly createdAt: string; readonly path: string },
  _b: { readonly createdAt: string; readonly path: string },
): number {
  throw new Error("todo");
}
