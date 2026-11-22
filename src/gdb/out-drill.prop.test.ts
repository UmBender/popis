import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { checkOutput } from "./check-output";
import { evalGdbCommand } from "./format";
import {
  GDB_OUT_KINDS,
  GDB_OUT_LEVELS,
  generateOutputItem,
  type GdbOutKind,
  type GdbOutLevel,
} from "./out-drill";

// T26 AC-5 property tests: every output drill kind and level produces deterministic,
// UB-free, float-free items whose canonical answer matches format.ts and passes checkOutput.

const RUNS = Number(process.env["FC_NUM_RUNS"] ?? 80);

function assertLevelBounds(
  kind: GdbOutKind,
  level: GdbOutLevel,
  lines: readonly string[],
  command: string,
  canonical: string,
) {
  const code = lines.join("\n");
  // Never uses floating-point types.
  expect(code, `${kind} L${String(level)} float check`).not.toMatch(/\b(float|double)\b/);
  // Never asks directly for concrete pointer addresses (non-null pointers must be masked as ADDR).
  if (kind === "ponteiro") {
    expect(canonical, `${kind} L${String(level)} unmasked addr`).not.toMatch(/0x[0-9a-f]{4,}/i);
  }
  // Every item is a short C++ program with main() and valid stop line.
  expect(code).toContain("int main()");
  expect(command.length).toBeGreaterThan(2);

  if (kind === "array" && level === 1) {
    // Level 1 arrays stay compact (no <repeats>).
    expect(canonical).not.toContain("<repeats");
  }
  if (kind === "string" && level === 1) {
    expect(canonical).not.toContain("<repeats");
  }
  if (kind === "struct" && level === 1) {
    // Level 1 structs are flat (no nested braces).
    const innerBraces = canonical.slice(1, -1);
    expect(innerBraces).not.toContain("{");
  }
}

describe("gdb output drill generator properties (AC-5)", () => {
  for (const kind of GDB_OUT_KINDS) {
    for (const level of GDB_OUT_LEVELS) {
      it(`kind "${kind}" level ${String(level)} generates deterministic, valid items accepted by checker`, () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 0x7fffffff }),
            fc.integer({ min: 0, max: 50 }),
            (seed, index) => {
              const item = generateOutputItem(seed, index, level, [kind]);

              expect(item.kind).toBe(kind);
              expect(item.level).toBe(level);
              expect(item.kc).toBe(`gdb.out.${kind}`);
              expect(item.stopLine).toBeGreaterThanOrEqual(1);
              expect(item.stopLine).toBeLessThanOrEqual(item.lines.length);
              expect(item.reason.length).toBeGreaterThan(10);

              // Canonical answer matches pure-TS memory+formatter model.
              const evaluated = evalGdbCommand(item.command, item.state);
              expect(evaluated.ok, `${kind} L${String(level)}: ${item.command}`).toBe(true);
              if (evaluated.ok) {
                expect(item.canonical).toBe(evaluated.output);
              }

              // Canonical answer passes the output checker (both bare and with $1 = for print).
              expect(
                checkOutput(item.canonical, item.canonical, { kind: item.commandKind }).ok,
              ).toBe(true);

              assertLevelBounds(kind, level, item.lines, item.command, item.canonical);

              // Deterministic: same seed + index + level + kinds -> identical item.
              const again = generateOutputItem(seed, index, level, [kind]);
              expect(again.command).toBe(item.command);
              expect(again.canonical).toBe(item.canonical);
              expect(again.lines).toEqual(item.lines);
              expect(again.stopLine).toBe(item.stopLine);
            },
          ),
          { numRuns: RUNS },
        );
      });
    }
  }
});
