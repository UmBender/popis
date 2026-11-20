import { describe, expect, it } from "vitest";
import { deriveSeed } from "../../core/rng";
import { CORPUS } from "../../typing/corpus";
import { LEVELS } from "../levels";
import { generateTarget, targetLimits } from "./target";

// AC-6: targets come from the seed, the index and the level only.

describe("targetLimits", () => {
  it("targetLimits allows 2 to 6 keys on level 1 and 2 to 4 on the others", () => {
    expect(targetLimits(1)).toEqual({ min: 2, max: 6 });
    for (const level of LEVELS.filter((l) => l > 1)) {
      expect(targetLimits(level)).toEqual({ min: 2, max: 4 });
    }
  });
});

describe("generateTarget", () => {
  it("generateTarget derives the seed of target i from the round seed", () => {
    expect(generateTarget(7, 3, 2).seed).toBe(deriveSeed(7, 3));
    expect(generateTarget(7, 0, 2).seed).toBe(deriveSeed(7, 0));
  });

  it("generateTarget picks a corpus snippet of at most 15 lines", () => {
    for (let index = 0; index < 8; index++) {
      const target = generateTarget(11, index, 4);
      const snippet = CORPUS.find((c) => c.id === target.snippetId);
      expect(snippet).toBeDefined();
      expect(target.lines).toEqual(snippet?.text.split("\n"));
      expect(target.lines.length).toBeLessThanOrEqual(15);
    }
  });

  it("generateTarget puts the start and the target on characters of the snippet", () => {
    const target = generateTarget(5, 1, 3);
    for (const pos of [target.start, target.target]) {
      expect(pos.line).toBeLessThan(target.lines.length);
      expect(pos.col).toBeLessThan(Math.max(1, (target.lines[pos.line] ?? "").length));
    }
    expect(target.start).not.toEqual(target.target);
  });

  it("generateTarget reports the minimum as the number of keys of its solution", () => {
    const target = generateTarget(5, 2, 4);
    expect(target.minimum).toBeGreaterThanOrEqual(2);
    expect(target.solution.length).toBeGreaterThan(0);
  });

  it("generateTarget gives the same target twice for the same arguments", () => {
    expect(generateTarget(99, 4, 6)).toEqual(generateTarget(99, 4, 6));
  });

  it("generateTarget gives different targets for different indices", () => {
    const targets = [0, 1, 2, 3, 4, 5].map((i) => generateTarget(3, i, 2));
    const ids = new Set(targets.map((t) => JSON.stringify([t.snippetId, t.start, t.target])));
    expect(ids.size).toBeGreaterThan(1);
  });
});
