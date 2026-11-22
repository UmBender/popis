import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { checkCommand } from "./check";
import { GDB_CMD_KINDS, generateCommandItem } from "./cmd-drill";
import { programById } from "./programs";

// T25 AC-3: property tests for every gdb command drill kind across many seeds.

const NUM_RUNS = Number(process.env["FC_NUM_RUNS"] ?? 100);

describe("gdb command drill generator properties (AC-3)", () => {
  for (const kind of GDB_CMD_KINDS) {
    it(`${kind}: canonical answer and alternatives pass, targets are valid, and generation is deterministic`, () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 0x7fffffff }),
          fc.integer({ min: 0, max: 50 }),
          (seed, index) => {
            const item = generateCommandItem(seed, index, [kind]);
            const again = generateCommandItem(seed, index, [kind]);
            expect(again).toEqual(item);

            expect(item.kind).toBe(kind);
            expect(item.kc).toBe(`gdb.cmd.${kind}`);

            // Canonical answer and all alternatives pass the checker.
            const canonicalCheck = checkCommand(item.canonical, item.expected, item.context);
            expect(canonicalCheck.ok, `${kind} canonical "${item.canonical}"`).toBe(true);
            for (const alt of item.alternatives) {
              const altCheck = checkCommand(alt, item.expected, item.context);
              expect(altCheck.ok, `${kind} alt "${alt}"`).toBe(true);
            }

            // Program and stop state are internally consistent.
            const prog = programById(item.programId);
            expect(item.file).toBe(prog.file);
            expect(item.lines).toEqual(prog.lines);
            if (item.stop.line !== null) {
              expect(item.stop.line).toBeGreaterThanOrEqual(1);
              expect(item.stop.line).toBeLessThanOrEqual(prog.lines.length);
            }
            for (const bp of item.stop.breakpoints) {
              expect(bp.line).toBeGreaterThanOrEqual(1);
              expect(bp.line).toBeLessThanOrEqual(prog.lines.length);
            }
            if (item.stop.frames.length > 0) {
              expect(item.stop.currentFrame).toBeGreaterThanOrEqual(0);
              expect(item.stop.currentFrame).toBeLessThan(item.stop.frames.length);
            }

            // Expected action references valid line / function / variable in the program.
            const sourceText = prog.lines.join("\n");
            const action = item.expected;
            if (action.kind === "break" || action.kind === "advance" || action.kind === "until") {
              const at = action.at;
              if (at?.kind === "line") {
                expect(at.line).toBeGreaterThanOrEqual(1);
                expect(at.line).toBeLessThanOrEqual(prog.lines.length);
              } else if (at?.kind === "func") {
                expect(prog.functions.some((f) => f.name === at.func)).toBe(true);
              }
            }
            if (action.kind === "print" || action.kind === "display") {
              const ident = /^[a-zA-Z_]\w*/.exec(action.expr)?.[0];
              if (ident !== undefined) expect(sourceText).toContain(ident);
            }
            if (action.kind === "set-var") {
              expect(sourceText).toContain(action.target);
            }
          },
        ),
        { numRuns: NUM_RUNS },
      );
    });
  }
});
