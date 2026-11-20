import { expect, test, type Page } from "@playwright/test";
import { parseKeys } from "../../src/vim/keys";

// T13 AC-10: a level 4 round where the test reads the optimal solution from
// the target and types it, so every target has efficiency 100%.

const SPECIAL: Record<string, string> = { "<CR>": "Enter", "<Esc>": "Escape", "<BS>": "Backspace" };

async function typeSolution(page: Page, solution: string) {
  for (const key of parseKeys(solution)) {
    const special = SPECIAL[key];
    if (special !== undefined) await page.keyboard.press(special);
    else await page.keyboard.type(key);
  }
}

test("a level 4 round typed with the optimal solutions has 100% efficiency", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Vim", exact: true }).click();
  await page.getByRole("combobox", { name: "Nível" }).selectOption("4");
  const box = page.getByRole("textbox", { name: "Teclas do Vim" });
  await expect(box).toBeFocused();

  for (let index = 0; index < 3; index++) {
    await expect(page.getByTestId("vim-code")).toHaveAttribute("data-target-index", String(index));
    const solution = await page.getByTestId("vim-target").getAttribute("data-solution");
    expect(solution).toBeTruthy();
    await typeSolution(page, solution ?? "");
  }
  await expect(page.getByTestId("vim-last")).toContainText("ótimo");

  await page.clock.runFor(61_000);
  await expect(page.getByTestId("vim-reached")).toHaveText("3");
  await expect(page.getByTestId("vim-skipped")).toHaveText("0");
  await expect(page.getByTestId("vim-efficiency")).toHaveText("100%");

  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByRole("button", { name: "Começar" })).toBeVisible();
});

test("a blocked key shows which one and does not move the cursor", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Vim", exact: true }).click();
  await page.getByRole("combobox", { name: "Nível" }).selectOption("1");
  const cursor = page.getByTestId("vim-cursor");
  const before = [await cursor.getAttribute("data-line"), await cursor.getAttribute("data-col")];
  await page.keyboard.type("w");
  await expect(page.getByTestId("vim-blocked")).toHaveText("bloqueado neste nível: w");
  expect([await cursor.getAttribute("data-line"), await cursor.getAttribute("data-col")]).toEqual(
    before,
  );
});
