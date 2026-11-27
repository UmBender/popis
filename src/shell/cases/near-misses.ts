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

export type EquivalentCase = {
  readonly id: string;
  readonly description: string;
  readonly canonical: string;
  readonly equivalent: string;
  readonly options?: CheckOptions;
  readonly fixture: string;
  readonly probe?: string;
};

/**
 * Script forms the checker accepts as equal (T54 AC-2). The oracle (AC-6) runs both
 * in GNU bash and requires the same observable effect.
 */
export const SCRIPT_EQUIVALENT_CASES: readonly EquivalentCase[] = [
  {
    id: "then-next-line",
    description: "then may follow ; on the same line or start the next line",
    canonical: "if [[ -f in1 ]]; then echo ok; fi",
    equivalent: "if [[ -f in1 ]]\nthen\n  echo ok\nfi",
    fixture: "scripts",
  },
  {
    id: "lt-vs-arith",
    description: "[[ $n -lt 5 ]] and (( n < 5 )) compare the same numbers",
    canonical: "n=3; [[ $n -lt 5 ]] && echo menor",
    equivalent: "n=3; (( n < 5 )) && echo menor",
    fixture: "scripts",
  },
  {
    id: "and-vs-arith",
    description: "&& inside [[ ]] with numeric tests matches && inside (( ))",
    canonical: "n=3; m=4; [[ $n -lt 5 && $m -gt 2 ]] && echo ok",
    equivalent: "n=3; m=4; (( n < 5 && m > 2 )) && echo ok",
    fixture: "scripts",
  },
  {
    id: "braced-positional",
    description: '"$1" and "${1}" expand the same argument',
    canonical: 'set -- "meu arquivo"; cat "$1"',
    equivalent: 'set -- "meu arquivo"; cat "${1}"',
    options: { strictQuotes: true },
    fixture: "spaces",
  },
  {
    id: "dot-slash-glob",
    description: "for f in ./in* visits the same files as for f in in* when $f is not shown",
    canonical: 'for f in in*; do ./a < "$f"; done',
    equivalent: 'for f in ./in*; do ./a < "$f"; done',
    fixture: "scripts",
  },
  {
    id: "quotes-optional",
    description: 'without names with spaces, $f and "$f" read the same file',
    canonical: 'for f in in*; do ./a < "$f"; done',
    equivalent: "for f in in*; do ./a < $f; done",
    fixture: "scripts",
  },
  {
    id: "backticks",
    description: "backticks and $(...) both capture the command output",
    canonical: 'n=$(wc -l < in1); echo "$n"',
    equivalent: 'n=`wc -l < in1`; echo "$n"',
    fixture: "scripts",
  },
];

/**
 * Script near misses (T54 AC-2): rejected by the checker and, in GNU bash, an effect
 * different from the canonical form (AC-6).
 */
export const SCRIPT_NEAR_MISS_CASES: readonly NearMissCase[] = [
  {
    id: "assign-spaces",
    description: "n = 5 runs a command called n instead of assigning",
    canonical: 'n=5; echo "n=$n"',
    nearMiss: 'n = 5; echo "n=$n"',
    fixture: "scripts",
    reasonMatch: /espaço/i,
  },
  {
    id: "test-no-space",
    description: "[[$n without a space is a command name, not a test",
    canonical: "n=3; [[ $n -lt 5 ]] && echo menor",
    nearMiss: "n=3; [[$n -lt 5]] && echo menor",
    fixture: "scripts",
    reasonMatch: /espaço/i,
  },
  {
    id: "unquoted-positional",
    description: "$1 without quotes splits a name with a space into two words",
    canonical: 'set -- "meu arquivo"; cat "$1"',
    nearMiss: 'set -- "meu arquivo"; cat $1',
    options: { strictQuotes: true },
    fixture: "spaces",
    reasonMatch: /aspas/i,
  },
  {
    id: "lt-string-compare",
    description: "< inside [[ ]] compares text, so 10 < 9 is true",
    canonical: "n=10; [[ $n -lt 9 ]] && echo menor",
    nearMiss: "n=10; [[ $n < 9 ]] && echo menor",
    fixture: "scripts",
    reasonMatch: /-lt/,
  },
  {
    id: "missing-fi",
    description: "if without fi is a syntax error",
    canonical: "if [[ -f in1 ]]; then echo ok; fi",
    nearMiss: "if [[ -f in1 ]]; then echo ok",
    fixture: "scripts",
    reasonMatch: /fi/,
  },
  {
    id: "missing-done",
    description: "for without done is a syntax error",
    canonical: 'for f in in*; do echo "$f"; done',
    nearMiss: 'for f in in*; do echo "$f"',
    fixture: "scripts",
    reasonMatch: /done/,
  },
  {
    id: "exit-without-code",
    description: "exit without a code returns the status of echo (0), not a failure",
    canonical: "if [[ ! -f out9 ]]; then echo falta; exit 1; fi",
    nearMiss: "if [[ ! -f out9 ]]; then echo falta; exit; fi",
    fixture: "scripts",
    reasonMatch: /exit 1/,
  },
  {
    id: "dot-slash-shown",
    description: "for f in ./in* prints ./in1 when the objective shows the file name",
    canonical: 'for f in in*; do echo "$f"; done',
    nearMiss: 'for f in ./in*; do echo "$f"; done',
    options: { exactPaths: true },
    fixture: "scripts",
    reasonMatch: /\.\//,
  },
];
