import { expect, test, type Page } from "@playwright/test";

async function openText(page: Page) {
  await page.goto("/");
  await page.getByRole("radio", { name: "Texto", exact: true }).check();
  await expect(page.getByRole("textbox", { name: "Texto digitado" })).toBeFocused();
}

async function shownWords(page: Page): Promise<string[]> {
  return page.getByTestId("text-words").locator("[data-word]").allTextContents();
}

test("typing a 10-word test in the real app", async ({ page }) => {
  await openText(page);
  await page.getByRole("combobox", { name: "Modo" }).selectOption("words");
  await page.getByRole("combobox", { name: "Tamanho" }).selectOption("10");
  await expect(page.getByTestId("text-progress")).toHaveText("0/10");

  const words = await shownWords(page);
  expect(words).toHaveLength(10);
  await page.getByRole("textbox", { name: "Texto digitado" }).focus();
  await page.keyboard.type(words.join(" "));

  await expect(page.getByTestId("text-accuracy")).toHaveText("100%");
  await expect(page.getByTestId("text-wpm")).toHaveText(/^\d+$/);
  await expect(page.getByTestId("text-summary")).toContainText("melhor");
});

test("typing a 15-second test in the real app ends with the time", async ({ page }) => {
  await page.clock.install();
  await openText(page);
  await page.getByRole("combobox", { name: "Tamanho" }).selectOption("15");
  await expect(page.getByTestId("text-progress")).toHaveText("15");

  const words = await shownWords(page);
  await page.getByRole("textbox", { name: "Texto digitado" }).focus();
  await page.keyboard.type(`${words.slice(0, 3).join(" ")} `);
  await expect(page.getByTestId("text-wpm")).toHaveCount(0);

  await page.clock.runFor(16_000);
  await expect(page.getByTestId("text-wpm")).toHaveText(/^\d+$/);
  await expect(page.getByTestId("text-accuracy")).toHaveText("100%");
  await expect(page.getByTestId("text-time")).toHaveText("15,00 s");
});
