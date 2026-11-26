import type { Contest, Site } from "./model";

export function parseCodeforces(_raw: string): Contest[] {
  throw new Error("todo");
}

export function parseCodechef(_raw: string): Contest[] {
  throw new Error("todo");
}

export function parseAtcoder(_raw: string): Contest[] {
  throw new Error("todo");
}

export function parseLeetcode(_raw: string): Contest[] {
  throw new Error("todo");
}

export const PARSERS: Readonly<Record<Site, (raw: string) => Contest[]>> = {
  codeforces: parseCodeforces,
  atcoder: parseAtcoder,
  codechef: parseCodechef,
  leetcode: parseLeetcode,
};
