// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { generateShellItem } from "../shell/drill";
import { loadEvents } from "../storage/events";
import { memoryStore, type KeyValueStore } from "../storage/history";
import { loadShellResults, loadShellSettings, SHELL_KEY } from "../storage/shell";
import { App } from "./App";
import { ShellScreen } from "./ShellScreen";

// T39 AC-5: Shell Comandos screen: objective, directory files, terminal lines,
// equivalent-form acceptance, canonical feedback on error, 60 s timer and T22 events.

const SEED = 29;
let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock();
});

afterEach(() => {
  vi.useRealTimers();
});

function advance(ms: number) {
  act(() => {
    clock.advance(ms);
    vi.advanceTimersByTime(ms);
  });
}

function setup(store: KeyValueStore = memoryStore()) {
  const onLearn = vi.fn();
  const onRunning = vi.fn();
  render(
    <ShellScreen
      drill="commands"
      clock={clock}
      store={store}
      newSeed={() => SEED}
      onBack={vi.fn()}
      onRunning={onRunning}
      onLearn={onLearn}
    />,
  );
  return { store, onLearn, onRunning };
}

const input = () => screen.getByRole<HTMLInputElement>("textbox", { name: "Comando bash" });

function submit(cmd: string) {
  const box = input();
  fireEvent.change(box, { target: { value: cmd } });
  fireEvent.keyDown(box, { key: "Enter" });
}

describe("ShellScreen Commands mode (AC-5)", () => {
  it("Enter submits and an equivalent form counts as correct", () => {
    const store = memoryStore({
      [SHELL_KEY]: JSON.stringify({ durationS: 60, kinds: ["compilar"] }),
    });
    setup(store);

    const item0 = generateShellItem(SEED, 0, ["compilar"]);
    expect(screen.getByTestId("shell-prompt").textContent).toBe(item0.prompt);
    expect(screen.getByTestId("shell-files").textContent).toContain(item0.files[0] ?? "");
    expect(screen.getByTestId("shell-terminal")).toBeTruthy();

    const alt = item0.alternatives[0] ?? item0.canonical;
    submit(alt);

    expect(screen.getByTestId("shell-score").textContent).toBe("1");
    expect(screen.getByTestId("shell-feedback").getAttribute("data-outcome")).toBe("correct");

    const item1 = generateShellItem(SEED, 1, ["compilar"]);
    expect(screen.getByTestId("shell-prompt").textContent).toBe(item1.prompt);
  });

  it("a wrong command shows the canonical form and moves on", () => {
    const store = memoryStore({
      [SHELL_KEY]: JSON.stringify({ durationS: 60, kinds: ["compilar"] }),
    });
    setup(store);

    const item0 = generateShellItem(SEED, 0, ["compilar"]);
    const item1 = generateShellItem(SEED, 1, ["compilar"]);

    submit("ls");

    const feedback = screen.getByTestId("shell-feedback");
    expect(feedback.getAttribute("data-outcome")).toBe("wrong");
    expect(feedback.textContent).toContain(item0.canonical);
    expect(screen.getByTestId("shell-score").textContent).toBe("0");
    expect(screen.getByTestId("shell-prompt").textContent).toBe(item1.prompt);
  });

  it("the round ends at 60 s on the fake clock", () => {
    const store = memoryStore({
      [SHELL_KEY]: JSON.stringify({ durationS: 60, kinds: ["compilar", "rodar"] }),
    });
    setup(store);

    const item0 = generateShellItem(SEED, 0, ["compilar", "rodar"]);
    submit(item0.canonical);
    submit("echo nope");

    expect(screen.getByTestId("shell-time").textContent).toBe("60 s");
    advance(60_500);

    expect(screen.getByTestId("result")).toBeTruthy();
    expect(screen.getByTestId("shell-kind-table")).toBeTruthy();
    expect(screen.getByTestId("shell-wrong-list").textContent).toContain("echo nope");
    expect(loadShellResults(store)).toHaveLength(1);

    const events = loadEvents(store);
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.drill === "shell.cmd")).toBe(true);
    expect(events[0]?.kc).toBe(item0.kc);
    expect(events[0]?.ok).toBe(true);
    expect(events[1]?.ok).toBe(false);
  });

  it("supports kind toggles, skip, restart, Esc exit and opens from the app tree", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => SEED} />);

    fireEvent.click(screen.getByRole("radio", { name: "Comandos (Shell)" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/shell/comandos");
    expect(screen.getByRole("heading", { level: 1, name: "Comandos" })).toBeTruthy();

    fireEvent.click(screen.getByText("Tipos de comando"));
    const arquivosBox = screen.getByRole<HTMLInputElement>("checkbox", { name: /Arquivos/ });
    fireEvent.click(arquivosBox);
    expect(loadShellSettings(store).kinds).not.toContain("arquivos");

    const box = input();
    fireEvent.change(box, { target: { value: "g" } });
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();

    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    expect(screen.getByTestId("shell-feedback").getAttribute("data-outcome")).toBe("skipped");

    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.getByRole("radiogroup", { name: "Treinos" })).toBeTruthy();
  });

  it("aprender links in Comandos reference panel jump to the command lesson", () => {
    const { onLearn } = setup();
    const ref = screen.getByRole("group", { name: "Comandos" });
    const links = within(ref).getAllByRole("button", { name: "aprender" });
    expect(links.length).toBeGreaterThanOrEqual(20);
    fireEvent.click(links[0]!);
    expect(onLearn).toHaveBeenCalledTimes(1);
    expect(typeof onLearn.mock.calls[0]?.[0]).toBe("string");
  });

  it("handles duration change, form submit button, restart shortcut, warning tone and results keyboard", () => {
    const store = memoryStore({
      [SHELL_KEY]: JSON.stringify({ durationS: 60, kinds: ["arquivos"] }),
    });
    setup(store);

    fireEvent.change(screen.getByRole("combobox", { name: "Duração" }), {
      target: { value: "30" },
    });
    expect(loadShellSettings(store).durationS).toBe(30);

    fireEvent.keyDown(input(), { key: "a" });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(screen.queryByTestId("shell-feedback")).toBeNull();

    const item0 = generateShellItem(SEED, 0, ["arquivos"]);
    fireEvent.change(input(), { target: { value: item0.canonical } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.getByTestId("shell-score").textContent).toBe("1");

    advance(25_000);
    expect(screen.getByTestId("shell-time").className).toContain("warning");
    advance(6_000);
    expect(screen.getByTestId("shell-final-score").textContent).toBe("1 acerto em 30 s");

    fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
    expect(screen.queryByTestId("result")).toBeNull();

    fireEvent.change(input(), { target: { value: "zzz" } });
    fireEvent.keyDown(input(), { key: "Enter", ctrlKey: true, shiftKey: true });
    expect(input().value).toBe("");

    fireEvent.change(input(), { target: { value: "zzz" } });
    advance(31_000);
    expect(screen.getByTestId("result")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.queryByTestId("result")).toBeNull();

    fireEvent.change(input(), { target: { value: "zzz" } });
    advance(31_000);
    expect(screen.getByTestId("result")).toBeTruthy();
    fireEvent.keyDown(window, { key: "a" });
    expect(screen.getByTestId("result")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("result")).toBeNull();
  });
});
