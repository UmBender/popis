import { expect, test, type Page } from "@playwright/test";

// T44 AC-2/AC-3: contest guide on desktop and mobile, persistence, links and one-page A4 print.

async function expectNoHorizontalScroll(page: Page, where: string) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, `horizontal scroll on ${where}`).toBeLessThanOrEqual(client);
}

async function openGuide(page: Page, mobile: boolean) {
  if (mobile) await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("radio", { name: "Guia", exact: true }).click();
  await expect(page.getByTestId("shell-path")).toHaveText("popis/maratona/guia");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Guia");
}

function pdfPageCount(pdf: Buffer): number {
  const latin = pdf.toString("latin1");
  const pages = latin.match(/\/Type\s*\/Page\b/g);
  return pages?.length ?? 0;
}

test("T44: open Guia from Maratona, persist checks, reset with Nova prova and follow links", async ({
  page,
}) => {
  const mobile = test.info().project.name === "mobile";
  await page.goto("./");
  await openGuide(page, mobile);
  await expectNoHorizontalScroll(page, "guide");

  const first = page.getByRole("checkbox").first();
  const second = page.getByRole("checkbox").nth(1);
  await first.click();
  await second.click();
  await expect(first).toBeChecked();
  await expect(second).toBeChecked();

  await page.reload();
  await expect(page.getByTestId("shell-path")).toHaveText("popis/maratona/guia");
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await expect(page.getByRole("checkbox").nth(1)).toBeChecked();

  await page.getByRole("button", { name: "Nova prova" }).click();
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();
  await expect(page.getByRole("checkbox").nth(1)).not.toBeChecked();

  await page.reload();
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();

  await page.getByRole("button", { name: "Estimativa" }).first().click();
  await expect(page.getByTestId("shell-path")).toHaveText("popis/cp/estimativa");

  await openGuide(page, mobile);
  await page.getByRole("button", { name: "Shell: .bashrc" }).click();
  await expect(page.getByTestId("shell-path")).toHaveText("popis/shell/aprender");
  await expect(
    page.getByRole("heading", { level: 2, name: /Atalhos e funções no ~\/\.bashrc/ }),
  ).toBeVisible();
  await expectNoHorizontalScroll(page, "guide link destination");
});

test("T44: print sheet hides shell and buttons, renders empty square checkboxes and fits on one A4 page", async ({
  page,
}) => {
  const mobile = test.info().project.name === "mobile";
  await page.goto("./");
  await openGuide(page, mobile);

  // Check an item before printing: the print sheet still renders an empty square.
  const firstBox = page.getByRole("checkbox").first();
  await firstBox.click();
  await expect(firstBox).toBeChecked();

  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("shell-bar")).toBeHidden();
  await expect(page.getByTestId("shell-status")).toBeHidden();
  await expect(page.getByRole("button", { name: "Nova prova" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Imprimir" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Shell: .bashrc" })).toBeHidden();

  const headings = page.locator(".guide-section h2");
  await expect(headings).toHaveCount(7);
  for (let i = 0; i < 7; i++) {
    await expect(headings.nth(i)).toBeVisible();
  }

  const boxStyle = await firstBox.evaluate((el) => {
    const inputStyle = getComputedStyle(el);
    const label = el.parentElement;
    const beforeContent = label ? getComputedStyle(label, "::before").content : "";
    return {
      borderWidth: parseFloat(inputStyle.borderTopWidth),
      beforeContent,
    };
  });
  expect(boxStyle.borderWidth).toBeGreaterThan(0);
  expect(boxStyle.beforeContent).toBe("none");

  const pdf = await page.pdf({ format: "A4" });
  expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  expect(pdfPageCount(pdf)).toBe(1);
});
