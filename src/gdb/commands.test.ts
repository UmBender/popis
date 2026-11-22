import { describe, expect, it } from "vitest";
import { COMMAND_TABLE, parseCommand, resolveCommandName } from "./commands";

// T25 AC-1: gdb command table, unique prefix resolution matching GNU gdb 18.1,
// ambiguous prefix rejection with gdb's message, and normalized actions.

describe("gdb command parser (AC-1)", () => {
  it("parser resolves unique prefixes like gdb", () => {
    const cases: readonly (readonly [string, string])[] = [
      ["b", "break"],
      ["br", "break"],
      ["bre", "break"],
      ["brea", "break"],
      ["break", "break"],
      ["tb", "tbreak"],
      ["tbr", "tbreak"],
      ["c", "continue"],
      ["cont", "continue"],
      ["fg", "continue"],
      ["n", "next"],
      ["next", "next"],
      ["s", "step"],
      ["step", "step"],
      ["fin", "finish"],
      ["fini", "finish"],
      ["u", "until"],
      ["unt", "until"],
      ["adv", "advance"],
      ["p", "print"],
      ["print", "print"],
      ["inspect", "print"],
      ["disp", "display"],
      ["und", "undisplay"],
      ["l", "list"],
      ["li", "list"],
      ["bt", "backtrace"],
      ["ba", "backtrace"],
      ["where", "backtrace"],
      ["whe", "backtrace"],
      ["f", "frame"],
      ["fr", "frame"],
      ["up", "up"],
      ["do", "down"],
      ["dow", "down"],
      ["i", "info"],
      ["inf", "info"],
      ["info", "info"],
      ["d", "delete"],
      ["del", "delete"],
      ["dis", "disable"],
      ["disa", "disable"],
      ["en", "enable"],
      ["cond", "condition"],
      ["ig", "ignore"],
      ["wa", "watch"],
      ["rw", "rwatch"],
      ["aw", "awatch"],
      ["set", "set"],
      ["cal", "call"],
      ["cat", "catch"],
      ["r", "run"],
      ["ru", "run"],
      ["start", "start"],
      ["k", "kill"],
      ["ki", "kill"],
      ["q", "quit"],
      ["qui", "quit"],
      ["exit", "quit"],
    ];

    for (const [input, expected] of cases) {
      const res = resolveCommandName(input);
      expect(res, input).toEqual({ ok: true, command: expected });
    }
  });

  it("parser rejects ambiguous prefixes", () => {
    const ambiguous = [
      "a",
      "ad",
      "ca",
      "co",
      "con",
      "de",
      "di",
      "e",
      "fi",
      "in",
      "ne",
      "nex",
      "pr",
      "pri",
      "prin",
      "qu",
      "se",
      "st",
      "sta",
      "star",
      "ste",
      "un",
    ];

    for (const prefix of ambiguous) {
      const res = resolveCommandName(prefix);
      expect(res.ok, prefix).toBe(false);
      if (!res.ok) {
        expect(res.error, prefix).toMatch(new RegExp(`^Ambiguous command "${prefix}":`));
      }
    }

    // Subcommand ambiguity for info and set.
    for (const [cmd, expectedPattern] of [
      ["info a", /^Ambiguous info command "a":/],
      ["info d", /^Ambiguous info command "d":/],
      ["info l", /^Ambiguous info command "l":/],
      ["set v x = 1", /^Ambiguous set command "v":/],
      ["set va x = 1", /^Ambiguous set command "va":/],
    ] as const) {
      const parsed = parseCommand(cmd);
      expect(parsed.ok, cmd).toBe(false);
      if (!parsed.ok) {
        expect(parsed.error, cmd).toMatch(expectedPattern);
      }
    }

    // Undefined command message matches gdb.
    const unknown = parseCommand("zzz");
    expect(unknown).toEqual({ ok: false, error: 'Undefined command: "zzz".  Try "help".' });
  });

  it("parser normalizes break forms to the same action", () => {
    const line14Cond = parseCommand("b 14 if i == 5");
    expect(line14Cond).toEqual({
      ok: true,
      action: {
        kind: "break",
        at: { kind: "line", line: 14 },
        cond: "5 == i",
        temporary: false,
      },
    });
    expect(parseCommand("break 14 if i==5")).toEqual(line14Cond);
    expect(parseCommand("brea 14 if 5 == i")).toEqual(line14Cond);
    expect(parseCommand("br 14 if (i == 5)")).toEqual(line14Cond);

    const fileLine = parseCommand("break sol.cpp:14 if i == 5");
    expect(fileLine).toEqual({
      ok: true,
      action: {
        kind: "break",
        at: { kind: "line", file: "sol.cpp", line: 14 },
        cond: "5 == i",
        temporary: false,
      },
    });

    expect(parseCommand("tb 14")).toEqual({
      ok: true,
      action: { kind: "break", at: { kind: "line", line: 14 }, temporary: true },
    });
    expect(parseCommand("tbreak dfs")).toEqual({
      ok: true,
      action: { kind: "break", at: { kind: "func", func: "dfs" }, temporary: true },
    });
  });

  it("parser parses every command family cleanly", () => {
    expect(parseCommand("gdb ./sol")).toEqual({
      ok: true,
      action: { kind: "launch", program: "sol" },
    });
    expect(parseCommand("run < in.txt")).toEqual({
      ok: true,
      action: { kind: "run", inputFile: "in.txt" },
    });
    expect(parseCommand("r <in.txt")).toEqual({
      ok: true,
      action: { kind: "run", inputFile: "in.txt" },
    });
    expect(parseCommand("start")).toEqual({ ok: true, action: { kind: "start" } });
    expect(parseCommand("k")).toEqual({ ok: true, action: { kind: "kill" } });
    expect(parseCommand("q")).toEqual({ ok: true, action: { kind: "quit" } });
    expect(parseCommand("i b")).toEqual({
      ok: true,
      action: { kind: "info", topic: "breakpoints" },
    });
    expect(parseCommand("info lo")).toEqual({
      ok: true,
      action: { kind: "info", topic: "locals" },
    });
    expect(parseCommand("inf ar")).toEqual({
      ok: true,
      action: { kind: "info", topic: "args" },
    });
    expect(parseCommand("info di")).toEqual({
      ok: true,
      action: { kind: "info", topic: "display" },
    });
    expect(parseCommand("del 2")).toEqual({
      ok: true,
      action: { kind: "bp-op", op: "delete", ids: [2] },
    });
    expect(parseCommand("dis 1 3")).toEqual({
      ok: true,
      action: { kind: "bp-op", op: "disable", ids: [1, 3] },
    });
    expect(parseCommand("en 2")).toEqual({
      ok: true,
      action: { kind: "bp-op", op: "enable", ids: [2] },
    });
    expect(parseCommand("cond 1 i == 5")).toEqual({
      ok: true,
      action: { kind: "condition", id: 1, cond: "5 == i" },
    });
    expect(parseCommand("ig 2 4")).toEqual({
      ok: true,
      action: { kind: "ignore", id: 2, count: 4 },
    });
    expect(parseCommand("n 3")).toEqual({
      ok: true,
      action: { kind: "step", mode: "next", count: 3 },
    });
    expect(parseCommand("s")).toEqual({
      ok: true,
      action: { kind: "step", mode: "step", count: 1 },
    });
    expect(parseCommand("c 4")).toEqual({
      ok: true,
      action: { kind: "continue", count: 4 },
    });
    expect(parseCommand("fin")).toEqual({ ok: true, action: { kind: "finish" } });
    expect(parseCommand("u 18")).toEqual({
      ok: true,
      action: { kind: "until", at: { kind: "line", line: 18 } },
    });
    expect(parseCommand("adv 20")).toEqual({
      ok: true,
      action: { kind: "advance", at: { kind: "line", line: 20 } },
    });
    expect(parseCommand("p a[i]")).toEqual({
      ok: true,
      action: { kind: "print", expr: "a[i]" },
    });
    expect(parseCommand("disp sum")).toEqual({
      ok: true,
      action: { kind: "display", expr: "sum" },
    });
    expect(parseCommand("und 1")).toEqual({
      ok: true,
      action: { kind: "undisplay", ids: [1] },
    });
    expect(parseCommand("l 10")).toEqual({
      ok: true,
      action: { kind: "list", at: { kind: "line", line: 10 } },
    });
    expect(parseCommand("where")).toEqual({ ok: true, action: { kind: "backtrace" } });
    expect(parseCommand("f 2")).toEqual({ ok: true, action: { kind: "frame", index: 2 } });
    expect(parseCommand("up 2")).toEqual({
      ok: true,
      action: { kind: "frame-shift", dir: "up", count: 2 },
    });
    expect(parseCommand("do")).toEqual({
      ok: true,
      action: { kind: "frame-shift", dir: "down", count: 1 },
    });
    expect(parseCommand("wa -l *p")).toEqual({
      ok: true,
      action: { kind: "watch", mode: "watch", location: true, expr: "*p" },
    });
    expect(parseCommand("rw cur")).toEqual({
      ok: true,
      action: { kind: "watch", mode: "rwatch", location: false, expr: "cur" },
    });
    expect(parseCommand("aw best")).toEqual({
      ok: true,
      action: { kind: "watch", mode: "awatch", location: false, expr: "best" },
    });
    expect(parseCommand("set var x = 10")).toEqual({
      ok: true,
      action: { kind: "set-var", target: "x", expr: "10" },
    });
    expect(parseCommand("p x = 10")).toEqual({
      ok: true,
      action: { kind: "set-var", target: "x", expr: "10" },
    });
    expect(parseCommand("cal helper(3)")).toEqual({
      ok: true,
      action: { kind: "call", expr: "helper(3)" },
    });
    expect(parseCommand("cat t")).toEqual({
      ok: true,
      action: { kind: "catch", event: "throw" },
    });
    expect(parseCommand("")).toEqual({ ok: true, action: { kind: "repeat" } });

    // Assignment inside condition is rejected.
    expect(parseCommand("b 14 if i = 5").ok).toBe(false);
    expect(parseCommand("condition 1 i = 5").ok).toBe(false);

    // Table lists every core command with a Portuguese description.
    expect(COMMAND_TABLE.length).toBeGreaterThanOrEqual(30);
    for (const entry of COMMAND_TABLE) {
      expect(entry.key.length).toBeGreaterThan(0);
      expect(entry.text.length).toBeGreaterThan(5);
    }
  });
});
