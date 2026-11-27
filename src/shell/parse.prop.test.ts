import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  formatShell,
  parseShell,
  type ArithExpr,
  type ListOp,
  type Redirection,
  type ShellNode,
  type SimpleCommand,
  type TestExpr,
  type Word,
  type WordPart,
} from "./parse";

// T39 AC-1: round-trip property — parseShell(formatShell(t)) equals t for arbitrary ASTs.

const identArb = fc.stringMatching(/^[a-z][a-z0-9_]{0,5}$/);
const safeTextArb = fc.stringMatching(/^[A-Za-z0-9_./+:=,-]{1,10}$/);
const spacedTextArb = fc.stringMatching(/^[a-z0-9 _./=-]{1,12}$/);

function normalizeParts(parts: readonly WordPart[]): WordPart[] {
  const out: WordPart[] = [];
  for (const part of parts) {
    const prev = out[out.length - 1];
    if (part.type === "text" && prev?.type === "text") {
      out[out.length - 1] = { type: "text", value: prev.value + part.value };
    } else {
      out.push(part);
    }
  }
  return out;
}

const simpleWordArb: fc.Arbitrary<Word> = fc
  .array(
    fc.oneof(
      { weight: 5, arbitrary: safeTextArb.map((value): WordPart => ({ type: "text", value })) },
      { weight: 2, arbitrary: spacedTextArb.map((value): WordPart => ({ type: "text", value })) },
      { weight: 2, arbitrary: identArb.map((name): WordPart => ({ type: "var", name })) },
    ),
    { minLength: 1, maxLength: 3 },
  )
  .map((parts) => ({ parts: normalizeParts(parts) }));

const redirArb: fc.Arbitrary<Redirection> = fc.oneof(
  fc.constant<Redirection>({ op: "2>&1" }),
  fc.record({
    op: fc.constantFrom<"<" | ">" | ">>" | "2>" | "&>">("<", ">", ">>", "2>", "&>"),
    target: simpleWordArb,
  }),
);

const leafCommandArb: fc.Arbitrary<SimpleCommand> = fc.record({
  kind: fc.constant("command" as const),
  words: fc.array(simpleWordArb, { minLength: 1, maxLength: 4 }),
  redirs: fc.array(redirArb, { minLength: 0, maxLength: 2 }),
});

const wordWithSubArb: fc.Arbitrary<Word> = fc.oneof(
  { weight: 6, arbitrary: simpleWordArb },
  {
    weight: 2,
    arbitrary: leafCommandArb.map((node): Word => ({ parts: [{ type: "cmdsub", node }] })),
  },
  {
    weight: 2,
    arbitrary: leafCommandArb.map((node): Word => ({
      parts: [{ type: "procsub", dir: "<", node }],
    })),
  },
);

const richCommandArb: fc.Arbitrary<SimpleCommand> = fc.record({
  kind: fc.constant("command" as const),
  words: fc.array(wordWithSubArb, { minLength: 1, maxLength: 4 }),
  redirs: fc.array(redirArb, { minLength: 0, maxLength: 2 }),
});

const stageArb: fc.Arbitrary<ShellNode> = fc.oneof(
  { weight: 5, arbitrary: richCommandArb },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant("for" as const),
      variable: identArb,
      items: fc.array(wordWithSubArb, { minLength: 1, maxLength: 3 }),
      body: leafCommandArb,
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant("while" as const),
      condition: leafCommandArb,
      body: leafCommandArb,
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant("funcdef" as const),
      name: identArb,
      body: leafCommandArb,
    }),
  },
);

const pipelineOrStageArb: fc.Arbitrary<ShellNode> = fc.oneof(
  { weight: 3, arbitrary: stageArb },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant("pipeline" as const),
      stages: fc.array(stageArb, { minLength: 2, maxLength: 3 }),
    }),
  },
);

const shellNodeArb: fc.Arbitrary<ShellNode> = fc.oneof(
  { weight: 3, arbitrary: pipelineOrStageArb },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant("list" as const),
      first: pipelineOrStageArb,
      rest: fc.array(
        fc.record({
          op: fc.constantFrom<ListOp>("&&", "||", ";"),
          node: pipelineOrStageArb,
        }),
        { minLength: 1, maxLength: 3 },
      ),
    }),
  },
);

describe("shell parser properties (AC-1)", () => {
  it("parseShell(formatShell(t)) equals t for any generated AST", () => {
    fc.assert(
      fc.property(shellNodeArb, (tree) => {
        const formatted = formatShell(tree);
        const parsed = parseShell(formatted);
        expect(parsed.ok, `formatted: ${formatted}`).toBe(true);
        if (!parsed.ok) return;
        expect(parsed.node).toEqual(tree);
      }),
    );
  });
});

// T54 AC-1: the same round trip for the script constructs (ADR-T54-1).

const arithNameArb = fc.oneof(
  { weight: 4, arbitrary: identArb },
  { weight: 1, arbitrary: fc.constantFrom("1", "2", "9", "#") },
);

const ARITH_BIN_OPS = [
  "||",
  "&&",
  "==",
  "!=",
  "<",
  "<=",
  ">",
  ">=",
  "+",
  "-",
  "*",
  "/",
  "%",
] as const;
const ARITH_ASSIGN_OPS = ["=", "+=", "-=", "*=", "/=", "%="] as const;

const arithArb: fc.Arbitrary<ArithExpr> = fc.letrec<{ expr: ArithExpr }>((tie) => ({
  expr: fc.oneof(
    { depthSize: "small", withCrossShrink: true },
    { weight: 4, arbitrary: fc.nat(999).map((value): ArithExpr => ({ type: "num", value })) },
    { weight: 4, arbitrary: arithNameArb.map((name): ArithExpr => ({ type: "name", name })) },
    {
      weight: 1,
      arbitrary: fc
        .tuple(fc.constantFrom<"-" | "!">("-", "!"), tie("expr"))
        .map(([op, arg]): ArithExpr => ({ type: "unary", op, arg })),
    },
    {
      weight: 3,
      arbitrary: fc
        .tuple(fc.constantFrom(...ARITH_BIN_OPS), tie("expr"), tie("expr"))
        .map(([op, left, right]): ArithExpr => ({ type: "binary", op, left, right })),
    },
    {
      weight: 1,
      arbitrary: fc
        .tuple(fc.constantFrom(...ARITH_ASSIGN_OPS), identArb, tie("expr"))
        .map(([op, name, value]): ArithExpr => ({ type: "assign", op, name, value })),
    },
    {
      weight: 1,
      arbitrary: fc
        .tuple(fc.constantFrom<"++" | "--">("++", "--"), fc.boolean(), identArb)
        .map(([op, prefix, name]): ArithExpr => ({ type: "incdec", op, prefix, name })),
    },
  ),
})).expr;

const varNameArb = fc.oneof(
  { weight: 4, arbitrary: identArb },
  { weight: 1, arbitrary: fc.constantFrom("1", "2", "#", "@", "?") },
);

const varPartArb: fc.Arbitrary<WordPart> = fc.oneof(
  { weight: 3, arbitrary: varNameArb.map((name): WordPart => ({ type: "var", name })) },
  {
    weight: 1,
    arbitrary: fc
      .tuple(fc.constantFrom("1", "2", "n"), fc.stringMatching(/^[a-z0-9_.]{0,6}$/))
      .map(([name, fallback]): WordPart => ({ type: "var", name, fallback })),
  },
);

const dqTextArb = fc.stringMatching(/^[a-z0-9 _.:=-]{1,8}$/);

const dqPartArb: fc.Arbitrary<WordPart> = fc.oneof(
  { weight: 2, arbitrary: dqTextArb.map((value): WordPart => ({ type: "text", value })) },
  { weight: 3, arbitrary: varPartArb },
  { weight: 1, arbitrary: arithArb.map((expr): WordPart => ({ type: "arith", expr })) },
  { weight: 1, arbitrary: leafCommandArb.map((node): WordPart => ({ type: "cmdsub", node })) },
);

const dqArb: fc.Arbitrary<WordPart> = fc
  .array(dqPartArb, { minLength: 1, maxLength: 3 })
  .map((parts) => normalizeParts(parts))
  .filter((parts) => parts.some((p) => p.type !== "text"))
  .map((parts) => ({ type: "dq", parts }) as WordPart);

const scriptWordArb: fc.Arbitrary<Word> = fc
  .array(
    fc.oneof(
      { weight: 4, arbitrary: safeTextArb.map((value): WordPart => ({ type: "text", value })) },
      { weight: 2, arbitrary: varPartArb },
      { weight: 2, arbitrary: dqArb },
      { weight: 1, arbitrary: arithArb.map((expr): WordPart => ({ type: "arith", expr })) },
    ),
    { minLength: 1, maxLength: 3 },
  )
  .map((parts) => ({ parts: normalizeParts(parts) }));

const scriptCommandArb: fc.Arbitrary<SimpleCommand> = fc.record({
  kind: fc.constant("command" as const),
  words: fc.array(scriptWordArb, { minLength: 1, maxLength: 3 }),
  redirs: fc.array(redirArb, { minLength: 0, maxLength: 1 }),
});

const TEST_UNARY_OPS = ["-f", "-d", "-e", "-s", "-x", "-z", "-n"] as const;
const TEST_BINARY_OPS = ["==", "!=", "<", ">", "-eq", "-ne", "-lt", "-le", "-gt", "-ge"] as const;

const testExprArb: fc.Arbitrary<TestExpr> = fc.letrec<{ expr: TestExpr }>((tie) => ({
  expr: fc.oneof(
    { depthSize: "small", withCrossShrink: true },
    {
      weight: 3,
      arbitrary: fc
        .tuple(fc.constantFrom(...TEST_UNARY_OPS), scriptWordArb)
        .map(([op, arg]): TestExpr => ({ type: "unary", op, arg })),
    },
    {
      weight: 3,
      arbitrary: fc
        .tuple(fc.constantFrom(...TEST_BINARY_OPS), scriptWordArb, scriptWordArb)
        .map(([op, left, right]): TestExpr => ({ type: "binary", op, left, right })),
    },
    { weight: 1, arbitrary: tie("expr").map((expr): TestExpr => ({ type: "not", expr })) },
    {
      weight: 2,
      arbitrary: fc
        .tuple(fc.constantFrom<"and" | "or">("and", "or"), tie("expr"), tie("expr"))
        .map(([type, left, right]): TestExpr => ({ type, left, right })),
    },
  ),
})).expr;

const simpleScriptNodeArb: fc.Arbitrary<ShellNode> = fc.oneof(
  { weight: 4, arbitrary: scriptCommandArb },
  { weight: 2, arbitrary: testExprArb.map((expr): ShellNode => ({ kind: "test", expr })) },
  { weight: 2, arbitrary: arithArb.map((expr): ShellNode => ({ kind: "arith", expr })) },
);

const bodyArb: fc.Arbitrary<ShellNode> = fc.oneof(
  { weight: 3, arbitrary: simpleScriptNodeArb },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant("list" as const),
      first: simpleScriptNodeArb,
      rest: fc.array(
        fc.record({ op: fc.constantFrom<ListOp>("&&", "||", ";"), node: simpleScriptNodeArb }),
        { minLength: 1, maxLength: 2 },
      ),
    }),
  },
);

const optArith = fc.option(arithArb, { nil: null });

const patternArb: fc.Arbitrary<Word> = fc
  .oneof(safeTextArb, fc.constant("*"))
  .map((value): Word => ({ parts: [{ type: "text", value }] }));

const compoundArb: fc.Arbitrary<ShellNode> = fc.oneof(
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant("if" as const),
      branches: fc.array(fc.record({ condition: bodyArb, body: bodyArb }), {
        minLength: 1,
        maxLength: 2,
      }),
      elseBody: fc.option(bodyArb, { nil: null }),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant("until" as const),
      condition: bodyArb,
      body: bodyArb,
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant("case" as const),
      word: scriptWordArb,
      arms: fc.array(
        fc.record({
          patterns: fc.array(patternArb, { minLength: 1, maxLength: 2 }),
          body: fc.option(bodyArb, { nil: null }),
        }),
        { minLength: 1, maxLength: 3 },
      ),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant("forarith" as const),
      init: optArith,
      condition: optArith,
      step: optArith,
      body: bodyArb,
    }),
  },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("group" as const), body: bodyArb }) },
  {
    weight: 1,
    arbitrary: fc.record({ kind: fc.constant("funcdef" as const), name: identArb, body: bodyArb }),
  },
);

const redirectableArb: fc.Arbitrary<ShellNode> = fc.oneof(
  compoundArb.filter((n) => n.kind !== "funcdef"),
  fc.record({ kind: fc.constant("while" as const), condition: bodyArb, body: bodyArb }),
);

const scriptNodeArb: fc.Arbitrary<ShellNode> = fc.oneof(
  { weight: 3, arbitrary: compoundArb },
  { weight: 2, arbitrary: bodyArb },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant("redirect" as const),
      body: redirectableArb,
      redirs: fc.array(redirArb, { minLength: 1, maxLength: 2 }),
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant("list" as const),
      first: compoundArb,
      rest: fc.array(
        fc.record({ op: fc.constantFrom<ListOp>("&&", "||", ";"), node: compoundArb }),
        { minLength: 1, maxLength: 2 },
      ),
    }),
  },
);

describe("shell parser script properties (T54 AC-1)", () => {
  it("parseShell(formatShell(t)) equals t for script constructs", () => {
    fc.assert(
      fc.property(scriptNodeArb, (tree) => {
        const formatted = formatShell(tree);
        expect(formatted).not.toContain("\n");
        const parsed = parseShell(formatted);
        expect(parsed.ok, `formatted: ${formatted}`).toBe(true);
        if (!parsed.ok) return;
        expect(parsed.node).toEqual(tree);
      }),
    );
  });
});
