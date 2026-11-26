// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { manualClock } from "../core/clock";
import { GUIDE_ITEMS, GUIDE_SECTIONS } from "../guide/content";
import { GUIDE_KEY, loadGuideState, saveGuideState } from "../storage/guide";
import { memoryStore } from "../storage/history";
import { App } from "./App";
import { GuideScreen } from "./GuideScreen";

// T44 AC-2: checklist screen, persistence in popis.guide, Nova prova reset, links and printing.

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GuideScreen (AC-2)", () => {
  it("guide screen renders every section and persists checked items in popis.guide", () => {
    const store = memoryStore();
    const onOpenLink = vi.fn();
    const view = render(<GuideScreen store={store} onOpenLink={onOpenLink} />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Guia");
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(
      GUIDE_SECTIONS.map((s) => s.title),
    );

    const boxes = screen.getAllByRole<HTMLInputElement>("checkbox");
    expect(boxes).toHaveLength(GUIDE_ITEMS.length);
    expect(boxes.every((box) => !box.checked)).toBe(true);
    expect(screen.getByTestId("guide-progress").textContent).toBe(
      `0/${String(GUIDE_ITEMS.length)} marcados`,
    );

    const first = GUIDE_ITEMS[0];
    const second = GUIDE_ITEMS[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    fireEvent.click(screen.getByRole("checkbox", { name: first?.text ?? "" }));
    fireEvent.click(screen.getByRole("checkbox", { name: second?.text ?? "" }));

    expect(screen.getByTestId("guide-progress").textContent).toBe(
      `2/${String(GUIDE_ITEMS.length)} marcados`,
    );
    expect(store.getItem(GUIDE_KEY)).toBeTruthy();
    expect(loadGuideState(store).checked).toEqual([first?.id, second?.id]);

    view.unmount();

    render(<GuideScreen store={store} onOpenLink={onOpenLink} />);
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", { name: first?.text ?? "" }).checked,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", { name: second?.text ?? "" }).checked,
    ).toBe(true);

    fireEvent.click(screen.getByRole("checkbox", { name: first?.text ?? "" }));
    expect(loadGuideState(store).checked).toEqual([second?.id]);
  });

  it("Nova prova clears all checked items and updates popis.guide", () => {
    const store = memoryStore();
    const ids = GUIDE_ITEMS.slice(0, 3).map((item) => item.id);
    saveGuideState(store, { checked: ids });

    render(<GuideScreen store={store} onOpenLink={vi.fn()} />);
    expect(screen.getByTestId("guide-progress").textContent).toBe(
      `3/${String(GUIDE_ITEMS.length)} marcados`,
    );

    fireEvent.click(screen.getByRole("button", { name: "Nova prova" }));

    expect(screen.getByTestId("guide-progress").textContent).toBe(
      `0/${String(GUIDE_ITEMS.length)} marcados`,
    );
    expect(screen.getAllByRole<HTMLInputElement>("checkbox").every((box) => !box.checked)).toBe(
      true,
    );
    expect(loadGuideState(store).checked).toEqual([]);
  });

  it("clicking item and lesson links opens the target screen or lesson", () => {
    render(<App clock={manualClock()} store={memoryStore()} newSeed={() => 7} />);

    fireEvent.click(screen.getByRole("radio", { name: "Guia" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/maratona/guia");

    const estimativaLinks = screen.getAllByRole("button", { name: "Estimativa" });
    fireEvent.click(estimativaLinks[0] as HTMLElement);
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/cp/estimativa");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Estimativa");

    fireEvent.click(screen.getByRole("radio", { name: "Guia" }));
    fireEvent.click(screen.getByRole("button", { name: "Shell: .bashrc" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/shell/aprender");
    expect(
      screen.getByRole("heading", { level: 2, name: /Atalhos e funções no ~\/\.bashrc/ }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "Guia" }));
    fireEvent.click(screen.getByRole("button", { name: "GDB: sinais" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/gdb/aprender");
    expect(screen.getByTestId("learn-explanation").textContent).toContain("SIGSEGV");
  });

  it("Imprimir calls window.print", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<GuideScreen store={memoryStore()} onOpenLink={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    expect(print).toHaveBeenCalledTimes(1);
  });
});
