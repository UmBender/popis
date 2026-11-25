import { STRING_NPOS } from "./sim";

export type StlCheckOptions = {
  readonly boolalpha?: boolean;
};

export type StlCheckResult = {
  readonly ok: boolean;
  readonly reason: string;
};

const NPOS_STR = String(STRING_NPOS);

/** Splits output into whitespace-separated tokens, ignoring extra spaces and trailing newlines. */
export function tokenizeOutput(text: string): string[] {
  const trimmed = text.trim();
  return trimmed.length === 0 ? [] : trimmed.split(/\s+/);
}

function tokenMatches(got: string, want: string, boolalpha: boolean): boolean {
  if (got === want) return true;
  if (!boolalpha) return false;
  return (
    (want === "true" && got === "1") ||
    (want === "false" && got === "0") ||
    (want === "1" && got === "true") ||
    (want === "0" && got === "false")
  );
}

/**
 * Checks the player's output against the simulator's expected output token by token.
 * Rejects `-0` for integers and `-1` for `string::npos`; accepts `1`/`true` only with `boolalpha`.
 */
export function checkStlAnswer(
  typed: string,
  expected: string,
  opts: StlCheckOptions = {},
): StlCheckResult {
  const gotTokens = tokenizeOutput(typed);
  const wantTokens = tokenizeOutput(expected);
  const boolalpha = opts.boolalpha === true;

  if (gotTokens.length === 0) {
    return { ok: false, reason: "Digite a saída esperada." };
  }
  if (gotTokens.length !== wantTokens.length) {
    return {
      ok: false,
      reason: `Esperados ${String(wantTokens.length)} valores, recebidos ${String(gotTokens.length)}.`,
    };
  }

  for (let i = 0; i < wantTokens.length; i++) {
    const got = gotTokens[i] as string;
    const want = wantTokens[i] as string;
    if (tokenMatches(got, want, boolalpha)) continue;
    if (got === "-0" && want === "0") {
      return { ok: false, reason: "Inteiros em C++ não imprimem -0; o valor é 0." };
    }
    if (got === "-1" && want === NPOS_STR) {
      return {
        ok: false,
        reason: "string::npos / size_t é sem sinal (64 bits: 18446744073709551615), não -1.",
      };
    }
    if (!boolalpha && ((want === "1" && got === "true") || (want === "0" && got === "false"))) {
      return { ok: false, reason: "Sem boolalpha, C++ imprime 1/0 em vez de true/false." };
    }
    return { ok: false, reason: "Saída diferente da esperada." };
  }

  return { ok: true, reason: "" };
}
