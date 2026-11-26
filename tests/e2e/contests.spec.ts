import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

// T38 AC-6/AC-7: Agenda > Contests on desktop and mobile with mocked contests.json.

const NOW = Date.UTC(2026, 10, 26, 12, 0, 0);
const MIN_TOUCH_PX = 44;

const MOCK_SNAPSHOT = {
  generatedAt: NOW - 20 * 60_000,
  contests: [
    {
      site: "codeforces",
      id: "2292",
      name: "Codeforces Round 1138 (Div. 3)",
      url: "https://codeforces.com/contests/2292",
      startMs: NOW - 30 * 60_000,
      durationMs: 2 * 3_600_000,
    },
    {
      site: "atcoder",
      id: "abc486",
      name: "AtCoder Beginner Contest 486",
      url: "https://atcoder.jp/contests/abc486",
      startMs: NOW + 2 * 86_400_000 + 3 * 3_600_000,
      durationMs: 100 * 60_000,
    },
    {
      site: "leetcode",
      id: "weekly-contest-530",
      name: "Weekly Contest 530",
      url: "https://leetcode.com/contest/weekly-contest-530",
      startMs: NOW + 3 * 86_400_000,
      durationMs: 90 * 60_000,
    },
  ],
  errors: [{ site: "codechef", message: "HTTP 503" }],
};

async function expectNoHorizontalScroll(page: Page, where: string) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, `horizontal scroll on ${where}`).toBeLessThanOrEqual(client);
}

async function expectTouchTargets(targets: Locator, where: string) {
  for (const target of await targets.all()) {
    if (!(await target.isVisible())) continue;
    const box = await target.boundingBox();
    const name = (await target.textContent())?.trim() ?? (await target.getAttribute("aria-label"));
    expect(box?.height ?? 0, `${where}: "${name ?? ""}" is too short`).toBeGreaterThanOrEqual(
      MIN_TOUCH_PX,
    );
  }
}

test("T38: open Contests from the Agenda folder, filter sites and download .ics", async ({
  page,
}) => {
  const mobile = test.info().project.name === "mobile";
  await page.clock.setFixedTime(NOW);
  await page.route("**/contests.json", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SNAPSHOT),
    });
  });

  await page.goto("./");
  if (mobile) await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("radio", { name: "Contests", exact: true }).click();

  await expect(page.getByTestId("shell-path")).toHaveText("popis/agenda/contests");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contests");
  await expect(page.getByText("atualizado há 20 min")).toBeVisible();
  await expect(page.getByText("CodeChef indisponível na última atualização")).toBeVisible();

  const running = page.getByRole("region", { name: "Acontecendo agora" });
  await expect(running.getByRole("link", { name: "Codeforces Round 1138 (Div. 3)" })).toBeVisible();
  await expect(running.getByText("termina em 1 h 30 min")).toBeVisible();

  await expect(page.getByRole("link", { name: "AtCoder Beginner Contest 486" })).toBeVisible();
  await expect(page.getByText("começa em 2 d 3 h")).toBeVisible();
  await expect(page.getByRole("link", { name: "Weekly Contest 530" })).toBeVisible();
  await expectNoHorizontalScroll(page, "contests");
  if (mobile) {
    await expectTouchTargets(
      page.locator(
        ".contests-controls label, .contests-controls button, .contest-actions a, .contest-actions button",
      ),
      "contests mobile",
    );
  }

  // Filter out AtCoder and verify persistence across reload.
  await page.getByRole("checkbox", { name: "AtCoder" }).uncheck();
  await expect(page.getByRole("link", { name: "AtCoder Beginner Contest 486" })).toBeHidden();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Baixar .ics", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("contests.ics");
  const filePath = await download.path();
  expect(filePath).not.toBeNull();
  if (filePath !== null) {
    const ics = readFileSync(filePath, "utf8");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:codeforces-2292@popis");
    expect(ics).toContain("UID:leetcode-weekly-contest-530@popis");
    expect(ics).not.toContain("UID:atcoder-abc486@popis");
  }

  await page.reload();
  await expect(page.getByRole("checkbox", { name: "AtCoder" })).not.toBeChecked();
  await expect(page.getByRole("link", { name: "AtCoder Beginner Contest 486" })).toBeHidden();
  await expectNoHorizontalScroll(page, "contests after reload");
});
