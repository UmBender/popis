import type { CompileGroup } from "./causes";

const RUNTIME_FRAME_RE =
  /\bin (?:__libc_start_call_main|__libc_start_main|_start)\b|\(\/lib|\(\/usr\/lib|libasan\.so|libc\.so/;

/** Masks temp paths, hex addresses, PIDs, BuildIds and runtime binary names. */
export function maskCompilerOutput(raw: string, tempDir?: string): string {
  let s = raw.replace(/\r\n/g, "\n");
  if (tempDir !== undefined && tempDir.length > 0) {
    s = s.split(`${tempDir}/`).join("");
    s = s.split(tempDir).join("DIR");
  }
  s = s.replace(/\/tmp\/popis-[^/\s:]+\//g, "");
  // Normalize binary name prefix on libc assert messages (`bin_name: sol.cpp:...` -> `sol: sol.cpp:...`).
  s = s.replace(/^[^\s:]+:\s+(sol\.cpp:\d+:)/gm, "sol: $1");
  // Mask PIDs (`==12345==`).
  s = s.replace(/==\d+==/g, "==N==");
  // Strip BuildId annotations.
  s = s.replace(/\s*\(BuildId:\s*[0-9a-fA-F]+\)/g, "");
  // Mask addresses and hex offsets (`0x...`).
  s = s.replace(/\+0x[0-9a-fA-F]+/g, "+ADDR");
  s = s.replace(/\b0x[0-9a-fA-F]{4,}\b/g, "ADDR");
  return s;
}

function trimGcc(lines: readonly string[]): string {
  const diagRe = /^sol\.cpp:\d+:\d+:\s*(?:fatal error|error|warning):/;
  const firstIdx = lines.findIndex((l) => diagRe.test(l));
  if (firstIdx === -1)
    return lines
      .filter((l) => l.length > 0)
      .slice(0, 10)
      .join("\n");

  const prev = lines[firstIdx - 1];
  const start =
    prev !== undefined && /^sol\.cpp: In function /.test(prev) ? firstIdx - 1 : firstIdx;
  const out: string[] = [];
  let seenFirst = false;
  for (let i = start; i < lines.length && out.length < 10; i++) {
    const line = lines[i]!;
    if (diagRe.test(line)) {
      if (seenFirst) break;
      seenFirst = true;
    }
    if (line.length > 0) out.push(line);
  }
  return out.join("\n");
}

function trimAsan(lines: readonly string[]): string {
  const out: string[] = [];
  let summary: string | null = null;
  let skippingBlock = false;
  let traceFrames = 0;
  let collapsed = false;

  for (const line of lines) {
    if (line.startsWith("SUMMARY: AddressSanitizer:")) {
      summary = line;
      skippingBlock = false;
      continue;
    }
    if (
      line.startsWith("==N==Register values:") ||
      line.startsWith("Shadow bytes around") ||
      line.startsWith("Shadow byte legend:") ||
      line.startsWith("HINT:")
    ) {
      skippingBlock = true;
      continue;
    }
    if (skippingBlock) continue;
    if (
      line.length === 0 ||
      /^=+$/.test(line) ||
      line === "AddressSanitizer:DEADLYSIGNAL" ||
      line === "==N==ABORTING"
    ) {
      continue;
    }
    if (RUNTIME_FRAME_RE.test(line)) continue;

    if (/^\s*#\d+\s/.test(line)) {
      if (!line.includes("sol.cpp:")) continue;
      if (traceFrames < 3) {
        out.push(line);
        traceFrames += 1;
      } else if (!collapsed) {
        out.push("    ... (frames repetidos)");
        collapsed = true;
      }
      continue;
    }

    traceFrames = 0;
    collapsed = false;
    if (out.length < 13) out.push(line);
  }

  const trimmed = out.slice(0, summary !== null ? 13 : 14);
  if (summary !== null) trimmed.push(summary);
  return trimmed.join("\n");
}

function trimUbsan(lines: readonly string[]): string {
  const runtime = lines.filter((l) => l.includes(": runtime error:")).slice(0, 4);
  return (runtime.length > 0 ? runtime : lines.filter((l) => l.length > 0).slice(0, 6)).join("\n");
}

function trimGlibcxx(lines: readonly string[]): string {
  const out: string[] = [];
  const errIdx = lines.findIndex((l) => l.startsWith("Error:"));
  if (errIdx !== -1) {
    for (let i = errIdx; i < lines.length; i++) {
      const l = lines[i]!;
      if (l.length === 0 || l.startsWith("Objects involved")) break;
      out.push(l);
    }
  }

  const btIdx = lines.findIndex((l) => l === "Backtrace:");
  if (btIdx !== -1) {
    const frames: string[] = [];
    for (let i = btIdx + 1; i < lines.length && frames.length < 4; i++) {
      const l = lines[i]!;
      if (l.length === 0 || l.startsWith("Error:")) break;
      if (l.includes("sol.cpp:")) {
        const prev = lines[i - 1]!;
        if (prev.trim().startsWith("ADDR ")) frames.push(prev);
        frames.push(l);
      }
    }
    if (frames.length > 0) {
      out.push("Backtrace:", ...frames);
    }
  }

  const typeLine = lines.find((l) => l.trim().startsWith("type = "));
  if (typeLine !== undefined) out.push(typeLine.trim());

  return (out.length > 0 ? out : lines.filter((l) => l.length > 0)).slice(0, 12).join("\n");
}

/** Trims masked compiler or sanitizer output to the lines a contestant reads. */
export function trimCompilerOutput(masked: string, group: CompileGroup): string {
  const lines = masked.split("\n").map((l) => l.trimEnd());
  switch (group) {
    case "compilacao":
    case "aviso":
      return trimGcc(lines);
    case "asan":
      return trimAsan(lines);
    case "ubsan":
      return trimUbsan(lines);
    case "glibcxx":
      return trimGlibcxx(lines);
    case "veredito":
      return lines
        .filter((l) => l.length > 0)
        .slice(0, 10)
        .join("\n");
  }
}

/** Masks and trims real g++ / sanitizer / judge output deterministically. */
export function formatCompilerOutput(raw: string, group: CompileGroup, tempDir?: string): string {
  return trimCompilerOutput(maskCompilerOutput(raw, tempDir), group);
}

/** Whether the formatted output literally cites `sol.cpp:<line>`. */
export function outputCitesLine(output: string, line: number): boolean {
  return new RegExp(`\\bsol\\.cpp:${String(line)}\\b`).test(output);
}
