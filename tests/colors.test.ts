import { describe, expect, it } from "vitest";
import { offending, read, sourceFiles } from "./source-files";

// ADR-0001: every colour is a token in src/ui/theme.css, taken from
// docs/architecture/Theme.md.
const THEME = "src/ui/theme.css";
const COLOR_LITERAL = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b|\b(?:rgba?|hsla?)\(/;

/** `--token: #value;` pairs declared in a CSS file. */
function cssTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const m of css.matchAll(/(--[a-z-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens.set(m[1] ?? "", (m[2] ?? "").toLowerCase());
  }
  return tokens;
}

/** Rows of the "Tokens da interface" table of the Theme note. */
function documentedTokens(md: string): Map<string, string> {
  const section = md.split("## Tokens da interface")[1]?.split("\n## ")[0] ?? "";
  const tokens = new Map<string, string>();
  for (const m of section.matchAll(/^\| `(--[a-z-]+)` \|[^|]*\| `(#[0-9a-fA-F]{6})` \|$/gm)) {
    tokens.set(m[1] ?? "", (m[2] ?? "").toLowerCase());
  }
  return tokens;
}

describe("colors", () => {
  it("no colour literal outside theme.css", () => {
    const files = sourceFiles("src", (p) => /\.(tsx?|css)$/.test(p)).filter((p) => p !== THEME);
    expect(files.flatMap((p) => offending(p, COLOR_LITERAL))).toEqual([]);
  });

  it("theme.css declares exactly the tokens of the Theme note", () => {
    const documented = documentedTokens(read("docs/architecture/Theme.md"));
    expect(documented.size).toBeGreaterThan(0);
    expect(cssTokens(read(THEME))).toEqual(documented);
  });
});
