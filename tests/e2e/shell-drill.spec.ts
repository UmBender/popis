import { expect, test, type Page } from "@playwright/test";

// T39 AC-7: Shell Aprender (one lesson + exercises) and Comandos round on desktop and mobile.

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

test("T39: complete a Shell Aprender lesson and play a Comandos round", async ({ page }) => {
  await page.clock.install();
  await page.goto("./");

  await chooseItem(page, "Aprender (Shell)");
  await expect(page.getByTestId("shell-path")).toHaveText("popis/shell/aprender");
  await expect(page.getByRole("list", { name: "Unidades" })).toBeVisible();
  await expectNoHorizontalScroll(page, "shell learn list");

  // Open the first lesson of Unit 1 (Arquivos).
  await page.getByRole("button", { name: /Navegar pastas/ }).click();
  await expect(page.getByTestId("learn-explanation")).toBeVisible();
  await expect(page.getByTestId("learn-step")).toContainText("1");
  await expectNoHorizontalScroll(page, "shell learn lesson");

  const box = page.getByRole("textbox", { name: "Comando bash" });
  const ref1 = (await page.getByTestId("learn-reference").textContent()) ?? "";
  const cmd1 = ref1.replace(/^.*?:\s*/, "").trim();

  // Miss once on exercise 1 so step 2 is shown, then answer step 1 cleanly.
  await box.fill("echo errado");
  await box.press("Enter");
  await expect(page.getByTestId("learn-feedback")).toBeVisible();

  await box.fill(cmd1);
  await box.press("Enter");
  await expect(page.getByTestId("learn-step")).toContainText("2");

  // Answer exercise 2 cleanly (moves directly to done via adaptive fading).
  const prompt2 = (await page.getByTestId("learn-exercise-prompt").textContent()) ?? "";
  const cmd2 = prompt2.includes("anterior")
    ? "cd -"
    : prompt2.includes("ocultos")
      ? "ls -la"
      : "cd contest";
  await box.fill(cmd2);
  await box.press("Enter");
  await expect(page.getByTestId("learn-done")).toBeVisible();

  // Jump to Comandos via Treinar.
  await page.getByRole("button", { name: "Treinar" }).click();
  await expect(page.getByTestId("shell-path")).toHaveText("popis/shell/comandos");
  await expect(page.getByTestId("shell-files")).toBeVisible();
  await expect(page.getByTestId("shell-terminal")).toBeVisible();
  await expectNoHorizontalScroll(page, "shell commands");

  // Submit a wrong command to verify canonical feedback and start the 60 s clock.
  const cmdBox = page.getByRole("textbox", { name: "Comando bash" });
  await cmdBox.fill("echo errado");
  await cmdBox.press("Enter");
  await expect(page.getByTestId("shell-feedback")).toHaveAttribute("data-outcome", "wrong");

  // Finish the 60 s round on the fake clock.
  await page.clock.runFor(61_000);
  await expect(page.getByTestId("result")).toBeVisible();
  await expect(page.getByTestId("shell-kind-table")).toBeVisible();
  await expectNoHorizontalScroll(page, "shell results");
});
