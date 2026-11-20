import { expect, test } from "@playwright/test";

// T18 AC-11: the menu works with the keyboard alone.

test("the menu is walked with the keyboard alone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("radio", { name: "Aritmética" })).toBeChecked();

  await page.keyboard.press("j");
  await page.keyboard.press("j");
  await expect(page.getByRole("radio", { name: "Fatoração" })).toBeChecked();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("prompt")).toBeVisible();
  await expect(page.getByTestId("shell-path")).toHaveText("popis/cálculo/fatoração");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Começar" })).toBeVisible();

  await page.locator("body").focus();
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: "Atalhos" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Atalhos" })).toBeHidden();
});

test("m collapses the tree and the panel takes the whole width", async ({ page }) => {
  await page.goto("/");
  const tree = page.getByRole("radiogroup", { name: "Treinos" });
  await expect(tree).toBeVisible();
  await page.keyboard.press("m");
  await expect(tree).toBeHidden();
  await page.reload();
  await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});
