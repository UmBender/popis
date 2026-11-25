import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  formatShell,
  parseShell,
  type ListOp,
  type Redirection,
  type ShellNode,
  type SimpleCommand,
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
    arbitrary: leafCommandArb.map((node): Word => ({ parts: [{ type: "procsub", dir: "<", node }] })),
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
