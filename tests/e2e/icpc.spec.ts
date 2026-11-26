import { expect, test, type Page } from "@playwright/test";

// T43 AC-3: ICPC scoreboard drill inside Maratona folder on desktop and mobile.

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

test("T43: open Placar in Maratona, submit an answer and finish a 90 s round", async ({ page }) => {
  await page.clock.install();
  await page.goto("./");

  await chooseItem(page, "Placar");
  await expect(page.getByTestId("shell-path")).toHaveText("popis/maratona/placar");
  await expect(page.getByRole("heading", { level: 1, name: "Placar" })).toBeVisible();
  await expect(page.getByTestId("icpc-board")).toBeVisible();
  await expect(page.getByTestId("icpc-time")).toHaveText("90 s");
  await expectNoHorizontalScroll(page, "icpc drill");

  const box = page.getByRole("textbox", { name: "Resposta" });
  await box.fill("99999");
  await box.press("Enter");
  await expect(page.getByTestId("icpc-feedback")).toHaveAttribute("data-outcome", "wrong");

  await page.clock.runFor(91_000);
  await expect(page.getByTestId("result")).toBeVisible();
  await expect(page.getByTestId("icpc-kind-table")).toBeVisible();
  await expectNoHorizontalScroll(page, "icpc results");
});
