import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { checkShellCommand } from "./check";
import { generateShellItem, SHELL_DRILL_KINDS } from "./drill";
import { parseShell, wordText, type ShellNode } from "./parse";

// T39 AC-3: property tests for the Shell commands drill generator.
// For many seeds and every kind:
//   1. the canonical answer (and every generated alternative) is accepted;
//   2. every file mentioned in the objective appears in the canonical answer;
//   3. the same seed produces the exact same item.

describe("shell drill generator properties (AC-3)", () => {
  it("canonical answer is accepted, mentioned files appear in the answer, and generation is deterministic", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: 0, max: 20 }),
        fc.constantFrom(...SHELL_DRILL_KINDS),
        (seed, index, kind) => {
          const item = generateShellItem(seed, index, [kind]);
          expect(item.kind).toBe(kind);
          expect(item.kc).toBe(`shell.${kind}`);
          expect(item.prompt.length).toBeGreaterThan(10);
          expect(item.files.length).toBeGreaterThan(0);

          // 1. Canonical answer is accepted.
          const res = checkShellCommand(item.canonical, item.expected);
          expect(res.ok, `${kind} seed=${seed} canonical="${item.canonical}"`).toBe(true);

          // Every generated equivalent alternative is also accepted.
          for (const alt of item.alternatives) {
            const altRes = checkShellCommand(alt, item.expected);
            expect(altRes.ok, `${kind} seed=${seed} alt="${alt}"`).toBe(true);
          }

          // 2. Files cited in the objective appear in the canonical answer.
          for (const file of item.mentionedFiles) {
            expect(item.prompt, `${kind} prompt mentions ${file}`).toContain(file);
            expect(item.canonical, `${kind} canonical includes ${file}`).toContain(file);
          }

          // 3. Determinism: same seed + index -> identical item.
          const again = generateShellItem(seed, index, [kind]);
          expect(again).toEqual(item);
        },
      ),
    );
  });
});

// T54 AC-5: the scripts kind drills one-line script constructs.

function usesScriptConstruct(node: ShellNode): boolean {
  switch (node.kind) {
    case "if":
    case "test":
    case "arith":
    case "forarith":
    case "funcdef":
    case "case":
    case "for":
    case "until":
      return true;
    case "command":
      return ["exit", "return", "local"].includes(wordText(node.words[0]!) ?? "");
    case "list":
      return usesScriptConstruct(node.first) || node.rest.some((r) => usesScriptConstruct(r.node));
    default:
      return false;
  }
}

describe("shell drill scripts kind (T54 AC-5)", () => {
  it("scripts items use a script construct", () => {
    expect(SHELL_DRILL_KINDS).toContain("scripts");
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: 0, max: 20 }),
        (seed, index) => {
          const item = generateShellItem(seed, index, ["scripts"]);
          expect(item.kc).toBe("shell.scripts");
          expect(item.canonical).not.toContain("\n");
          expect(item.prompt).not.toContain("`");
          const parsed = parseShell(item.canonical);
          expect(parsed.ok, item.canonical).toBe(true);
          if (parsed.ok) expect(usesScriptConstruct(parsed.node), item.canonical).toBe(true);
        },
      ),
    );
  });
});
