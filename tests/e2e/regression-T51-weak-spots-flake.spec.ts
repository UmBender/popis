// On a busy machine the weak-spots e2e sometimes saw "qu" at ~290 ms and
// never moved on to "->": the fake clock kept flowing with real time, so
// real lag between keys leaked into the measured intervals. A slow machine
// must not change what the round measures.
import { expect, test } from "@playwright/test";
import { playWeakSpotsRound } from "./weak-spots";

test.describe("regression T51 weak-spots-flake", () => {
  test("real lag between keys does not leak into the measured intervals", async ({ page }) => {
    await playWeakSpotsRound(page, { realDelayMs: 200 });

    await expect(page.getByTestId("result")).toBeVisible();
    await expect(page.getByTestId("weak-results-table")).toContainText("qu");
    await expect(page.getByTestId("weak-results-table")).toContainText("->");
  });
});
