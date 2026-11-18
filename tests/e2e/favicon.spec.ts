import { expect, test } from "@playwright/test";

test("the served app links and delivers the favicon", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(href).toMatch(/^\/favicon\.svg\?v=[0-9a-f]{8}$/);

  const response = await request.get(href ?? "");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/svg+xml");
  expect(await response.text()).toContain(">n!<");
});
