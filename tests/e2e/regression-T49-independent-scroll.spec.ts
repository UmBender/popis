// Scrolling the panel scrolled the whole page, so the tree (taller than the
// window since T39-T46) went away with it; the tree, the panel and the
// reference index should each scroll on their own.
import { expect, test, type Page } from "@playwright/test";

const tops = (page: Page) =>
  page.evaluate(() => ({
    page: window.scrollY,
    tree: document.querySelector(".tree")?.getBoundingClientRect().top ?? NaN,
    // The index is sticky: it may rise to the top of the panel, but it must
    // stay wholly inside the window.
    index: (() => {
      const r = document.querySelector(".ref-sections")?.getBoundingClientRect();
      return r === undefined ? null : r.top >= 0 && r.bottom <= window.innerHeight;
    })(),
  }));

test.describe("regression T49 independent-scroll", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  for (const item of ["C++", "STL"]) {
    test(`tree and reference index stay put while the panel scrolls (${item})`, async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByRole("radio", { name: item, exact: true }).click();
      const before = await tops(page);

      await page.locator(".shell-main").hover();
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(200);
      const after = await tops(page);

      expect(after.page).toBe(0);
      expect(after.tree).toBe(before.tree);
      expect(after.index).toBe(before.index); // both true on C++, both null on STL
    });
  }

  test("tree scrolls on its own when taller than the window", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "C++", exact: true }).click();
    const tree = page.locator(".tree");
    const mainTop = () =>
      page.evaluate(() => document.querySelector(".shell-main")?.scrollTop ?? NaN);

    await tree.hover();
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(200);

    expect(await tree.evaluate((t) => t.scrollTop)).toBeGreaterThan(0);
    expect(await mainTop()).toBe(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});
