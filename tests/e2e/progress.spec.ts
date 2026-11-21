import { expect, test } from "@playwright/test";

test("Evolução displays charts, allows setting a goal, and fits phone viewport without horizontal scroll", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const base = Date.UTC(2026, 0, 1);
    const day = 86_400_000;
    const sessions = Array.from({ length: 12 }, (_, i) => ({
      version: 1,
      mode: "arithmetic",
      finishedAt: base + i * 3 * day,
      durationMs: 60_000,
      seed: i + 1,
      params: {
        operations: ["add", "sub", "mul", "div"],
        addLeft: { min: 2, max: 100 },
        addRight: { min: 2, max: 100 },
        mulLeft: { min: 2, max: 12 },
        mulRight: { min: 2, max: 100 },
      },
      log: Array.from({ length: Math.round(35 + i * 1.2) }, (_, j) => ({
        problem: {
          prompt: "2+2",
          answer: "4",
          skill: j % 2 === 0 ? "arithmetic.add" : "arithmetic.mul",
          seed: j,
          params: {},
        },
        outcome: "correct",
        timeMs: j % 2 === 0 ? 1000 : 1800,
        corrections: 0,
      })),
    }));
    localStorage.setItem("popis.history.v1", JSON.stringify(sessions));
  });

  await page.goto("/");
  await page.getByRole("radio", { name: "Evolução", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Evolução" })).toBeVisible();
  await expect(page.locator("svg").first()).toBeVisible();

  await page.getByLabel("Meta (valor)").first().fill("60");
  await page.getByLabel("Data da meta").first().fill("2026-06-01");
  await page.getByRole("button", { name: "Salvar meta" }).first().click();
  await expect(page.getByTestId("goal-status-arithmetic")).toBeVisible();

  // AC-7: phone viewport has no horizontal overflow.
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
