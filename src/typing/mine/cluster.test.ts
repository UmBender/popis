import { describe, expect, it } from "vitest";
import { clusterSnippets, toShortName } from "./cluster";
import { extractItems } from "./extract";
import type { RepoFile } from "./types";

const FENWICK_A = [
  "#include <bits/stdc++.h>",
  "using namespace std;",
  "struct FenwickTree {",
  "    int n;",
  "    vector<int> tree;",
  "    FenwickTree(int n_) : n(n_ + 1), tree(n_ + 1, 0) {}",
  "    void add(int pos, int delta) {",
  "        for (pos++; pos < n; pos += pos & -pos) {",
  "            tree[pos] += delta;",
  "        }",
  "    }",
  "    int query(int right) {",
  "        int acc = 0;",
  "        for (right++; right > 0; right -= right & -right) {",
  "            acc += tree[right];",
  "        }",
  "        return acc;",
  "    }",
  "};",
].join("\n");

const FENWICK_B = [
  "#include <bits/stdc++.h>",
  "using namespace std;",
  "struct BIT {",
  "    int sz;",
  "    vector<int> bit;",
  "    BIT(int m) : sz(m + 1), bit(m + 1, 0) {}",
  "    void update(int idx, int val) {",
  "        for (idx++; idx < sz; idx += idx & -idx) {",
  "            bit[idx] += val;",
  "        }",
  "    }",
  "    int sum(int r) {",
  "        int ans = 0;",
  "        for (r++; r > 0; r -= r & -r) {",
  "            ans += bit[r];",
  "        }",
  "        return ans;",
  "    }",
  "};",
].join("\n");

const DSU_CODE = [
  "#include <bits/stdc++.h>",
  "using namespace std;",
  "struct DSU {",
  "    vector<int> p;",
  "    int comps;",
  "    DSU(int n) : p(n, -1), comps(n) {}",
  "    int find(int x) {",
  "        while (p[x] >= 0) x = p[x];",
  "        return x;",
  "    }",
  "    bool unite(int a, int b) {",
  "        a = find(a); b = find(b);",
  "        if (a == b) return false;",
  "        if (p[a] > p[b]) swap(a, b);",
  "        p[a] += p[b]; p[b] = a; comps--;",
  "        return true;",
  "    }",
  "};",
].join("\n");

const SIEVE_CODE = [
  "#include <bits/stdc++.h>",
  "using namespace std;",
  "struct Sieve {",
  "    vector<int> primes, spf;",
  "    Sieve(int n) : spf(n, 0) {",
  "        for (int i = 2; i < n; i++) {",
  "            if (!spf[i]) spf[i] = i, primes.push_back(i);",
  "            for (int p : primes) {",
  "                if (p > spf[i] || i * p >= n) break;",
  "                spf[i * p] = p;",
  "            }",
  "        }",
  "    }",
  "};",
].join("\n");

describe("clusterSnippets", () => {
  it("near-identical Fenwick trees with renamed identifiers fall in one cluster", () => {
    const files: RepoFile[] = [
      { path: "contest/120/a.cpp", content: FENWICK_B, createdAt: "2025-05-01T10:00:00-03:00" },
      { path: "contest/180/e.cpp", content: FENWICK_A, createdAt: "2026-11-14T10:00:00-03:00" },
    ];

    const clusters = clusterSnippets(files);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.name).toBe("fenwick");
    expect(clusters[0]?.fileCount).toBe(2);
    expect(clusters[0]?.canonicalPath).toBe("contest/180/e.cpp");
    expect(clusters[0]?.canonicalCode).toContain("struct FenwickTree");
  });

  it("the canonical variant is the most recently created one, higher contest number breaking ties", () => {
    const sameDate = "2026-11-10T10:00:00-03:00";
    const files: RepoFile[] = [
      { path: "contest/10/a.cpp", content: FENWICK_B, createdAt: sameDate },
      { path: "contest/186/d.cpp", content: FENWICK_A, createdAt: sameDate },
      { path: "contest/90/b.cpp", content: FENWICK_B, createdAt: "2025-01-01T10:00:00-03:00" },
    ];

    const clusters = clusterSnippets(files);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.canonicalPath).toBe("contest/186/d.cpp");
    expect(clusters[0]?.firstSeen).toBe("2025-01-01");
    expect(clusters[0]?.lastSeen).toBe("2026-11-10");
  });

  it("clusters rank by file count then recency", () => {
    const files: RepoFile[] = [
      // Sieve: 3 files, older
      { path: "contest/10/a.cpp", content: SIEVE_CODE, createdAt: "2025-01-01T10:00:00-03:00" },
      { path: "contest/11/a.cpp", content: SIEVE_CODE, createdAt: "2025-01-02T10:00:00-03:00" },
      { path: "contest/12/a.cpp", content: SIEVE_CODE, createdAt: "2025-01-03T10:00:00-03:00" },
      // DSU: 2 files, newer
      { path: "contest/180/a.cpp", content: DSU_CODE, createdAt: "2026-11-01T10:00:00-03:00" },
      { path: "contest/181/a.cpp", content: DSU_CODE, createdAt: "2026-11-15T10:00:00-03:00" },
      // Fenwick: 2 files, older than DSU
      { path: "contest/100/a.cpp", content: FENWICK_A, createdAt: "2025-06-01T10:00:00-03:00" },
      { path: "contest/101/a.cpp", content: FENWICK_B, createdAt: "2025-06-02T10:00:00-03:00" },
    ];

    const clusters = clusterSnippets(files);

    expect(clusters.map((c) => c.name)).toEqual(["sieve", "dsu", "fenwick"]);
    expect(clusters.map((c) => c.fileCount)).toEqual([3, 2, 2]);
  });

  it("extracts template structs, free functions, named lambdas, binary search and BFS loops", () => {
    const rich = [
      "#include <bits/stdc++.h>",
      "using namespace std;",
      "template <class T>",
      "struct Segtree {",
      "    int n;",
      "    vector<T> t;",
      "    Segtree(int n_) : n(n_), t(2 * n_) {}",
      "    void set(int i, T x) { t[i += n] = x; }",
      "};",
      "long long fastExp(long long a, long long b, long long mod) {",
      "    long long res = 1;",
      "    while (b > 0) {",
      "        if (b & 1) res = res * a % mod;",
      "        a = a * a % mod;",
      "        b >>= 1;",
      "    }",
      "    return res;",
      "}",
      "int main() {",
      "    auto check = [&](int x) -> bool {",
      "        int cnt = 0;",
      "        for (int i = 0; i < x; i++) cnt += i;",
      "        return cnt >= 10;",
      "    };",
      "    int l = 0, r = 100, ans = -1;",
      "    while (l <= r) {",
      "        int mid = l + (r - l) / 2;",
      "        if (check(mid)) {",
      "            ans = mid;",
      "            r = mid - 1;",
      "        } else {",
      "            l = mid + 1;",
      "        }",
      "    }",
      "    queue<int> q;",
      "    q.push(0);",
      "    while (!q.empty()) {",
      "        int u = q.front();",
      "        q.pop();",
      "        for (int v : adj[u]) {",
      "            if (!vis[v]) {",
      "                vis[v] = 1;",
      "                q.push(v);",
      "            }",
      "        }",
      "    }",
      "}",
    ].join("\n");

    const items = extractItems([
      { path: "contest/185/a.cpp", content: rich, createdAt: "2026-11-20T10:00:00-03:00" },
    ]);

    expect(items.map((i) => `${i.kind}:${i.shortName}`).sort()).toEqual([
      "function:fast_exp",
      "lambda:check",
      "loop:bfs",
      "loop:binary_search",
      "struct:segtree",
    ]);
  });

  it("extracts Python classes, functions and loops", () => {
    const py = [
      "class BIT:",
      "    def __init__(self, n):",
      "        self.t = [0] * (n + 1)",
      "    def add(self, i, d):",
      "        i += 1",
      "        while i < len(self.t):",
      "            self.t[i] += d",
      "            i += i & -i",
      "",
      "def fast_exp(a, b, mod):",
      "    res = 1",
      "    while b > 0:",
      "        if b & 1:",
      "            res = res * a % mod",
      "        a = a * a % mod",
      "        b >>= 1",
      "    return res",
      "",
      "def main():",
      "    l, r = 0, 100",
      "    while l <= r:",
      "        mid = (l + r) // 2",
      "        if mid * mid >= 50:",
      "            r = mid - 1",
      "        else:",
      "            l = mid + 1",
    ].join("\n");

    const items = extractItems([
      { path: "algols/BITPython/main.py", content: py, createdAt: "2025-02-01T10:00:00-03:00" },
    ]);

    expect(items.map((i) => `${i.kind}:${i.shortName}`).sort()).toEqual([
      "function:fast_exp",
      "loop:binary_search",
      "struct:fenwick",
    ]);
  });

  it("maps struct and function names to short names", () => {
    expect(toShortName("FenwickTree")).toBe("fenwick");
    expect(toShortName("BIT")).toBe("fenwick");
    expect(toShortName("DSU")).toBe("dsu");
    expect(toShortName("SegTree")).toBe("segtree");
    expect(toShortName("SegmentTree")).toBe("segtree");
    expect(toShortName("SparseTable")).toBe("sparse_table");
    expect(toShortName("fastExp")).toBe("fast_exp");
    expect(toShortName("MergeSortTree")).toBe("merge_sort_tree");
    expect(toShortName("CustomHelper")).toBe("custom_helper");
  });
});
