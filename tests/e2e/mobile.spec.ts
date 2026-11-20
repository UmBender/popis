import { expect, test, type Locator, type Page } from "@playwright/test";
import { MODE_IDS, MODES } from "../../src/modes";

// T11 (ADR-T11-1): runs in the "mobile" project (Pixel 7) against the
// Pages build served under /popis/.

const MIN_TOUCH_PX = 44;

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

async function expectInTopHalf(page: Page, target: Locator, where: string) {
  const viewport = page.viewportSize();
  const box = await target.boundingBox();
  expect(box, `${where} is visible`).not.toBeNull();
  expect((box?.y ?? 0) + (box?.height ?? 0), `${where} below the keyboard`).toBeLessThanOrEqual(
    (viewport?.height ?? 0) / 2,
  );
}

test("the app served under /popis/ loads its script and favicon", async ({ page, request }) => {
  await page.goto("./");
  await expect(page.getByRole("button", { name: "Começar" })).toBeVisible();

  const href = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(href).toMatch(/^\/popis\/favicon\.svg\?v=[0-9a-f]{8}$/);
  const response = await request.get(href ?? "");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/svg+xml");
});

test("typing is hidden on touch screens", async ({ page }) => {
  // T10 AC-8: code typing needs a physical keyboard.
  await page.goto("./");
  await expect(page.getByRole("button", { name: "Começar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Digitação" })).toBeHidden();
});

test("text typing fits a phone", async ({ page }) => {
  // T12 AC-10: text typing stays visible on touch screens.
  await page.goto("./");
  await page.getByRole("button", { name: "Texto", exact: true }).click();
  const box = page.getByRole("textbox", { name: "Texto digitado" });
  await expect(box).toBeFocused();
  await expect(box).toHaveAttribute("autocapitalize", "off");
  await expect(box).toHaveAttribute("autocorrect", "off");
  await expect(box).toHaveAttribute("spellcheck", "false");
  await expectNoHorizontalScroll(page, "text typing");
  await expectTouchTargets(page.locator("label.op, select, button"), "text typing");
  await expectInTopHalf(page, page.getByTestId("text-words"), "text typing words");

  await page.getByRole("combobox", { name: "Modo" }).selectOption("words");
  await page.getByRole("combobox", { name: "Tamanho" }).selectOption("10");
  const words = await page.getByTestId("text-words").locator("[data-word]").allTextContents();
  await box.focus();
  await page.keyboard.type(words.join(" "));
  await expect(page.getByTestId("text-accuracy")).toHaveText("100%");
  await expectNoHorizontalScroll(page, "text typing results");
  await expectTouchTargets(page.locator("button"), "text typing results");
});

test("every mode fits a phone in config, game and results", async ({ page }) => {
  await page.clock.install();
  await page.goto("./");

  // Review comes last in MODE_IDS: the skips of the modes before it give it items.
  for (const mode of MODE_IDS) {
    const spec = MODES[mode];
    await page.getByRole("radio", { name: spec.label }).check();
    await expectNoHorizontalScroll(page, `${mode} config`);
    await expectTouchTargets(
      page.locator("label.op, input.bound, select, button"),
      `${mode} config`,
    );
    const durationS = Number(await page.getByRole("combobox", { name: "Duração" }).inputValue());

    await page.getByRole("button", { name: "Começar" }).click();
    const answer = page.getByRole("textbox", { name: "Resposta" });
    await expect(answer).toBeFocused();
    if (spec.numeric) {
      await expect(answer).toHaveAttribute("inputmode", "numeric");
    } else {
      await expect(answer).toHaveAttribute("inputmode", "text");
    }
    await expect(answer).toHaveAttribute("autocapitalize", "off");
    await expect(answer).toHaveAttribute("autocorrect", "off");
    await expect(answer).toHaveAttribute("spellcheck", "false");
    await expectNoHorizontalScroll(page, `${mode} game`);
    await expectInTopHalf(page, page.getByTestId("prompt"), `${mode} prompt`);
    await expectInTopHalf(page, answer, `${mode} answer box`);
    const choices = page.getByRole("list", { name: "Opções" });
    if ((await choices.count()) > 0) await expectInTopHalf(page, choices, `${mode} choices`);

    if (spec.allowSkip) {
      await answer.press("Enter");
      await expect(page.getByTestId("skipped")).toBeVisible();
      await expectNoHorizontalScroll(page, `${mode} game after a skip`);
    }

    await page.clock.runFor(durationS * 1000 + 1000);
    await expect(page.getByTestId("final-score")).toBeVisible();
    await expectNoHorizontalScroll(page, `${mode} results`);
    await expectTouchTargets(page.locator("button"), `${mode} results`);
    await page.getByRole("button", { name: "Configurar" }).click();
  }
});
