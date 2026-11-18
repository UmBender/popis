import { describe, expect, it } from "vitest";
import { isMode, MODE_IDS, MODES } from "./modes";

describe("mode registry", () => {
  it("lists the modes in menu order", () => {
    expect(MODE_IDS.slice(0, 3)).toEqual(["arithmetic", "factoring", "division"]);
  });

  it("each mode's generator has the mode's id", () => {
    for (const id of MODE_IDS) expect(MODES[id].generator.id).toBe(id);
  });

  it("only arithmetic follows zetamac without skipping or a text keyboard", () => {
    for (const id of MODE_IDS) {
      expect(MODES[id].allowSkip).toBe(id !== "arithmetic");
      expect(MODES[id].numeric).toBe(id === "arithmetic");
    }
  });

  it("each mode's defaults are valid and survive a JSON round trip", () => {
    for (const id of MODE_IDS) {
      const spec = MODES[id];
      expect(spec.validate(spec.defaults as never)).toEqual([]);
      expect(spec.parseSettings(JSON.parse(JSON.stringify(spec.defaults)))).toEqual(spec.defaults);
    }
  });

  it("isMode accepts registry ids only", () => {
    expect(isMode("division")).toBe(true);
    expect(isMode("chess")).toBe(false);
    expect(isMode(undefined)).toBe(false);
  });
});
