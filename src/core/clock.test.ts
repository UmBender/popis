import { describe, expect, it } from "vitest";
import { manualClock, systemClock } from "./clock";

describe("systemClock", () => {
  it("now never goes backwards", () => {
    const a = systemClock.now();
    const b = systemClock.now();
    expect(b).toBeGreaterThanOrEqual(a);
  });

  it("wallTime is an epoch timestamp after 2025", () => {
    expect(Number.isInteger(systemClock.wallTime())).toBe(true);
    expect(systemClock.wallTime()).toBeGreaterThan(1_735_689_600_000);
  });
});

describe("manualClock", () => {
  it("moves only when advanced", () => {
    const clock = manualClock(100);
    expect(clock.now()).toBe(100);
    clock.advance(250);
    expect(clock.now()).toBe(350);
    expect(clock.wallTime()).toBe(350);
  });
});
