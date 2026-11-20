import { expect, test, type Page } from "@playwright/test";
import { parseKeys } from "../../src/vim/keys";

// T13 AC-10: a level 4 round where the test reads the optimal solution from
// the target and types it, so every target has efficiency 100%.

const SPECIAL: Record<string, string> = { "<CR>": "Enter", "<Esc>": "Escape", "<BS>": "Backspace" };

async function typeSolution(page: Page, solution: string) {
  for (const key of parseKeys(solution)) {
    const special = SPECIAL[key];
    const ctrl = /^<C-(.)>$/.exec(key);
    if (special !== undefined) await page.keyboard.press(special);
    else if (ctrl !== null) await page.keyboard.press(`Control+${ctrl[1] ?? ""}`);
    else await page.keyboard.type(key);
  }
}

test("a level 4 round typed with the optimal solutions has 100% efficiency", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("radio", { name: "Movimento", exact: true }).check();
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

test("T14 AC-10: an edit round typed with the references has 100% efficiency", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("radio", { name: "Edição", exact: true }).check();
  await expect(page.getByRole("textbox", { name: "Teclas do Vim" })).toBeFocused();

  for (let index = 0; index < 3; index++) {
    await expect(page.getByTestId("vim-code")).toHaveAttribute("data-edit-index", String(index));
    const reference = await page.getByTestId("vim-after").getAttribute("data-reference");
    expect(reference).toBeTruthy();
    await typeSolution(page, reference ?? "");
  }
  await expect(page.getByTestId("vim-last")).toContainText("referência");

  await page.clock.runFor(61_000);
  await expect(page.getByTestId("vim-reached")).toHaveText("3");
  await expect(page.getByTestId("vim-efficiency")).toHaveText("100%");
});

test("T15 AC-8: comment and rename edits typed with <C-v> and :s are completed", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "popis.vim-edit-settings",
      JSON.stringify({
        drill: "edit",
        durationS: 60,
        kinds: ["comment-block", "rename-variable"],
      }),
    );
  });
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("radio", { name: "Edição", exact: true }).check();
  await expect(page.getByRole("textbox", { name: "Teclas do Vim" })).toBeFocused();

  for (let index = 0; index < 4; index++) {
    await expect(page.getByTestId("vim-code")).toHaveAttribute("data-edit-index", String(index));
    const reference = await page.getByTestId("vim-after").getAttribute("data-reference");
    expect(reference).toBeTruthy();
    await typeSolution(page, reference ?? "");
  }
  await page.clock.runFor(61_000);
  await expect(page.getByTestId("vim-reached")).toHaveText("4");
  await expect(page.getByTestId("vim-efficiency")).toHaveText("100%");
});

test("T16 AC-8: the number-lines edit is done with a macro and the panel shows it", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "popis.vim-edit-settings",
      JSON.stringify({ drill: "edit", durationS: 60, kinds: ["number-lines"] }),
    );
    localStorage.setItem("popis.vim-learn", JSON.stringify({ unlocked: ["number-lines"] }));
  });
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("radio", { name: "Edição", exact: true }).check();
  await expect(page.getByRole("textbox", { name: "Teclas do Vim" })).toBeFocused();

  const reference = (await page.getByTestId("vim-after").getAttribute("data-reference")) ?? "";
  expect(reference).toMatch(/^qayyp<C-a>q\d*@a$/);
  await typeSolution(page, "qa");
  await expect(page.getByTestId("vim-status")).toContainText("gravando @a");
  await typeSolution(page, "yyp<C-a>q");
  await expect(page.getByTestId("vim-status")).not.toContainText("gravando");
  await expect(page.getByTestId("vim-registers").locator('li[data-register="a"]')).toContainText(
    "yyp^A",
  );
  await typeSolution(page, reference.slice("qayyp<C-a>q".length));
  await expect(page.getByTestId("vim-code")).toHaveAttribute("data-edit-index", "1");
  await page.clock.runFor(61_000);
  await expect(page.getByTestId("vim-reached")).toHaveText("1");
  await expect(page.getByTestId("vim-efficiency")).toHaveText("100%");
});

test("a blocked key shows which one and does not move the cursor", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "Movimento", exact: true }).check();
  await page.getByRole("combobox", { name: "Nível" }).selectOption("1");
  const cursor = page.getByTestId("vim-cursor");
  const before = [await cursor.getAttribute("data-line"), await cursor.getAttribute("data-col")];
  await page.keyboard.type("w");
  await expect(page.getByTestId("vim-blocked")).toHaveText("bloqueado neste nível: w");
  expect([await cursor.getAttribute("data-line"), await cursor.getAttribute("data-col")]).toEqual(
    before,
  );
});
