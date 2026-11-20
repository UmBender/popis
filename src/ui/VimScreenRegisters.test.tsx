// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { memoryStore, type KeyValueStore } from "../storage/history";
import { VIM_EDIT_SETTINGS_KEY } from "../storage/vim";
import { parseKeys } from "../vim/keys";
import { VimScreen } from "./VimScreen";

// AC-7: the status line says when a macro is being recorded, and a panel lists
// the registers that hold something.

let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(): KeyValueStore {
  const store = memoryStore({
    [VIM_EDIT_SETTINGS_KEY]: JSON.stringify({
      drill: "edit",
      durationS: 60,
      kinds: ["delete-line"],
    }),
  });
  render(<VimScreen clock={clock} store={store} newSeed={() => 21} onBack={vi.fn()} />);
  return store;
}

const box = () => screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Teclas do Vim" });
const status = () => screen.getByTestId("vim-status");
const panel = () => screen.getByTestId("vim-registers");

const EVENT_KEYS: Record<string, string> = {
  "<CR>": "Enter",
  "<Esc>": "Escape",
  "<BS>": "Backspace",
};

function press(keys: string) {
  for (const key of parseKeys(keys)) {
    const ctrl = /^<C-(.)>$/.exec(key);
    if (ctrl !== null) fireEvent.keyDown(box(), { key: ctrl[1], ctrlKey: true });
    else fireEvent.keyDown(box(), { key: EVENT_KEYS[key] ?? key });
  }
}

describe("VimScreen registers", () => {
  it("the status line says gravando @a while recording and stops after q", () => {
    setup();
    expect(status().textContent).not.toContain("gravando");
    press("qa");
    expect(status().textContent).toContain("gravando @a");
    press("l");
    expect(status().textContent).toContain("gravando @a");
    press("q");
    expect(status().textContent).not.toContain("gravando");
  });

  it("the status line shows a register prefix while it is typed", () => {
    setup();
    press('"a');
    expect(status().textContent).toContain('"a');
  });

  it("the panel says that no register holds text at first", () => {
    setup();
    expect(within(panel()).getByText("Nenhum registrador com texto.")).toBeTruthy();
  });

  it("a yank shows in the unnamed register and in register 0, with ^J for line breaks", () => {
    setup();
    press("yy");
    const rows = panel().querySelectorAll("li");
    expect(rows).toHaveLength(2);
    expect((rows[0] as HTMLElement).dataset["register"]).toBe('"');
    expect((rows[1] as HTMLElement).dataset["register"]).toBe("0");
    expect(rows[0]?.textContent).toContain("^J");
    expect(rows[0]?.textContent).toContain("l");
  });

  it("a recorded macro shows in its register with the Esc spelled ^[", () => {
    setup();
    press("qaA;<Esc>q");
    const row = panel().querySelector<HTMLElement>('li[data-register="a"]');
    expect(row?.textContent).toContain("A;^[");
  });

  it("a named yank is listed under its name", () => {
    setup();
    press('"ayy');
    expect(panel().querySelector('li[data-register="a"]')).not.toBeNull();
    expect(panel().querySelector('li[data-register="0"]')).toBeNull();
  });

  it("the panel is hidden when the round has finished", () => {
    setup();
    // The first key starts the clock; the timer exists only after that render.
    press("l");
    act(() => {
      clock.advance(61_000);
      vi.advanceTimersByTime(61_000);
    });
    expect(screen.queryByTestId("vim-registers")).toBeNull();
  });

  it("the commands panel explains registers and macros with a use in CP", () => {
    setup();
    const commands = screen.getByRole("group", { name: "Comandos" });
    for (const keys of ['"a', '"_', "q", "@a", "@@", "<C-a>"]) {
      expect(within(commands).getByText(keys, { selector: "code" })).toBeTruthy();
    }
  });
});
