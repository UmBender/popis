// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { manualClock } from "../core/clock";
import { arithmetic, DEFAULT_ARITHMETIC } from "../gen/arithmetic";
import { QUOTA_NOTICE_KEY } from "../storage/daily";
import { appendSession, loadHistory, memoryStore, type KeyValueStore } from "../storage/history";
import { DataPanel } from "./DataPanel";

const NOW = Date.UTC(2026, 10, 20, 15);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function withSession(store: KeyValueStore = memoryStore()): KeyValueStore {
  appendSession(store, {
    version: 1,
    mode: "arithmetic",
    finishedAt: NOW - 1000,
    durationMs: 120_000,
    seed: 4,
    params: DEFAULT_ARITHMETIC,
    log: [
      {
        problem: arithmetic.generate(4, DEFAULT_ARITHMETIC),
        outcome: "correct",
        timeMs: 1000,
        corrections: 0,
      },
    ],
  });
  return store;
}

function setup(store: KeyValueStore, save = vi.fn()) {
  render(<DataPanel store={store} clock={manualClock(NOW)} save={save} />);
  return save;
}

const upload = (text: string) =>
  fireEvent.change(screen.getByLabelText("Importar dados"), {
    target: { files: [new File([text], "backup.json", { type: "application/json" })] },
  });

describe("DataPanel", () => {
  it("export button downloads a dated json", () => {
    const save = setup(withSession());

    fireEvent.click(screen.getByRole("button", { name: "Exportar dados" }));

    expect(save).toHaveBeenCalledTimes(1);
    const [name, text] = save.mock.calls[0] as [string, string];
    expect(name).toBe("popis-2026-11-20.json");
    const parsed = JSON.parse(text) as { app: string; data: Record<string, unknown> };
    expect(parsed.app).toBe("popis");
    expect(Object.keys(parsed.data)).toContain("popis.history.v1");
  });

  it("export saves a file through the browser by default", () => {
    // jsdom has no object URLs.
    const createObjectURL = vi.fn((_blob: Blob) => "blob:fake");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    let anchor: HTMLAnchorElement | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      anchor = this;
    });
    render(<DataPanel store={withSession()} clock={manualClock(NOW)} />);

    fireEvent.click(screen.getByRole("button", { name: "Exportar dados" }));
    Reflect.deleteProperty(URL, "createObjectURL");
    Reflect.deleteProperty(URL, "revokeObjectURL");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL.mock.calls[0]?.[0].type).toBe("application/json");
    expect(anchor?.download).toBe("popis-2026-11-20.json");
    expect(anchor?.getAttribute("href")).toBe("blob:fake");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("import button merges a chosen file and says so", async () => {
    const source = setup(withSession());
    fireEvent.click(screen.getByRole("button", { name: "Exportar dados" }));
    const text = (source.mock.calls[0] as [string, string])[1];
    cleanup();
    const target = memoryStore();
    setup(target);

    upload(text);

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("Importado: 1 registro novo.");
    });
    expect(loadHistory(target)).toHaveLength(1);
  });

  it("an invalid file shows an error", async () => {
    setup(memoryStore());

    upload("not json");

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("não é um backup do POPIS");
    });
    upload('{"app":"popis","version":9,"data":{}}');
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("versão");
    });
    upload('{"app":"other","version":1,"data":{}}');
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("outro app");
    });
  });

  it("choosing no file does nothing", () => {
    setup(memoryStore());

    fireEvent.change(screen.getByLabelText("Importar dados"), { target: { files: [] } });

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("the quota notice shows once", () => {
    const store = memoryStore({ [QUOTA_NOTICE_KEY]: "pending" });
    const { unmount } = render(<DataPanel store={store} clock={manualClock(NOW)} save={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toContain("armazenamento");

    fireEvent.click(screen.getByRole("button", { name: "Entendi" }));
    expect(screen.queryByRole("alert")).toBeNull();
    unmount();

    render(<DataPanel store={store} clock={manualClock(NOW)} save={vi.fn()} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
