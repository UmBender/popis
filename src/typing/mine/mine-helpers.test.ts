import { describe, expect, it } from "vitest";
import { clusterSnippets } from "./cluster";
import { extractItems } from "./extract";
import { buildInventory } from "./inventory";
import { normalizeSnippet, stripComments, validateSnippetRules } from "./normalize";
import { mineLibrary } from "./output";
import { buildProfile } from "./profile";
import { compareCodePoints, compareRecency, parseTimestampMs } from "./recency";
import { detectTemplate } from "./template";
import { formatNormalizedTokens, tokenize } from "./tokenize";

describe("mine helper edge cases", () => {
  it("parses date-only, UTC, positive/negative offsets, and invalid timestamps", () => {
    expect(parseTimestampMs("not-a-date")).toBe(0);
    expect(parseTimestampMs("2026-11-21")).toBe(Date.UTC(2026, 10, 21));
    expect(parseTimestampMs("2026-11-21T12:00:00Z")).toBe(Date.UTC(2026, 10, 21, 12, 0, 0));
    expect(parseTimestampMs("2026-11-21T14:00:00+02:00")).toBe(Date.UTC(2026, 10, 21, 12, 0, 0));
    expect(parseTimestampMs("2026-11-21T09:00:00-03:00")).toBe(Date.UTC(2026, 10, 21, 12, 0, 0));
    expect(compareCodePoints("same", "same")).toBe(0);
    expect(
      compareRecency(
        { createdAt: "2026-11-21", path: "questions/b/main.cpp" },
        { createdAt: "2026-11-21", path: "questions/a/main.cpp" },
      ),
    ).toBeGreaterThan(0);
  });

  it("strips C++ block comments, escaped strings, Python triple quotes and collapses blank lines", () => {
    const cpp = [
      "",
      'string s = "a\\"/*keep*/b"; // trailing',
      "int x/*inline*/= 1;",
      "/* multi",
      "   line */",
      "",
      "",
      "int y = 2;",
      "",
    ].join("\n");
    const normCpp = normalizeSnippet(cpp, "cpp");
    expect(normCpp).toContain('"a\\"/*keep*/b"');
    expect(normCpp).not.toContain("trailing");
    expect(normCpp).not.toContain("multi");
    expect(normCpp).not.toContain("\n\n\n");

    const py = [
      'doc = """keep # inside',
      'still \\"inside\\" """ # strip me',
      "s = 'esc\\'quote' # also strip",
      "unclosed = 'abc",
      "x = 1",
    ].join("\n");
    const strippedPy = stripComments(py, "python");
    expect(strippedPy).toContain("keep # inside");
    expect(strippedPy).not.toContain("strip me");
    expect(strippedPy).not.toContain("also strip");

    expect(normalizeSnippet("   // only comment\n", "cpp")).toBe("");
    expect(validateSnippetRules("int x = 1;")).toEqual({ ok: true });
  });

  it("tokenizes Python triple quotes, escaped strings, and empty braces cleanly", () => {
    const pyTokens = tokenize('x = """hi\\n\\"there\\""""', "python");
    expect(pyTokens.some((t) => t.kind === "string")).toBe(true);
    expect(formatNormalizedTokens(tokenize("int f() {}", "cpp"))).toBe("int $0() {}");
  });

  it("handles empty atcoder files and multiple duplicates in inventory", () => {
    const body = "int main() { return 0; }\n";
    const inv = buildInventory([
      { path: "contest/33/a/atcoder/empty.hpp", content: "   \n", createdAt: "2025-01-01" },
      { path: "contest/1/a.cpp", content: body, createdAt: "2025-01-01" },
      { path: "contest/2/a.cpp", content: body, createdAt: "2025-01-02" },
      { path: "contest/3/a.cpp", content: body, createdAt: "2025-01-03" },
    ]);
    expect(inv.owned.map((f) => f.path)).toEqual(["contest/3/a.cpp"]);
    expect(inv.duplicates.map((d) => d.path)).toEqual(["contest/1/a.cpp", "contest/2/a.cpp"]);
  });

  it("handles multiline #define, __dbg helpers, nested #ifdef, headers without main, and tie-breakers", () => {
    const oldMacroHeader = [
      "#include <bits/stdc++.h>",
      "using namespace std;",
      "#ifdef LOCAL",
      "#if 1",
      "void trace() {}",
      "#endif",
      "#endif",
      "void __dbg() {",
      "    cerr << endl;",
      "}",
      "#define dbg(...) \\",
      "    do { \\",
      "        __dbg(__VA_ARGS__); \\",
      "    } while (0)",
    ].join("\n");
    const altHeader = [
      "#include <bits/stdc++.h>",
      "using namespace std;",
      "using ll = long long;",
    ].join("\n");

    // Header without main and newest file without a valid header (forces allExtracted fallback).
    const tpl = detectTemplate([
      { path: "algols/a.hpp", content: oldMacroHeader, createdAt: "2025-01-01" },
      { path: "algols/b.hpp", content: altHeader, createdAt: "2025-01-01" },
      { path: "algols/c.cpp", content: "int only_var = 1;\n", createdAt: "2026-11-21" },
    ]);
    expect(tpl).not.toBeNull();
    expect(tpl?.canonicalPath).toBe("algols/b.hpp");

    // Equal count + equal recency tie-breaks deterministically by header key.
    const tied = detectTemplate([
      { path: "algols/x.hpp", content: oldMacroHeader, createdAt: "2026-11-01" },
      { path: "algols/x.hpp", content: altHeader, createdAt: "2026-11-01" },
    ]);
    expect(tied).not.toBeNull();

    // C++ files with no valid header at all return null.
    expect(
      detectTemplate([
        { path: "algols/empty.cpp", content: "int x = 1;\n", createdAt: "2026-11-01" },
      ]),
    ).toBeNull();
  });

  it("extracts edge cases: POD structs skipped, unbalanced blocks, Python BFS, non-ASCII and short blocks", () => {
    const weirdCpp = [
      "struct Forward;",
      "struct Pod {",
      "    int a;",
      "    int b;",
      "    int c;",
      "};",
      "template <class T>",
      "template <class U>",
      "int ok_str(int x) {",
      '    string s = "a\\"{";',
      "    int y = x + 1;",
      "    return y * 2;",
      "}",
      "() {",
      "    int a = 1;",
      "    int b = 2;",
      "    int c = 3;",
      "}",
      "int non_ascii() {",
      '    string s = "árvore";',
      "    int a = 1;",
      "    int b = 2;",
      "    return a + b;",
      "}",
      "int tiny() {",
      "    return 1;",
      "}",
      "int few_tokens() {",
      "    ;",
      "    ;",
      "    ;",
      "}",
      "int main() {",
      "    auto ok = [&]() { return 1; };",
      "    while (x > 0) {",
      "        x--;",
      "        y++;",
      "        z++;",
      "    }",
      "}",
    ].join("\n");
    const unclosedStruct = "struct Broken {\n    int run() {\n        return 1;\n";

    const pyBfs = [
      "from collections import deque",
      "def bfs_run(adj, s):",
      "    q = deque([s])",
      "    vis = {s}",
      "",
      "    while q:",
      "        u = q.popleft()",
      "        for v in adj[u]:",
      "            if v not in vis:",
      "                vis.add(v)",
      "                q.append(v)",
      "    return vis",
      "",
      "while flag:",
      "    x += 1",
      "    y += 2",
      "    z += 3",
    ].join("\n");

    const items = extractItems([
      { path: "README.md", content: "# ignored\n", createdAt: "2026-11-01" },
      { path: "contest/1/weird.cpp", content: weirdCpp, createdAt: "2026-11-01" },
      { path: "contest/1/broken.cpp", content: unclosedStruct, createdAt: "2026-11-01" },
      { path: "algols/bfs.py", content: pyBfs, createdAt: "2026-11-01" },
    ]);

    expect(items.map((i) => `${i.language}:${i.kind}:${i.shortName}`)).toEqual([
      "cpp:function:ok_str",
      "python:function:bfs_run",
      "python:loop:bfs",
    ]);
  });

  it("clusters empty inputs, chains of 3 variants, mixed languages, same-file duplicates, and ties", () => {
    expect(clusterSnippets([])).toEqual([]);

    const loopBase = (extra: string) =>
      [
        "int main() {",
        "    int l = 0, r = 100, ans = 0;",
        "    while (l <= r) {",
        "        int mid = (l + r) / 2;",
        `        if (${extra}) { ans = mid; r = mid - 1; }`,
        "        else { l = mid + 1; }",
        "    }",
        "}",
      ].join("\n");

    // 3 variants forming a similarity triangle + Python snippet + two identical loops in one file
    const twoLoopsSameFile = [
      "int main() {",
      "    while (l <= r) {",
      "        int mid = (l + r) / 2;",
      "        if (mid * mid >= 10) { ans = mid; r = mid - 1; }",
      "        else { l = mid + 1; }",
      "    }",
      "    while (a <= b) {",
      "        int m = (a + b) / 2;",
      "        if (m * m >= 10) { res = m; b = m - 1; }",
      "        else { a = m + 1; }",
      "    }",
      "}",
    ].join("\n");

    const pyFn = [
      "def gcd_iter(a, b):",
      "    while b > 0:",
      "        a, b = b, a % b",
      "    return a",
    ].join("\n");

    const sameFileTies = [
      "int alpha(int n) {",
      "    vector<int> v(n);",
      "    for (int i = 0; i < n; i++) v[i] = i * 3 + 1;",
      "    return v[0] + v[n - 1];",
      "}",
      "int beta(int n) {",
      "    deque<int> d;",
      "    while (n > 0) { d.push_back(n % 7); n /= 7; }",
      "    return d.front() - d.back();",
      "}",
      "int beta(long long n) {",
      "    set<long long> st;",
      "    st.insert(n + 99);",
      "    return st.count(n) ? 1 : 0;",
      "}",
    ].join("\n");

    const clusters = clusterSnippets([
      { path: "contest/1/a.cpp", content: loopBase("mid * mid >= 10"), createdAt: "2026-10-01" },
      {
        path: "contest/2/a.cpp",
        content: loopBase("mid * mid >= 10 && mid > 0"),
        createdAt: "2026-10-02",
      },
      {
        path: "contest/3/a.cpp",
        content: loopBase("mid * mid >= 10 && mid > 0 && mid < 50"),
        createdAt: "2026-10-03",
      },
      { path: "contest/4/a.cpp", content: twoLoopsSameFile, createdAt: "2026-10-04" },
      { path: "algols/g.py", content: pyFn, createdAt: "2026-10-04" },
      { path: "algols/ties.cpp", content: sameFileTies, createdAt: "2026-10-05" },
    ]);

    expect(clusters.length).toBeGreaterThanOrEqual(3);
    expect(clusters.some((c) => c.language === "python")).toBe(true);
  });

  it("extracts macro, scientific, large-int, and limit constants in buildProfile and handles empty repos", () => {
    const profile = buildProfile([
      { path: "README.md", content: "ignored\n", createdAt: "2026-11-01" },
      {
        path: "contest/1/a.cpp",
        createdAt: "2026-11-01",
        content: [
          "#define MAX_VAL 998244353",
          "constexpr long long INF = 1e18;",
          "long long lim = LLONG_MAX;",
        ].join("\n"),
      },
    ]);
    const vals = profile.constants.map((c) => c.value);
    expect(vals).toContain("MAX_VAL");
    expect(vals).toContain("998244353");
    expect(vals).toContain("INF");
    expect(vals).toContain("1e18");
    expect(vals).toContain("LLONG_MAX");

    // Empty repo exercises no-template and no-snippets branches of output & report
    const emptyOut = mineLibrary([], { commitSha: "0000000" });
    expect(emptyOut.template).toBeNull();
    expect(emptyOut.files.map((f) => f.filename)).toEqual(["profile.json"]);
    expect(emptyOut.report).toContain("Nenhum template detectado.");
    expect(emptyOut.report).toContain("Nenhum trecho extraido.");

    // Filename collision disambiguation + Python .py extension
    const colliding = mineLibrary(
      [
        {
          path: "algols/a.cpp",
          createdAt: "2026-11-01",
          content: [
            "int helper(int n) {",
            "    vector<int> a(n);",
            "    for (int i = 0; i < n; i++) a[i] = i * 2 + 1;",
            "    return a[0] + 100;",
            "}",
          ].join("\n"),
        },
        {
          path: "algols/b.cpp",
          createdAt: "2026-11-02",
          content: [
            "int helper(int x) {",
            "    deque<int> q;",
            "    while (x > 0) { q.push_back(x % 10); x /= 10; }",
            "    return q.front() * 3;",
            "}",
          ].join("\n"),
        },
        {
          path: "algols/c.py",
          createdAt: "2026-11-03",
          content: [
            "def helper(n):",
            "    res = 0",
            "    for i in range(n):",
            "        res += i * i",
            "    return res",
          ].join("\n"),
        },
      ],
      { commitSha: "1111111" },
    );
    expect(colliding.files.map((f) => f.filename)).toEqual([
      "helper.cpp",
      "helper.py",
      "helper_2.cpp",
      "profile.json",
    ]);
  });
});
