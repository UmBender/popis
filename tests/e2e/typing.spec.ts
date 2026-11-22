import { expect, test, type Page } from "@playwright/test";
import { CORPUS } from "../../src/typing/corpus";

/** Types the shown snippet line by line, leaving the indentation to auto-indent. */
async function typeShownSnippet(page: Page) {
  const id = await page.getByTestId("typing-code").getAttribute("data-snippet-id");
  const snippet = CORPUS.find((s) => s.id === id);
  expect(snippet, `snippet ${id ?? ""}`).toBeDefined();
  const lines = (snippet?.text ?? "").split("\n");
  for (const [i, line] of lines.entries()) {
    await page.keyboard.type(line.trimStart());
    if (i < lines.length - 1) await page.keyboard.press("Enter");
  }
  return snippet;
}

test("typing a Python and a C++ snippet with auto-indent in the real app", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "Código" }).check();
  await expect(page.getByRole("textbox", { name: "Código digitado" })).toBeFocused();

  await page.getByRole("checkbox", { name: "C++" }).uncheck();
  const python = await typeShownSnippet(page);
  expect(python?.language).toBe("python");
  await expect(page.getByTestId("accuracy")).toHaveText("100%");
  await expect(page.getByTestId("wpm")).toHaveText(/^\d+$/);

  await page.getByRole("checkbox", { name: "C++" }).check();
  await page.getByRole("checkbox", { name: "Python" }).uncheck();
  await page.getByRole("textbox", { name: "Código digitado" }).focus();
  const cpp = await typeShownSnippet(page);
  expect(cpp?.language).toBe("cpp");
  await expect(page.getByTestId("accuracy")).toHaveText("100%");
  await expect(page.getByTestId("typing-summary")).toContainText("Últimas 10 rodadas");
  await expect(page.getByTestId("typing-summary")).toContainText("melhor");
  await expect(page.getByTestId("typing-pace-result")).toContainText("das linhas no ritmo");
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
  const now = Date.UTC(2026, 10, 22, 12);
  const seeded = [
    ...Array.from({ length: 6 }, (_, k) => [
      now - 86_400_000 + k * 1000,
      "typing.text",
      "en-30s",
      "word",
      1,
      360,
      { seed: 500 + k, i: 0, w: "qu", iv: [360], bad: [] },
    ]),
    ...Array.from({ length: 6 }, (_, k) => [
      now - 2 * 86_400_000 + k * 1000,
      "typing.text",
      "en-30s",
      "word",
      1,
      290,
      { seed: 600 + k, i: 0, w: "->", iv: [290], bad: [] },
    ]),
  ];
  await page.addInitScript(
    ({ eventsJson, paceJson }) => {
      window.localStorage.setItem("popis.events.v1", eventsJson);
      window.localStorage.setItem("popis.typing-pace", paceJson);
    },
    {
      eventsJson: JSON.stringify(seeded),
      paceJson: JSON.stringify({
        version: 1,
        enabled: true,
        goal: 0.85,
        targets: { "text:en-30s": 60 },
      }),
    },
  );
  await page.clock.install({ time: now });
  await page.goto("/");
  await page.getByRole("radio", { name: "Pontos fracos" }).check();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pontos fracos");
  await expect(page.getByTestId("weak-focus")).toHaveText("qu");
  await expect(
    page.getByTestId("weak-words").locator('[data-weak-match="true"]').first(),
  ).toBeVisible();

  for (let block = 1; block <= 5; block++) {
    const stepMs = block === 1 ? 100 : 250;
    const words = await page
      .getByTestId("weak-words")
      .locator(".word")
      .evaluateAll((els) => els.slice(0, 2).map((el) => el.textContent ?? ""));
    for (const word of words) {
      for (const ch of word) {
        await page.clock.runFor(stepMs);
        await page.keyboard.type(ch);
      }
      await page.clock.runFor(stepMs);
      await page.keyboard.press("Space");
    }
    await page.clock.runFor(31_000);
  }

  await expect(page.getByTestId("result")).toBeVisible();
  await expect(page.getByTestId("weak-results-table")).toContainText("qu");
  await expect(page.getByTestId("weak-results-table")).toContainText("360 ms");
  await expect(page.getByTestId("weak-results-table")).toContainText("->");
  await expect(page.getByTestId("weak-results-table")).toContainText("290 ms");
});
