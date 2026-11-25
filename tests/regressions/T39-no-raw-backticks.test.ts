// Bug: Shell Comandos prompts, lesson exercises and checker feedback contained raw
// Markdown backticks (`...`) that rendered literally in the monospace UI. Prompts,
// explanations and error feedback must not contain raw backtick characters.
import { describe, expect, it } from "vitest";
import { NEAR_MISS_CASES } from "../../src/shell/cases/near-misses";
import { checkShellCommand } from "../../src/shell/check";
import { SHELL_LESSONS } from "../../src/shell/curriculum";
import { generateShellItem, SHELL_DRILL_KINDS } from "../../src/shell/drill";

describe("regression T39 no-raw-backticks", () => {
  it("shell drill prompts, curriculum text and checker reasons contain no raw backticks", () => {
    for (const kind of SHELL_DRILL_KINDS) {
      for (let seed = 0; seed < 30; seed++) {
        const item = generateShellItem(seed, 0, [kind]);
        expect(item.prompt, `${kind} seed=${String(seed)}`).not.toContain("`");
      }
    }

    for (const lesson of SHELL_LESSONS) {
      expect(lesson.explanation, lesson.id).not.toContain("`");
      for (const ex of lesson.exercises) {
        expect(ex.prompt, lesson.id).not.toContain("`");
      }
    }

    for (const c of NEAR_MISS_CASES) {
      const res = checkShellCommand(c.nearMiss, { accepted: [c.canonical], options: c.options });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason, c.id).not.toContain("`");
    }

    const wrongCmd = checkShellCommand("echo hi", { accepted: ["rm -f debug.log"] });
    expect(wrongCmd.ok).toBe(false);
    if (!wrongCmd.ok) expect(wrongCmd.reason).not.toContain("`");

    const unsupported = checkShellCommand("case $x in a) echo a;; esac", { accepted: ["ls"] });
    expect(unsupported.ok).toBe(false);
    if (!unsupported.ok) expect(unsupported.reason).not.toContain("`");
  });
});
