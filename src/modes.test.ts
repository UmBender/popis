import { describe, expect, it } from "vitest";
import { DEFAULT_FACTORING, factoring } from "./gen/factoring";
import { modeOfSkill } from "./gen/review";
import { isMode, MODE_IDS, MODES } from "./modes";

describe("mode registry", () => {
  it("lists the modes in menu order", () => {
    expect(MODE_IDS.slice(0, 3)).toEqual(["arithmetic", "factoring", "division"]);
  });

  it("each mode's generator has the mode's id", () => {
    for (const id of MODE_IDS) expect(MODES[id].generator.id).toBe(id);
  });

  it("only arithmetic follows zetamac without skipping or a text keyboard", () => {
    // T07 (ADR-T07-1): estimation answers with an option number, so it also
    // uses the numeric keyboard; it still skips with Enter.
    const NUMERIC: readonly string[] = ["arithmetic", "estimation"];
    for (const id of MODE_IDS) {
      expect(MODES[id].allowSkip).toBe(id !== "arithmetic");
      expect(MODES[id].numeric).toBe(NUMERIC.includes(id));
    }
  });

  it("each mode's defaults are valid and survive a JSON round trip", () => {
    for (const id of MODE_IDS) {
      const spec = MODES[id];
      expect(spec.validate(spec.defaults as never)).toEqual([]);
      expect(spec.parseSettings(JSON.parse(JSON.stringify(spec.defaults)))).toEqual(spec.defaults);
    }
  });

  it("each mode's skills start with the mode's id", () => {
    for (const id of MODE_IDS.filter((m) => m !== "review")) {
      const spec = MODES[id];
      for (let seed = 0; seed < 50; seed++) {
        const skill = spec.generator.generate(seed, spec.defaults as never).skill;
        expect(modeOfSkill(skill)).toBe(id);
      }
    }
  });

  it("review is the last mode and keeps no items in the settings", () => {
    expect(MODE_IDS.at(-1)).toBe("review");
    expect(MODES.review.label).toBe("Revisar");
    const item = { mode: "factoring", seed: 3, params: DEFAULT_FACTORING };
    expect(MODES.review.parseSettings({ items: [item] })).toEqual({ items: [] });
  });

  it("review generator replays problems of the registry's modes", () => {
    const item = { mode: "factoring", seed: 3, params: DEFAULT_FACTORING };
    const problem = MODES.review.generator.generate(1, { items: [item] });
    expect(problem).toEqual(factoring.generate(3, DEFAULT_FACTORING));
    expect(MODES.review.generator.check(problem, problem.answer)).toBe(true);
  });

  it("review generator does not replay review problems", () => {
    const item = { mode: "review", seed: 3, params: { items: [] } };
    expect(() => MODES.review.generator.generate(1, { items: [item] })).toThrow(RangeError);
  });

  it("sums is a skippable mode with a wide text answer", () => {
    expect(MODE_IDS).toContain("sums");
    expect(MODES.sums.label).toBe("Somatórios");
    expect(MODES.sums.allowSkip).toBe(true);
    expect(MODES.sums.numeric).toBe(false);
    expect(MODES.sums.wide).toBe(true);
    expect(MODES.sums.parseSettings({ kinds: ["loop", "loop"] })).toEqual({ kinds: ["loop"] });
    expect(MODES.sums.parseSettings({ kinds: ["chess"] })).toBeNull();
    expect(MODES.sums.validate({ kinds: [] })).toEqual(["no-kind"]);
  });

  it("isMode accepts registry ids only", () => {
    expect(isMode("division")).toBe(true);
    expect(isMode("chess")).toBe(false);
    expect(isMode(undefined)).toBe(false);
  });
});
