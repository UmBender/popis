import { describe, expect, it } from "vitest";
import {
  formatShell,
  parseShell,
  wordDisplay,
  wordText,
  type ParseResult,
  type ShellNode,
  type Word,
} from "./parse";

// T39 AC-1: pure-TS parser for the contest bash subset, producing a normalized AST
// and returning readable Portuguese errors for unsupported syntax without throwing.

describe("shell parser (AC-1)", () => {
  it("parses simple commands, quoted arguments and escapes", () => {
    const res = parseShell(`g++ -O2 -std=gnu++20 "a.cpp" -o 'a'`);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.node).toEqual({
      kind: "command",
      words: [
        { parts: [{ type: "text", value: "g++" }] },
        { parts: [{ type: "text", value: "-O2" }] },
        { parts: [{ type: "text", value: "-std=gnu++20" }] },
        { parts: [{ type: "text", value: "a.cpp" }] },
        { parts: [{ type: "text", value: "-o" }] },
        { parts: [{ type: "text", value: "a" }] },
      ],
      redirs: [],
    });
    if (res.node.kind !== "command") return;
    expect(wordText(res.node.words[0]!)).toBe("g++");
    expect(wordDisplay(res.node.words[0]!)).toBe("g++");
  });

  it("parses redirections before, between and after arguments", () => {
    const res = parseShell("./a <in1 >out1 2>err.log");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.node.kind).toBe("command");
    if (res.node.kind !== "command") return;
    expect(res.node.words.map((w) => wordText(w))).toEqual(["./a"]);
    expect(res.node.redirs).toEqual([
      { op: "<", target: { parts: [{ type: "text", value: "in1" }] } },
      { op: ">", target: { parts: [{ type: "text", value: "out1" }] } },
      { op: "2>", target: { parts: [{ type: "text", value: "err.log" }] } },
    ]);

    const combined = parseShell("./a >> log.txt 2>&1");
    expect(combined.ok).toBe(true);
    if (!combined.ok || combined.node.kind !== "command") return;
    expect(combined.node.redirs).toEqual([
      { op: ">>", target: { parts: [{ type: "text", value: "log.txt" }] } },
      { op: "2>&1" },
    ]);

    const amp = parseShell("./a &> all.log");
    expect(amp.ok).toBe(true);
    if (!amp.ok || amp.node.kind !== "command") return;
    expect(amp.node.redirs).toEqual([
      { op: "&>", target: { parts: [{ type: "text", value: "all.log" }] } },
    ]);
  });

  it("parses pipelines and command lists with &&, || and ;", () => {
    const res = parseShell("sort -n a.txt | uniq -c && echo ok || break; ls -la");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.node.kind).toBe("list");
    if (res.node.kind !== "list") return;
    expect(res.node.first.kind).toBe("pipeline");
    expect(res.node.rest.map((r) => r.op)).toEqual(["&&", "||", ";"]);
  });

  it("parses for and while loops with variables and command substitution", () => {
    const forRes = parseShell(
      "for i in $(seq 1 100); do ./gen $i > in && ./sol < in > out1 && ./brute < in > out2 && diff -Z out1 out2 || break; done",
    );
    expect(forRes.ok).toBe(true);
    if (!forRes.ok) return;
    expect(forRes.node.kind).toBe("for");
    if (forRes.node.kind !== "for") return;
    expect(forRes.node.variable).toBe("i");
    expect(forRes.node.items).toHaveLength(1);
    expect(forRes.node.items[0]?.parts[0]?.type).toBe("cmdsub");
    expect(forRes.node.body.kind).toBe("list");

    const whileRes = parseShell(
      "while true; do ./gen > in; ./sol < in > out1; ./brute < in > out2; diff out1 out2 || break; done",
    );
    expect(whileRes.ok).toBe(true);
    if (!whileRes.ok) return;
    expect(whileRes.node.kind).toBe("while");
  });

  it("parses process substitution, braced variables, history tokens and function definitions", () => {
    const proc = parseShell("diff <(./sol < in1) <(./brute < in1)");
    expect(proc.ok).toBe(true);
    if (!proc.ok || proc.node.kind !== "command") return;
    expect(proc.node.words[1]?.parts[0]?.type).toBe("procsub");
    expect(proc.node.words[2]?.parts[0]?.type).toBe("procsub");

    const fn = parseShell(`c() { g++ -O2 -std=gnu++20 "$1.cpp" -o "$1"; }`);
    expect(fn.ok).toBe(true);
    if (!fn.ok) return;
    expect(fn.node.kind).toBe("funcdef");
    if (fn.node.kind !== "funcdef") return;
    expect(fn.node.name).toBe("c");

    const braced = parseShell(`echo "\${i}_out" && cat !$`);
    expect(braced.ok).toBe(true);
    if (!braced.ok) return;
    expect(wordText({ parts: [{ type: "var", name: "i" }] })).toBeNull();
    expect(formatShell(braced.node)).toContain("${i}_out");
  });

  it("rejects out-of-subset syntax with a readable Portuguese message instead of throwing", () => {
    const cases: readonly (readonly [string, RegExp])[] = [
      ["", /vazio/i],
      ["   ", /vazio/i],
      ["select x in a b; do echo $x; done", /não entende.*select/i],
      ["cat << EOF", /não entende.*<</i],
      ["cat <<< hello", /não entende.*<<</i],
      ["./a &", /não entende.*&/i],
      [`echo "unterminated`, /aspas/i],
      ["echo 'unterminated", /aspas/i],
      ["for i in 1 2; do echo $i", /done/i],
      ["while true; do echo ok", /done/i],
      ["c() { echo hi", /\}/i],
      ["echo $(seq 5", /\)/i],
      ["diff <(./a", /\)/i],
      ["./a >", /arquivo|destino/i],
      ["| ls", /comando/i],
      ["<<< hi", /here-string/i],
      ["<< EOF", /here-doc/i],
      ["for 123 in a; do echo a; done", /variável/i],
      ["for i a b; do echo $i; done", /in/i],
      ["for i in ; do echo $i; done", /lista/i],
      ["for i in a b", /incompleto/i],
      ["for i in a; echo $i; done", /do/i],
      ["for i in a; do done", /comando/i],
      ["while true; echo ok; done", /do/i],
      ["c() echo hi", /\{/i],
      ["echo )", /parêntese/i],
      ["echo \\", /barra/i],
      [`echo "hi\\`, /aspas/i],
      [`echo "$(seq 3`, /\)/i],
      ["echo ${foo", /\}/i],
      ["echo ${1a}", /inválida/i],
      ["echo a ; )", /sintaxe|comando|parêntese/i],
    ];
    for (const [input, pattern] of cases) {
      let res: ParseResult;
      try {
        res = parseShell(input);
      } catch (err) {
        expect.unreachable(`parseShell("${input}") threw: ${String(err)}`);
      }
      expect(res.ok, `expected error for "${input}"`).toBe(false);
      if (!res.ok) {
        expect(res.error, input).toMatch(pattern);
      }
    }
  });

  it("handles escapes, empty quotes, double-quoted substitutions, literal $ and single-quote formatting", () => {
    const escaped = parseShell(`echo a\\ b "" '' "x\\"y\\\\z\\$w\\q" "$(seq 2)" "$" "it's ok"`);
    expect(escaped.ok).toBe(true);
    if (!escaped.ok) return;
    const formatted = formatShell(escaped.node);
    expect(formatted).toContain(`"it's ok"`);
    const reparsed = parseShell(formatted);
    expect(reparsed).toEqual(escaped);

    const multiDigit = parseShell(`echo "\${10}a"`);
    expect(multiDigit.ok).toBe(true);
    if (multiDigit.ok) {
      expect(formatShell(multiDigit.node)).toContain("${10}");
    }
  });
});

// T54 AC-1: the subset grows to cover bash scripts (ADR-T54-1).

function parsedNode(input: string): ShellNode {
  const res = parseShell(input);
  if (!res.ok) expect.unreachable(`parseShell("${input}") failed: ${res.error}`);
  return res.node;
}

function lit(value: string): Word {
  return { parts: [{ type: "text", value }] };
}

describe("shell parser script constructs (T54 AC-1)", () => {
  it("parser reads each script construct", () => {
    // Assignment and local stay plain words of a simple command.
    const assign = parsedNode("n=5");
    expect(assign).toEqual({ kind: "command", words: [lit("n=5")], redirs: [] });
    expect(parsedNode("local x=1")).toEqual({
      kind: "command",
      words: [lit("local"), lit("x=1")],
      redirs: [],
    });

    // Double quotes around an expansion are kept; ${1:-x}, $#, $@ and $? are variables.
    const vars = parsedNode(`echo "\${1:-padrão}" $# "$@" $?`);
    expect(vars).toEqual({
      kind: "command",
      words: [
        lit("echo"),
        { parts: [{ type: "dq", parts: [{ type: "var", name: "1", fallback: "padrão" }] }] },
        { parts: [{ type: "var", name: "#" }] },
        { parts: [{ type: "dq", parts: [{ type: "var", name: "@" }] }] },
        { parts: [{ type: "var", name: "?" }] },
      ],
      redirs: [],
    });
    expect(parsedNode('echo "$1"')).not.toEqual(parsedNode("echo $1"));
    expect(parsedNode('echo "$1"')).toEqual(parsedNode('echo "${1}"'));

    // Arithmetic expansion and command.
    expect(parsedNode("echo $((a + b * 2))")).toEqual({
      kind: "command",
      words: [
        lit("echo"),
        {
          parts: [
            {
              type: "arith",
              expr: {
                type: "binary",
                op: "+",
                left: { type: "name", name: "a" },
                right: {
                  type: "binary",
                  op: "*",
                  left: { type: "name", name: "b" },
                  right: { type: "num", value: 2 },
                },
              },
            },
          ],
        },
      ],
      redirs: [],
    });
    expect(parsedNode("(( i++ ))")).toEqual({
      kind: "arith",
      expr: { type: "incdec", op: "++", prefix: false, name: "i" },
    });
    expect(parsedNode("(( $n < 5 ))")).toEqual(parsedNode("((n<5))"));

    // [[ ]] tests with unary, binary, !, && and ||.
    expect(parsedNode('[[ -f in1 && $n -lt 5 || -z "$s" ]]')).toEqual({
      kind: "test",
      expr: {
        type: "or",
        left: {
          type: "and",
          left: { type: "unary", op: "-f", arg: lit("in1") },
          right: {
            type: "binary",
            op: "-lt",
            left: { parts: [{ type: "var", name: "n" }] },
            right: lit("5"),
          },
        },
        right: {
          type: "unary",
          op: "-z",
          arg: { parts: [{ type: "dq", parts: [{ type: "var", name: "s" }] }] },
        },
      },
    });
    expect(parsedNode("[[ $a = b ]]")).toEqual(parsedNode("[[ $a == b ]]"));
    expect(parsedNode("[[ ! -d tests ]]")).toEqual({
      kind: "test",
      expr: { type: "not", expr: { type: "unary", op: "-d", arg: lit("tests") } },
    });

    // if / elif / else.
    const ifNode = parsedNode(
      "if [[ -f a ]]; then echo a; elif (( n > 1 )); then echo b; else echo c; fi",
    );
    expect(ifNode.kind).toBe("if");
    if (ifNode.kind !== "if") return;
    expect(ifNode.branches).toHaveLength(2);
    expect(ifNode.branches[0]?.condition.kind).toBe("test");
    expect(ifNode.branches[1]?.condition.kind).toBe("arith");
    expect(ifNode.elseBody).toEqual(parsedNode("echo c"));
    expect(parsedNode("if true; then echo a; fi")).toMatchObject({ kind: "if", elseBody: null });

    // until, case, arithmetic for, functions with return, groups, compound redirection.
    expect(parsedNode("until false; do echo a; done").kind).toBe("until");

    const caseNode = parsedNode(`case "$1" in run) ./a;; stress | s) ./s;; *) echo uso;; esac`);
    expect(caseNode.kind).toBe("case");
    if (caseNode.kind !== "case") return;
    expect(caseNode.arms.map((a) => a.patterns.map((p) => wordText(p)))).toEqual([
      ["run"],
      ["stress", "s"],
      ["*"],
    ]);
    expect(parsedNode("case $x in a) ;; esac")).toMatchObject({
      kind: "case",
      arms: [{ patterns: [lit("a")], body: null }],
    });

    expect(parsedNode("for (( i = 1; i <= n; i++ )); do echo $i; done")).toMatchObject({
      kind: "forarith",
      init: { type: "assign", op: "=", name: "i", value: { type: "num", value: 1 } },
      condition: {
        type: "binary",
        op: "<=",
        left: { type: "name", name: "i" },
        right: { type: "name", name: "n" },
      },
      step: { type: "incdec", op: "++", prefix: false, name: "i" },
    });

    expect(parsedNode(`t() { ./a < "$1"; return 1; }`).kind).toBe("funcdef");

    const group = parsedNode("cmp -s a b || { echo WA; exit 1; }");
    expect(group.kind).toBe("list");
    if (group.kind !== "list") return;
    expect(group.rest[0]?.node.kind).toBe("group");

    expect(parsedNode('while read -r l; do echo "$l"; done < in1')).toMatchObject({
      kind: "redirect",
      body: { kind: "while" },
      redirs: [{ op: "<", target: lit("in1") }],
    });

    // Backticks read as $(...).
    expect(parsedNode("n=`wc -l < in1`")).toEqual(parsedNode("n=$(wc -l < in1)"));
    expect(parsedNode('echo "`ls`"')).toEqual(parsedNode('echo "$(ls)"'));
  });

  it("parser reads a multi-line script with comments", () => {
    const script = [
      "#!/usr/bin/env bash",
      "# roda todos os testes",
      "set -euo pipefail",
      "",
      "n=${1:-3}   # quantidade",
      "if [[ -f in1 ]]",
      "then",
      '  echo "tem in1"',
      "fi",
      "t() {",
      '  local entrada="$1"',
      '  ./a < "$entrada"',
      "}",
      "case $n in",
      "  1) echo um ;;",
      "  *)",
      "    echo outro",
      "    ;;",
      "esac",
      "for (( i = 1; i <= n; i++ )); do",
      '  t "in$i" &&',
      '    echo "ok $i"',
      "done",
      "",
    ].join("\n");
    const node = parsedNode(script);
    expect(node.kind).toBe("list");
    const flat = formatShell(node);
    expect(flat).not.toContain("\n");
    expect(flat).not.toContain("#!/usr");
    expect(parsedNode(flat)).toEqual(node);
  });

  it("parser rejects constructs still outside the subset with a readable message", () => {
    const cases: readonly (readonly [string, RegExp])[] = [
      ["a=(1 2 3)", /array/i],
      ["echo ${a[0]}", /array/i],
      ["trap 'rm -f x' EXIT", /trap/],
      ["getopts ab opt", /getopts/],
      ["eval echo hi", /eval/],
      ["select x in a b; do echo $x; done", /select/],
      ["cat << EOF", /here-doc/],
      ["if [[ -f in1 ]]; then echo ok", /fi/],
      ["if [[ -f in1 ]]; echo ok; fi", /then/],
      ["[[$n -lt 5]]", /espaço/],
      ["[[ $n -lt 5]]", /espaço|\]\]/],
      ["case $x in a) echo a;;", /esac/],
      ["until false; do echo a", /done/],
      ["for (( i = 1; i <= 3 )); do echo; done", /três|;/],
      ["echo $(( 1 + ))", /aritm/i],
      ["(( 1 +", /\)\)/],
      ["{ echo a", /\}/],
    ];
    for (const [input, pattern] of cases) {
      let res: ParseResult;
      try {
        res = parseShell(input);
      } catch (err) {
        expect.unreachable(`parseShell("${input}") threw: ${String(err)}`);
      }
      expect(res.ok, `expected error for "${input}"`).toBe(false);
      if (!res.ok) expect(res.error, input).toMatch(pattern);
    }
  });
});

describe("shell parser script edge cases (T54 AC-1)", () => {
  it("parser reads edge forms of the script constructs", () => {
    const ok = [
      "for (( i = 0; i < 2; i++ )) do echo $i; done",
      "for i in a b do echo $i; done",
      "case x in (a) echo a;; esac",
      "case x in a) echo a; esac",
      "echo $(( -(1 + 2) * !0 )) $(( ++i )) $(( (a) ))",
      "(( x = y += 2 ))",
      "echo ${n} $((${n} + $# + $1))",
      "[[ ( -f a || -d b ) && ! -z $c ]]",
      "[[ $a != b && $x -ne 1 ]]",
      "[[ $a ]]",
      "[[ $a > b ]]",
      "{ echo a; } > out 2>&1",
      "if true; then echo a; else echo b; fi < in1",
      "f() {\n  echo a\n}",
      "echo `echo a`",
    ];
    for (const input of ok) {
      const res = parseShell(input);
      expect(res.ok, `${input}: ${res.ok ? "" : res.error}`).toBe(true);
      if (res.ok) expect(parseShell(formatShell(res.node))).toEqual(res);
    }
  });

  it("parser explains broken script constructs", () => {
    const cases: readonly (readonly [string, RegExp])[] = [
      ["echo $(( 1 @ 2 ))", /aritm/i],
      ["echo $(( $ ))", /aritm/i],
      ["echo $(( ++ ))", /aritm/i],
      ["echo $(( (1 ))", /aritm|\)\)/i],
      ["echo $(( ) ))", /\)\)/],
      ["echo $(( ))", /aritm/i],
      ["echo $(( 1 2 ))", /aritm/i],
      ["echo $(( 1 + ) x ))", /\)\)|aritm/i],
      ["echo a |", /comando/],
      ["echo a; fi", /sintaxe/],
      ["done << EOF", /comando|here-doc/],
      ["for i in a; do echo; done << EOF", /here-doc|sintaxe/],
      ["case", /palavra/],
      ["case x esac", /in/],
      ["case x in ) a;; esac", /padrão/],
      ["case x in a b) echo;; esac", /\)/],
      ["case x in a) echo a; fi", /;;/],
      ["[[ ]]", /vazio/],
      ["[[ -f ]]", /valor/],
      ["[[ ( -f a ]]", /\)/],
      ["[[ a == ]]", /valor/],
      ["[[ && ]]", /valor/],
      ["echo `ls", /crase/],
      ["echo `ls |`", /comando/],
      ["./a &", /segundo plano/],
    ];
    for (const [input, pattern] of cases) {
      const res = parseShell(input);
      expect(res.ok, `expected error for "${input}"`).toBe(false);
      if (!res.ok) expect(res.error, input).toMatch(pattern);
    }
  });
});
