// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { memoryStore, type KeyValueStore } from "../storage/history";
import { VIM_EDIT_SETTINGS_KEY, loadVimEditSettings } from "../storage/vim";
import { VIM_LEARN_KEY, loadUnlocked, unlockKind } from "../storage/vim-learn";
import { EDIT_KIND_LABELS } from "../vim/drills/edit";
import { REGISTER_KINDS } from "../vim/drills/register-edit";
import { formatKeys, parseKeys } from "../vim/keys";
import { exampleFrames, exerciseFor, lessonFor } from "../vim/lessons";
import { VimScreen } from "./VimScreen";

// AC-6: the Learn mode: an explanation, an animated example and a guided
// exercise for each kind, which unlocks the free practice of that kind.

const STEP_MS = 600;

let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(store: KeyValueStore = memoryStore(), drill: "learn" | "edit" = "learn") {
  store.setItem(
    VIM_EDIT_SETTINGS_KEY,
    JSON.stringify({ drill, durationS: 60, kinds: ["delete-line"] }),
  );
  render(<VimScreen clock={clock} store={store} newSeed={() => 21} onBack={vi.fn()} />);
  return store;
}

const box = () => screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Teclas do Vim" });

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function press(keys: string) {
  for (const key of parseKeys(keys)) {
    const named = { "<CR>": "Enter", "<Esc>": "Escape", "<BS>": "Backspace" }[key];
    const ctrl = /^<C-(.)>$/.exec(key);
    if (ctrl !== null) fireEvent.keyDown(box(), { key: ctrl[1], ctrlKey: true });
    else fireEvent.keyDown(box(), { key: named ?? key });
  }
}

const open = (kind: (typeof REGISTER_KINDS)[number]) => {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(lessonFor(kind).title) }));
};

describe("VimScreen Learn mode", () => {
  it("the Treino choice has Aprender, which is saved", () => {
    const store = setup(memoryStore(), "edit");
    fireEvent.change(screen.getByRole("combobox", { name: "Treino" }), {
      target: { value: "learn" },
    });
    expect(screen.getByRole("heading", { name: "Aprender" })).toBeTruthy();
    expect(loadVimEditSettings(store).drill).toBe("learn");
  });

  it("lists one lesson for each kind, none done at first", () => {
    setup();
    for (const kind of REGISTER_KINDS) {
      const button = screen.getByRole("button", { name: new RegExp(lessonFor(kind).title) });
      expect(button.textContent).not.toContain("feito");
    }
  });

  it("a lesson shows its explanation and commands", () => {
    setup();
    open("number-lines");
    const lesson = lessonFor("number-lines");
    expect(screen.getByTestId("learn-explanation").textContent).toBe(lesson.explanation);
    for (const command of lesson.commands) {
      expect(within(screen.getByTestId("learn-commands")).getByText(command)).toBeTruthy();
    }
  });

  it("the example plays one key every 600 ms and the buffer changes", () => {
    setup();
    open("number-lines");
    const lesson = lessonFor("number-lines");
    const frames = exampleFrames(lesson);
    const keys = parseKeys(lesson.example.keys);
    expect(screen.getByTestId("learn-buffer").textContent).toBe(lesson.example.lines.join("\n"));
    expect(screen.getByTestId("learn-keys").textContent).toBe("");
    advance(STEP_MS);
    expect(screen.getByTestId("learn-keys").textContent).toBe(keys[0]);
    expect(screen.getByTestId("learn-buffer").textContent).toBe(
      (frames[1]?.lines ?? []).join("\n"),
    );
    advance(STEP_MS * keys.length);
    expect(screen.getByTestId("learn-buffer").textContent).toBe(lesson.example.after.join("\n"));
  });

  it("Pausar stops the animation and Tocar goes on", () => {
    setup();
    open("number-lines");
    advance(STEP_MS * 2);
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    const shown = screen.getByTestId("learn-keys").textContent;
    advance(STEP_MS * 5);
    expect(screen.getByTestId("learn-keys").textContent).toBe(shown);
    fireEvent.click(screen.getByRole("button", { name: "Tocar" }));
    advance(STEP_MS);
    expect(screen.getByTestId("learn-keys").textContent?.length).toBeGreaterThan(
      shown?.length ?? 0,
    );
  });

  it("Recomeçar goes back to the first frame and plays again", () => {
    setup();
    open("number-lines");
    advance(STEP_MS * 3);
    fireEvent.click(screen.getByRole("button", { name: "Recomeçar" }));
    expect(screen.getByTestId("learn-keys").textContent).toBe("");
    advance(STEP_MS);
    expect(screen.getByTestId("learn-keys").textContent).not.toBe("");
  });

  it("the exercise shows the reference and highlights the next key", () => {
    setup();
    open("swap-columns");
    const edit = exerciseFor(lessonFor("swap-columns"));
    const keys = parseKeys(edit.reference);
    expect(screen.getByTestId("learn-reference").textContent).toBe(keys.join(" "));
    expect(screen.getByTestId("learn-next-key").textContent).toBe(keys[0]);
    press(keys[0] as string);
    expect(screen.getByTestId("learn-next-key").textContent).toBe(keys[1]);
    expect(screen.getByTestId("vim-code").textContent).toBe(edit.lines.join("\n"));
  });

  it("a wrong key leaves the highlight on the key still to be typed", () => {
    setup();
    open("number-lines");
    const keys = parseKeys(exerciseFor(lessonFor("number-lines")).reference);
    press("z");
    expect(screen.getByTestId("learn-next-key").textContent).toBe(keys[0]);
  });

  it("typing the reference finishes the exercise, unlocks the kind and enables its practice", () => {
    const store = setup();
    open("number-lines");
    const edit = exerciseFor(lessonFor("number-lines"));
    press(edit.reference);
    expect(screen.getByTestId("learn-done")).toBeTruthy();
    expect(loadUnlocked(store)).toEqual(["number-lines"]);
    expect(loadVimEditSettings(store).kinds).toContain("number-lines");
    expect(
      screen.getByRole("button", { name: new RegExp(lessonFor("number-lines").title) }).textContent,
    ).toContain("feito");
  });

  it("the exercise can be done again with another approach and still ends the same", () => {
    const store = setup();
    open("array-initializer");
    press(exerciseFor(lessonFor("array-initializer")).reference);
    expect(loadUnlocked(store)).toEqual(["array-initializer"]);
  });

  it("the kinds are locked in the free practice until their lesson is done", () => {
    setup(memoryStore(), "edit");
    for (const kind of REGISTER_KINDS) {
      const box = screen.getByRole<HTMLInputElement>("checkbox", { name: EDIT_KIND_LABELS[kind] });
      expect(box.disabled).toBe(true);
      expect(box.checked).toBe(false);
    }
  });

  it("an unlocked kind can be switched on and off in the free practice", () => {
    const store = memoryStore();
    unlockKind(store, "number-lines");
    setup(store, "edit");
    const checkbox = screen.getByRole<HTMLInputElement>("checkbox", {
      name: EDIT_KIND_LABELS["number-lines"],
    });
    expect(checkbox.disabled).toBe(false);
    fireEvent.click(checkbox);
    expect(loadVimEditSettings(store).kinds).toContain("number-lines");
    const locked = screen.getByRole<HTMLInputElement>("checkbox", {
      name: EDIT_KIND_LABELS["swap-columns"],
    });
    expect(locked.disabled).toBe(true);
  });

  it("the unlocked kinds are still there after the screen is opened again", () => {
    const store = setup();
    open("number-lines");
    press(exerciseFor(lessonFor("number-lines")).reference);
    expect(JSON.parse(store.getItem(VIM_LEARN_KEY) as string)).toEqual({
      unlocked: ["number-lines"],
    });
  });

  it("Lições goes back from a lesson to the list", () => {
    setup();
    open("number-lines");
    fireEvent.click(screen.getByRole("button", { name: "Lições" }));
    expect(screen.queryByTestId("learn-explanation")).toBeNull();
  });
});

describe("VimScreen Learn mode controls", () => {
  it("Voltar leaves the screen", () => {
    const onBack = vi.fn();
    const store = memoryStore();
    store.setItem(VIM_EDIT_SETTINGS_KEY, JSON.stringify({ drill: "learn" }));
    render(<VimScreen clock={clock} store={store} newSeed={() => 21} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("the Treino choice goes from Aprender to the other drills and is saved", () => {
    const store = setup();
    fireEvent.change(screen.getByRole("combobox", { name: "Treino" }), {
      target: { value: "edit" },
    });
    expect(screen.getByTestId("vim-after")).toBeTruthy();
    expect(loadVimEditSettings(store).drill).toBe("edit");
    fireEvent.change(screen.getByRole("combobox", { name: "Treino" }), {
      target: { value: "motion" },
    });
    expect(loadVimEditSettings(store).drill).toBe("motion");
  });

  it("keys typed as text, like composed or pasted ones, reach the exercise", () => {
    setup();
    open("number-lines");
    const keys = parseKeys(exerciseFor(lessonFor("number-lines")).reference);
    fireEvent.change(box(), { target: { value: "qa\n" } });
    expect(screen.getByTestId("learn-next-key").textContent).toBe(keys[2]);
    box().value = "yy";
    fireEvent.compositionEnd(box());
    expect(screen.getByTestId("learn-next-key").textContent).toBe(keys[4]);
  });

  it("keys that are still being composed wait for the composition to end", () => {
    setup();
    open("number-lines");
    const keys = parseKeys(exerciseFor(lessonFor("number-lines")).reference);
    fireEvent.input(box(), { target: { value: "q" }, isComposing: true });
    fireEvent.keyDown(box(), { key: "q", isComposing: true });
    expect(screen.getByTestId("learn-next-key").textContent).toBe(keys[0]);
  });

  it("a kind already in the saved kinds is not added twice", () => {
    const store = memoryStore();
    store.setItem(
      VIM_EDIT_SETTINGS_KEY,
      JSON.stringify({ drill: "learn", durationS: 60, kinds: ["delete-line", "number-lines"] }),
    );
    render(<VimScreen clock={clock} store={store} newSeed={() => 21} onBack={vi.fn()} />);
    open("number-lines");
    press(exerciseFor(lessonFor("number-lines")).reference);
    expect(loadVimEditSettings(store).kinds).toEqual(["delete-line", "number-lines"]);
  });

  it("a click on the buffer focuses the key box again", () => {
    setup();
    open("number-lines");
    box().blur();
    fireEvent.click(screen.getByTestId("vim-code"));
    expect(document.activeElement).toBe(box());
  });

  it("a dead key is left to the composition and moves nothing", () => {
    setup();
    open("number-lines");
    const keys = parseKeys(exerciseFor(lessonFor("number-lines")).reference);
    fireEvent.keyDown(box(), { key: "Dead" });
    expect(screen.getByTestId("learn-next-key").textContent).toBe(keys[0]);
  });

  it("Recomeçar exercício puts the buffer and the highlight back", () => {
    setup();
    open("number-lines");
    const edit = exerciseFor(lessonFor("number-lines"));
    const keys = parseKeys(edit.reference);
    press("qa");
    expect(screen.getByTestId("vim-status").textContent).toContain("gravando @a");
    fireEvent.click(screen.getByRole("button", { name: "Recomeçar exercício" }));
    expect(screen.getByTestId("learn-next-key").textContent).toBe(keys[0]);
    expect(screen.getByTestId("vim-status").textContent).not.toContain("gravando");
    expect(screen.getByTestId("vim-code").textContent).toBe(edit.lines.join("\n"));
  });

  it("keys after the exercise is done change nothing", () => {
    setup();
    open("number-lines");
    const edit = exerciseFor(lessonFor("number-lines"));
    press(edit.reference);
    press("dd");
    expect(screen.getByTestId("vim-code").textContent).toBe(edit.after.join("\n"));
  });

  it("a lesson already done says so", () => {
    const store = memoryStore();
    unlockKind(store, "number-lines");
    setup(store);
    open("number-lines");
    expect(screen.getByTestId("learn-was-done")).toBeTruthy();
  });

  it("Tocar after the end plays the example again", () => {
    setup();
    open("number-lines");
    const keys = parseKeys(lessonFor("number-lines").example.keys);
    advance(STEP_MS * (keys.length + 2));
    expect(screen.getByTestId("learn-keys").textContent).toBe(formatKeys(keys));
    fireEvent.click(screen.getByRole("button", { name: "Tocar" }));
    expect(screen.getByTestId("learn-keys").textContent).toBe("");
    advance(STEP_MS);
    expect(screen.getByTestId("learn-keys").textContent).toBe(keys[0]);
  });

  it("a round with only locked register kinds falls back to the plain kinds", () => {
    const store = memoryStore({
      [VIM_EDIT_SETTINGS_KEY]: JSON.stringify({
        drill: "edit",
        durationS: 60,
        kinds: ["number-lines"],
      }),
    });
    render(<VimScreen clock={clock} store={store} newSeed={() => 21} onBack={vi.fn()} />);
    expect(screen.getByTestId("vim-code").dataset["editIndex"]).toBe("0");
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", {
        name: EDIT_KIND_LABELS["number-lines"],
      }).checked,
    ).toBe(false);
  });
});
