// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { browserStore } from "./history";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("browserStore", () => {
  it("reads and writes localStorage", () => {
    browserStore().setItem("k", "v");
    expect(window.localStorage.getItem("k")).toBe("v");
    expect(browserStore().getItem("k")).toBe("v");
  });

  it("falls back to memory when localStorage is blocked", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const store = browserStore();
    store.setItem("k", "v");
    expect(store.getItem("k")).toBe("v");
  });
});
