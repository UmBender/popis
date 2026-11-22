import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { evalExpr } from "./expr";
import { T_INT, buildMemoryState } from "./memory";

// T26 AC-2 property tests: C division/remainder identity and unsigned wraparound.

const RUNS = Number(process.env["FC_NUM_RUNS"] ?? 300);

describe("gdb expression properties (AC-2)", () => {
  it("satisfies a / b * b + a % b == a for all non-zero b (avoiding INT_MIN / -1)", () => {
    const int32 = fc.integer({ min: -1_000_000, max: 1_000_000 });
    const nonZero = int32.filter((b) => b !== 0);

    fc.assert(
      fc.property(int32, nonZero, (a, b) => {
        const state = buildMemoryState([
          { name: "a", type: T_INT, value: a },
          { name: "b", type: T_INT, value: b },
        ]);
        const q = evalExpr("a / b", state);
        const r = evalExpr("a % b", state);
        const check = evalExpr("a / b * b + a % b", state);

        expect(q.kind).toBe("scalar");
        expect(r.kind).toBe("scalar");
        expect(check.kind).toBe("scalar");
        if (q.kind === "scalar" && r.kind === "scalar" && check.kind === "scalar") {
          expect(check.raw).toBe(BigInt(a));
          // Truncation toward zero: remainder has same sign as dividend when non-zero.
          if (r.raw !== 0n) {
            expect(r.raw > 0n).toBe(a > 0);
          }
          expect(r.raw < 0n ? -r.raw : r.raw).toBeLessThan(BigInt(Math.abs(b)));
        }
      }),
      { numRuns: RUNS },
    );
  });

  it("wraps negative integers modulo 2^32 under (unsigned) cast", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (k) => {
        const state = buildMemoryState([{ name: "k", type: T_INT, value: k }]);
        const res = evalExpr("(unsigned)(-k)", state);
        expect(res.kind).toBe("scalar");
        if (res.kind === "scalar") {
          expect(res.raw).toBe(0x1_0000_0000n - BigInt(k));
        }
      }),
      { numRuns: RUNS },
    );
  });
});
