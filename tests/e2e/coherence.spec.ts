import { expect, test } from "@playwright/test";

// T19 AC-10: uniform keys, panel order, compact Vim Edit and mobile game layout.

const PANEL_ORDER = ["title", "options", "area", "history", "reference"];

test("training keys work uniformly across calculation, typing, text and vim", async ({ page }) => {
  await page.goto("/");

  // Calculation (Fatoração)
  await page.getByRole("radio", { name: "Fatoração" }).click();
  await page.getByRole("button", { name: "Começar" }).click();
  const prompt1 = await page.getByTestId("prompt").textContent();
  await page.keyboard.press("Control+Enter");
  await expect(page.getByTestId("skipped")).toBeVisible();
  await expect(page.getByTestId("prompt")).not.toHaveText(prompt1 ?? "");
  await page.keyboard.press("Control+Shift+Enter");
  await expect(page.getByTestId("skipped")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Começar" })).toBeVisible();

  // Code typing
  await page.getByRole("radio", { name: "Código" }).click();
  await page.keyboard.type("a");
  await expect(page.getByRole("radiogroup", { name: "Treinos" })).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("radiogroup", { name: "Treinos" })).toBeVisible();

  // Text typing
  await page.getByRole("radio", { name: "Texto" }).click();
  await page.keyboard.type("a");
  await expect(page.getByRole("radiogroup", { name: "Treinos" })).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("radiogroup", { name: "Treinos" })).toBeVisible();

  // Vim Motion: Esc stays in Vim, :q + Enter exits
  await page.getByRole("radio", { name: "Movimento" }).click();
  await page.keyboard.type("l");
  await expect(page.getByRole("radiogroup", { name: "Treinos" })).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("radiogroup", { name: "Treinos" })).toBeHidden();
  await page.keyboard.type(":q");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("radiogroup", { name: "Treinos" })).toBeVisible();

  // Vim Edit: Esc stays in Vim, :q + Enter exits
  await page.getByRole("radio", { name: "Edição" }).click();
  await page.keyboard.type("l");
  await expect(page.getByRole("radiogroup", { name: "Treinos" })).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("radiogroup", { name: "Treinos" })).toBeHidden();
  await page.keyboard.type(":q");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("radiogroup", { name: "Treinos" })).toBeVisible();
});

test("every screen keeps panel order and unique h1", async ({ page }) => {
  await page.goto("/");
  const radios = page.getByRole("radiogroup", { name: "Treinos" }).getByRole("radio");
  const count = await radios.count();
  const headings = new Set<string>();

  for (let i = 0; i < count; i++) {
    const r = radios.nth(i);
    const label = (await r.getAttribute("aria-label")) ?? "";
    await r.click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(label);
    headings.add(label);

    const blocks = await page
      .locator("[data-panel]")
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-panel") ?? ""));
    const ranks = blocks.map((b) => PANEL_ORDER.indexOf(b));
    expect(ranks.every((rank) => rank >= 0)).toBe(true);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  }
  expect(headings.size).toBe(count);
});

test("vim edit fits 1280x800 with side-by-side buffers", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByRole("radio", { name: "Edição" }).click();

  const before = await page.getByTestId("vim-code").boundingBox();
  const after = await page.getByTestId("vim-after").boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  if (before && after) {
    // Side by side: `after` sits to the right of `before` and starts on the same row.
    expect(after.x).toBeGreaterThan(before.x + before.width / 2);
    expect(Math.abs(after.y - before.y)).toBeLessThan(20);
    // Visible above the fold without scrolling.
    expect(before.y + before.height).toBeLessThanOrEqual(800);
  }
});

test("mobile game stacks prompt above answer box", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Começar" }).click();

  const prompt = await page.getByTestId("prompt").boundingBox();
  const answer = await page.getByRole("textbox", { name: "Resposta" }).boundingBox();
  expect(prompt).not.toBeNull();
  expect(answer).not.toBeNull();
  if (prompt && answer) {
    expect(answer.y).toBeGreaterThanOrEqual(prompt.y + prompt.height - 2);
  }
});
