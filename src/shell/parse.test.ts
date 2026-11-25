import { describe, expect, it } from "vitest";
import { formatShell, parseShell, wordDisplay, wordText, type ParseResult } from "./parse";

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
      ["case $x in a) echo a;; esac", /não entende.*case/i],
      ["if true; then echo a; fi", /não entende.*if/i],
      ["until false; do echo a; done", /não entende.*until/i],
      ["select x in a b; do echo $x; done", /não entende.*select/i],
      ["[[ -f a.cpp ]]", /não entende.*\[\[/i],
      ["cat << EOF", /não entende.*<</i],
      ["cat <<< hello", /não entende.*<<</i],
      ["./a &", /não entende.*&/i],
      ["echo `seq 5`", /\$\(/i],
      [`echo "unterminated`, /aspas/i],
      ["echo 'unterminated", /aspas/i],
      ["for i in 1 2; do echo $i", /done/i],
      ["while true; do echo ok", /done/i],
      ["c() { echo hi", /\}/i],
      ["echo $(seq 5", /\)/i],
      ["diff <(./a", /\)/i],
      ["./a >", /arquivo|destino/i],
      ["| ls", /comando/i],
      ["(( i++ ))", /não entende/i],
      ["<<< hi", /here-string/i],
      ["<< EOF", /here-doc/i],
      ["for ((i=0; i<3; i++)); do echo $i; done", /for/i],
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
      [`echo "\`ls\`"`, /\$\(/i],
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
