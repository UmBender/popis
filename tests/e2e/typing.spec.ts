import { expect, test, type Page } from "@playwright/test";
import { playWeakSpotsRound } from "./weak-spots";

/** Types the shown generated snippet or burst line by line, leaving indentation to auto-indent. */
async function typeShownCode(page: Page) {
  const code = page.getByTestId("typing-code");
  const id = (await code.getAttribute("data-snippet-id")) ?? "";
  const text = (await code.textContent()) ?? "";
  expect(text.length).toBeGreaterThan(0);
  const lines = text.split("\n");
  for (const [i, line] of lines.entries()) {
    await page.keyboard.type(line.trimStart());
    if (i < lines.length - 1) await page.keyboard.press("Enter");
  }
  return { id, text, lines };
}

test("typing a Python and a C++ generated snippet with auto-indent in the real app", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "Código" }).check();
  await expect(page.getByRole("textbox", { name: "Código digitado" })).toBeFocused();

  await page.getByRole("checkbox", { name: "C++" }).uncheck();
  const python = await typeShownCode(page);
  expect(python.id).toMatch(/^gen:python:\d+$/);
  await expect(page.getByTestId("accuracy")).toHaveText("100%");
  await expect(page.getByTestId("wpm")).toHaveText(/^\d+$/);
  await expect(page.getByTestId("typing-seed")).toHaveText(/^\d+$/);

  await page.getByRole("checkbox", { name: "C++" }).check();
  await page.getByRole("checkbox", { name: "Python" }).uncheck();
  await page.getByRole("textbox", { name: "Código digitado" }).focus();
  const cpp = await typeShownCode(page);
  expect(cpp.id).toMatch(/^gen:cpp:\d+$/);
  await expect(page.getByTestId("accuracy")).toHaveText("100%");
  await expect(page.getByTestId("typing-summary")).toContainText("Últimas 10 rodadas");
  await expect(page.getByTestId("typing-summary")).toContainText("melhor");
  await expect(page.getByTestId("typing-pace-result")).toContainText("das linhas certas no ritmo");
  await expect(page.getByTestId("typing-pace-result")).toContainText("→");
});

test("burst mode repeats one idiom 5 times and shows repetition times and separate target", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "Código" }).check();
  await page.getByRole("checkbox", { name: "Rajada (5×)" }).check();

  const burst = await typeShownCode(page);
  expect(burst.id).toMatch(/^burst:(cpp|python):[a-z0-9-]+:\d+$/);
  expect(burst.lines).toHaveLength(5);
  expect(new Set(burst.lines).size).toBe(1);

  await expect(page.getByTestId("burst-rep")).toHaveCount(5);
  await expect(page.getByTestId("burst-ratio")).toContainText("×");
  await expect(page.getByTestId("typing-pace-result")).toContainText("→");
});

test("code ghost caret advances during typing and hides when Ritmo-alvo is off", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("radio", { name: "Código" }).check();

  const code = page.getByTestId("typing-code");
  await expect(code.locator('[data-ghost="true"]')).toHaveCount(0);
  await page.keyboard.type("a");
  await page.clock.runFor(1600);
  await expect(code.locator('[data-ghost="true"]')).toHaveCount(1);

  await page.keyboard.press("Escape");
  await page.getByRole("checkbox", { name: "Ritmo-alvo" }).uncheck();
  await page.getByRole("textbox", { name: "Código digitado" }).focus();
  await page.keyboard.type("a");
  await page.clock.runFor(1600);
  await expect(code.locator('[data-ghost="true"]')).toHaveCount(0);
});

test("weak spots round with seeded history highlights focused n-gram and shows before/after result", async ({
  page,
}) => {
  await playWeakSpotsRound(page);

  await expect(page.getByTestId("result")).toBeVisible();
  await expect(page.getByTestId("weak-results-table")).toContainText("qu");
  await expect(page.getByTestId("weak-results-table")).toContainText("360 ms");
  await expect(page.getByTestId("weak-results-table")).toContainText("->");
  await expect(page.getByTestId("weak-results-table")).toContainText("290 ms");
});
