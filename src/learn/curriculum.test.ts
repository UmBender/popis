import { describe, expect, it } from "vitest";
import { nextFadingStep, nextUncompleted, unitStatus } from "./curriculum";

// T25 AC-7: shared curriculum progress and adaptive fading helpers used by Vim and GDB.

describe("learn curriculum helpers", () => {
  const unit = { lessons: [{ id: "a" }, { id: "b" }, { id: "c" }] };

  it("unitStatus reports new, in-progress and done", () => {
    expect(unitStatus(unit, new Set())).toBe("new");
    expect(unitStatus(unit, new Set(["a"]))).toBe("in-progress");
    expect(unitStatus(unit, new Set(["a", "b"]))).toBe("in-progress");
    expect(unitStatus(unit, new Set(["a", "b", "c"]))).toBe("done");
  });

  it("nextUncompleted returns the first unfinished lesson or null when all are done", () => {
    expect(nextUncompleted(unit.lessons, new Set())?.id).toBe("a");
    expect(nextUncompleted(unit.lessons, new Set(["a"]))?.id).toBe("b");
    expect(nextUncompleted(unit.lessons, new Set(["a", "b", "c"]))).toBeNull();
  });

  it("nextFadingStep skips the next help level on a first-try answer", () => {
    expect(nextFadingStep(0, true)).toBe(2);
    expect(nextFadingStep(0, false)).toBe(1);
    expect(nextFadingStep(1, true)).toBe("done");
    expect(nextFadingStep(1, false)).toBe(2);
    expect(nextFadingStep(2, true)).toBe("done");
    expect(nextFadingStep(2, false)).toBe("done");
  });
});
