import { expect, test } from "@playwright/test";

test("Treino do dia, nível automático, recomendações e experimento funcionam e cabem no celular", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const now = Date.now();
    const day = 86_400_000;
    const sessions = Array.from({ length: 10 }, (_, idx) => ({
      version: 1,
      mode: "arithmetic",
      finishedAt: now - (21 - idx * 2) * day,
      durationMs: 60_000,
      seed: idx + 1,
      params: {
        operations: ["add", "sub", "mul", "div"],
        addLeft: { min: 2, max: 100 },
        addRight: { min: 2, max: 100 },
        mulLeft: { min: 2, max: 12 },
        mulRight: { min: 2, max: 100 },
      },
      log: Array.from({ length: 10 }, (_, j) => ({
        problem: {
          skill: j % 2 === 0 ? "arithmetic.add" : "arithmetic.mul",
          prompt: "2 + 2",
          answer: "4",
          seed: j,
          params: {},
        },
        outcome: j < 6 ? "correct" : "skipped",
        timeMs: 1200,
        corrections: 0,
      })),
    }));
    localStorage.setItem("popis.history.v1", JSON.stringify(sessions));
    localStorage.setItem(
      "popis.adaptive.v1",
      JSON.stringify({
        autoLevel: { "vim-motion": false, arithmetic: false, estimation: false, sums: false },
        targetAccuracy: 0.85,
        dailyMode: "interleaved",
        dailyModeWeek: "2026-W47",
        dailySessions: [
          {
            finishedAt: now - 10 * day,
            week: "2026-W45",
            mode: "interleaved",
            accuracy: 0.85,
            hitsPerMin: 24,
            itemsCompleted: 20,
          },
          {
            finishedAt: now - 3 * day,
            week: "2026-W46",
            mode: "blocked",
            accuracy: 0.82,
            hitsPerMin: 21,
            itemsCompleted: 18,
          },
        ],
      }),
    );
  });

  await page.goto("/");

  // Recommendation visible in Aritmética panel
  await expect(page.getByTestId("recommendations")).toContainText("deve ajudar");

  // Auto-level option visible and toggleable
  const auto = page.getByRole("checkbox", { name: /Nível automático/i });
  await auto.check();
  await expect(page.getByRole("combobox", { name: /Meta de acerto/i })).toHaveValue("0.85");

  // Treino do dia sits at the top of the tree
  await page.getByRole("radio", { name: "Treino do dia", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Treino do dia" })).toBeVisible();
  await expect(page.getByTestId("daily-blocks")).toBeVisible();

  // Toggle weekly mode
  await page.getByRole("combobox", { name: /Modo da semana/i }).selectOption("blocked");

  // Evolução shows experiment comparison
  await page.getByRole("radio", { name: "Evolução", exact: true }).click();
  await expect(page.getByTestId("daily-experiment")).toContainText("Intercalado");
  await expect(page.getByTestId("daily-experiment")).toContainText("Em bloco");

  // Mobile viewport check: no horizontal overflow on Treino do dia
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("radio", { name: "Treino do dia", exact: true }).click();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
