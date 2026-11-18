import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export const ROOT = join(import.meta.dirname, "..");

/** Every file under `dir` (relative to the repo root) whose name passes `keep`. */
export function sourceFiles(dir: string, keep: (path: string) => boolean): string[] {
  const out: string[] = [];
  const walk = (abs: string) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const path = join(abs, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (keep(path)) out.push(relative(ROOT, path));
    }
  };
  walk(join(ROOT, dir));
  return out.sort();
}

export function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

/** Lines of `path` matching `pattern`, as "path:line: text". */
export function offending(path: string, pattern: RegExp): string[] {
  return read(path)
    .split("\n")
    .flatMap((text, i) => (pattern.test(text) ? [`${path}:${i + 1}: ${text.trim()}`] : []));
}
