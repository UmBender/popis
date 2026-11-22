import { describe, expect, it } from "vitest";
import { buildInventory } from "./inventory";
import type { RepoFile } from "./types";

const file = (
  path: string,
  content: string,
  createdAt = "2026-10-01T10:00:00-03:00",
): RepoFile => ({
  path,
  content,
  createdAt,
});

describe("buildInventory", () => {
  it("excludes vendored atcoder headers by folder and by content", () => {
    const aclDsu = [
      "#ifndef ATCODER_DSU_HPP",
      "#define ATCODER_DSU_HPP",
      "namespace atcoder {",
      "struct dsu { int n; };",
      "}",
      "#endif",
    ].join("\n");
    const aclExpander =
      "class Expander:\n    def expand(self, source: str) -> str:\n        return source\n";
    const ownerCode = "#include <bits/stdc++.h>\nint main() { return 0; }\n";

    const result = buildInventory([
      file("contest/33/a/atcoder/dsu.hpp", aclDsu),
      file("refs/atcoder/expander.py", aclExpander),
      file("algols/copied_dsu.hpp", `${aclDsu}\r\n`),
      file("contest/33/a/expander.py", aclExpander),
      file("contest/50/a/expanded_copy.cpp", "namespace atcoder {\nstruct modint {};\n}\n"),
      file("contest/180/a.cpp", ownerCode),
    ]);

    expect(result.owned.map((f) => f.path)).toEqual(["contest/180/a.cpp"]);
    expect(result.thirdParty.map((f) => f.path)).toEqual([
      "algols/copied_dsu.hpp",
      "contest/33/a/atcoder/dsu.hpp",
      "contest/33/a/expander.py",
      "contest/50/a/expanded_copy.cpp",
      "refs/atcoder/expander.py",
    ]);
    expect(result.flagged).toEqual([]);
  });

  it("flags files with an origin URL instead of including them", () => {
    const files: RepoFile[] = [
      file(
        "algols/cp_algo.cpp",
        "// Source: https://cp-algorithms.com/data_structures/fenwick.html\nstruct BIT {};\n",
      ),
      file("algols/kactl_flow.cpp", "// Adapted from KACTL\nstruct Dinic {};\n"),
      file("questions/gh/main.cpp", "// https://github.com/someone/cp-lib\nint main() {}\n"),
      file("algols/from_book.cpp", "// Source: Competitive Programming 4\nint f() { return 1; }\n"),
      file(
        "contest/180/e.cpp",
        "// Verify: https://judge.yosupo.jp/problem/point_add_range_sum\nstruct Fenwick {};\n",
      ),
    ];

    const result = buildInventory(files);

    expect(result.owned.map((f) => f.path)).toEqual(["contest/180/e.cpp"]);
    expect(result.flagged.map((f) => f.path)).toEqual([
      "algols/cp_algo.cpp",
      "algols/from_book.cpp",
      "algols/kactl_flow.cpp",
      "questions/gh/main.cpp",
    ]);
  });

  it("deduplicates by normalized content", () => {
    const v1 = "#include <bits/stdc++.h>\r\n\r\nint main() {\r\n\treturn 0;   \r\n}\r\n";
    const v2 = "#include <bits/stdc++.h>\nint main() {\n\treturn 0;\n}\n\n";
    const v3 = "#include <bits/stdc++.h>\nint main() {\n\treturn 1;\n}\n";

    const result = buildInventory([
      file("contest/10/a/main.cpp", v1, "2024-08-01T10:00:00-03:00"),
      file("contest/180/a.cpp", v2, "2026-11-14T10:00:00-03:00"),
      file("contest/181/a.cpp", v3, "2026-11-16T10:00:00-03:00"),
    ]);

    expect(result.owned.map((f) => f.path)).toEqual(["contest/180/a.cpp", "contest/181/a.cpp"]);
    expect(result.duplicates).toEqual([{ path: "contest/10/a/main.cpp", reason: "duplicate" }]);
  });

  it("excludes refs, icpc_prep, kotlin, advent_of_code and build artifacts", () => {
    const code = "int main() { return 0; }\n";
    const result = buildInventory([
      file("refs/book.cpp", code),
      file("icpc_prep/team.cpp", code),
      file("kotlin/a.cpp", code),
      file("advent_of_code/2025/1/a.cpp", code),
      file("contest/50/a/combined.cpp", code),
      file("contest/50/a/Makefile", "all:\n\tg++ main.cpp\n"),
      file("contest/50/a/build.sh", "#!/bin/sh\n"),
      file("contest/50/a/empty.cpp", "   \n\t\n"),
      file("contest/50/a/main.cpp", code),
    ]);

    expect(result.owned.map((f) => f.path)).toEqual(["contest/50/a/main.cpp"]);
    expect(result.thirdParty.length).toBe(8);
  });

  it("keeps gempro/refs, dp_study, tem_que_saber and algols/100-days-of-code", () => {
    const result = buildInventory([
      file("gempro/refs/contest_5/a.cpp", "int a() { return 1; }\n"),
      file("dp_study/frog1/main.cpp", "int b() { return 2; }\n"),
      file("tem_que_saber/bfs/1/main.cpp", "int c() { return 3; }\n"),
      file("algols/100-days-of-code/fib_por_exp/main.py", "def fib(n):\n    return n\n"),
    ]);

    expect(result.owned.map((f) => f.path)).toEqual([
      "algols/100-days-of-code/fib_por_exp/main.py",
      "dp_study/frog1/main.cpp",
      "gempro/refs/contest_5/a.cpp",
      "tem_que_saber/bfs/1/main.cpp",
    ]);
    expect(result.thirdParty).toEqual([]);
    expect(result.flagged).toEqual([]);
  });

  it("flags files with license headers regardless of comment style", () => {
    const result = buildInventory([
      file("algols/mit.cpp", "/* MIT License\n * Copyright (c) 2024 Someone\n */\nint x = 1;\n"),
      file("algols/spdx.py", "# SPDX-License-Identifier: Apache-2.0\ndef f():\n    return 1\n"),
      file("algols/own.cpp", "int own() { return 42; }\n"),
    ]);

    expect(result.owned.map((f) => f.path)).toEqual(["algols/own.cpp"]);
    expect(result.flagged.map((f) => f.path)).toEqual(["algols/mit.cpp", "algols/spdx.py"]);
  });

  it("deduplication is independent of input order and prefers higher contest number on tied dates", () => {
    const body = "int x = 7;\n";
    const a = file("contest/10/a.cpp", body, "2026-11-01T10:00:00-03:00");
    const b = file("contest/180/a.cpp", body, "2026-11-01T10:00:00-03:00");

    const r1 = buildInventory([a, b]);
    const r2 = buildInventory([b, a]);

    expect(r1).toEqual(r2);
    expect(r1.owned.map((f) => f.path)).toEqual(["contest/180/a.cpp"]);
    expect(r1.duplicates.map((f) => f.path)).toEqual(["contest/10/a.cpp"]);
  });
});
