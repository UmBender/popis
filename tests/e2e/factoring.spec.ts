import { expect, test } from "@playwright/test";

/** Factors a level-1 prompt "x² + bx + c" by trying every pair of roots in −9..9. */
function factor(prompt: string): string {
  const text = prompt.replaceAll("−", "-").replaceAll(" ", "");
  const match = /^x²(?:([+-]\d*)x)?([+-]\d+)?$/.exec(text);
  if (match === null) throw new Error(`unexpected prompt: ${prompt}`);
  const linear = match[1];
  const b = linear === undefined ? 0 : linear.length === 1 ? Number(`${linear}1`) : Number(linear);
  const c = match[2] === undefined ? 0 : Number(match[2]);
  for (let r = -9; r <= 9; r++) {
    for (let s = -9; s <= 9; s++) {
      if (r + s === -b && r * s === c) {
        const term = (root: number) => (root >= 0 ? `(x-${root})` : `(x+${-root})`);
        return term(r) + term(s);
      }
    }
  }
  throw new Error(`no integer roots: ${prompt}`);
}

test("a factoring game with a skip in the real app", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("radio", { name: "Fatoração" }).check();
  await page.getByRole("button", { name: "Começar" }).click();

  const answer = page.getByRole("textbox", { name: "Resposta" });
  for (let i = 1; i <= 2; i++) {
    const prompt = (await page.getByTestId("prompt").textContent()) ?? "";
    await answer.pressSequentially(factor(prompt));
    await expect(page.getByTestId("score")).toHaveText(String(i));
  }

  const skippedPrompt = (await page.getByTestId("prompt").textContent()) ?? "";
  await answer.press("Enter");
  await expect(page.getByTestId("skipped")).toContainText(skippedPrompt);

  await page.clock.runFor(121_000);
  await expect(page.getByTestId("final-score")).toHaveText("2");
  await expect(page.getByRole("table", { name: "Puladas" })).toContainText(skippedPrompt);
});
