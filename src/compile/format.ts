import type { CompileGroup } from "./causes";

/** Masks temp paths, hex addresses, PIDs, BuildIds and runtime paths. */
export function maskCompilerOutput(_raw: string, _tempDir?: string): string {
  throw new Error("todo");
}

/** Trims masked compiler or sanitizer output to the lines a contestant reads. */
export function trimCompilerOutput(_masked: string, _group: CompileGroup): string {
  throw new Error("todo");
}

/** Masks and trims real g++ / sanitizer / judge output deterministically. */
export function formatCompilerOutput(
  _raw: string,
  _group: CompileGroup,
  _tempDir?: string,
): string {
  throw new Error("todo");
}

/** Whether the formatted output literally cites `sol.cpp:<line>`. */
export function outputCitesLine(_output: string, _line: number): boolean {
  throw new Error("todo");
}
