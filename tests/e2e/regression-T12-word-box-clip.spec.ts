// The word box showed part of a fourth line through its bottom padding;
// every word should be either wholly visible or wholly hidden.
import { expect, test } from "@playwright/test";

test.describe("regression T12 word-box-clip", () => {
  test("word box shows only whole words", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "Texto", exact: true }).check();
    const partial = await page.getByTestId("text-words").evaluate((area) => {
      const box = area.getBoundingClientRect();
      // Overflow clips at the padding edge, inside the borders. The
      // computed style keeps fractions that clientTop/clientHeight round.
      const style = getComputedStyle(area);
      const top = box.top + parseFloat(style.borderTopWidth);
      const bottom = box.bottom - parseFloat(style.borderBottomWidth);
      return (
        [...area.querySelectorAll("[data-word]")]
          .map((w) => w.getBoundingClientRect())
          // Layout rounds line boxes to 1/64 px, so allow a pixel of slack.
          .filter((r) => {
            const shown = Math.min(r.bottom, bottom) - Math.max(r.top, top);
            return shown > 1 && (r.top < top - 1 || r.bottom > bottom + 1);
          }).length
      );
    });
    expect(partial).toBe(0);
  });
});
