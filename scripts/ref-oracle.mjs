// Verifies the examples of the reference (T46, ADR-T46-1) against the real compiler:
//   1. every example, wrapped in the contest template, compiles with
//      `g++ -std=gnu++20 -O2 -Wall` without a single warning, runs with its `input`
//      and prints exactly its recorded `output` (exit code 0);
//   2. an entry with `judge` must FAIL with `-std=gnu++20` and pass with `-std=gnu++23`
//      (its output is recorded from the second build).
//
//   npm run ref:oracle -- cpp            check every C++ entry
//   npm run ref:oracle -- cpp --write    record the outputs into src/ref/cpp/outputs.ts
//   npm run ref:oracle -- cpp --only id  check one entry
//
// Needs `g++` in PATH, so it stays out of `npm run check`.
import { execFile, spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { runnerImport } from "vite";

const execFileAsync = promisify(execFile);
const ROOT = join(import.meta.dirname, "..");
const OUTPUTS_FILE = join(ROOT, "src", "ref", "cpp", "outputs.ts");
const PRETTIER = join(ROOT, "node_modules", ".bin", "prettier");

/** The contest template around an example: `#` lines go to the top (ADR-T46-1). */
export function wrap(example) {
  const lines = example.split("\n");
  const top = lines.filter((l) => l.startsWith("#"));
  const body = lines.filter((l) => !l.startsWith("#"));
  return [
    ...top,
    "#include <bits/stdc++.h>",
    "using namespace std;",
    "int main() {",
    ...body.map((l) => `  ${l}`),
    "}",
    "",
  ].join("\n");
}

async function compile(dir, name, source, std) {
  const src = join(dir, `${name}.cpp`);
  const bin = join(dir, `${name}-${std}`);
  writeFileSync(src, source);
  try {
    const { stderr } = await execFileAsync(
      "g++",
      [`-std=${std}`, "-O2", "-Wall", src, "-o", bin],
      { cwd: dir, timeout: 120_000 },
    );
    return { ok: true, bin, stderr: stderr.split(dir + "/").join("") };
  } catch (error) {
    return { ok: false, bin, stderr: String(error.stderr ?? error).split(dir + "/").join("") };
  }
}

function run(bin, input) {
  return new Promise((resolve) => {
    const child = spawn(bin, [], { stdio: ["pipe", "pipe", "pipe"], timeout: 10_000 });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
    // A program that never reads may exit before its input is written.
    child.stdin.on("error", () => undefined);
    child.stdin.end(input ?? "");
  });
}

async function checkEntry(dir, entry) {
  const source = wrap(entry.example);
  const problems = [];
  let std = "gnu++20";
  if (entry.judge === true) {
    const old = await compile(dir, entry.id, source, "gnu++20");
    if (old.ok) problems.push("judge entry compiles with -std=gnu++20");
    std = "gnu++23";
  }
  const built = await compile(dir, entry.id, source, std);
  if (!built.ok) return { problems: [...problems, `does not compile with -std=${std}:\n${built.stderr}`] };
  if (built.stderr.trim() !== "") problems.push(`warnings with -std=${std}:\n${built.stderr}`);
  const ran = await run(built.bin, entry.input);
  if (ran.code !== 0) problems.push(`exit ${String(ran.code)} ${String(ran.signal)}: ${ran.stderr}`);
  if (ran.stdout === "") problems.push("prints nothing");
  return { problems, output: ran.stdout };
}

async function pool(items, size, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: size }, worker));
  return results;
}

function formatOutputs(entries, outputs) {
  const rows = entries
    .filter((e) => (outputs.get(e.id) ?? "") !== "")
    .map((e) => `  ${e.id}: ${JSON.stringify(outputs.get(e.id))},`);
  return (
    "// Recorded by `npm run ref:oracle -- cpp --write` (ADR-T46-1). Do not edit by hand.\n\n" +
    "export const CPP_OUTPUTS: Readonly<Record<string, string>> = {\n" +
    rows.join("\n") +
    "\n};\n"
  );
}

async function main() {
  const args = process.argv.slice(2);
  const lang = args.find((a) => !a.startsWith("--")) ?? "cpp";
  if (lang !== "cpp") {
    console.error(`unknown language ${lang} (only cpp)`);
    process.exitCode = 2;
    return;
  }
  const write = args.includes("--write");
  const onlyAt = args.indexOf("--only");
  const only = onlyAt >= 0 ? args[onlyAt + 1] : undefined;
  const { module } = await runnerImport("/src/ref/cpp/index.ts");
  const all = module.CPP_ENTRIES;
  const entries = only === undefined ? all : all.filter((e) => e.id === only);
  const { stdout: version } = await execFileAsync("g++", ["--version"]);
  console.log(`ref:oracle ${lang}: ${String(entries.length)} entries, ${version.split("\n")[0]}`);

  const dir = mkdtempSync(join(tmpdir(), "popis-"));
  try {
    const results = await pool(entries, availableParallelism(), (e) => checkEntry(dir, e));
    const outputs = new Map(all.map((e) => [e.id, e.output]));
    let failures = 0;
    let mismatches = 0;
    entries.forEach((entry, i) => {
      const { problems, output } = results[i];
      if (output !== undefined && output !== entry.output) {
        if (write) outputs.set(entry.id, output);
        else {
          mismatches += 1;
          problems.push(
            `output differs\n--- recorded\n${entry.output}--- real\n${output}`,
          );
        }
      }
      if (problems.length > 0) {
        failures += 1;
        console.log(`FAIL ${entry.id}${entry.judge ? " (judge)" : ""}\n  ${problems.join("\n  ")}`);
      }
    });
    const judged = entries.filter((e) => e.judge === true).length;
    console.log(
      `ref:oracle ${lang}: ${String(entries.length - failures)}/${String(entries.length)} ok` +
        ` (${String(judged)} judge entries, ${String(mismatches)} output mismatches)`,
    );
    if (write) {
      writeFileSync(OUTPUTS_FILE, formatOutputs(all, outputs));
      await execFileAsync(PRETTIER, ["--write", OUTPUTS_FILE], { cwd: ROOT });
      console.log(`wrote ${OUTPUTS_FILE}`);
    }
    if (failures > 0) process.exitCode = 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

await main();
