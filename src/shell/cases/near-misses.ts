import type { CheckOptions } from "../check";

export type NearMissCase = {
  readonly id: string;
  readonly description: string;
  readonly canonical: string;
  readonly nearMiss: string;
  readonly options?: CheckOptions;
  readonly fixture: string;
  readonly probe?: string;
  readonly reasonMatch: RegExp;
};

/**
 * Near-miss table shared by unit tests (AC-2) and the live bash/g++ oracle (AC-4).
 * Every entry is rejected by `checkShellCommand` and produces a measurably different
 * effect in real bash/g++.
 */
export const NEAR_MISS_CASES: readonly NearMissCase[] = [
  {
    id: "redir-out-instead-of-in",
    description: "> in place of < overwrites the input file instead of feeding stdin",
    canonical: "./a < in1",
    nearMiss: "./a > in1",
    fixture: "run",
    reasonMatch: /saída.*entrada|>/i,
  },
  {
    id: "diff-missing-Z",
    description: "diff without -Z fails on trailing whitespace differences",
    canonical: "diff -Z out1 ans1",
    nearMiss: "diff out1 ans1",
    fixture: "compare",
    reasonMatch: /-Z/i,
  },
  {
    id: "diff-w-instead-of-Z",
    description: "diff -w ignores internal spaces too, not just trailing spaces",
    canonical: "diff -Z out_inner ans_inner",
    nearMiss: "diff -w out_inner ans_inner",
    fixture: "compare",
    reasonMatch: /-Z/i,
  },
  {
    id: "stress-missing-break",
    description: "stress loop without || break continues past the failing seed 7",
    canonical:
      "for i in $(seq 1 10); do ./gen $i > in; ./sol < in > out1; ./brute < in > out2; diff out1 out2 || break; done",
    nearMiss:
      "for i in $(seq 1 10); do ./gen $i > in; ./sol < in > out1; ./brute < in > out2; diff out1 out2; done",
    options: { allowSemicolon: true },
    fixture: "stress",
    probe: "cat in",
    reasonMatch: /break/i,
  },
  {
    id: "ulimit-missing-value",
    description: "ulimit -s without value prints the current limit instead of raising it",
    canonical: "ulimit -s 65536",
    nearMiss: "ulimit -s",
    fixture: "limits",
    probe: "ulimit -s",
    reasonMatch: /valor|ulimit/i,
  },
  {
    id: "gpp-missing-O2",
    description: "compiling without -O2 omits __OPTIMIZE__ and differs from judge flags",
    canonical: "g++ -O2 -std=gnu++20 a.cpp -o a",
    nearMiss: "g++ -std=gnu++20 a.cpp -o a",
    fixture: "compile",
    probe: "./a < in1",
    reasonMatch: /-O2/i,
  },
  {
    id: "timeout-wrong-binary",
    description: "timeout 2 ./a vs timeout 2s ./b runs a different program",
    canonical: "timeout 2 ./a < in1",
    nearMiss: "timeout 2s ./b < in1",
    fixture: "run",
    reasonMatch: /timeout|executável|alvo/i,
  },
  {
    id: "mkdir-missing-p",
    description: "mkdir without -p fails when parent directories do not exist",
    canonical: "mkdir -p a/b/c",
    nearMiss: "mkdir a/b/c",
    fixture: "files",
    reasonMatch: /-p/i,
  },
  {
    id: "sort-missing-n",
    description: "sort without -n sorts 10 before 2 lexicographically",
    canonical: "sort -n nums.txt",
    nearMiss: "sort nums.txt",
    fixture: "text",
    reasonMatch: /-n/i,
  },
  {
    id: "redir-2to1-order",
    description: "2>&1 > err.log sends stderr to stdout instead of err.log",
    canonical: "./a < in1 > all.log 2>&1",
    nearMiss: "./a < in1 2>&1 > all.log",
    fixture: "run",
    probe: "cat all.log",
    reasonMatch: /2>&1/i,
  },
];
