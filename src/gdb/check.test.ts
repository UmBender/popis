import { describe, expect, it } from "vitest";
import { checkCommand, type CheckContext } from "./check";
import { parseCommand, type GdbAction } from "./commands";

// T25 AC-2: effect-based answer checker accepting equivalent gdb forms
// and rejecting near misses with a clear Portuguese explanation.

const BASE_CTX: CheckContext = {
  file: "sol.cpp",
  currentFrame: 0,
  frameCount: 4,
};

function actionOf(cmd: string): GdbAction {
  const parsed = parseCommand(cmd);
  if (!parsed.ok) throw new Error(`bad test command "${cmd}": ${parsed.error}`);
  return parsed.action;
}

describe("gdb command checker (AC-2)", () => {
  it("checker accepts equivalent command forms", () => {
    const cases: readonly {
      readonly name: string;
      readonly expected: string;
      readonly typed: string;
      readonly ctx?: CheckContext;
    }[] = [
      { name: "alias vs full name (break)", expected: "break 14", typed: "b 14" },
      { name: "file:line vs line", expected: "break 14", typed: "b sol.cpp:14" },
      { name: "line vs file:line", expected: "break sol.cpp:14", typed: "break 14" },
      { name: "func vs file:func", expected: "break dfs", typed: "b sol.cpp:dfs" },
      { name: "file:func vs func", expected: "break sol.cpp:dfs", typed: "break dfs" },
      {
        name: "spaces in condition",
        expected: "break 14 if i == 5",
        typed: "b 14 if i==5",
      },
      {
        name: "== in reverse order",
        expected: "break 14 if i == 5",
        typed: "break sol.cpp:14 if 5 == i",
      },
      {
        name: "!= in reverse order",
        expected: "break 14 if p != nullptr",
        typed: "b 14 if nullptr != p",
      },
      {
        name: "< vs > flipped",
        expected: "condition 1 i < n",
        typed: "cond 1 n > i",
      },
      {
        name: "<= vs >= flipped",
        expected: "condition 2 lo <= hi",
        typed: "cond 2 hi >= lo",
      },
      { name: "next 3 vs n 3", expected: "next 3", typed: "n 3" },
      { name: "next vs next 1", expected: "next", typed: "n 1" },
      { name: "bt vs where", expected: "bt", typed: "where" },
      { name: "bt vs backtrace", expected: "backtrace", typed: "bt" },
      { name: "info breakpoints vs i b", expected: "info breakpoints", typed: "i b" },
      { name: "set var vs print assignment", expected: "set var x = 5", typed: "p x = 5" },
      { name: "set variable vs set var", expected: "set var x = 5", typed: "set variable x=5" },
      { name: "set bare assignment", expected: "set var x = 5", typed: "set x = 5" },
      { name: "watch -l vs watch -location", expected: "watch -l *p", typed: "wa -location *p" },
      {
        name: "frame 2 vs up 2 at frame 0",
        expected: "up 2",
        typed: "f 2",
        ctx: { file: "sol.cpp", currentFrame: 0, frameCount: 4 },
      },
      {
        name: "down 1 vs frame 1 at frame 2",
        expected: "down",
        typed: "frame 1",
        ctx: { file: "sol.cpp", currentFrame: 2, frameCount: 4 },
      },
      { name: "run redirection spacing", expected: "run < in.txt", typed: "r <in.txt" },
      { name: "gdb ./sol vs gdb sol", expected: "gdb ./sol", typed: "gdb sol" },
      { name: "tbreak alias", expected: "tbreak 12", typed: "tb sol.cpp:12" },
      { name: "start, kill, quit, finish, repeat", expected: "start", typed: "start" },
      { name: "kill alias", expected: "kill", typed: "k" },
      { name: "quit alias", expected: "quit", typed: "exit" },
      { name: "finish alias", expected: "finish", typed: "fin" },
      { name: "repeat empty", expected: "", typed: "   " },
      { name: "list alias", expected: "list 10", typed: "l sol.cpp:10" },
      { name: "undisplay alias", expected: "undisplay 1", typed: "und 1" },
      { name: "call alias", expected: "call gcd(12, 8)", typed: "cal gcd(12,8)" },
      { name: "catch throw alias", expected: "catch throw", typed: "cat t" },
      { name: "ignore alias", expected: "ignore 1 3", typed: "ig 1 3" },
      { name: "until bare", expected: "until", typed: "u" },
      { name: "advance alias", expected: "advance 9", typed: "adv sol.cpp:9" },
      { name: "print alias", expected: "print a[i]", typed: "p a[i]" },
      { name: "display alias", expected: "display sum", typed: "disp sum" },
      { name: "continue alias", expected: "continue 3", typed: "c 3" },
      { name: "delete alias", expected: "delete 2", typed: "d 2" },
    ];

    for (const c of cases) {
      const res = checkCommand(c.typed, actionOf(c.expected), c.ctx ?? BASE_CTX);
      expect(res.ok, `${c.name}: ${c.typed} vs ${c.expected}`).toBe(true);
    }
  });

  it("checker rejects near misses", () => {
    const cases: readonly {
      readonly name: string;
      readonly expected: string;
      readonly typed: string;
      readonly ctx?: CheckContext;
    }[] = [
      { name: "step instead of next", expected: "next", typed: "step" },
      { name: "next instead of step", expected: "step", typed: "n" },
      { name: "wrong line", expected: "break 14", typed: "b 15" },
      { name: "wrong file", expected: "break 14", typed: "b other.cpp:14" },
      {
        name: "= instead of == in break if",
        expected: "break 14 if i == 5",
        typed: "b 14 if i = 5",
      },
      {
        name: "= instead of == in condition",
        expected: "condition 1 i == 5",
        typed: "condition 1 i = 5",
      },
      { name: "break instead of tbreak", expected: "tbreak 14", typed: "b 14" },
      { name: "tbreak instead of break", expected: "break 14", typed: "tb 14" },
      { name: "watch instead of rwatch", expected: "rwatch cur", typed: "watch cur" },
      { name: "watch instead of awatch", expected: "awatch cur", typed: "watch cur" },
      { name: "watch without -l", expected: "watch -l *p", typed: "watch *p" },
      {
        name: "frame 2 instead of up 2 from frame 1",
        expected: "up 2",
        typed: "frame 2",
        ctx: { file: "sol.cpp", currentFrame: 1, frameCount: 5 },
      },
      {
        name: "up 2 instead of frame 2 from frame 1",
        expected: "frame 2",
        typed: "up 2",
        ctx: { file: "sol.cpp", currentFrame: 1, frameCount: 5 },
      },
      { name: "delete all instead of delete 2", expected: "delete 2", typed: "delete" },
      { name: "disable instead of delete", expected: "delete 2", typed: "disable 2" },
      { name: "ignore swapped args", expected: "ignore 2 5", typed: "ignore 5 2" },
      { name: "continue without count", expected: "continue 3", typed: "c" },
      { name: "print instead of display", expected: "display sum", typed: "p sum" },
      { name: "info locals instead of info args", expected: "info args", typed: "info locals" },
      { name: "until instead of advance", expected: "advance 20", typed: "until 20" },
      { name: "advance instead of until", expected: "until 20", typed: "advance 20" },
      { name: "non-frame command for frame goal", expected: "frame 2", typed: "next" },
      { name: "out-of-bounds frame", expected: "frame 2", typed: "frame 9" },
      { name: "wrong step count", expected: "next 3", typed: "next 2" },
      { name: "wrong break condition", expected: "break 14 if i == 5", typed: "b 14 if i == 6" },
      { name: "unexpected -l on watch", expected: "watch cur", typed: "watch -l cur" },
      { name: "wrong watch expression", expected: "watch cur", typed: "watch sum" },
      { name: "wrong bp id", expected: "delete 2", typed: "delete 1" },
      { name: "ambiguous prefix", expected: "finish", typed: "fi" },
      { name: "empty when non-repeat expected", expected: "next", typed: "" },
      { name: "completely different command", expected: "start", typed: "kill" },
    ];

    for (const c of cases) {
      const res = checkCommand(c.typed, actionOf(c.expected), c.ctx ?? BASE_CTX);
      expect(res.ok, `${c.name}: ${c.typed} vs ${c.expected}`).toBe(false);
      if (!res.ok) {
        expect(res.reason.length, c.name).toBeGreaterThan(5);
      }
    }
  });
});
