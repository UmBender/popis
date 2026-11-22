import type { FormatCommandKind } from "./format";

export type OutputCheckKind = FormatCommandKind;

export type OutputCheckMeta = {
  readonly command?: string;
  readonly kind?: OutputCheckKind;
  readonly fallbackReason?: string;
};

export type OutputCheckResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * Quote-aware normalizer: strips optional `$N = ` history prefix, collapses extra
 * whitespace outside string/char literals, and normalizes spacing around punctuation
 * (`{`, `}`, `,`, `=`, `(`, `)`, `*`) while keeping quoted contents verbatim.
 */
export function normalizeGdbOutput(text: string, allowHistoryPrefix = true): string {
  let s = text.trim();
  if (allowHistoryPrefix) {
    s = s.replace(/^\$\d+\s*=\s*/, "");
  }

  let out = "";
  let i = 0;
  let quote: "'" | '"' | null = null;

  while (i < s.length) {
    const ch = s[i]!;
    if (quote !== null) {
      out += ch;
      if (ch === "\\" && i + 1 < s.length) {
        out += s[i + 1]!;
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }

    if (/\s/.test(ch)) {
      while (i < s.length && /\s/.test(s[i]!)) i += 1;
      out += " ";
      continue;
    }

    out += ch;
    i += 1;
  }

  // Normalize spaces around punctuation outside quotes by running a second quote-aware pass.
  return normalizePunctuation(out.trim());
}

function normalizePunctuation(s: string): string {
  const parts: { readonly quoted: boolean; readonly text: string }[] = [];
  let buf = "";
  let quote: "'" | '"' | null = null;
  let i = 0;

  while (i < s.length) {
    const ch = s[i]!;
    if (quote !== null) {
      buf += ch;
      if (ch === "\\" && i + 1 < s.length) {
        buf += s[i + 1]!;
        i += 2;
        continue;
      }
      if (ch === quote) {
        parts.push({ quoted: true, text: buf });
        buf = "";
        quote = null;
      }
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      if (buf.length > 0) {
        parts.push({ quoted: false, text: buf });
      }
      quote = ch;
      buf = ch;
      i += 1;
      continue;
    }
    buf += ch;
    i += 1;
  }
  if (buf.length > 0) parts.push({ quoted: quote !== null, text: buf });

  const normalized = parts
    .map((p) => {
      if (p.quoted) return p.text;
      return p.text
        .replace(/\s*,\s*/g, ", ")
        .replace(/\s*=\s*/g, " = ")
        .replace(/\{\s+/g, "{")
        .replace(/\s+\}/g, "}")
        .replace(/\(\s+/g, "(")
        .replace(/\s+\)/g, ")")
        .replace(/([A-Za-z0-9_])\s*\*/g, "$1 *");
    })
    .join("");

  return normalized.trim();
}

/** Replaces concrete non-zero 4+ hex-digit addresses with ADDR (preserves 0x0). */
function maskNonNullAddresses(s: string): string {
  return s.replace(/\b0x([0-9a-fA-F]{4,})\b/g, (full, hex: string) =>
    /^0+$/.test(hex) ? full : "ADDR",
  );
}

function diagnoseNearMiss(
  typed: string,
  expected: string,
  meta?: OutputCheckMeta,
): string {
  // 1. Reversed endianness in x/ examine output
  if (meta?.kind === "examine") {
    const typedToks = typed.split(" ").filter((t) => t.length > 0);
    const expToks = expected.split(" ").filter((t) => t.length > 0);
    if (
      typedToks.length > 1 &&
      typedToks.length === expToks.length &&
      typedToks.every((t, idx) => t === expToks[expToks.length - 1 - idx])
    ) {
      return "x86-64 é little-endian: o byte menos significativo vem primeiro.";
    }
  }

  // 2. Hex expected: decimal given OR wrong two's-complement width
  if (/^0x[0-9a-f]+$/i.test(expected)) {
    if (/^-?\d+$/.test(typed)) {
      return "O formato /x imprime em hexadecimal com prefixo 0x.";
    }
    if (/^0x[0-9a-f]+$/i.test(typed) && typed.length !== expected.length) {
      const bytes = Math.ceil((expected.length - 2) / 2);
      return `A largura em complemento de dois segue o tamanho do tipo (${String(bytes)} bytes = ${String(expected.length - 2)} dígitos hex).`;
    }
  }

  // 3. Floor division instead of C truncation toward zero
  if (
    meta?.command !== undefined &&
    /[/%]/.test(meta.command) &&
    /^-?\d+$/.test(expected) &&
    /^-?\d+$/.test(typed)
  ) {
    const expNum = Number(expected);
    const typNum = Number(typed);
    if (expNum < 0 && typNum === expNum - 1) {
      return "Em C/C++, a divisão inteira trunca em direção a zero (não arredonda para baixo).";
    }
  }

  // 4. Expanded array instead of <repeats N times>
  if (expected.includes("<repeats ") && !typed.includes("<repeats")) {
    return "O gdb compacta mais de 10 elementos iguais com <repeats N times>.";
  }

  // 5. Struct without field names
  if (expected.startsWith("{") && expected.includes(" = ") && typed.startsWith("{") && !typed.includes(" = ")) {
    return "O gdb imprime structs com os nomes dos campos: {campo = valor, ...}.";
  }

  // 6. Char missing numeric code or quoted char literal
  if (/^-?\d+ '.*'$/.test(expected) && !/^-?\d+ '.*'$/.test(typed)) {
    return "O gdb imprime char como código numérico seguido do caractere entre aspas simples.";
  }

  return meta?.fallbackReason ?? `A saída do gdb para este comando é ${expected}.`;
}

export function checkOutput(
  typed: string,
  expected: string,
  meta?: OutputCheckMeta,
): OutputCheckResult {
  if (typed.trim().length === 0) {
    return { ok: false, reason: "Digite a saída produzida pelo gdb." };
  }

  const allowPrefix = meta?.kind !== "examine" && meta?.kind !== "whatis" && meta?.kind !== "ptype";
  const normExpected = normalizeGdbOutput(expected, allowPrefix);
  const normTyped = normalizeGdbOutput(typed, allowPrefix);

  if (normTyped === normExpected) {
    return { ok: true };
  }

  // When expected has masked non-null addresses (`ADDR`), accept any concrete non-null 4+-digit hex address too.
  if (normExpected.includes("ADDR") && maskNonNullAddresses(normTyped) === normExpected) {
    return { ok: true };
  }

  return { ok: false, reason: diagnoseNearMiss(normTyped, normExpected, meta) };
}
