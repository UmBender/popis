import { describe, expect, it } from "vitest";
import {
  NEAR_MISS_CASES,
  SCRIPT_EQUIVALENT_CASES,
  SCRIPT_NEAR_MISS_CASES,
} from "./cases/near-misses";
import { checkShellCommand, equivalentForms, normalizeShell, SHELL_COMMAND_TABLE } from "./check";
import { parseShell } from "./parse";

// T39 AC-2: effect-based checker via normalized ASTs — accepts equivalent forms
// and rejects near misses with helpful Portuguese explanations.

describe("shell checker (AC-2)", () => {
  it("checker accepts equivalent command forms", () => {
    const cases: readonly (readonly [string, string, { readonly allowSemicolon?: boolean }?])[] = [
      // g++ flag order, -o position, sanitizer order
      ["g++ -Wall -Wextra -Wshadow a.cpp -o a", "g++ -Wshadow -Wextra -Wall -o a a.cpp"],
      ["g++ -O2 -std=gnu++20 a.cpp -o a", "g++ -o a -std=gnu++20 -O2 a.cpp"],
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
      [
        "for i in $(seq 1 50); do ./gen $i > in; done",
        "for i in $(seq 50); do ./gen $i > in; done",
      ],
      // source vs .
      ["source ~/.bashrc", ". ~/.bashrc"],
      // && vs ; when item does not require stopping on error
      ["mkdir -p tmp && cp a.cpp tmp/", "mkdir -p tmp; cp a.cpp tmp/", { allowSemicolon: true }],
    ];

    for (const [canonical, alt, options] of cases) {
      const res = checkShellCommand(alt, { accepted: [canonical], options });
      expect(
        res.ok,
        `"${alt}" should match "${canonical}" (got ${res.ok ? "ok" : res.reason})`,
      ).toBe(true);
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

    // Exercise edge-case normalizations and diagnostic reasons.
    expect(
      checkShellCommand("g++ -oa -x c++ a.cpp", { accepted: ["g++ -x c++ a.cpp -o a"] }).ok,
    ).toBe(true);
    expect(checkShellCommand("head --lines 5 out1", { accepted: ["head -n 5 out1"] }).ok).toBe(
      true,
    );
    expect(checkShellCommand("grep -- -n file", { accepted: ["grep -- -n file"] }).ok).toBe(true);
    expect(checkShellCommand("grep --unknown file", { accepted: ["grep --unknown file"] }).ok).toBe(
      true,
    );
    expect(
      checkShellCommand("./a 2>&1 < in1 > out1", { accepted: ["./a < in1 2>&1 > out1"] }).ok,
    ).toBe(true);
    expect(checkShellCommand("time ./a", { accepted: ["time ./a"] }).ok).toBe(true);
    expect(checkShellCommand("timeout 2", { accepted: ["timeout 2s"] }).ok).toBe(true);
    expect(checkShellCommand("seq 1 a", { accepted: ["seq 1 a"] }).ok).toBe(true);
    expect(checkShellCommand("alias x='123'", { accepted: ["alias x='123'"] }).ok).toBe(true);
    expect(checkShellCommand("g++ -o", { accepted: ["g++ -o"] }).ok).toBe(true);
    expect(checkShellCommand("head -n", { accepted: ["head -n"] }).ok).toBe(true);

    const swapInOut = checkShellCommand("./a < out1", { accepted: ["./a > out1"] });
    expect(swapInOut.ok).toBe(false);
    const missW = checkShellCommand("diff out1 ans1", { accepted: ["diff -w out1 ans1"] });
    expect(missW.ok).toBe(false);
    const missGlib = checkShellCommand("g++ -std=gnu++20 a.cpp -o a", {
      accepted: ["g++ -std=gnu++20 -D_GLIBCXX_DEBUG a.cpp -o a"],
    });
    expect(missGlib.ok).toBe(false);
    const customHint = checkShellCommand("echo a", {
      accepted: ["echo b"],
      options: { hint: "dica personalizada" },
    });
    expect(customHint).toEqual({ ok: false, reason: "dica personalizada" });

    expect(equivalentForms("./a > all.log 2>&1")).toContain("./a &> all.log");
    expect(equivalentForms("./a < in1")).toContain("./a <in1");
    expect(
      equivalentForms("g++ -g -fsanitize=address,undefined a.cpp -o a").length,
    ).toBeGreaterThan(0);

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

// T54 AC-2: script forms accepted as equal and script near misses rejected.

describe("shell checker scripts (T54 AC-2)", () => {
  it("checker accepts equivalent script forms", () => {
    expect(SCRIPT_EQUIVALENT_CASES.length).toBeGreaterThanOrEqual(6);
    for (const c of SCRIPT_EQUIVALENT_CASES) {
      const res = checkShellCommand(c.equivalent, { accepted: [c.canonical], options: c.options });
      expect(res.ok, `${c.id}: got ${res.ok ? "ok" : res.reason}`).toBe(true);
      const rev = checkShellCommand(c.canonical, { accepted: [c.equivalent], options: c.options });
      expect(rev.ok, `${c.id} reversed`).toBe(true);
    }
  });

  it("checker rejects script near misses", () => {
    expect(SCRIPT_NEAR_MISS_CASES.length).toBeGreaterThanOrEqual(8);
    for (const c of SCRIPT_NEAR_MISS_CASES) {
      const expected = { accepted: [c.canonical], options: c.options };
      expect(checkShellCommand(c.canonical, expected).ok, `canonical ${c.id}`).toBe(true);
      const res = checkShellCommand(c.nearMiss, expected);
      expect(res.ok, `near miss ${c.id} ("${c.nearMiss}") must be rejected`).toBe(false);
      if (!res.ok) {
        expect(res.reason, c.id).toMatch(c.reasonMatch);
        expect(res.reason, c.id).not.toContain("`");
      }
    }

    // A different construct names both forms.
    const other = checkShellCommand("case $x in a) echo a;; esac", { accepted: ["cd contest"] });
    expect(other).toEqual({ ok: false, reason: expect.stringMatching(/cd.*case/) as string });
  });
});

describe("shell checker script normalization (T54 AC-2)", () => {
  it("checker normalizes every script construct consistently", () => {
    const same: readonly (readonly [string, string])[] = [
      ['echo "$(ls  in*)"', "echo $(ls in*)"],
      ['echo a"b$c"', "echo ab$c"],
      ["for f in ./ in*; do echo; done", "for f in ./ in*; do echo; done"],
      ["[[ ! $a -lt 2 ]]", "(( !(a < 2) ))"],
      ["[[ $a -lt 2 || $b -ge 3 ]]", "(( a < 2 || b >= 3 ))"],
      ['[[ "$a" -eq 1 ]]', "(( a == 1 ))"],
      ["[[ ! -f a && $x -lt ${y:-1} ]]", "[[ ! -f a && $x -lt ${y:-1} ]]"],
      ["[[ x$a -lt 2 ]]", "[[ x$a -lt 2 ]]"],
      [
        'if [[ -f a ]]; then echo "$x"; else echo b; fi',
        "if [[ -f a ]]; then echo $x; else echo b; fi",
      ],
      ['until [[ -f a ]]; do echo "$x"; done', "until [[ -f a ]]; do echo $x; done"],
      ['case "$1" in a) echo "$x";; *) ;; esac', "case $1 in a) echo $x;; *) ;; esac"],
      [
        'for (( i=0; i<2; i++ )); do echo "$i"; done',
        "for (( i = 0; i < 2; i++ )); do echo $i; done",
      ],
      ['{ echo "$a"; } > out', "{ echo $a; } >out"],
    ];
    for (const [a, b] of same) {
      const res = checkShellCommand(a, { accepted: [b] });
      expect(res.ok, `"${a}" vs "${b}": ${res.ok ? "" : res.reason}`).toBe(true);
    }
  });

  it("checker diagnoses differences inside script constructs", () => {
    const cases: readonly (readonly [string, string, RegExp])[] = [
      ["if [[ -f a ]]; then echo b; fi", "if [[ -f a ]]; then echo a; fi", /diferentes/],
      ["until false; do ls; done", "until false; do cd x; done", /esperado cd, mas você usou ls/],
      ["case $x in a) ls;; esac", "case $x in a) cd x;; esac", /esperado cd/],
      ["case $x in a) ;; esac", "case $x in a) cd;; b) ls;; esac", /diferentes/],
      ["for (( ;; )); do ls; done", "for (( ;; )); do cd; done", /esperado cd/],
      ["{ ls; } > a", "{ cd; } > a", /esperado cd/],
      ["ls | wc", "(( 1 ))", /esperado \(\( \)\), mas você usou ls/],
      ["[[ -f a ]]", "{ ls; }", /esperado \{ \}, mas você usou \[\[ \]\]/],
      ["f() { ls; }", "ls | wc", /esperado ls, mas você usou uma função/],
      ["while true; do ls; done", "for (( ;; )); do ls; done", /esperado for, mas você usou while/],
      ["{ ls; } > a", "while true; do ls; done > a", /while/],
      ['echo "$a"', "cat $a", /esperado cat/],
      ["[[ $1 > 2 ]]", "[[ $1 > 3 ]]", /diferentes/],
      ["exit", "exit 0", /diferentes/],
      // ./$x may differ from $x when $x is an absolute path.
      ["for f in ./$x; do echo; done", "for f in $x; do echo; done", /diferentes/],
      ["for f in ./in*; do echo $f; done", "for f in ./in*; do echo $f; done x", /./],
    ];
    for (const [typed, canonical, pattern] of cases) {
      const res = checkShellCommand(typed, { accepted: [canonical] });
      expect(res.ok, `${typed} vs ${canonical}`).toBe(false);
      if (!res.ok) expect(res.reason, `${typed} vs ${canonical}`).toMatch(pattern);
    }

    // Strict quotes accept a quoted test operand and a quoted redirect target.
    expect(
      checkShellCommand('[[ -f "$1" ]] && cat < "$1"', {
        accepted: ['[[ -f "$1" ]] && cat < "$1"'],
        options: { strictQuotes: true },
      }).ok,
    ).toBe(true);
    const bareRedir = checkShellCommand("cat < $1 2>&1", {
      accepted: ['cat < "$1" 2>&1'],
      options: { strictQuotes: true },
    });
    expect(bareRedir.ok).toBe(false);
    const bareTest = checkShellCommand("[[ -f $1 && $1 == x ]]", {
      accepted: ['[[ -f "$1" && "$1" == x ]]'],
      options: { strictQuotes: true },
    });
    expect(bareTest).toEqual({ ok: false, reason: expect.stringMatching(/aspas/) as string });
  });
});
