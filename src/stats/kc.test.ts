import { describe, expect, it } from "vitest";
import type { TrainingEvent } from "./event";
import { kcCurve, kcStats } from "./kc";

function ev(kc: string, ok: boolean, timeMs: number, at: number, i = 0): TrainingEvent {
  return {
    at,
    drill: "calc",
    config: "arithmetic",
    kc,
    ok,
    timeMs,
    extra: { seed: 1, i },
  };
}

describe("kcCurve", () => {
  it("kcCurve computes error rate and median time per opportunity up to 20", () => {
    const events: TrainingEvent[] = [];
    for (let k = 0; k < 25; k++) {
      // Two KCs: kcA fails on first 2 opportunities, kcB always succeeds.
      events.push(ev("kcA", k >= 2, 2000 - k * 30, 1000 + k * 100, 0));
      events.push(ev("kcB", true, 1000 - k * 10, 1000 + k * 100, 1));
    }
    const curve = kcCurve(events);
    expect(curve).toHaveLength(20);
    expect(curve[0]).toEqual({ opportunity: 1, errorRate: 0.5, medianMs: 1500, count: 2 });
    expect(curve[2]).toEqual({ opportunity: 3, errorRate: 0, medianMs: 1460, count: 2 });
    expect(curve[19]?.opportunity).toBe(20);
  });

  it("kcCurve returns empty array when given no events", () => {
    expect(kcCurve([])).toEqual([]);
  });
});

describe("kcStats", () => {
  it("kcStats orders weaker KCs first by BIS", () => {
    const events: TrainingEvent[] = [
      // Fast & accurate KC
      ...Array.from({ length: 10 }, (_, i) => ev("fast-ok", true, 800, 1000 + i, i)),
      // Medium KC
      ...Array.from({ length: 10 }, (_, i) => ev("mid", i < 8, 1500, 2000 + i, i)),
      // Slow & inaccurate KC (weakest)
      ...Array.from({ length: 10 }, (_, i) => ev("slow-bad", i < 4, 3200, 3000 + i, i)),
    ];
    const stats = kcStats(events);
    expect(stats.map((s) => s.kc)).toEqual(["slow-bad", "mid", "fast-ok"]);
    expect(stats[0]?.bis).toBeLessThan(stats[1]?.bis ?? 0);
    expect(stats[1]?.bis).toBeLessThan(stats[2]?.bis ?? 0);
  });

  it("kcStats computes CV only with at least 10 hits and labels stable vs irregular", () => {
    const events: TrainingEvent[] = [
      // Only 9 hits -> cv is null
      ...Array.from({ length: 9 }, (_, i) => ev("few", true, 1000, 1000 + i, i)),
      // 10 steady hits -> cv <= 0.35 -> estável
      ...Array.from({ length: 10 }, (_, i) => ev("steady", true, 1000 + (i % 2) * 50, 2000 + i, i)),
      // 10 erratic hits -> cv > 0.35 -> irregular
      ...Array.from({ length: 10 }, (_, i) => ev("erratic", true, i % 2 === 0 ? 400 : 2600, 3000 + i, i)),
    ];
    const byKc = new Map(kcStats(events).map((s) => [s.kc, s]));
    expect(byKc.get("few")?.cv).toBeNull();
    expect(byKc.get("few")?.stability).toBeNull();
    expect(byKc.get("steady")?.cv).not.toBeNull();
    expect(byKc.get("steady")?.stability).toBe("estável");
    expect(byKc.get("erratic")?.cv).not.toBeNull();
    expect(byKc.get("erratic")?.stability).toBe("irregular");
  });

  it("kcStats handles a single KC without NaN", () => {
    const stats = kcStats([ev("only", true, 1200, 1000, 0)]);
    expect(stats).toHaveLength(1);
    expect(stats[0]?.bis).toBe(0);
    expect(stats[0]?.hitsPerMin).toBeCloseTo(50, 5);
  });
});
