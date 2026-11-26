import { expect, type Page } from "@playwright/test";

/**
 * Seeds two weak n-grams ("qu" slower than "->"), opens Pontos fracos and
 * types five blocks: the first fast enough for "qu" to graduate, so the
 * round moves on to "->". `realDelayMs` waits that long in real time
 * before each key, as a busy machine would (T51).
 */
export async function playWeakSpotsRound(page: Page, { realDelayMs = 0 } = {}) {
  const now = Date.UTC(2026, 10, 22, 12);
  const seeded = [
    ...Array.from({ length: 6 }, (_, k) => [
      now - 86_400_000 + k * 1000,
      "typing.text",
      "en-30s",
      "word",
      1,
      360,
      { seed: 500 + k, i: 0, w: "qu", iv: [360], bad: [] },
    ]),
    ...Array.from({ length: 6 }, (_, k) => [
      now - 2 * 86_400_000 + k * 1000,
      "typing.text",
      "en-30s",
      "word",
      1,
      290,
      { seed: 600 + k, i: 0, w: "->", iv: [290], bad: [] },
    ]),
  ];
  await page.addInitScript(
    ({ eventsJson, paceJson }) => {
      window.localStorage.setItem("popis.events.v1", eventsJson);
      window.localStorage.setItem("popis.typing-pace", paceJson);
    },
    {
      eventsJson: JSON.stringify(seeded),
      paceJson: JSON.stringify({
        version: 1,
        enabled: true,
        goal: 0.85,
        targets: { "text:en-30s": 60 },
      }),
    },
  );
  await page.clock.install({ time: now });
  await page.goto("/");
  await page.getByRole("radio", { name: "Pontos fracos" }).check();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pontos fracos");
  await expect(page.getByTestId("weak-focus")).toHaveText("qu");
  await expect(
    page.getByTestId("weak-words").locator('[data-weak-match="true"]').first(),
  ).toBeVisible();

  for (let block = 1; block <= 5; block++) {
    const stepMs = block === 1 ? 100 : 250;
    const words = await page
      .getByTestId("weak-words")
      .locator(".word")
      .evaluateAll((els) => els.slice(0, 2).map((el) => el.textContent ?? ""));
    for (const word of words) {
      for (const ch of word) {
        await page.clock.runFor(stepMs);
        if (realDelayMs > 0) await page.waitForTimeout(realDelayMs);
        await page.keyboard.type(ch);
      }
      await page.clock.runFor(stepMs);
      await page.keyboard.press("Space");
    }
    await page.clock.runFor(31_000);
  }
}
