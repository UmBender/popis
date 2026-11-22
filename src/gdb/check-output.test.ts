import { describe, expect, it } from "vitest";
import { checkOutput } from "./check-output";

// T26 AC-4: output answer checker — equivalent forms accepted, near misses rejected with reasons.

describe("gdb output checker (AC-4)", () => {
  it("output checker accepts equivalent forms", () => {
    const cases: readonly (readonly [string, string, "print" | "examine" | "whatis" | "error"])[] = [
      // With and without $N = prefix
      ["0xffffffff", "0xffffffff", "print"],
      ["$1 = 0xffffffff", "0xffffffff", "print"],
      ["$42 = 0xffffffff", "0xffffffff", "print"],
      ["$1=0xffffffff", "0xffffffff", "print"],
      // Extra spaces outside quotes
      ["  -3  ", "-3", "print"],
      ["{ 3 , 1 , 4 , 1 , 5 }", "{3, 1, 4, 1, 5}", "print"],
      ["{3,1,4,1,5}", "{3, 1, 4, 1, 5}", "print"],
      ["{ c = 97 'a' , x = 7 , y = 9 }", "{c = 97 'a', x = 7, y = 9}", "print"],
      ["{c=97 'a', x=7, y=9}", "{c = 97 'a', x = 7, y = 9}", "print"],
      ["  0x02   0x01   0x00   0x00  ", "0x02 0x01 0x00 0x00", "examine"],
      ["$3 = {0 <repeats 16 times>}", "{0 <repeats 16 times>}", "print"],
      ["type = int *", "type = int *", "whatis"],
      ["type=int*", "type = int *", "whatis"],
      // ADDR accepted where gdb prints a non-null address (and concrete hex address accepted too)
      ["{val = 10, next = ADDR}", "{val = 10, next = ADDR}", "print"],
      ["{val = 10, next = 0x7fffffffd100}", "{val = 10, next = ADDR}", "print"],
      ["(int *) ADDR", "(int *) ADDR", "print"],
      ["(int *) 0x7fffffffc500", "(int *) ADDR", "print"],
      // Exact string spaces preserved when matching
      ['"a  b"', '"a  b"', "print"],
      ["32 ' '", "32 ' '", "print"],
      // Null pointer deref error
      [
        "Cannot access memory at address 0x0",
        "Cannot access memory at address 0x0",
        "error",
      ],
    ];

    for (const [typed, expected, kind] of cases) {
      const res = checkOutput(typed, expected, { kind });
      expect(res.ok, `"${typed}" vs "${expected}"`).toBe(true);
    }
  });

  it("output checker rejects near misses", () => {
    const cases: readonly {
      readonly typed: string;
      readonly expected: string;
      readonly kind: "print" | "examine" | "whatis" | "error";
      readonly command?: string;
      readonly reasonMatch: RegExp;
    }[] = [
      {
        // Decimal instead of hexadecimal
        typed: "-1",
        expected: "0xffffffff",
        kind: "print",
        command: "p/x neg",
        reasonMatch: /hex|0x/i,
      },
      {
        // Wrong two's complement width (0xff vs 0xffffffff)
        typed: "0xff",
        expected: "0xffffffff",
        kind: "print",
        command: "p/x neg",
        reasonMatch: /largura|complemento|bytes|d[ií]gitos/i,
      },
      {
        // Big-endian byte order instead of little-endian
        typed: "0x00 0x00 0x01 0x02",
        expected: "0x02 0x01 0x00 0x00",
        kind: "examine",
        command: "x/4xb &n",
        reasonMatch: /little-endian|menos significativo/i,
      },
      {
        // Floor division -4 instead of C truncation -3 in -7/2
        typed: "-4",
        expected: "-3",
        kind: "print",
        command: "p -7 / 2",
        reasonMatch: /trunca|zero/i,
      },
      {
        // Expanded array instead of <repeats N times>
        typed: "{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}",
        expected: "{0 <repeats 16 times>}",
        kind: "print",
        command: "p rep16",
        reasonMatch: /repeats/i,
      },
      {
        // Struct without field names
        typed: "{97 'a', 7, 9}",
        expected: "{c = 97 'a', x = 7, y = 9}",
        kind: "print",
        command: "p sm",
        reasonMatch: /campo|nome/i,
      },
      {
        // Char missing numeric code or literal
        typed: "'A'",
        expected: "65 'A'",
        kind: "print",
        command: "p chA",
        reasonMatch: /c[óo]digo|caractere/i,
      },
      {
        // 0x0 must NOT match non-null ADDR
        typed: "{val = 10, next = 0x0}",
        expected: "{val = 10, next = ADDR}",
        kind: "print",
        command: "p n1",
        reasonMatch: /.+/,
      },
      {
        // Spaces inside string literals must NOT be collapsed
        typed: '"a b"',
        expected: '"a  b"',
        kind: "print",
        reasonMatch: /.+/,
      },
      {
        // Empty answer
        typed: "   ",
        expected: "42",
        kind: "print",
        reasonMatch: /.+/,
      },
    ];

    for (const c of cases) {
      const res = checkOutput(c.typed, c.expected, {
        kind: c.kind,
        ...(c.command !== undefined ? { command: c.command } : {}),
      });
      expect(res.ok, `"${c.typed}" should be rejected vs "${c.expected}"`).toBe(false);
      if (!res.ok) {
        expect(res.reason, `"${c.typed}" reason`).toMatch(c.reasonMatch);
      }
    }
  });
});
