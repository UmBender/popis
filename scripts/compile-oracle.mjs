// Verifies T40 cases against real g++ 16.2, AddressSanitizer, UBSan, _GLIBCXX_DEBUG
// and judge verdicts (ADR-T40-1).
//
//   npm run compile:oracle             check every case output and line citation
//   npm run compile:oracle -- --write  record outputs from real g++ into src/compile/cases/outputs.ts
//
// Needs `g++`, `timeout` and `bash` in PATH, so it stays out of `npm run check`.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runnerImport } from "vite";

const OUTPUTS_FILE = join(import.meta.dirname, "..", "src", "compile", "cases", "outputs.ts");
const BASE_ENV = {
  ...process.env,
  LC_ALL: "C",
  ASAN_OPTIONS: "detect_leaks=0:color=never:abort_on_error=0",
  UBSAN_OPTIONS: "halt_on_error=1:print_stacktrace=0:color=never",
};

function splitFlags(flags) {
  const pre = [];
  const libs = [];
  for (const f of flags) {
    if (f.startsWith("-l")) libs.push(f);
    else pre.push(f);
  }
  return { pre, libs };
}

function verdictLine(c, res) {
  if (c.limits?.timeS !== undefined && res.status === 124) {
    return `Veredito: TLE (tempo limite excedido: ${String(c.limits.timeS)} s, saída 124)`;
  }
  if (c.limits?.memoryKb !== undefined && (res.signal !== null || res.status !== 0)) {
    const detail = res.signal !== null ? `sinal ${res.signal}` : `saída ${String(res.status)}`;
    return `Veredito: MLE (limite de memória excedido, ${detail})`;
  }
  if (res.signal === "SIGSEGV") {
    return "Veredito: RTE (sinal SIGSEGV — falha de segmentação)";
  }
  if (res.signal === "SIGFPE") {
    return "Veredito: RTE (sinal SIGFPE — exceção aritmética)";
  }
  if (res.signal === "SIGABRT") {
    return "Veredito: RTE (sinal SIGABRT — abortado)";
  }
  throw new Error(
    `case ${c.id}: unexpected verdict result (status=${String(res.status)}, signal=${String(res.signal)})`,
  );
}

function runCase(dir, c, formatCompilerOutput) {
  const srcPath = join(dir, "sol.cpp");
  const binPath = join(dir, c.id);
  writeFileSync(srcPath, `${c.code}\n`);

  const { pre, libs } = splitFlags(c.flags);
  const comp = spawnSync("g++", [...pre, srcPath, "-o", binPath, ...libs], {
    cwd: dir,
    encoding: "utf8",
    env: BASE_ENV,
    timeout: 30_000,
  });

  if (c.group === "compilacao") {
    if (comp.status === 0) throw new Error(`case ${c.id}: expected compile error, got exit 0`);
    return formatCompilerOutput(comp.stderr ?? "", c.group, dir);
  }
  if (comp.status !== 0) {
    throw new Error(`case ${c.id}: unexpected compile error:\n${comp.stderr ?? ""}`);
  }
  if (c.group === "aviso") {
    if (!(comp.stderr ?? "").includes("warning:")) {
      throw new Error(`case ${c.id}: expected compiler warning, got none`);
    }
    return formatCompilerOutput(comp.stderr ?? "", c.group, dir);
  }

  let run;
  const input = c.input ?? "";
  if (c.limits?.timeS !== undefined) {
    run = spawnSync("timeout", [String(c.limits.timeS), binPath], {
      cwd: dir,
      input,
      encoding: "utf8",
      env: BASE_ENV,
      timeout: (c.limits.timeS + 5) * 1000,
    });
  } else if (c.limits?.memoryKb !== undefined) {
    run = spawnSync(
      "bash",
      [
        "--noprofile",
        "--norc",
        "-c",
        `ulimit -v ${String(c.limits.memoryKb)} && exec "$1"`,
        "_",
        binPath,
      ],
      { cwd: dir, input, encoding: "utf8", env: BASE_ENV, timeout: 10_000 },
    );
  } else {
    run = spawnSync(binPath, [], {
      cwd: dir,
      input,
      encoding: "utf8",
      env: BASE_ENV,
      timeout: 10_000,
    });
  }

  if (c.group === "veredito") {
    const rawParts = [];
    const stderr = (run.stderr ?? "").trim();
    if (stderr.length > 0) rawParts.push(stderr);
    rawParts.push(verdictLine(c, run));
    return formatCompilerOutput(rawParts.join("\n"), c.group, dir);
  }

  const stderr = (run.stderr ?? "").trim();
  if (stderr.length === 0) {
    throw new Error(`case ${c.id}: expected sanitizer/debug stderr, got none`);
  }
  return formatCompilerOutput(stderr, c.group, dir);
}

function formatOutputsFile(map) {
  return (
    `// Recorded from real g++ 16.2 by \`npm run compile:oracle -- --write\` (ADR-T40-1).\n` +
    `export const RECORDED_OUTPUTS: Readonly<Record<string, string>> = ${JSON.stringify(map, null, 2)};\n`
  );
}

async function main() {
  const write = process.argv.includes("--write");
  const { module: casesMod } = await runnerImport("/src/compile/cases/cases.ts");
  const { module: outputsMod } = await runnerImport("/src/compile/cases/outputs.ts");
  const { module: formatMod } = await runnerImport("/src/compile/format.ts");

  const { COMPILE_CASE_DEFS } = casesMod;
  const { RECORDED_OUTPUTS } = outputsMod;
  const { formatCompilerOutput, outputCitesLine } = formatMod;

  const dir = mkdtempSync(join(tmpdir(), "popis-compile-"));
  const recorded = {};
  const failures = [];

  try {
    for (const c of COMPILE_CASE_DEFS) {
      let actual;
      try {
        actual = runCase(dir, c, formatCompilerOutput);
      } catch (err) {
        failures.push(err instanceof Error ? err.message : String(err));
        continue;
      }

      if (actual.length === 0) {
        failures.push(`case ${c.id}: empty formatted output`);
        continue;
      }

      const mustCiteLine = c.group !== "veredito" || actual.includes("sol.cpp:");
      if (mustCiteLine && !outputCitesLine(actual, c.line)) {
        failures.push(
          `case ${c.id}: output does not cite sol.cpp:${String(c.line)}\n  output:\n${actual}`,
        );
      }

      recorded[c.id] = actual;
      if (!write) {
        const expected = RECORDED_OUTPUTS[c.id];
        if (actual !== expected) {
          failures.push(
            `case ${c.id}: live output differs from recorded\n  live:\n${actual}\n  recorded:\n${String(expected)}`,
          );
        }
      }
    }

    if (write && failures.length === 0) {
      writeFileSync(OUTPUTS_FILE, formatOutputsFile(recorded));
      console.log(`wrote ${String(Object.keys(recorded).length)} case outputs from real g++`);
    }

    for (const line of failures) console.error(`FAIL: ${line}`);
    const passed = COMPILE_CASE_DEFS.length - failures.length;
    console.log(
      `compile oracle: ${String(passed)}/${String(COMPILE_CASE_DEFS.length)} cases ok`,
    );
    if (failures.length > 0) process.exitCode = 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

await main();
