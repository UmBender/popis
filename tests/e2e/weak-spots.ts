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
  // Paused: only runFor moves time, so real lag between keys (a busy
  // machine) never reaches the measured intervals (T51).
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  await page.goto("/");
  await page.getByRole("radio", { name: "Pontos fracos" }).check();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pontos fracos");
  await expect(page.getByTestId("weak-focus")).toHaveText("qu");
  await expect(
    page.getByTestId("weak-words").locator('[data-weak-match="true"]').first(),
  ).toBeVisible();

  for (let block = 1; block <= 5; block++) {
    const stepMs = block === 1 ? 100 : 250;
    // The screen focuses its input in an effect: type only once it has.
    await expect(page.getByRole("textbox", { name: "Texto digitado" })).toBeFocused();
    const focus = (await page.getByTestId("weak-focus").textContent()) ?? "";
    const words = await page
      .getByTestId("weak-words")
      .locator(".word")
      .evaluateAll((els) => els.slice(0, 20).map((el) => el.textContent ?? ""));
    // The words come from a fresh seed, and the first ones may lack the
    // focused n-gram; keep typing until two words with it are in (T51).
    let withFocus = 0;
    for (const word of words) {
      if (withFocus >= 2) break;
      for (const ch of word) {
        await page.clock.runFor(stepMs);
        if (realDelayMs > 0) await page.waitForTimeout(realDelayMs);
        await page.keyboard.type(ch);
      }
      await page.clock.runFor(stepMs);
      await page.keyboard.press("Space");
      if (word.includes(focus)) withFocus += 1;
    }
    expect(withFocus).toBe(2);
    await page.clock.runFor(31_000);
  }
}
