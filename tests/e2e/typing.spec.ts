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
  await page.getByRole("button", { name: "Digitação" }).click();
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
  await expect(page.getByTestId("typing-summary")).toContainText("Python: melhor");
  await expect(page.getByTestId("typing-summary")).toContainText("C++: melhor");
});
