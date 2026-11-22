import { describe, expect, it } from "vitest";
import { LANGUAGES } from "../corpus";
import {
  BURST_REPETITIONS,
  burstSummary,
  CPP_RULE_NAMES,
  generateBurst,
  PYTHON_RULE_NAMES,
} from "./index";

describe("burst mode", () => {
  it("a burst repeats one idiom 5 times", () => {
    expect(BURST_REPETITIONS).toBe(5);
    for (let seed = 0; seed < 100; seed++) {
      for (const langs of [["cpp"], ["python"], LANGUAGES] as const) {
        const burst = generateBurst(seed, langs);
        const lines = burst.text.split("\n");
        expect(burst.repetitions).toBe(5);
        expect(lines).toHaveLength(5);
        expect(lines.every((line) => line === burst.idiom)).toBe(true);
        expect(burst.idiom).toMatch(/^[\x20-\x7e]+$/);
        expect(burst.idiom).toMatch(/^\S.*\S$/);
        expect(burst.idiom.length).toBeLessThanOrEqual(60);
        expect(burst.id).toBe(`burst:${burst.language}:${burst.rule}:${String(seed)}`);
        expect(burst.seed).toBe(seed);
        expect(langs).toContain(burst.language);
        expect(generateBurst(seed, langs)).toEqual(burst);
      }
    }
  });

  it("burst covers all C++ and Python idiom rules and throws without languages", () => {
    const seenCpp = new Set<string>();
    const seenPy = new Set<string>();
    for (let seed = 0; seed < 300; seed++) {
      seenCpp.add(generateBurst(seed, ["cpp"]).rule);
      seenPy.add(generateBurst(seed, ["python"]).rule);
    }
    for (const rule of CPP_RULE_NAMES) {
      expect(seenCpp.has(rule), `missing C++ burst rule ${rule}`).toBe(true);
    }
    for (const rule of PYTHON_RULE_NAMES) {
      expect(seenPy.has(rule), `missing Python burst rule ${rule}`).toBe(true);
    }
    expect(() => generateBurst(1, [])).toThrow(RangeError);
  });

  it("burstSummary computes repetition times and last-to-first ratio", () => {
    const summary = burstSummary([2000, 1800, 1600, 1500, 1400]);
    expect(summary.timesMs).toEqual([2000, 1800, 1600, 1500, 1400]);
    expect(summary.ratio).toBeCloseTo(0.7, 10);

    expect(burstSummary([0, 100, 100, 100, 100])).toEqual({
      timesMs: [0, 100, 100, 100, 100],
      ratio: null,
    });
    expect(burstSummary([])).toEqual({ timesMs: [], ratio: null });
  });
});
