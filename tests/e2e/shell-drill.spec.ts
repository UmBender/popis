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

test("T54: a script lesson shows the annotated file next to each line", async ({ page }) => {
  await page.clock.install();
  await page.goto("./");
  await chooseItem(page, "Aprender (Shell)");
  await page.getByRole("button", { name: /Primeiro script/ }).click();

  const script = page.getByTestId("shell-script");
  await expect(script).toBeVisible();
  await expect(script).toContainText("ola.sh");
  const code = page.getByTestId("shell-script-code").first();
  const note = page.getByTestId("shell-script-note").first();
  await expect(code).toHaveText("#!/usr/bin/env bash");
  await expect(note).toBeVisible();
  await expectNoHorizontalScroll(page, "shell script lesson");

  const codeBox = await code.boundingBox();
  const noteBox = await note.boundingBox();
  expect(codeBox).not.toBeNull();
  expect(noteBox).not.toBeNull();
  if (codeBox !== null && noteBox !== null) {
    if (test.info().project.name === "mobile") {
      // Narrow screen: the note sits below its line of code.
      expect(noteBox.y).toBeGreaterThanOrEqual(codeBox.y + codeBox.height - 1);
    } else {
      // Wide screen: the note sits beside its line of code.
      expect(noteBox.x).toBeGreaterThan(codeBox.x + codeBox.width - 1);
      expect(Math.abs(noteBox.y - codeBox.y)).toBeLessThan(codeBox.height);
    }
  }

  // The first exercise accepts the shown command.
  const ref = (await page.getByTestId("learn-reference").textContent()) ?? "";
  const box = page.getByRole("textbox", { name: "Comando bash" });
  await box.fill(ref.replace(/^.*?:\s*/, "").trim());
  await box.press("Enter");
  await expect(page.getByTestId("learn-step")).toContainText("3");
});
