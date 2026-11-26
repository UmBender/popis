import { expect, test, type Page } from "@playwright/test";

// T41 AC-4: Maratona -> Caça ao WA 5-case round on desktop and mobile without horizontal overflow.

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

test("T41: play a 5-case Caça ao WA round on desktop and mobile", async ({ page }) => {
  await page.goto("./");

  await chooseItem(page, "Caça ao WA");
  await expect(page.getByTestId("shell-path")).toHaveText("popis/maratona/caça ao wa");
  await expect(page.getByRole("heading", { level: 1, name: "Caça ao WA" })).toBeVisible();
  await expect(page.getByTestId("wa-statement")).toBeVisible();
  await expect(page.getByTestId("wa-code")).toBeVisible();
  await expect(page.getByTestId("wa-choices")).toBeVisible();
  await expectNoHorizontalScroll(page, "wa idle");

  // Play all 5 cases: pick line 1 and first class, check counterexample + diff, then advance.
  for (let i = 1; i <= 5; i++) {
    await expect(page.getByTestId("wa-progress")).toHaveText(`${String(i)}/5`);
    await page.getByRole("button", { name: "Linha 1", exact: true }).click();
    await page.getByTestId("wa-choices").getByRole("button").first().click();

    await expect(page.getByTestId("wa-feedback")).toBeVisible();
    await expect(page.getByTestId("wa-breaking-input")).toBeVisible();
    await expect(page.getByTestId("wa-wrong-output")).toBeVisible();
    await expect(page.getByTestId("wa-expected-output")).toBeVisible();
    await expect(page.getByTestId("wa-diff")).toBeVisible();
    if (i === 1) await expectNoHorizontalScroll(page, "wa feedback");

    const nextName = i < 5 ? /Próximo/ : /Ver resultado/;
    await page.getByRole("button", { name: nextName }).click();
  }

  await expect(page.getByTestId("result")).toBeVisible();
  await expect(page.getByTestId("wa-class-table")).toBeVisible();
  await expectNoHorizontalScroll(page, "wa results");
});
