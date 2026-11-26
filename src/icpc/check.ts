import type { IcpcKind } from "./drill";

export type IcpcCheckResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: string };

const MINUTE_RE = /^(\d+)(?:\s*min)?$/i;
const RANK_RE = /^#?(\d+)[ºo°]?$/i;
const LETTER_RE = /^[a-z]$/i;

/** Checks an answer for one of the four ICPC scoreboard drill kinds (T43 AC-2). */
export function checkIcpcAnswer(kind: IcpcKind, typed: string, canonical: string): IcpcCheckResult {
  const trimmed = typed.trim();

  switch (kind) {
    case "penalidade":
    case "ultrapassar": {
      if (trimmed.length === 0) {
        return { ok: false, reason: "Digite um número inteiro não negativo." };
      }
      const match = MINUTE_RE.exec(trimmed);
      if (match === null) {
        return { ok: false, reason: "Digite apenas um número inteiro não negativo." };
      }
      const value = Number.parseInt(match[1]!, 10);
      const expected = Number.parseInt(canonical, 10);
      if (value === expected) return { ok: true };
      return {
        ok: false,
        reason: kind === "penalidade" ? "Penalidade incorreta." : "Minuto limite incorreto.",
      };
    }

    case "posicao": {
      if (trimmed.length === 0) {
        return { ok: false, reason: "Digite a posição numérica (ex.: 2)." };
      }
      const match = RANK_RE.exec(trimmed);
      if (match === null) {
        return { ok: false, reason: "Digite uma posição inteira positiva (ex.: 2 ou 2º)." };
      }
      const value = Number.parseInt(match[1]!, 10);
      if (value <= 0) {
        return { ok: false, reason: "A posição começa em 1." };
      }
      const expected = Number.parseInt(canonical, 10);
      if (value === expected) return { ok: true };
      return { ok: false, reason: "Posição incorreta." };
    }

    case "escolher": {
      if (trimmed.length === 0) {
        return { ok: false, reason: "Digite a letra do problema (ex.: B)." };
      }
      if (!LETTER_RE.test(trimmed)) {
        return { ok: false, reason: "Digite apenas uma letra de problema (ex.: B)." };
      }
      if (trimmed.toUpperCase() === canonical.toUpperCase()) return { ok: true };
      return { ok: false, reason: "Outro problema tem taxa de acerto maior." };
    }
  }
}
