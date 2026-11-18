import { expect, test } from "@playwright/test";

function solve(prompt: string): string {
  const match = /^(\d+) ([+−×÷]) (\d+)$/.exec(prompt);
  if (match === null) throw new Error(`unexpected prompt: ${prompt}`);
  const [a, b] = [Number(match[1]), Number(match[3])];
  return String({ "+": a + b, "−": a - b, "×": a * b, "÷": a / b }[match[2] as "+"]);
}

test("a full two-minute game in the real app", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Começar" }).click();

  const answer = page.getByRole("textbox", { name: "Resposta" });
  await expect(answer).toBeFocused();
  for (let i = 1; i <= 3; i++) {
    const prompt = (await page.getByTestId("prompt").textContent()) ?? "";
    await answer.pressSequentially(solve(prompt));
    await expect(page.getByTestId("score")).toHaveText(String(i));
    await expect(answer).toHaveValue("");
  }

  await page.clock.runFor(121_000);
  await expect(page.getByTestId("final-score")).toHaveText("3");
  await expect(page.getByRole("table", { name: "Mais lentas" })).toBeVisible();
});
