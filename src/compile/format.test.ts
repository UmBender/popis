import { describe, expect, it } from "vitest";
import {
  formatCompilerOutput,
  maskCompilerOutput,
  outputCitesLine,
  trimCompilerOutput,
} from "./format";

// T40 AC-1 / ADR-T40-1: deterministic masking and trimming of real g++ / sanitizer outputs.

describe("compile output formatting", () => {
  it("masks temp paths, addresses, PIDs, BuildIds and libc frames", () => {
    const tempDir = "/tmp/popis-compile-abc123";
    const raw = [
      "=================================================================",
      "==98765==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x7bc8adbe0020 at pc 0x0000004008a2 bp 0x7ffc5c02cae0 sp 0x7ffc5c02cad8",
      "READ of size 4 at 0x7bc8adbe0020 thread T0",
      `    #0 0x0000004008a1 in main ${tempDir}/sol.cpp:6`,
      "    #1 0x7fa8aea0a680 in __libc_start_call_main (/lib64/libc.so.6+0x3680) (BuildId: 85075e2ae2e13352a1413d41c327dacf6461526c)",
      `    #2 0x000000400494 in _start (${tempDir}/bin+0x400494) (BuildId: fff9507f97c8aeb77c2fc08a0450873902e04505)`,
      "0x7bc8adbe0020 is located 0 bytes after 16-byte region [0x7bc8adbe0010,0x7bc8adbe0020)",
      "SUMMARY: AddressSanitizer: heap-buffer-overflow /tmp/popis-compile-abc123/sol.cpp:6 in main",
    ].join("\n");

    const masked = maskCompilerOutput(raw, tempDir);
    expect(masked).not.toContain(tempDir);
    expect(masked).not.toContain("98765");
    expect(masked).not.toContain("0x7bc8");
    expect(masked).not.toContain("BuildId");
    expect(masked).toContain("==N==ERROR: AddressSanitizer: heap-buffer-overflow");
    expect(masked).toContain("sol.cpp:6");
    expect(masked).toContain("ADDR");
  });

  it("trims long ASan recursion and strips libc, shadow and register blocks", () => {
    const raw = [
      "AddressSanitizer:DEADLYSIGNAL",
      "=================================================================",
      "==123==ERROR: AddressSanitizer: stack-overflow on address 0x7ffdef32eff8 (pc 0x0000004004fa bp 0x7ffdef32f000 sp 0x7ffdef32f000 T0)",
      "    #0 0x0000004004fa in dfs(int) /tmp/popis-xyz/sol.cpp:3",
      "    #1 0x00000040052b in dfs(int) /tmp/popis-xyz/sol.cpp:4",
      "    #2 0x00000040052b in dfs(int) /tmp/popis-xyz/sol.cpp:4",
      "    #3 0x00000040052b in dfs(int) /tmp/popis-xyz/sol.cpp:4",
      "    #4 0x00000040052b in dfs(int) /tmp/popis-xyz/sol.cpp:4",
      "    #5 0x00000040052b in dfs(int) /tmp/popis-xyz/sol.cpp:4",
      "==123==Register values:",
      "rax = 0x000000000000000a  rbx = 0x0000000000000000",
      "Shadow bytes around the buggy address:",
      "  0x7ffdef32ed00: 00 00 00 00",
      "SUMMARY: AddressSanitizer: stack-overflow /tmp/popis-xyz/sol.cpp:3 in dfs(int)",
    ].join("\n");

    const formatted = formatCompilerOutput(raw, "asan", "/tmp/popis-xyz");
    expect(formatted).toContain("==N==ERROR: AddressSanitizer: stack-overflow");
    expect(formatted).toContain("sol.cpp:3");
    expect(formatted).toContain("SUMMARY: AddressSanitizer: stack-overflow sol.cpp:3 in dfs(int)");
    expect(formatted).not.toContain("Register values");
    expect(formatted).not.toContain("Shadow bytes");
    expect(formatted.split("\n").length).toBeLessThanOrEqual(14);
  });

  it("trims compiler diagnostics, UBSan, GLIBCXX_DEBUG and verdict outputs cleanly", () => {
    const gcc = [
      "/tmp/popis-1/sol.cpp: In function 'int main()':",
      "/tmp/popis-1/sol.cpp:5:13: error: 'm' was not declared in this scope",
      '    5 |     cout << m << "\\n";',
      "      |             ^",
      "/tmp/popis-1/sol.cpp:4:9: warning: unused variable 'n' [-Wunused-variable]",
      "    4 |     int n = 5;",
      "      |         ^",
    ].join("\n");
    const gccOut = formatCompilerOutput(gcc, "compilacao", "/tmp/popis-1");
    expect(gccOut).toContain("sol.cpp:5:13: error:");
    expect(gccOut).not.toContain("unused variable");

    const ubsan = [
      "/tmp/popis-1/sol.cpp:5:15: runtime error: division by zero",
      "AddressSanitizer:DEADLYSIGNAL",
      "==12==ERROR: AddressSanitizer: FPE",
    ].join("\n");
    const ubsanOut = formatCompilerOutput(ubsan, "ubsan", "/tmp/popis-1");
    expect(ubsanOut).toBe("sol.cpp:5:15: runtime error: division by zero");

    const glibcxx = [
      "/usr/include/c++/16/debug/vector:523:",
      "In function:",
      "    constexpr std::debug::vector<int>::reference operator[](size_type)",
      "",
      "Backtrace:",
      "    0x4011bc std::debug::vector<int>::operator[](unsigned long)",
      "    /usr/include/c++/16/debug/vector:523",
      "    0x4006f7 main",
      "    /tmp/popis-1/sol.cpp:6",
      "",
      "Error: attempt to subscript container with out-of-bounds index 3, but",
      "container only holds 3 elements.",
      "",
      "Objects involved in the operation:",
      '    sequence "this" @ 0x7ffd67f32700 {',
      "      type = std::debug::vector<int, std::allocator<int> >;",
      "    }",
    ].join("\n");
    const glibcxxOut = formatCompilerOutput(glibcxx, "glibcxx", "/tmp/popis-1");
    expect(glibcxxOut).toContain("Error: attempt to subscript container");
    expect(glibcxxOut).toContain("sol.cpp:6");
    expect(glibcxxOut).not.toContain("0x7ffd");

    const verdict = trimCompilerOutput("Veredito: TLE (tempo limite excedido: 2 s, saída 124)\n", "veredito");
    expect(verdict).toBe("Veredito: TLE (tempo limite excedido: 2 s, saída 124)");
  });

  it("outputCitesLine matches exact sol.cpp line numbers", () => {
    expect(outputCitesLine("sol.cpp:6:13: error: ...", 6)).toBe(true);
    expect(outputCitesLine("    #0 ADDR in main sol.cpp:12", 12)).toBe(true);
    expect(outputCitesLine("sol.cpp:12:5: runtime error", 1)).toBe(false);
    expect(outputCitesLine("Veredito: TLE (saída 124)", 5)).toBe(false);
  });
});
