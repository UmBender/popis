import type { Language, ValidationResult } from "./types";

const MAX_LINES = 300;
const MAX_BYTES = 16 * 1024;

/** Detect supported source language by file extension. */
export function detectLanguage(path: string): Language | null {
  const lower = path.toLowerCase();
  if (
    lower.endsWith(".cpp") ||
    lower.endsWith(".cc") ||
    lower.endsWith(".h") ||
    lower.endsWith(".hpp")
  ) {
    return "cpp";
  }
  if (lower.endsWith(".py")) return "python";
  return null;
}

function stripCppComments(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const ch = src.charAt(i);
    const next = src.charAt(i + 1);
    if (ch === '"' || ch === "'") {
      const quote = ch;
      out += ch;
      i++;
      while (i < src.length) {
        const cur = src.charAt(i);
        out += cur;
        i++;
        if (cur === "\\" && i < src.length) {
          out += src.charAt(i);
          i++;
        } else if (cur === quote || cur === "\n") {
          break;
        }
      }
      continue;
    }
    if (ch === "/" && next === "/") {
      i += 2;
      while (i < src.length && src.charAt(i) !== "\n") i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      let hadNewline = false;
      while (i < src.length && !(src.charAt(i) === "*" && src.charAt(i + 1) === "/")) {
        if (src.charAt(i) === "\n") {
          out += "\n";
          hadNewline = true;
        }
        i++;
      }
      if (!hadNewline) out += " ";
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function stripPythonComments(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const ch = src.charAt(i);
    if (ch === '"' || ch === "'") {
      const triple = src.slice(i, i + 3) === ch.repeat(3);
      const delim = triple ? ch.repeat(3) : ch;
      out += delim;
      i += delim.length;
      while (i < src.length) {
        if (src.startsWith(delim, i)) {
          out += delim;
          i += delim.length;
          break;
        }
        const cur = src.charAt(i);
        out += cur;
        i++;
        if (cur === "\\" && i < src.length) {
          out += src.charAt(i);
          i++;
        } else if (!triple && cur === "\n") {
          break;
        }
      }
      continue;
    }
    if (ch === "#") {
      while (i < src.length && src.charAt(i) !== "\n") i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/** Strip line and block comments while keeping string literals and line breaks intact. */
export function stripComments(code: string, language: Language): string {
  const lf = code.replace(/\r\n?/g, "\n");
  return language === "cpp" ? stripCppComments(lf) : stripPythonComments(lf);
}

/** Normalize a snippet according to the T32 snippet rules (no comments, LF, 4 spaces, dedented). */
export function normalizeSnippet(code: string, language: Language): string {
  const rawLines = stripComments(code, language)
    .replace(/\t/g, "    ")
    .split("\n")
    .map((line) => line.replace(/ +$/, ""));

  let start = 0;
  while (start < rawLines.length && rawLines[start] === "") start++;
  let end = rawLines.length;
  while (end > start && rawLines[end - 1] === "") end--;
  const trimmed = rawLines.slice(start, end);
  if (trimmed.length === 0) return "";

  let minIndent = Infinity;
  for (const line of trimmed) {
    if (line.length === 0) continue;
    const indent = line.length - line.trimStart().length;
    if (indent < minIndent) minIndent = indent;
  }

  const collapsed: string[] = [];
  let prevBlank = false;
  for (const line of trimmed) {
    if (line.length === 0) {
      if (!prevBlank) collapsed.push("");
      prevBlank = true;
    } else {
      collapsed.push(line.slice(minIndent));
      prevBlank = false;
    }
  }
  return `${collapsed.join("\n")}\n`;
}

/** Validate a normalized snippet against all T32 snippet rules. */
export function validateSnippetRules(text: string): ValidationResult {
  if (text.trim().length === 0) return { ok: false, reason: "empty snippet" };
  if (text.length > MAX_BYTES) return { ok: false, reason: "exceeds 16 KB" };
  if (text.includes("\r")) return { ok: false, reason: "contains CRLF" };
  if (text.includes("\t")) return { ok: false, reason: "contains tab" };

  const body = text.endsWith("\n") ? text.slice(0, -1) : text;
  const lines = body.split("\n");
  if (lines.length > MAX_LINES) return { ok: false, reason: "exceeds 300 lines" };

  for (const line of lines) {
    if (line.endsWith(" ")) return { ok: false, reason: "trailing whitespace" };
  }

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code !== 10 && (code < 32 || code > 126)) {
      return { ok: false, reason: "non-ASCII character" };
    }
  }
  return { ok: true };
}
