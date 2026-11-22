import { describe, expect, it } from "vitest";
import { validateSnippetRules } from "./normalize";
import { mineLibrary } from "./output";
import type { RepoFile } from "./types";

const SAMPLE_REPO: readonly RepoFile[] = [
  {
    path: "contest/180/a.cpp",
    createdAt: "2026-11-14T10:00:00-03:00",
    content: [
      "#include <bits/stdc++.h>",
      "using namespace std;",
      "using ll = long long;",
      "#define int ll",
      "using vi = vector<int>;",
      "constexpr int MAXN = 2e5 + 100;",
      "constexpr int MOD = 1e9 + 7;",
      "// Fenwick comment with non-ASCII: árvore",
      "struct FenwickTree {",
      "\tint n;",
      "\tvi tree;",
      "\tFenwickTree(int n_) : n(n_ + 1), tree(n_ + 1, 0) {}",
      "\tvoid add(int pos, int delta) {",
      "\t\tfor (pos++; pos < n; pos += pos & -pos) tree[pos] += delta;   ",
      "\t}",
      "\tint query(int r) {",
      "\t\tint acc = 0;",
      "\t\tfor (r++; r > 0; r -= r & -r) acc += tree[r];",
      "\t\treturn acc;",
      "\t}",
      "};",
      "int32_t main() {",
      "\tcin.tie(0)->sync_with_stdio(0);",
      "\tint n;",
      "\tcin >> n;",
      "\tfor (int i = 0; i < n; i++) {",
      "\t\tcout << i << endl;",
      "\t}",
      "\treturn 0;",
      "}",
    ].join("\r\n"),
  },
  {
    path: "contest/181/b.cpp",
    createdAt: "2026-11-16T10:00:00-03:00",
    content: [
      "#include <bits/stdc++.h>",
      "using namespace std;",
      "using ll = long long;",
      "#define int ll",
      "using vi = vector<int>;",
      "constexpr int MAXN = 2e5 + 100;",
      "constexpr int MOD = 1e9 + 7;",
      "struct BIT {",
      "    int sz;",
      "    vi t;",
      "    BIT(int m) : sz(m + 1), t(m + 1, 0) {}",
      "    void add(int i, int d) {",
      "        for (i++; i < sz; i += i & -i) t[i] += d;",
      "    }",
      "    int sum(int r) {",
      "        int ans = 0;",
      "        for (r++; r > 0; r -= r & -r) ans += t[r];",
      "        return ans;",
      "    }",
      "};",
      "int32_t main() {",
      "    cin.tie(0)->sync_with_stdio(0);",
      "    int n;",
      "    cin >> n;",
      "    for (int i = 0; i < n; i++) {",
      "        cout << i << endl;",
      "    }",
      "    return 0;",
      "}",
    ].join("\n"),
  },
  {
    path: "contest/33/a/atcoder/dsu.hpp",
    createdAt: "2025-01-01T10:00:00-03:00",
    content: "namespace atcoder { struct dsu {}; }\n",
  },
  {
    path: "algols/copied_from_cp.cpp",
    createdAt: "2025-02-01T10:00:00-03:00",
    content: "// Source: https://cp-algorithms.com/graph/dijkstra.html\nvoid dijkstra() {}\n",
  },
  {
    path: "contest/10/dup.cpp",
    createdAt: "2024-07-01T10:00:00-03:00",
    content: [
      "#include <bits/stdc++.h>",
      "using namespace std;",
      "using ll = long long;",
      "#define int ll",
      "using vi = vector<int>;",
      "constexpr int MAXN = 2e5 + 100;",
      "constexpr int MOD = 1e9 + 7;",
      "struct BIT {",
      "    int sz;",
      "    vi t;",
      "    BIT(int m) : sz(m + 1), t(m + 1, 0) {}",
      "    void add(int i, int d) {",
      "        for (i++; i < sz; i += i & -i) t[i] += d;",
      "    }",
      "    int sum(int r) {",
      "        int ans = 0;",
      "        for (r++; r > 0; r -= r & -r) ans += t[r];",
      "        return ans;",
      "    }",
      "};",
      "int32_t main() {",
      "    cin.tie(0)->sync_with_stdio(0);",
      "    int n;",
      "    cin >> n;",
      "    for (int i = 0; i < n; i++) {",
      "        cout << i << endl;",
      "    }",
      "    return 0;",
      "}",
    ].join("\n"),
  },
];

describe("mineLibrary output and report", () => {
  it("output is byte-identical for the same input", () => {
    const a = mineLibrary(SAMPLE_REPO, { commitSha: "0f83f9e8688f444342982aa1cdf7e0719a85bd90" });
    const b = mineLibrary([...SAMPLE_REPO].reverse(), {
      commitSha: "0f83f9e8688f444342982aa1cdf7e0719a85bd90",
    });

    expect(a.files).toEqual(b.files);
    expect(a.report).toBe(b.report);
  });

  it("every written snippet passes the T32 snippet rules", () => {
    const out = mineLibrary(SAMPLE_REPO, { commitSha: "abc1234" });
    const snippets = out.files.filter(
      (f) => f.filename.endsWith(".cpp") || f.filename.endsWith(".py"),
    );

    expect(snippets.length).toBeGreaterThanOrEqual(2);
    expect(snippets.map((s) => s.filename)).toContain("template.cpp");
    expect(snippets.map((s) => s.filename)).toContain("fenwick.cpp");

    for (const snippet of snippets) {
      expect(validateSnippetRules(snippet.content)).toEqual({ ok: true });
      expect(snippet.content).not.toContain("//");
      expect(snippet.content).not.toContain("/*");
      expect(snippet.content).not.toContain("contest/");
    }
  });

  it("profile lists identifiers, idioms and constants with counts", () => {
    const out = mineLibrary(SAMPLE_REPO, { commitSha: "abc1234" });
    const profileFile = out.files.find((f) => f.filename === "profile.json");

    expect(profileFile).toBeDefined();
    const parsed = JSON.parse(profileFile?.content ?? "{}") as {
      identifiers: { value: string; count: number }[];
      idioms: { value: string; count: number }[];
      constants: { value: string; count: number }[];
    };

    expect(parsed.identifiers.length).toBeGreaterThan(0);
    expect(parsed.identifiers.length).toBeLessThanOrEqual(200);
    expect(parsed.identifiers.map((e) => e.value)).toContain("vi");
    expect(parsed.identifiers.every((e) => e.count > 0)).toBe(true);

    expect(parsed.idioms.length).toBeGreaterThan(0);
    expect(parsed.idioms.length).toBeLessThanOrEqual(100);
    expect(parsed.idioms.some((e) => e.value.includes("for (int $0 = 0; $0 < $1; $0++)"))).toBe(
      true,
    );

    expect(parsed.constants.length).toBeGreaterThan(0);
    const constNames = parsed.constants.map((e) => e.value);
    expect(constNames).toContain("MAXN");
    expect(constNames).toContain("MOD");
    expect(constNames).toContain("1e9 + 7");
  });

  it("report includes commit, inventory counts, snippet checkboxes and flagged files", () => {
    const sha = "0f83f9e8688f444342982aa1cdf7e0719a85bd90";
    const out = mineLibrary(SAMPLE_REPO, { commitSha: sha });

    expect(out.report).toContain(sha);
    expect(out.report).toContain("Do dono | 2");
    expect(out.report).toContain("De terceiros | 1");
    expect(out.report).toContain("Duplicados | 1");
    expect(out.report).toContain("Marcados | 1");
    expect(out.report).toContain("- [x] manter");
    expect(out.report).toContain("fenwick");
    expect(out.report).toContain("contest/181/b.cpp");
    expect(out.report).toContain("2026-11-14");
    expect(out.report).toContain("2026-11-16");
    expect(out.report).toContain("algols/copied_from_cp.cpp");
  });

  it("caps written snippets at maxSnippets (default 30) plus template.cpp and profile.json", () => {
    const files: RepoFile[] = [];
    const containers = [
      "vector<int>",
      "deque<int>",
      "set<int>",
      "multiset<int>",
      "queue<int>",
      "stack<int>",
    ];
    const ops = ["+=", "-=", "*=", "^=", "|=", "&="];
    for (let i = 0; i < 35; i++) {
      // Structurally distinct bodies with unique numeric literals and control flow
      // so each function stays in its own cluster.
      const c = containers[i % containers.length]!;
      const op = ops[Math.floor(i / containers.length) % ops.length]!;
      const k1 = 1000 + i * 37;
      const k2 = 2000 + i * 53;
      const k3 = 3000 + i * 71;
      const k4 = 4000 + i * 97;
      files.push({
        path: `algols/algo_${i}/main.cpp`,
        createdAt: `2026-10-${String((i % 28) + 1).padStart(2, "0")}T10:00:00-03:00`,
        content: [
          "#include <bits/stdc++.h>",
          "using namespace std;",
          `int algo_${i}(int x) {`,
          `    ${c} box;`,
          `    if (x > ${k1}) x ${op} ${k2};`,
          `    for (int t = ${k3}; t < ${k4}; t += ${i + 2}) x ^= t + ${i * 11 + 3};`,
          `    return x + ${k1 + k4} - ${k2};`,
          "}",
          "int main() {",
          "    cin.tie(0)->sync_with_stdio(0);",
          "}",
        ].join("\n"),
      });
    }

    const out = mineLibrary(files, { commitSha: "deadbeef" });
    const snippetFiles = out.files.filter(
      (f) => f.filename !== "template.cpp" && f.filename !== "profile.json",
    );

    expect(snippetFiles.length).toBe(30);
    expect(new Set(out.files.map((f) => f.filename)).size).toBe(out.files.length);
  });

  it("validateSnippetRules rejects CRLF, tabs, trailing spaces, non-ASCII, empty and oversized snippets", () => {
    expect(validateSnippetRules("int x = 1;\n")).toEqual({ ok: true });
    expect(validateSnippetRules("").ok).toBe(false);
    expect(validateSnippetRules("int x = 1;\r\n").ok).toBe(false);
    expect(validateSnippetRules("\tint x = 1;\n").ok).toBe(false);
    expect(validateSnippetRules("int x = 1;  \n").ok).toBe(false);
    expect(validateSnippetRules("int árvore = 1;\n").ok).toBe(false);
    expect(validateSnippetRules("x\n".repeat(301)).ok).toBe(false);
    expect(validateSnippetRules(`${"a".repeat(16385)}\n`).ok).toBe(false);
  });
});
