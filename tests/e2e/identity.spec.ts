import { expect, test } from "@playwright/test";

test("the served app has the POPIS title and a Portuguese description", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("POPIS — Practice Of Problem-solving In Sprints");
  const description = await page.locator('meta[name="description"]').getAttribute("content");
  expect(description).toBe(
    "Treino rápido de cálculo mental, lógica e digitação para programação competitiva.",
  );
});
