// Verifies T25 & T26 against real GNU gdb 18.1 and g++ 16.2 (ADR-T25-1, ADR-T26-1):
//   1. Unique/ambiguous prefix resolution matches gdb 18.1.
//   2. Every Aprender lesson example transcript (units 1-14) matches real gdb 18.1
//      (with raw memory addresses masked as ADDR and PIDs as N).
//   3. For a fixed sample of seeds of every Comandos drill kind, the canonical command
//      and every listed alternative produce the exact same observable gdb effect.
//   4. Every format case in src/gdb/cases/format-cases.ts matches live gdb 18.1 AND format.ts.
//   5. For a fixed sample of seeds of every Saída drill kind x level (9 x 3), compiling
//      the generated C++ program and running the command in live gdb 18.1 matches format.ts.
//
//   npm run gdb:oracle             check all five suites
//   npm run gdb:oracle -- --write  record lesson transcripts from real gdb
//
// Needs `gdb` and `g++` in PATH, so it stays out of `npm run check`.
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { runnerImport } from "vite";

const execFileAsync = promisify(execFile);
const TRANSCRIPTS_FILE = join(import.meta.dirname, "..", "src", "gdb", "cases", "transcripts.ts");

const GDB_BASE_ARGS = ["-nx", "-q", "-batch", "-iex", "set debuginfod enabled off"];

/**
 * Masks raw x86-64 memory addresses (preserving 0x0 and formatted integer values like
 * 0xffffffff, 0xffff, 0x12345678), PIDs, temporary build paths, and libc noise.
 */
function maskOutput(raw, tempDir) {
  let s = raw.replace(/\r\n/g, "\n");
  if (tempDir) {
    s = s.split(tempDir + "/").join("");
    s = s.split(tempDir).join("DIR");
  }
  // Examine address column (`0x7fffffff...:`).
  s = s.replace(/^0x[0-9a-fA-F]+:/gm, "ADDR:");
  // Breakpoint / frame / stack / PIE / non-PIE code addresses (keep 0x0 and hex integer literals).
  s = s.replace(/\b(at|in)\s+0x[0-9a-fA-F]{4,}\b/g, "$1 ADDR");
  s = s.replace(/\b0x0{4,}(?:40|7f|5[56])[0-9a-fA-F]{4,}\b/gi, "ADDR");
  s = s.replace(/\b0x7f[0-9a-fA-F]{8,12}\b/gi, "ADDR");
  s = s.replace(/\b0x5[56][0-9a-fA-F]{8,12}\b/gi, "ADDR");
  s = s.replace(/\b0x40[0-9a-fA-F]{4}\b/gi, "ADDR");
  // Mask process / LWP ids.
  s = s.replace(/\bprocess \d+/g, "process N");
  s = s.replace(/\bLWP \d+/g, "LWP N");
  s = s.replace(/\bpid \d+/gi, "pid N");
  // Mask volatile syscall / libc internal paths.
  s = s.replace(/at \.\.\/[^\s]+/g, "at libc");
  return s;
}

function cleanLines(text) {
  return text
    .split("\n")
    .map((l) => l.trimEnd())
    .filter(
      (l) =>
        l.length > 0 &&
        !l.startsWith("[Thread debugging using") &&
        !l.startsWith("Using host libthread_db library"),
    );
}

async function compileSource(dir, fileName, binName, lines, stdin) {
  const srcPath = join(dir, fileName);
  const binPath = join(dir, binName);
  writeFileSync(srcPath, lines.join("\n") + "\n");
  if (stdin !== undefined) {
    writeFileSync(join(dir, "in.txt"), stdin);
  }
  await execFileAsync("g++", ["-g", "-O0", "-std=c++17", srcPath, "-o", binPath], {
    cwd: dir,
    timeout: 30_000,
  });
  return binPath;
}

async function compileProgram(dir, prog) {
  return compileSource(dir, prog.file, prog.id, prog.lines, prog.stdin);
}

async function runGdbScript(dir, binPath, commands) {
  const args = [...GDB_BASE_ARGS];
  args.push("-iex", "set pagination off", "-iex", "set confirm off", "-iex", "set width 0");
  for (const cmd of commands) {
    args.push("-ex", cmd);
  }
  if (binPath !== null) args.push(binPath);
  try {
    const { stdout, stderr } = await execFileAsync("gdb", args, { cwd: dir, timeout: 20_000 });
    return { stdout, stderr, code: 0 };
  } catch (err) {
    return {
      stdout: String(err.stdout ?? ""),
      stderr: String(err.stderr ?? ""),
      code: Number(err.code ?? 1),
    };
  }
}

/** 1. Check command prefix resolution & ambiguity against live gdb 18.1. */
async function checkPrefixes(commandsMod) {
  const { resolveCommandName } = commandsMod;
  const baseCommands = [
    "run",
    "start",
    "kill",
    "quit",
    "break",
    "tbreak",
    "delete",
    "disable",
    "enable",
    "info",
    "next",
    "step",
    "continue",
    "finish",
    "until",
    "advance",
    "print",
    "display",
    "undisplay",
    "list",
    "backtrace",
    "where",
    "frame",
    "up",
    "down",
    "condition",
    "ignore",
    "watch",
    "rwatch",
    "awatch",
    "set",
    "call",
    "catch",
  ];
  const prefixes = [
    ...new Set([
      ...baseCommands.flatMap((c) => Array.from({ length: c.length }, (_, i) => c.slice(0, i + 1))),
      "b",
      "br",
      "bre",
      "brea",
      "c",
      "fg",
      "n",
      "s",
      "p",
      "inspect",
      "bt",
      "i",
      "inf",
      "u",
      "f",
      "tb",
      "d",
      "del",
      "dis",
      "disa",
      "en",
      "fin",
      "l",
      "q",
      "exit",
      "r",
      "do",
      "dow",
      "k",
    ]),
  ].sort();

  const failures = [];
  const checkOne = async (prefix) => {
    const parserRes = resolveCommandName(prefix);
    const { stdout, stderr } = await runGdbScript(process.cwd(), null, [prefix]);
    const combined = `${stderr}\n${stdout}`;
    const gdbAmbiguous = /^Ambiguous command /m.test(combined);
    const gdbUndefined = /^Undefined command:/m.test(combined);
    const gdbOk = !gdbAmbiguous && !gdbUndefined;
    if (parserRes.ok !== gdbOk) {
      failures.push(
        `prefix "${prefix}": parser=${parserRes.ok ? parserRes.command : parserRes.error} vs gdb=${gdbOk ? "OK" : combined.trim().split("\n")[0]}`,
      );
    }
  };

  const CONCURRENCY = 8;
  let idx = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (idx < prefixes.length) {
        const p = prefixes[idx++];
        await checkOne(p);
      }
    }),
  );

  return { total: prefixes.length, failures };
}

/** Extracts current source line (from `frame`) and breakpoint lines (from `info breakpoints`). */
function parseProbeState(frameText, bpText, file) {
  let line = null;
  const escaped = file.replace(".", "\\.");
  const frameRe = new RegExp(`^#\\d+\\s.*\\b${escaped}:(\\d+)`, "m");
  const frameMatch = frameRe.exec(frameText);
  if (frameMatch) line = Number(frameMatch[1]);

  const bpLines = [];
  const bpRe = new RegExp(`at ${escaped}:(\\d+)`, "g");
  for (const m of bpText.matchAll(bpRe)) {
    const n = Number(m[1]);
    if (!bpLines.includes(n)) bpLines.push(n);
  }
  return { line, breakpoints: bpLines };
}

/** 2. Record (or verify) every lesson example transcript from real gdb 18.1. */
async function runTranscript(dir, binPath, prog, lesson) {
  const MARK_CMD = "===POPIS_STEP===";
  const MARK_FRAME = "===POPIS_FRAME===";
  const MARK_BP = "===POPIS_BP===";
  const commands = [...(lesson.example.setup ?? [])];

  commands.push(`printf "${MARK_FRAME}\\n"`, "frame", `printf "${MARK_BP}\\n"`, "info breakpoints");
  for (const step of lesson.example.steps) {
    commands.push(
      `printf "${MARK_CMD}\\n"`,
      step.cmd,
      `printf "${MARK_FRAME}\\n"`,
      "frame",
      `printf "${MARK_BP}\\n"`,
      "info breakpoints",
    );
  }

  const { stdout, stderr } = await runGdbScript(dir, binPath, commands);
  const full = maskOutput(stdout, dir);
  const maskedErr = maskOutput(stderr, dir);
  const memErrMatch = /Cannot access memory at address 0x[0-9a-f]+/i.exec(maskedErr);

  const chunks = full.split(MARK_CMD);
  const frames = [];

  const splitProbe = (segment) => {
    const [rawOut = "", rest = ""] = segment.split(MARK_FRAME);
    const [frameOut = "", bpOut = ""] = rest.split(MARK_BP);
    return { rawOut, frameOut, bpOut };
  };

  const init = splitProbe(chunks[0] ?? "");
  const initState = parseProbeState(init.frameOut, init.bpOut, prog.file);
  frames.push({
    cmd: null,
    output: lesson.example.setup?.length
      ? cleanLines(init.rawOut).slice(-3)
      : [`Reading symbols from ./${prog.id}...`],
    line: initState.line,
    breakpoints: initState.breakpoints,
  });

  let prevState = initState;
  for (let i = 0; i < lesson.example.steps.length; i++) {
    const step = lesson.example.steps[i];
    const { rawOut, frameOut, bpOut } = splitProbe(chunks[i + 1] ?? "");
    const linesOut = cleanLines(rawOut).slice(0, 12);
    const state = frameOut.length > 0 ? parseProbeState(frameOut, bpOut, prog.file) : prevState;
    if (linesOut.length === 0 && i === lesson.example.steps.length - 1 && memErrMatch !== null) {
      linesOut.push(memErrMatch[0]);
    }
    frames.push({
      cmd: step.cmd,
      output: linesOut,
      line: state.line,
      breakpoints: state.breakpoints,
    });
    prevState = state;
  }

  const badStderr = stderr
    .split("\n")
    .filter(
      (l) =>
        l.trim().length > 0 &&
        !l.includes("No stack.") &&
        !l.includes("No frame selected.") &&
        !l.includes("Assertion") &&
        !l.includes("Aborted") &&
        !l.includes("terminate called") &&
        !l.includes("Cannot access memory at address 0x0"),
    );

  return {
    transcript: { programId: prog.id, frames },
    errors: badStderr,
  };
}

/** 3. Check Comandos drill canonical command vs every equivalent alternative on live gdb 18.1. */
async function checkDrillEquivalences(dir, bins, cmdDrillMod) {
  const { GDB_CMD_KINDS, generateCommandItem } = cmdDrillMod;
  const MARK = "===POPIS_OBSERVE===";
  const SEEDS = [1, 7, 19, 42];
  const failures = [];
  let checked = 0;

  const observe = async (binPath, setupCommands, cmd, probe) => {
    const script = [...setupCommands, cmd, `printf "${MARK}\\n"`, ...probe];
    const { stdout, stderr } = await runGdbScript(dir, binPath, script);
    const after = maskOutput(stdout.split(MARK)[1] ?? "", dir);
    const normalized = cleanLines(after)
      .map((l) => l.replace(/^\$\d+ = /, "$N = ").replace(/\s+/g, " "))
      .join("\n");
    const errLines = cleanLines(stderr).filter(
      (l) =>
        !l.includes("No stack.") &&
        !l.includes("No frame selected.") &&
        !l.includes("Assertion") &&
        !l.includes("Aborted") &&
        !l.includes("terminate called"),
    );
    return { normalized, errLines };
  };

  for (const kind of GDB_CMD_KINDS) {
    for (const seed of SEEDS) {
      const item = generateCommandItem(seed, 0, [kind]);
      const binPath = bins.get(item.programId);
      const base = await observe(binPath, item.setupCommands, item.canonical, item.oracleProbe);
      if (base.errLines.length > 0) {
        failures.push(
          `${kind} seed=${seed} canonical "${item.canonical}" stderr: ${base.errLines.join(" | ")}`,
        );
        continue;
      }
      for (const alt of item.alternatives) {
        checked += 1;
        const got = await observe(binPath, item.setupCommands, alt, item.oracleProbe);
        if (got.errLines.length > 0) {
          failures.push(`${kind} seed=${seed} alt "${alt}" stderr: ${got.errLines.join(" | ")}`);
          continue;
        }
        if (got.normalized !== base.normalized) {
          failures.push(
            `${kind} seed=${seed} "${item.canonical}" vs "${alt}":\n  canonical: ${base.normalized}\n  alt:       ${got.normalized}`,
          );
        }
      }
    }
  }

  return { checked, failures };
}

/** Normalizes live gdb output for a single T26 output command (p, x/, whatis, ptype, or memory error). */
function extractGdbCommandOutput(command, rawStdout, rawStderr, tempDir) {
  const maskedOut = maskOutput(rawStdout, tempDir);
  const maskedErr = maskOutput(rawStderr, tempDir);
  const memErr = /Cannot access memory at address 0x[0-9a-f]+/i.exec(maskedErr);
  if (memErr !== null && cleanLines(maskedOut).length === 0) {
    return memErr[0];
  }
  const lines = cleanLines(maskedOut);
  if (/^x(?:\/|\s)/.test(command.trim())) {
    // Each x/ line has `ADDR:\tval1\tval2...` -> join values with single spaces.
    const vals = [];
    for (const line of lines) {
      const stripped = line.replace(/^ADDR:\s*/, "");
      for (const part of stripped.split("\t")) {
        const trimmed = part.trim();
        if (trimmed.length > 0) vals.push(trimmed);
      }
    }
    return vals.join(" ");
  }
  const joined = lines.join("\n");
  if (/^(?:p|print)(?:\/|\s)/.test(command.trim())) {
    return joined.replace(/^\$\d+ = /, "");
  }
  return joined;
}

/** 4. Verify every FORMAT_CASES entry against live gdb 18.1 and format.ts (T26 AC-6). */
async function checkFormatCases(dir, formatCasesMod, formatMod) {
  const { FORMAT_CASES, FORMAT_CASE_CPP, FORMAT_CASE_STOP_LINE, buildFormatCaseState } =
    formatCasesMod;
  const { evalGdbCommand } = formatMod;

  const binPath = await compileSource(dir, "format_cases.cpp", "format_cases", FORMAT_CASE_CPP);
  const state = buildFormatCaseState();
  const MARK = "===POPIS_FMT===";
  const failures = [];

  // Separate error-producing cases (like `p *np`) so batch doesn't abort remaining cases.
  const regular = FORMAT_CASES.filter((c) => !c.expected.startsWith("Cannot access memory"));
  const errorCases = FORMAT_CASES.filter((c) => c.expected.startsWith("Cannot access memory"));

  const script = [`break ${String(FORMAT_CASE_STOP_LINE)}`, "run"];
  for (const c of regular) {
    script.push(`printf "${MARK}\\n"`, c.command);
  }
  const { stdout, stderr } = await runGdbScript(dir, binPath, script);
  const chunks = stdout.split(MARK).slice(1);

  for (let i = 0; i < regular.length; i++) {
    const c = regular[i];
    const gdbOut = extractGdbCommandOutput(c.command, chunks[i] ?? "", "", dir);
    const modelRes = evalGdbCommand(c.command, state);
    if (!modelRes.ok) {
      failures.push(`format ${c.id} (${c.command}): model failed: ${modelRes.error}`);
      continue;
    }
    if (gdbOut !== c.expected) {
      failures.push(
        `format ${c.id} (${c.command}): gdb vs recorded mismatch\n  gdb:      ${gdbOut}\n  recorded: ${c.expected}`,
      );
    }
    if (gdbOut !== modelRes.output) {
      failures.push(
        `format ${c.id} (${c.command}): gdb vs format.ts mismatch\n  gdb:   ${gdbOut}\n  model: ${modelRes.output}`,
      );
    }
  }

  const badErr = cleanLines(stderr).filter((l) => !l.includes("No stack."));
  if (badErr.length > 0) {
    failures.push(`format batch stderr: ${badErr.join(" | ")}`);
  }

  for (const c of errorCases) {
    const res = await runGdbScript(dir, binPath, [
      `break ${String(FORMAT_CASE_STOP_LINE)}`,
      "run",
      `printf "${MARK}\\n"`,
      c.command,
    ]);
    const after = res.stdout.split(MARK)[1] ?? "";
    const gdbOut = extractGdbCommandOutput(c.command, after, res.stderr, dir);
    const modelRes = evalGdbCommand(c.command, state);
    if (!modelRes.ok || gdbOut !== c.expected || gdbOut !== modelRes.output) {
      failures.push(
        `format ${c.id} (${c.command}): gdb="${gdbOut}" model="${modelRes.ok ? modelRes.output : modelRes.error}" expected="${c.expected}"`,
      );
    }
  }

  return { total: FORMAT_CASES.length, failures };
}

/** 5. Verify a fixed sample of Saída drill items (9 kinds x 3 levels x 2 seeds) against live gdb 18.1 (T26 AC-6). */
async function checkOutputDrills(dir, outDrillMod) {
  const { GDB_OUT_KINDS, GDB_OUT_LEVELS, generateOutputItem } = outDrillMod;
  const SEEDS = [1, 7];
  const MARK = "===POPIS_OUT===";
  const jobs = [];
  for (const kind of GDB_OUT_KINDS) {
    for (const level of GDB_OUT_LEVELS) {
      for (const seed of SEEDS) {
        jobs.push({ kind, level, seed });
      }
    }
  }

  const failures = [];
  let idx = 0;
  const CONCURRENCY = 8;

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (idx < jobs.length) {
        const job = jobs[idx++];
        const item = generateOutputItem(job.seed, 0, job.level, [job.kind]);
        const tag = `out_${job.kind}_L${String(job.level)}_s${String(job.seed)}`;
        try {
          const binPath = await compileSource(dir, `${tag}.cpp`, tag, item.lines);
          const { stdout, stderr } = await runGdbScript(dir, binPath, [
            `break ${String(item.stopLine)}`,
            "run",
            `printf "${MARK}\\n"`,
            item.command,
          ]);
          const after = stdout.split(MARK)[1] ?? "";
          const gdbOut = extractGdbCommandOutput(item.command, after, stderr, dir);
          if (gdbOut !== item.canonical) {
            failures.push(
              `output ${job.kind} L${String(job.level)} seed=${String(job.seed)} (${item.command}):\n  gdb:   ${gdbOut}\n  model: ${item.canonical}`,
            );
          }
        } catch (err) {
          failures.push(
            `output ${job.kind} L${String(job.level)} seed=${String(job.seed)} compile/run failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }),
  );

  return { total: jobs.length, failures };
}

function formatTranscriptsFile(map) {
  return (
    `export type TranscriptFrame = {\n` +
    `  readonly cmd: string | null;\n` +
    `  readonly output: readonly string[];\n` +
    `  readonly line: number | null;\n` +
    `  readonly breakpoints: readonly number[];\n` +
    `};\n\n` +
    `export type LessonTranscript = {\n` +
    `  readonly programId: string;\n` +
    `  readonly frames: readonly TranscriptFrame[];\n` +
    `};\n\n` +
    `// Recorded from real GNU gdb 18.1 by \`npm run gdb:oracle -- --write\` (ADR-T25-1, ADR-T26-1).\n` +
    `export const LESSON_TRANSCRIPTS: Readonly<Record<string, LessonTranscript>> = ${JSON.stringify(map, null, 2)};\n`
  );
}

async function main() {
  const write = process.argv.includes("--write");
  const { module: commandsMod } = await runnerImport("/src/gdb/commands.ts");
  const { module: programsMod } = await runnerImport("/src/gdb/programs.ts");
  const { module: cmdDrillMod } = await runnerImport("/src/gdb/cmd-drill.ts");
  const { module: curriculumMod } = await runnerImport("/src/gdb/curriculum.ts");
  const { module: transcriptsMod } = await runnerImport("/src/gdb/cases/transcripts.ts");
  const { module: formatCasesMod } = await runnerImport("/src/gdb/cases/format-cases.ts");
  const { module: formatMod } = await runnerImport("/src/gdb/format.ts");
  const { module: outDrillMod } = await runnerImport("/src/gdb/out-drill.ts");

  const dir = mkdtempSync(join(tmpdir(), "gdb-oracle-"));
  try {
    const bins = new Map();
    for (const prog of programsMod.PROGRAMS) {
      bins.set(prog.id, await compileProgram(dir, prog));
    }

    // 1. Prefix check.
    const prefixRes = await checkPrefixes(commandsMod);

    // 2. Lesson transcripts (units 1-14).
    const recorded = {};
    const transcriptFailures = [];
    for (const lesson of curriculumMod.GDB_LESSONS) {
      const prog = programsMod.programById(lesson.example.programId);
      const { transcript, errors } = await runTranscript(dir, bins.get(prog.id), prog, lesson);
      if (errors.length > 0) {
        transcriptFailures.push(`lesson ${lesson.id} stderr: ${errors.join(" | ")}`);
      }
      recorded[lesson.id] = transcript;
      if (!write) {
        const expected = transcriptsMod.LESSON_TRANSCRIPTS[lesson.id];
        if (JSON.stringify(expected) !== JSON.stringify(transcript)) {
          transcriptFailures.push(`lesson ${lesson.id} transcript differs from live gdb`);
        }
      }
    }

    if (write) {
      writeFileSync(TRANSCRIPTS_FILE, formatTranscriptsFile(recorded));
      console.log(`wrote ${String(Object.keys(recorded).length)} lesson transcripts from real gdb`);
    }

    // 3. Comandos drill equivalence check.
    const drillRes = await checkDrillEquivalences(dir, bins, cmdDrillMod);

    // 4. T26 format cases check.
    const fmtRes = await checkFormatCases(dir, formatCasesMod, formatMod);

    // 5. T26 output drill sample check.
    const outRes = await checkOutputDrills(dir, outDrillMod);

    const allFailures = [
      ...prefixRes.failures,
      ...transcriptFailures,
      ...drillRes.failures,
      ...fmtRes.failures,
      ...outRes.failures,
    ];
    for (const line of allFailures) console.error(`FAIL: ${line}`);

    console.log(
      `gdb oracle: prefixes ${String(prefixRes.total - prefixRes.failures.length)}/${String(prefixRes.total)}, ` +
        `transcripts ${String(curriculumMod.GDB_LESSONS.length - transcriptFailures.length)}/${String(curriculumMod.GDB_LESSONS.length)}, ` +
        `equivalences ${String(drillRes.checked - drillRes.failures.length)}/${String(drillRes.checked)}, ` +
        `format ${String(fmtRes.total - fmtRes.failures.length)}/${String(fmtRes.total)}, ` +
        `output ${String(outRes.total - outRes.failures.length)}/${String(outRes.total)}`,
    );

    if (allFailures.length > 0) process.exitCode = 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

await main();
