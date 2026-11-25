import { expect, test, type Page } from "@playwright/test";

// T40 AC-5: Maratona -> Ler o erro round on desktop and mobile without horizontal overflow.

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

test("T40: play a Ler o erro round on desktop and mobile", async ({ page }) => {
  await page.clock.install();
  await page.goto("./");

  await chooseItem(page, "Ler o erro");
  await expect(page.getByTestId("shell-path")).toHaveText("popis/maratona/ler o erro");
  await expect(page.getByRole("heading", { level: 1, name: "Ler o erro" })).toBeVisible();
  await expect(page.getByTestId("compile-code")).toBeVisible();
  await expect(page.getByTestId("compile-output")).toBeVisible();
  await expect(page.getByTestId("compile-choices")).toBeVisible();
  await expectNoHorizontalScroll(page, "compile idle");

  // Select line 1 and the first cause button to start the 90 s clock.
  await page.getByRole("button", { name: "Linha 1" }).click();
  await page.getByTestId("compile-choices").getByRole("button").first().click();
  await expect(page.getByTestId("compile-feedback")).toBeVisible();
  await expectNoHorizontalScroll(page, "compile feedback");

  // Finish the 90 s round on the fake clock.
  await page.clock.runFor(91_000);
  await expect(page.getByTestId("result")).toBeVisible();
  await expect(page.getByTestId("compile-group-table")).toBeVisible();
  await expectNoHorizontalScroll(page, "compile results");
});
