import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock } from "../core/clock";
import { entriesOf, sectionsOf } from "../ref/langs";
import { memoryStore } from "../storage/history";
import { App } from "./App";
import { RefScreen } from "./RefScreen";

// T46 AC-5: the reader, common to every language; AC-6/AC-7: opened from the hash and the tree.

const CPP = entriesOf("cpp");
const scrolled = vi.fn();

beforeEach(() => {
  history.replaceState(null, "", "/");
  scrolled.mockClear();
  Element.prototype.scrollIntoView = scrolled;
});

afterEach(() => {
  history.replaceState(null, "", "/");
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "clipboard");
});

const search = () => screen.getByRole("searchbox", { name: "Buscar na referência" });
const entry = (title: string) => screen.getByRole("article", { name: title });
const titleOf = (id: string) => CPP.find((e) => e.id === id)?.title ?? id;

describe("RefScreen", () => {
  it("reader shows every entry grouped by section with its parts", () => {
    render(<RefScreen lang="cpp" />);
    expect(screen.getAllByRole("article")).toHaveLength(CPP.length);
    const nav = screen.getByRole("navigation", { name: "Seções" });
    expect(within(nav).getAllByRole("button").map((b) => b.textContent)).toEqual(
      sectionsOf("cpp").map((s) => s.title),
    );
    const vector = entry(titleOf("vector"));
    expect(within(vector).getByTestId("ref-signature").textContent).toContain("vector");
    expect(within(vector).getByRole("table", { name: "Complexidade" })).toBeTruthy();
    expect(within(vector).getByTestId("ref-example").textContent).toBe(
      CPP.find((e) => e.id === "vector")?.example,
    );
    expect(within(vector).getByTestId("ref-output").textContent).toBe(
      CPP.find((e) => e.id === "vector")?.output,
    );
    expect(within(vector).getByRole("link", { name: "cppreference" }).getAttribute("href")).toMatch(
      /^https:\/\/en\.cppreference\.com\/w\/cpp\//,
    );
    const eof = entry(titleOf("read_until_eof"));
    expect(within(eof).getByTestId("ref-input").textContent).toBe(
      CPP.find((e) => e.id === "read_until_eof")?.input,
    );
    const gcd = entry(titleOf("gcd"));
    expect(within(gcd).getByTestId("ref-complexity").textContent).toContain("log");
    expect(within(gcd).getByText("C++17")).toBeTruthy();
  });

  it("typing filters entries", () => {
    render(<RefScreen lang="cpp" />);
    fireEvent.change(search(), { target: { value: "priority" } });
    const shown = screen.getAllByRole("article");
    expect(shown.length).toBeLessThan(CPP.length);
    expect(shown[0]).toBe(entry(titleOf("priority_queue")));
    expect(screen.getByTestId("ref-count").textContent).toBe(`${String(shown.length)} verbetes`);
    fireEvent.change(search(), { target: { value: "lb" } });
    expect(screen.getAllByRole("article")[0]).toBe(entry(titleOf("lower_bound")));
    fireEvent.change(search(), { target: { value: "zzzzqqq" } });
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByText("Nenhum verbete encontrado.")).toBeTruthy();
  });

  it("/ focuses search", () => {
    render(<RefScreen lang="cpp" />);
    expect(document.activeElement).not.toBe(search());
    fireEvent.keyDown(window, { key: "/", ctrlKey: true });
    expect(document.activeElement).not.toBe(search());
    const pressed = fireEvent.keyDown(document.body, { key: "/" });
    expect(pressed).toBe(false);
    expect(document.activeElement).toBe(search());
    // Inside the field, "/" is typed, not taken.
    expect(fireEvent.keyDown(search(), { key: "/" })).toBe(true);
  });

  it("Escape clears the search", () => {
    render(<RefScreen lang="cpp" />);
    fireEvent.change(search(), { target: { value: "sort" } });
    fireEvent.keyDown(search(), { key: "a" });
    expect((search() as HTMLInputElement).value).toBe("sort");
    fireEvent.keyDown(search(), { key: "Escape" });
    expect((search() as HTMLInputElement).value).toBe("");
    expect(screen.getAllByRole("article")).toHaveLength(CPP.length);
  });

  it("hash opens the entry", () => {
    history.replaceState(null, "", "/#cpp/lower_bound");
    render(<RefScreen lang="cpp" />);
    const lb = entry(titleOf("lower_bound"));
    expect(lb.getAttribute("aria-current")).toBe("true");
    expect(document.activeElement).toBe(lb);
    expect(scrolled).toHaveBeenCalled();

    // A later hash change opens another entry and clears the search.
    fireEvent.change(search(), { target: { value: "zzzzqqq" } });
    act(() => {
      history.replaceState(null, "", "/#cpp/priority_queue");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect((search() as HTMLInputElement).value).toBe("");
    expect(entry(titleOf("priority_queue")).getAttribute("aria-current")).toBe("true");
    expect(entry(titleOf("lower_bound")).getAttribute("aria-current")).toBeNull();

    // A hash of an unknown entry or another language opens nothing.
    act(() => {
      history.replaceState(null, "", "/#cpp/no_such_entry");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(screen.queryByRole("article", { current: true })).toBeNull();
  });

  it("clicking a title puts its hash in the URL and opens it", () => {
    render(<RefScreen lang="cpp" />);
    const sort = entry(titleOf("sort"));
    fireEvent.click(within(sort).getByRole("link", { name: titleOf("sort") }));
    expect(window.location.hash).toBe("#cpp/sort");
    expect(entry(titleOf("sort")).getAttribute("aria-current")).toBe("true");
  });

  it("judge badge is shown", () => {
    render(<RefScreen lang="cpp" />);
    const judged = CPP.find((e) => e.judge === true);
    expect(judged).toBeDefined();
    const article = entry(judged?.title ?? "");
    expect(within(article).getByText("não existe na WF")).toBeTruthy();
    expect(within(article).getByText("C++23")).toBeTruthy();
    expect(within(entry(titleOf("sort"))).queryByText("não existe na WF")).toBeNull();
  });

  it("copy puts the example on the clipboard", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<RefScreen lang="cpp" />);
    const sort = entry(titleOf("sort"));
    await act(async () => {
      fireEvent.click(within(sort).getByRole("button", { name: "copiar" }));
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith(CPP.find((e) => e.id === "sort")?.example);
    expect(within(sort).getByRole("button", { name: "copiado" })).toBeTruthy();
  });

  it("copy without a clipboard does nothing", () => {
    render(<RefScreen lang="cpp" />);
    const sort = entry(titleOf("sort"));
    fireEvent.click(within(sort).getByRole("button", { name: "copiar" }));
    expect(within(sort).getByRole("button", { name: "copiar" })).toBeTruthy();
  });

  it("a section link scrolls to the section", () => {
    render(<RefScreen lang="cpp" />);
    const nav = screen.getByRole("navigation", { name: "Seções" });
    const containers = sectionsOf("cpp").find((s) => s.id === "containers");
    fireEvent.click(within(nav).getByRole("button", { name: containers?.title ?? "" }));
    expect(scrolled).toHaveBeenCalledTimes(1);
    expect(scrolled.mock.contexts[0]).toBe(document.getElementById("ref-cpp-containers"));
  });

  it("print button prints the sheet", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<RefScreen lang="cpp" />);
    fireEvent.click(screen.getByRole("button", { name: "imprimir" }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("app opens the reference from the hash", () => {
    history.replaceState(null, "", "/#cpp/set");
    render(<App clock={manualClock()} store={memoryStore()} newSeed={() => 5} />);
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/referência/c++");
    expect(entry(titleOf("set")).getAttribute("aria-current")).toBe("true");
  });

  it("app switches to the reference when the hash changes", () => {
    render(<App clock={manualClock()} store={memoryStore()} newSeed={() => 5} />);
    expect(screen.getByTestId("shell-path").textContent).not.toContain("referência");
    act(() => {
      history.replaceState(null, "", "/#somewhere-else");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(screen.getByTestId("shell-path").textContent).not.toContain("referência");
    act(() => {
      history.replaceState(null, "", "/#cpp/map");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/referência/c++");
    expect(entry(titleOf("map")).getAttribute("aria-current")).toBe("true");
  });
});
