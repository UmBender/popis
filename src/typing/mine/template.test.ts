import { describe, expect, it } from "vitest";
import { detectTemplate } from "./template";
import type { RepoFile } from "./types";

const OLD_HEADER = [
  "#include <bits/stdc++.h>",
  "using namespace std;",
  "using ll = long long;",
  "#define int ll",
  "#define endl (char)10",
  "",
  "int32_t main() {",
  "\tios_base::sync_with_stdio(false);",
  "\tcin.tie(0);",
  "\tint n;",
  "\tcin >> n;",
  "\treturn 0;",
  "}",
].join("\n");

const NEW_HEADER = [
  "#include <bits/stdc++.h>",
  "using namespace std;",
  "using ll = long long;",
  "#define int ll",
  "using vi = vector<int>;",
  "using vvi = vector<vi>;",
  "using pii = pair<int, int>;",
  "",
  "int32_t main() {",
  "\tcin.tie(0)->sync_with_stdio(0);",
  "\tint n;",
  "\tcin >> n;",
  "\tcout << n << endl;",
  "\treturn 0;",
  "}",
].join("\n");

const ALT_RECENT_HEADER = [
  "#include <bits/stdc++.h>",
  "using namespace std;",
  "using i64 = long long;",
  "",
  "int main() {",
  "    ios::sync_with_stdio(false);",
  "    cin.tie(nullptr);",
  "    int x; cin >> x;",
  "}",
].join("\n");

describe("detectTemplate", () => {
  it("picks the most frequent header of the last 6 months, not of all time", () => {
    const files: RepoFile[] = [];
    for (let i = 1; i <= 10; i++) {
      files.push({
        path: `contest/${i}/a.cpp`,
        content: OLD_HEADER,
        createdAt: `2024-08-${String(i).padStart(2, "0")}T10:00:00-03:00`,
      });
    }
    for (let i = 180; i <= 183; i++) {
      files.push({
        path: `contest/${i}/a.cpp`,
        content: NEW_HEADER,
        createdAt: `2026-11-${String(i - 170).padStart(2, "0")}T10:00:00-03:00`,
      });
    }
    files.push(
      {
        path: "contest/170/a.cpp",
        content: ALT_RECENT_HEADER,
        createdAt: "2026-10-01T10:00:00-03:00",
      },
      {
        path: "contest/171/a.cpp",
        content: ALT_RECENT_HEADER,
        createdAt: "2026-10-02T10:00:00-03:00",
      },
    );

    const tpl = detectTemplate(files);

    expect(tpl).not.toBeNull();
    expect(tpl?.recentFileCount).toBe(4);
    expect(tpl?.canonicalPath).toBe("contest/183/a.cpp");
    expect(tpl?.code).toContain("using vi = vector<int>;");
    expect(tpl?.code).toContain("cin.tie(0)->sync_with_stdio(0);");
    expect(tpl?.code).not.toContain("(char)10");
    expect(tpl?.code).not.toContain("\t");
    expect(tpl?.code).not.toContain("cout << n");
  });

  it("groups whitespace variants of the same header and keeps the newest variant", () => {
    const spaced = [
      "// clang-format off",
      "#include <bits/stdc++.h>",
      "using namespace std;",
      "using ll = long long;",
      "#define int ll",
      "using vi = vector<int>;",
      "",
      "int32_t main() {",
      "    cin.tie(0)->sync_with_stdio(0);",
      "    return 0;",
      "}",
    ].join("\n");
    const compact = [
      "#include<bits/stdc++.h>",
      "using namespace std;",
      "using ll=long long;",
      "#define int ll",
      "using vi=vector<int>;",
      "",
      "int32_t main(){",
      "\tcin.tie(0)->sync_with_stdio(0);",
      "\tint a; cin>>a;",
      "\treturn 0;",
      "}",
    ].join("\n");

    const tpl = detectTemplate([
      { path: "contest/185/a.cpp", content: spaced, createdAt: "2026-11-18T10:00:00-03:00" },
      { path: "contest/186/a.cpp", content: compact, createdAt: "2026-11-21T10:00:00-03:00" },
    ]);

    expect(tpl).not.toBeNull();
    expect(tpl?.recentFileCount).toBe(2);
    expect(tpl?.canonicalPath).toBe("contest/186/a.cpp");
    expect(tpl?.firstSeen).toBe("2026-11-18");
    expect(tpl?.lastSeen).toBe("2026-11-21");
    expect(tpl?.code).not.toContain("//");
  });

  it("handles #ifdef LOCAL debug header blocks and solve-driver main", () => {
    const dbgHeader = [
      "#include <bits/stdc++.h>",
      "using namespace std;",
      "",
      "#ifdef LOCAL",
      "template <typename... T> void _dbg(const char *names, T &&...args) {",
      '    cerr << "[" << names << "] =";',
      "    ((cerr << ' ' << args), ...);",
      "    cerr << endl;",
      "}",
      "#define dbg(...) _dbg(#__VA_ARGS__, __VA_ARGS__)",
      "#else",
      "#define dbg(...)",
      "#endif",
      "",
      "using ll = long long;",
      "",
      "void solve() {",
      "    int n; cin >> n;",
      "    cout << n << endl;",
      "}",
      "",
      "int main() {",
      "    ios::sync_with_stdio(false);",
      "    cin.tie(nullptr);",
      "    int t = 1;",
      "    while (t--) solve();",
      "}",
    ].join("\n");

    const tpl = detectTemplate([
      { path: "contest/179/a.cpp", content: dbgHeader, createdAt: "2026-11-10T10:00:00-03:00" },
      { path: "contest/180/a.cpp", content: dbgHeader, createdAt: "2026-11-14T10:00:00-03:00" },
    ]);

    expect(tpl).not.toBeNull();
    expect(tpl?.code).toContain("#ifdef LOCAL");
    expect(tpl?.code).toContain('cerr << "[" << names << "] =";');
    expect(tpl?.code).toContain("ios::sync_with_stdio(false);");
    expect(tpl?.code).toContain("cin.tie(nullptr);");
    expect(tpl?.code).not.toContain("cout << n");
  });

  it("returns null when no C++ files with a header exist", () => {
    expect(detectTemplate([])).toBeNull();
    expect(
      detectTemplate([
        { path: "contest/163/a.py", content: "print(1)\n", createdAt: "2026-11-01T10:00:00-03:00" },
      ]),
    ).toBeNull();
  });
});
