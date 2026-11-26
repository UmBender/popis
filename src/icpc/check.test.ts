import { describe, expect, it } from "vitest";
import { checkIcpcAnswer } from "./check";
import type { IcpcKind } from "./drill";

// T43 AC-2: answer checker accepts equivalent forms and rejects near-misses.

describe("checkIcpcAnswer (AC-2)", () => {
  const accepted: readonly (readonly [IcpcKind, string, string])[] = [
    ["penalidade", "245", "245"],
    ["penalidade", "  245  ", "245"],
    ["penalidade", "245 min", "245"],
    ["penalidade", "245MIN", "245"],
    ["penalidade", "0", "0"],
    ["posicao", "2", "2"],
    ["posicao", " 2 ", "2"],
    ["posicao", "2º", "2"],
    ["posicao", "2o", "2"],
    ["posicao", "2°", "2"],
    ["posicao", "#2", "2"],
    ["ultrapassar", "148", "148"],
    ["ultrapassar", " 148 min ", "148"],
    ["ultrapassar", "0", "0"],
    ["escolher", "B", "B"],
    ["escolher", "b", "B"],
    ["escolher", "  c  ", "C"],
  ];

  for (const [kind, typed, canonical] of accepted) {
    it(`accepts ${JSON.stringify(typed)} for ${kind} (${canonical})`, () => {
      expect(checkIcpcAnswer(kind, typed, canonical)).toEqual({ ok: true });
    });
  }

  const rejected: readonly (readonly [IcpcKind, string, string])[] = [
    ["penalidade", "", "245"],
    ["penalidade", "   ", "245"],
    ["penalidade", "244", "245"],
    ["penalidade", "246", "245"],
    ["penalidade", "-245", "245"],
    ["penalidade", "245.0", "245"],
    ["penalidade", "245 20", "245"],
    ["penalidade", "245s", "245"],
    ["posicao", "", "2"],
    ["posicao", "1", "2"],
    ["posicao", "3", "2"],
    ["posicao", "0", "2"],
    ["posicao", "-2", "2"],
    ["posicao", "2a", "2"],
    ["posicao", "2.0", "2"],
    ["posicao", "segundo", "2"],
    ["ultrapassar", "", "148"],
    ["ultrapassar", "147", "148"],
    ["ultrapassar", "149", "148"],
    ["ultrapassar", "-148", "148"],
    ["ultrapassar", "148.5", "148"],
    ["ultrapassar", "148h", "148"],
    ["escolher", "", "B"],
    ["escolher", "A", "B"],
    ["escolher", "BB", "B"],
    ["escolher", "BA", "B"],
    ["escolher", "2", "B"],
    ["escolher", "B.", "B"],
  ];

  for (const [kind, typed, canonical] of rejected) {
    it(`rejects ${JSON.stringify(typed)} for ${kind} (${canonical})`, () => {
      const res = checkIcpcAnswer(kind, typed, canonical);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason.length).toBeGreaterThan(0);
      }
    });
  }
});
