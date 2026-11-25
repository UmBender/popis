import { expect, test, type Page } from "@playwright/test";

// T45 AC-7: Regex Aprender (one lesson) and Prática (one item) on desktop and mobile.

async function chooseItem(page: Page, radioName: string) {
  const mobile = test.info().project.name === "mobile";
  if (mobile) {
    await page.getByRole("button", { name: "Menu" }).click();
  }
  await page.getByRole("radio", { name: radioName, exact: true }).click();
}

async function expectNoHorizontalScroll(page: Page, where: string) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, `horizontal scroll on ${where}`).toBeLessThanOrEqual(client);
}

test("T45: complete one Regex lesson and solve/skip one Prática item", async ({ page }) => {
  await page.goto("./");

  // Open Regex -> Aprender and verify the 9 units render with no horizontal overflow.
  await chooseItem(page, "Aprender (Regex)");
  await expect(page.getByTestId("shell-path")).toHaveText("popis/regex/aprender");
  await expect(page.getByRole("list", { name: "Unidades" })).toBeVisible();
  await expectNoHorizontalScroll(page, "regex learn list");

  // Open the first lesson of Unit 1.
  await page.getByRole("button", { name: /Caracteres literais/ }).click();
  await expect(page.getByTestId("learn-explanation")).toBeVisible();
  await expect(page.getByTestId("learn-step")).toContainText("1");
  await expectNoHorizontalScroll(page, "regex learn lesson");

  // Read the canonical hint on exercise 1 and solve cleanly -> jumps to exercise 3.
  const ref1 = (await page.getByTestId("learn-reference").textContent()) ?? "";
  const pat1 = ref1.replace(/^.*?:\s*/, "").trim();
  const learnBox = page.getByRole("textbox", { name: "Expressão regular" });
  await learnBox.fill(pat1);
  await learnBox.press("Enter");
  await expect(page.getByTestId("learn-step")).toContainText("3");

  // Solve exercise 3 (literal "TLE" in unit 1 lesson 1).
  await learnBox.fill("TLE");
  await learnBox.press("Enter");
  await expect(page.getByTestId("learn-done")).toBeVisible();

  // Jump to Prática via Treinar.
  await page.getByRole("button", { name: "Treinar" }).click();
  await expect(page.getByTestId("shell-path")).toHaveText("popis/regex/prática");
  await expect(page.getByTestId("regex-progress")).toHaveText("1 / 5");
  await expectNoHorizontalScroll(page, "regex practice");

  // Trigger a live syntax error, then skip to reveal canonical and advance to item 2.
  const practiceBox = page.getByRole("textbox", { name: "Expressão regular" });
  if (await practiceBox.isVisible()) {
    await practiceBox.fill("(abc");
    await expect(page.getByTestId("regex-error")).toBeVisible();
  }
  await page.getByRole("button", { name: "Pular" }).click();
  await expect(page.getByTestId("regex-canonical")).toBeVisible();
  await page.getByRole("button", { name: "Próximo" }).click();
  await expect(page.getByTestId("regex-progress")).toHaveText("2 / 5");
  await expectNoHorizontalScroll(page, "regex practice item 2");
});
