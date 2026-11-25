import { expect, test, type Page } from "@playwright/test";

// T42 AC-5: STL output drill inside Maratona folder on desktop and mobile.

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

test("T42: open STL in Maratona, submit an answer and finish a 120 s round", async ({ page }) => {
  await page.clock.install();
  await page.goto("./");

  await chooseItem(page, "STL");
  await expect(page.getByTestId("shell-path")).toHaveText("popis/maratona/stl");
  await expect(page.getByRole("heading", { level: 1, name: "STL" })).toBeVisible();
  await expect(page.getByTestId("stl-code")).toBeVisible();
  await expect(page.getByTestId("stl-time")).toHaveText("120 s");
  await expectNoHorizontalScroll(page, "stl drill");

  const box = page.getByRole("textbox", { name: "Saída do programa" });
  await box.fill("resposta-errada");
  await box.press("Enter");
  await expect(page.getByTestId("stl-feedback")).toHaveAttribute("data-outcome", "wrong");

  await page.clock.runFor(121_000);
  await expect(page.getByTestId("result")).toBeVisible();
  await expect(page.getByTestId("stl-model-table")).toBeVisible();
  await expectNoHorizontalScroll(page, "stl results");
});
