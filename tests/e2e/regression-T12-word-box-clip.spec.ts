// The word box showed part of a fourth line through its bottom padding;
// every word should be either wholly visible or wholly hidden.
import { expect, test } from "@playwright/test";

test.describe("regression T12 word-box-clip", () => {
  test("word box shows only whole words", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Texto", exact: true }).click();
    const partial = await page.getByTestId("text-words").evaluate((area) => {
      const box = area.getBoundingClientRect();
      // Overflow clips at the padding edge, inside the borders.
      const top = box.top + area.clientTop;
      const bottom = top + area.clientHeight;
      return [...area.querySelectorAll("[data-word]")]
        .map((w) => w.getBoundingClientRect())
        .filter((r) => r.top < bottom && r.bottom > top && (r.top < top || r.bottom > bottom))
        .length;
    });
    expect(partial).toBe(0);
  });
});
