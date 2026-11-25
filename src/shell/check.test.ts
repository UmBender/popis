import { describe, expect, it } from "vitest";
import { NEAR_MISS_CASES } from "./cases/near-misses";
import { checkShellCommand, equivalentForms, normalizeShell, SHELL_COMMAND_TABLE } from "./check";
import { parseShell } from "./parse";

// T39 AC-2: effect-based checker via normalized ASTs — accepts equivalent forms
// and rejects near misses with helpful Portuguese explanations.

describe("shell checker (AC-2)", () => {
  it("checker accepts equivalent command forms", () => {
    const cases: readonly (readonly [
      string,
      string,
      { readonly allowSemicolon?: boolean }?,
    ])[] = [
      // g++ flag order, -o position, sanitizer order
      [
        "g++ -Wall -Wextra -Wshadow a.cpp -o a",
        "g++ -Wshadow -Wextra -Wall -o a a.cpp",
      ],
      [
        "g++ -O2 -std=gnu++20 a.cpp -o a",
        "g++ -o a -std=gnu++20 -O2 a.cpp",
      ],
      [
        "g++ -g -fsanitize=address,undefined a.cpp -o a",
        "g++ -fsanitize=undefined,address -g -o a a.cpp",
      ],
      // diff long vs short flags
      ["diff -Z out1 ans1", "diff --ignore-trailing-space out1 ans1"],
      ["diff -w out1 ans1", "diff --ignore-all-space out1 ans1"],
      ["diff -u out1 ans1", "diff --unified out1 ans1"],
      // cmp short vs long
      ["cmp -s out1 ans1", "cmp --silent out1 ans1"],
      ["cmp -s out1 ans1", "cmp --quiet out1 ans1"],
      // redirection order and spacing
      ["./a < in1 > out1", "./a >out1 <in1"],
      ["./a < in1 > out1", "< in1 ./a > out1"],
      ["./a > all.log 2>&1", "./a &> all.log"],
      // grouped vs separate short flags
      ["ls -la", "ls -a -l"],
      ["ls -la", "ls -al"],
      ["ls -lh", "ls --human-readable -l"],
      ["mkdir -p a/b", "mkdir --parents a/b"],
      ["rm -rf tmp", "rm -f -r tmp"],
      ["cp -r src dst", "cp --recursive src dst"],
      ["head -n 10 out1", "head -n10 out1"],
      ["head -n 10 out1", "head --lines=10 out1"],
      ["head -n 10 out1", "head -10 out1"],
      ["tail -n 20 log.txt", "tail -20 log.txt"],
      ["wc -l out1", "wc --lines out1"],
      ["sort -nr nums.txt", "sort -r -n nums.txt"],
      ["sort -nr nums.txt", "sort --reverse --numeric-sort nums.txt"],
      ["uniq -c words.txt", "uniq --count words.txt"],
      ["grep -in err log.txt", "grep -n -i err log.txt"],
      // timeout seconds suffix
      ["timeout 2 ./a < in1", "timeout 2s ./a <in1"],
      // seq 1 N vs seq N
      ["for i in $(seq 1 50); do ./gen $i > in; done", "for i in $(seq 50); do ./gen $i > in; done"],
      // source vs .
      ["source ~/.bashrc", ". ~/.bashrc"],
      // && vs ; when item does not require stopping on error
      ["mkdir -p tmp && cp a.cpp tmp/", "mkdir -p tmp; cp a.cpp tmp/", { allowSemicolon: true }],
    ];

    for (const [canonical, alt, options] of cases) {
      const res = checkShellCommand(alt, { accepted: [canonical], options });
      expect(res.ok, `"${alt}" should match "${canonical}" (got ${res.ok ? "ok" : res.reason})`).toBe(
        true,
      );
      const rev = checkShellCommand(canonical, { accepted: [alt], options });
      expect(rev.ok, `"${canonical}" should match "${alt}"`).toBe(true);
    }
  });

  it("checker rejects near misses", () => {
    expect(NEAR_MISS_CASES.length).toBeGreaterThanOrEqual(8);
    for (const c of NEAR_MISS_CASES) {
      const canonRes = checkShellCommand(c.canonical, {
        accepted: [c.canonical],
        options: c.options,
      });
      expect(canonRes.ok, `canonical for ${c.id} should pass`).toBe(true);

      const missRes = checkShellCommand(c.nearMiss, {
        accepted: [c.canonical],
        options: c.options,
      });
      expect(missRes.ok, `near miss ${c.id} ("${c.nearMiss}") must be rejected`).toBe(false);
      if (!missRes.ok) {
        expect(missRes.reason, `reason for ${c.id}`).toMatch(c.reasonMatch);
      }
    }

    // Semicolon rejected when && is required to stop on error.
    const strictAnd = checkShellCommand("g++ -O2 a.cpp -o a; ./a < in1", {
      accepted: ["g++ -O2 a.cpp -o a && ./a < in1"],
    });
    expect(strictAnd.ok).toBe(false);

    // 2>&1 before > out is NOT equivalent to > out 2>&1.
    const wrongRedirOrder = checkShellCommand("./a 2>&1 > all.log", {
      accepted: ["./a > all.log 2>&1"],
    });
    expect(wrongRedirOrder.ok).toBe(false);
  });

  it("equivalentForms generates accepted alternatives and SHELL_COMMAND_TABLE covers known commands", () => {
    const alts = equivalentForms("g++ -Wall -Wextra a.cpp -o a");
    expect(alts.length).toBeGreaterThan(0);
    for (const alt of alts) {
      expect(checkShellCommand(alt, { accepted: ["g++ -Wall -Wextra a.cpp -o a"] }).ok).toBe(true);
    }

    const parsed = parseShell("ls -la");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const norm = normalizeShell(parsed.node);
      expect(norm.kind).toBe("command");
    }

    const keys = SHELL_COMMAND_TABLE.map((c) => c.key);
    for (const required of [
      "g++",
      "diff",
      "cmp",
      "timeout",
      "time",
      "ulimit",
      "head",
      "tail",
      "wc",
      "sort",
      "uniq",
      "grep",
      "cat",
      "seq",
      "cp",
      "mv",
      "mkdir",
      "ls",
      "cd",
    ]) {
      expect(keys, `missing ${required}`).toContain(required);
    }
  });
});
