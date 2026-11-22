// Verifies T25 against real GNU gdb 18.1 and g++ 16.2 (ADR-T25-1):
//   1. Unique/ambiguous prefix resolution matches gdb 18.1.
//   2. For a fixed sample of seeds of every drill kind, the canonical command and
//      every listed alternative produce the exact same observable gdb effect.
//   3. Every Aprender lesson example transcript matches real gdb 18.1 (with
//      addresses masked as ADDR and PIDs as N).
//
//   npm run gdb:oracle           check prefixes, drill equivalences and transcripts
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

/** Masks addresses, PIDs, temporary build paths, and thread/LWP noise for deterministic transcripts. */
function maskOutput(raw, tempDir) {
  let s = raw.replace(/\r\n/g, "\n");
  if (tempDir) {
    s = s.split(tempDir + "/").join("");
    s = s.split(tempDir).join("DIR");
  }
  // Mask raw hex addresses (keep 0x0 as null pointer!).
  s = s.replace(/0x[0-9a-fA-F]{4,}/g, "ADDR");
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

async function compileProgram(dir, prog) {
  const srcPath = join(dir, prog.file);
  const binPath = join(dir, prog.id);
  writeFileSync(srcPath, prog.lines.join("\n") + "\n");
  if (prog.stdin !== undefined) {
    writeFileSync(join(dir, "in.txt"), prog.stdin);
  }
  await execFileAsync("g++", ["-g", "-O0", "-std=c++17", srcPath, "-o", binPath], {
    cwd: dir,
    timeout: 30_000,
  });
  return binPath;
}

async function runGdbScript(dir, binPath, commands) {
  const args = [...GDB_BASE_ARGS];
  // Disable pagination & confirmation prompts cleanly.
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
  // Batch in one python/gdb check per prefix (fast: ~2s total in parallel batches).
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

  // Initial state marker before first animated step.
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

  const chunks = full.split(MARK_CMD);
  const frames = [];

  const splitProbe = (segment) => {
    const [rawOut = "", rest = ""] = segment.split(MARK_FRAME);
    const [frameOut = "", bpOut = ""] = rest.split(MARK_BP);
    return { rawOut, frameOut, bpOut };
  };

  // Frame 0: state right after setup, before first animated command.
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

  for (let i = 0; i < lesson.example.steps.length; i++) {
    const step = lesson.example.steps[i];
    const { rawOut, frameOut, bpOut } = splitProbe(chunks[i + 1] ?? "");
    const state = parseProbeState(frameOut, bpOut, prog.file);
    frames.push({
      cmd: step.cmd,
      output: cleanLines(rawOut).slice(0, 12),
      line: state.line,
      breakpoints: state.breakpoints,
    });
  }

  // Flag genuine gdb syntax errors in stderr (ignoring benign "No stack." during initial frame probe).
  const badStderr = stderr
    .split("\n")
    .filter(
      (l) =>
        l.trim().length > 0 &&
        !l.includes("No stack.") &&
        !l.includes("No frame selected.") &&
        !l.includes("Assertion") &&
        !l.includes("Aborted") &&
        !l.includes("terminate called"),
    );

  return {
    transcript: { programId: prog.id, frames },
    errors: badStderr,
  };
}

/** 3. Check drill canonical command vs every equivalent alternative on live gdb 18.1. */
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
    // Normalize whitespace and value-history numbering ($1 = vs $2 =).
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
    `// Recorded from real GNU gdb 18.1 by \`npm run gdb:oracle -- --write\` (ADR-T25-1).\n` +
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

  const dir = mkdtempSync(join(tmpdir(), "gdb-oracle-"));
  try {
    // Compile every program once into os.tmpdir().
    const bins = new Map();
    for (const prog of programsMod.PROGRAMS) {
      bins.set(prog.id, await compileProgram(dir, prog));
    }

    // 1. Prefix check.
    const prefixRes = await checkPrefixes(commandsMod);

    // 2. Lesson transcripts.
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

    // 3. Drill equivalence check.
    const drillRes = await checkDrillEquivalences(dir, bins, cmdDrillMod);

    const allFailures = [...prefixRes.failures, ...transcriptFailures, ...drillRes.failures];
    for (const line of allFailures) console.error(`FAIL: ${line}`);

    console.log(
      `gdb oracle: prefixes ${String(prefixRes.total - prefixRes.failures.length)}/${String(prefixRes.total)}, ` +
        `transcripts ${String(curriculumMod.GDB_LESSONS.length - transcriptFailures.length)}/${String(curriculumMod.GDB_LESSONS.length)}, ` +
        `equivalences ${String(drillRes.checked - drillRes.failures.length)}/${String(drillRes.checked)}`,
    );

    if (allFailures.length > 0) process.exitCode = 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

await main();
