import { expect, test, type Page } from "@playwright/test";

// T46 AC-5/AC-7: the C++ reference on desktop and phone: tree, search, hash and print sheet.

async function expectNoHorizontalScroll(page: Page, where: string) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, `horizontal scroll on ${where}`).toBeLessThanOrEqual(client);
}

test("T46: open the C++ reference from the tree and search it", async ({ page }) => {
  const mobile = test.info().project.name === "mobile";
  await page.goto("./");
  if (mobile) await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("radio", { name: "C++", exact: true }).click();
  await expect(page.getByTestId("shell-path")).toHaveText("popis/referência/c++");
  await expect(page.getByRole("navigation", { name: "Seções" })).toBeVisible();
  await expectNoHorizontalScroll(page, "reference");

  const box = page.getByRole("searchbox", { name: "Buscar na referência" });
  if (mobile) {
    await box.tap();
  } else {
    await page.keyboard.press("/");
    await expect(box).toBeFocused();
  }
  await box.fill("busca binaria");
  const first = page.getByRole("article").first();
  await expect(first).toHaveAccessibleName("lower_bound");
  await expect(first.getByTestId("ref-output")).not.toBeEmpty();
  await box.press("Escape");
  await expect(box).toHaveValue("");
  await expectNoHorizontalScroll(page, "reference search");
});

test("T46: a hash link opens the entry", async ({ page }) => {
  await page.goto("./#cpp/priority_queue");
  await expect(page.getByTestId("shell-path")).toHaveText("popis/referência/c++");
  const pq = page.getByRole("article", { name: "priority_queue", exact: true });
  await expect(pq).toHaveAttribute("aria-current", "true");
  await expect(pq).toBeInViewport();
  await expectNoHorizontalScroll(page, "reference entry");
});

test("T46: the print sheet has two columns and no window", async ({ page }) => {
  await page.goto("./#cpp/sort");
  await expect(page.getByRole("article", { name: "sort", exact: true })).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("shell-status")).toBeHidden();
  await expect(page.getByRole("searchbox", { name: "Buscar na referência" })).toBeHidden();
  const columns = await page
    .getByTestId("ref-entries")
    .evaluate((el) => getComputedStyle(el).columnCount);
  expect(columns).toBe("2");
});
