import { expect, test, type Page } from "@playwright/test";

// T25 AC-8: GDB Aprender (lesson + 3 exercises) and Comandos round on desktop and mobile.

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

test("T25: open a lesson, complete all 3 exercises and play a Comandos round", async ({ page }) => {
  await page.clock.install();
  await page.goto("./");

  await chooseItem(page, "Aprender (GDB)");
  await expect(page.getByTestId("shell-path")).toHaveText("popis/gdb/aprender");
  await expect(page.getByRole("list", { name: "Unidades" })).toBeVisible();
  await expectNoHorizontalScroll(page, "gdb learn list");

  // Open the first lesson of Unit 2 (break) so exercises are short gdb commands.
  await page.getByRole("button", { name: /Parar com break/ }).click();
  await expect(page.getByTestId("learn-explanation")).toBeVisible();
  await expect(page.getByTestId("learn-step")).toContainText("1");
  await expectNoHorizontalScroll(page, "gdb learn lesson");

  const box = page.getByRole("textbox", { name: "Comando gdb" });
  const ref1 = (await page.getByTestId("learn-reference").textContent()) ?? "";
  const cmd1 = ref1.replace(/^.*?:\s*/, "").trim();

  // Miss once on exercise 1 so all 3 exercises are walked.
  await box.fill("zzz");
  await box.press("Enter");
  await expect(page.getByTestId("learn-feedback")).toBeVisible();

  await box.fill(cmd1);
  await box.press("Enter");
  await expect(page.getByTestId("learn-step")).toContainText("2");

  // Miss once on exercise 2, then answer cleanly -> goes to exercise 3.
  await box.fill("zzz");
  await box.press("Enter");
  const prompt2 = (await page.getByTestId("learn-exercise-prompt").textContent()) ?? "";
  const line2 = /linha (\d+)/.exec(prompt2)?.[1];
  const fn2 = /função `?(\w+)`?/.exec(prompt2)?.[1];
  await box.fill(line2 !== undefined ? `b ${line2}` : `b ${fn2 ?? "main"}`);
  await box.press("Enter");
  await expect(page.getByTestId("learn-step")).toContainText("3");

  // Complete exercise 3.
  const prompt3 = (await page.getByTestId("learn-exercise-prompt").textContent()) ?? "";
  const line3 = /linha (\d+)/.exec(prompt3)?.[1];
  const fn3 = /função `?(\w+)`?/.exec(prompt3)?.[1];
  await box.fill(line3 !== undefined ? `break ${line3}` : `break ${fn3 ?? "main"}`);
  await box.press("Enter");
  await expect(page.getByTestId("learn-done")).toBeVisible();

  // Jump to Comandos via Treinar.
  await page.getByRole("button", { name: "Treinar" }).click();
  await expect(page.getByTestId("shell-path")).toHaveText("popis/gdb/comandos");
  await expect(page.getByTestId("gdb-code")).toBeVisible();
  await expectNoHorizontalScroll(page, "gdb commands");

  // Submit a wrong command to see canonical feedback and start the 60 s clock.
  const cmdBox = page.getByRole("textbox", { name: "Comando gdb" });
  await cmdBox.fill("zzz");
  await cmdBox.press("Enter");
  await expect(page.getByTestId("gdb-feedback")).toHaveAttribute("data-outcome", "wrong");

  // Finish the 60 s round on the fake clock.
  await page.clock.runFor(61_000);
  await expect(page.getByTestId("result")).toBeVisible();
  await expect(page.getByTestId("gdb-kind-table")).toBeVisible();
  await expectNoHorizontalScroll(page, "gdb results");
});
