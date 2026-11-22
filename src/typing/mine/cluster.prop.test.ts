import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { clusterSnippets } from "./cluster";
import type { RepoFile } from "./types";

const identArb = fc.stringMatching(/^[a-z][a-z0-9_]{2,7}$/).map((s) => `usr_${s}`);

function makeFenwick(
  structName: string,
  sizeVar: string,
  arrVar: string,
  addFn: string,
  idxVar: string,
  deltaVar: string,
  sumFn: string,
  accVar: string,
): string {
  return [
    "#include <bits/stdc++.h>",
    "using namespace std;",
    `struct ${structName} {`,
    `    int ${sizeVar};`,
    `    vector<int> ${arrVar};`,
    `    ${structName}(int m) : ${sizeVar}(m + 1), ${arrVar}(m + 1, 0) {}`,
    `    void ${addFn}(int ${idxVar}, int ${deltaVar}) {`,
    `        for (${idxVar}++; ${idxVar} < ${sizeVar}; ${idxVar} += ${idxVar} & -${idxVar}) {`,
    `            ${arrVar}[${idxVar}] += ${deltaVar};`,
    "        }",
    "    }",
    `    int ${sumFn}(int r) {`,
    `        int ${accVar} = 0;`,
    "        for (r++; r > 0; r -= r & -r) {",
    `            ${accVar} += ${arrVar}[r];`,
    "        }",
    `        return ${accVar};`,
    "    }",
    "};",
  ].join("\n");
}

const POOL: readonly RepoFile[] = [
  {
    path: "contest/100/a.cpp",
    createdAt: "2025-04-01T10:00:00-03:00",
    content: makeFenwick("BIT", "n", "bit", "add", "i", "d", "sum", "s"),
  },
  {
    path: "contest/180/e.cpp",
    createdAt: "2026-11-14T10:00:00-03:00",
    content: makeFenwick("FenwickTree", "sz", "tree", "update", "pos", "delta", "query", "acc"),
  },
  {
    path: "contest/173/d.cpp",
    createdAt: "2026-10-28T10:00:00-03:00",
    content: [
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
    ].join("\n"),
  },
  {
    path: "questions/sieve/main.cpp",
    createdAt: "2026-10-20T10:00:00-03:00",
    content: [
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
    ].join("\n"),
  },
  {
    path: "contest/186/b.cpp",
    createdAt: "2026-11-21T10:00:00-03:00",
    content: [
      "#include <bits/stdc++.h>",
      "using namespace std;",
      "int main() {",
      "    int l = 0, r = 100;",
      "    while (l <= r) {",
      "        int mid = (l + r) / 2;",
      "        if (mid * mid >= 42) r = mid - 1;",
      "        else l = mid + 1;",
      "    }",
      "}",
    ].join("\n"),
  },
];

describe("clusterSnippets properties", () => {
  it("renaming user identifiers does not change the cluster assignment", () => {
    const distinctIdents = fc.uniqueArray(identArb, { minLength: 8, maxLength: 8 });
    fc.assert(
      fc.property(distinctIdents, (names) => {
        const [s, sz, arr, add, idx, delta, sum, acc] = names as [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ];
        const original: RepoFile = {
          path: "contest/150/a.cpp",
          createdAt: "2026-06-01T10:00:00-03:00",
          content: makeFenwick("FenwickTree", "n", "tree", "add", "pos", "delta", "query", "acc"),
        };
        const renamed: RepoFile = {
          path: "contest/180/a.cpp",
          createdAt: "2026-11-14T10:00:00-03:00",
          content: makeFenwick(s, sz, arr, add, idx, delta, sum, acc),
        };
        const dsu = POOL[2]!;

        const clusters = clusterSnippets([original, renamed, dsu]);
        expect(clusters).toHaveLength(2);
        const grouped = clusters.find((c) => c.fileCount === 2);
        expect(grouped).toBeDefined();
        expect(grouped?.variantPaths).toEqual(["contest/150/a.cpp", "contest/180/a.cpp"]);
      }),
    );
  });

  it("cluster output does not depend on the input file order", () => {
    const perm = fc.shuffledSubarray([...POOL], { minLength: POOL.length, maxLength: POOL.length });
    fc.assert(
      fc.property(perm, perm, (orderA, orderB) => {
        expect(clusterSnippets(orderA)).toEqual(clusterSnippets(orderB));
      }),
    );
  });
});
