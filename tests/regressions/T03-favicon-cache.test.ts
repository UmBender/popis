// Bug: after the favicon changed from O(n!) to n!, the browser kept showing
// the old icon. Browsers cache favicons by URL and a hard reload does not
// refresh them. The link must carry a version derived from the file's
// content, so every change to the icon changes its URL.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { read } from "../source-files";

describe("regression T03 favicon-cache", () => {
  it("the favicon link carries the hash of the current icon", () => {
    const hash = createHash("sha256").update(read("public/favicon.svg")).digest("hex").slice(0, 8);
    expect(read("index.html")).toContain(`href="/favicon.svg?v=${hash}"`);
  });
});
