import { expect, test } from "@playwright/test";

test("loop code keeps its lines and indentation in the real app", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("radio", { name: "Somatórios" }).check();
  await page.getByRole("checkbox", { name: /^Somatório Σ/ }).uncheck();
  await page.getByRole("button", { name: "Começar" }).click();

  const prompt = page.getByTestId("prompt");
  await expect(prompt).toContainText("ops++;");
  const style = await prompt.evaluate((el) => {
    const css = getComputedStyle(el);
    return { whiteSpace: css.whiteSpace, lines: el.getBoundingClientRect().height };
  });
  const lineHeight = await prompt.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
  expect(style.whiteSpace).toBe("pre");
  expect(style.lines).toBeGreaterThanOrEqual(3 * lineHeight - 1);

  await page.getByRole("textbox", { name: "Resposta" }).press("Enter");
  await expect(page.getByTestId("skipped")).toContainText("ops++;");
});
