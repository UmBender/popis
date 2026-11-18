import { describe, expect, it } from "vitest";
import { read } from "./source-files";

// ADR-T03-1: the favicon is the only file outside theme.css with colours,
// and they must be theme tokens.
const FAVICON = "public/favicon.svg";

/** Value of a token in the "Tokens da interface" table of the Theme note. */
function token(name: string): string {
  const md = read("docs/architecture/Theme.md");
  const match = new RegExp(`^\\| \`${name}\` \\|[^|]*\\| \`(#[0-9a-fA-F]{6})\` \\|$`, "m").exec(md);
  if (match?.[1] === undefined) throw new Error(`token ${name} not in Theme.md`);
  return match[1].toLowerCase();
}

describe("favicon", () => {
  it("favicon draws n! in theme tokens", () => {
    const svg = read(FAVICON);
    expect(svg).toMatch(/<text[^>]*>n!<\/text>/);

    const colours = new Set([...svg.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase()));
    expect(colours).toEqual(new Set([token("--surface"), token("--text")]));
    expect(svg).toMatch(new RegExp(`<rect[^>]*fill="${token("--surface")}"`, "i"));
    expect(svg).toMatch(new RegExp(`<text[^>]*fill="${token("--text")}"`, "i"));
    expect(svg).not.toMatch(/\b(?:rgba?|hsla?)\(/);
  });

  it("index.html links the favicon", () => {
    expect(read("index.html")).toMatch(
      /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg" \/>/,
    );
  });
});
