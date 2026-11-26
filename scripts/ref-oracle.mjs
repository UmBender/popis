// Verifies the examples of the reference (T46, T47, ADR-T46-1, ADR-T47-1) against
// the real toolchains:
//   cpp: wraps each example in the contest template, compiles with
//        `g++ -std=gnu++20 -O2 -Wall` without warnings, runs with `input` and
//        checks `output`; `judge` entries must fail gnu++20 and pass gnu++23.
//   py:  runs each example with both `pypy3` and `python3` with `input`, checks
//        that both exit 0 with identical stdout matching `output`, and checks
//        Python 3.9 compatibility via `ast.parse(..., feature_version=(3, 9))`,
//        the post-3.9 stdlib API list (`src/ref/py/compat.ts`) and `since`.
//
//   npm run ref:oracle -- cpp            check every C++ entry
//   npm run ref:oracle -- cpp --write    record outputs into src/ref/cpp/outputs.ts
//   npm run ref:oracle -- py             check every Python entry
//   npm run ref:oracle -- py --write     record outputs into src/ref/py/outputs.ts
//   npm run ref:oracle -- py --only id   check one entry
//
// Needs `g++` (cpp) or `pypy3` + `python3` (py) in PATH, so it stays out of `npm run check`.
import { execFile, spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { runnerImport } from "vite";

const execFileAsync = promisify(execFile);
const ROOT = join(import.meta.dirname, "..");
const PRETTIER = join(ROOT, "node_modules", ".bin", "prettier");

const PY39_PARSE =
  "import ast, sys; ast.parse(open(sys.argv[1], encoding='utf-8').read(), sys.argv[1], feature_version=(3, 9))";

/** The C++ contest template around an example: `#` lines go to the top (ADR-T46-1). */
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
    const { stderr } = await execFileAsync("g++", [`-std=${std}`, "-O2", "-Wall", src, "-o", bin], {
      cwd: dir,
      timeout: 120_000,
    });
    return { ok: true, bin, stderr: stderr.split(dir + "/").join("") };
  } catch (error) {
    return {
      ok: false,
      bin,
      stderr: String(error.stderr ?? error)
        .split(dir + "/")
        .join(""),
    };
  }
}

function run(cmd, args, input) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"], timeout: 10_000 });
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

async function checkCppEntry(dir, entry) {
  const source = wrap(entry.example);
  const problems = [];
  let std = "gnu++20";
  if (entry.judge === true) {
    const old = await compile(dir, entry.id, source, "gnu++20");
    if (old.ok) problems.push("judge entry compiles with -std=gnu++20");
    std = "gnu++23";
  }
  const built = await compile(dir, entry.id, source, std);
  if (!built.ok)
    return { problems: [...problems, `does not compile with -std=${std}:\n${built.stderr}`] };
  if (built.stderr.trim() !== "") problems.push(`warnings with -std=${std}:\n${built.stderr}`);
  const ran = await run(built.bin, [], entry.input);
  if (ran.code !== 0)
    problems.push(`exit ${String(ran.code)} ${String(ran.signal)}: ${ran.stderr}`);
  if (ran.stdout === "") problems.push("prints nothing");
  return { problems, output: ran.stdout };
}

async function parsePy39(src) {
  try {
    await execFileAsync("python3", ["-c", PY39_PARSE, src], { timeout: 10_000 });
    return { ok: true, stderr: "" };
  } catch (error) {
    return { ok: false, stderr: String(error.stderr ?? error).trim() };
  }
}

async function checkPyEntry(dir, entry, compat) {
  // Prefix avoids shadowing stdlib modules (e.g. `decimal.py`) on sys.path[0].
  const src = join(dir, `entry_${entry.id}.py`);
  writeFileSync(src, entry.example + "\n");
  const problems = [];

  const syntax39 = await parsePy39(src);
  const apiHits = compat.findPost39Apis(entry.example);
  const after39 = compat.isAfter39(entry.since);

  if (entry.judge === true) {
    if (!after39) problems.push(`judge entry must declare since > Python 3.9 (got ${String(entry.since)})`);
    if (syntax39.ok && apiHits.length === 0)
      problems.push("judge entry passes Python 3.9 syntax and post-3.9 API check");
  } else {
    if (after39) problems.push(`non-judge entry declares since ${String(entry.since)}`);
    if (!syntax39.ok) problems.push(`fails Python 3.9 syntax check:\n${syntax39.stderr}`);
    if (apiHits.length > 0)
      problems.push(`uses post-3.9 API(s): ${apiHits.map((h) => h.name).join(", ")}`);
  }

  const [pypy, cpy] = await Promise.all([
    run("pypy3", [src], entry.input),
    run("python3", [src], entry.input),
  ]);
  for (const [label, res] of [
    ["pypy3", pypy],
    ["python3", cpy],
  ]) {
    if (res.code !== 0)
      problems.push(`${label} exit ${String(res.code)} ${String(res.signal)}: ${res.stderr.trim()}`);
    if (res.stderr.trim() !== "") problems.push(`${label} stderr:\n${res.stderr.trim()}`);
    if (res.stdout === "") problems.push(`${label} prints nothing`);
  }
  if (pypy.code === 0 && cpy.code === 0 && pypy.stdout !== cpy.stdout) {
    problems.push(`pypy3 and python3 outputs differ\n--- pypy3\n${pypy.stdout}--- python3\n${cpy.stdout}`);
  }
  return { problems, output: pypy.code === 0 && cpy.code === 0 ? pypy.stdout : undefined };
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

function formatOutputs(lang, exportName, entries, outputs) {
  const adr = lang === "cpp" ? "ADR-T46-1" : "ADR-T47-1";
  const rows = entries
    .filter((e) => (outputs.get(e.id) ?? "") !== "")
    .map((e) => `  ${e.id}: ${JSON.stringify(outputs.get(e.id))},`);
  return (
    `// Recorded by \`npm run ref:oracle -- ${lang} --write\` (${adr}). Do not edit by hand.\n\n` +
    `export const ${exportName}: Readonly<Record<string, string>> = {\n` +
    rows.join("\n") +
    "\n};\n"
  );
}

async function loadLang(lang) {
  if (lang === "cpp") {
    const { module } = await runnerImport("/src/ref/cpp/index.ts");
    const { stdout } = await execFileAsync("g++", ["--version"]);
    return {
      all: module.CPP_ENTRIES,
      exportName: "CPP_OUTPUTS",
      outputsFile: join(ROOT, "src", "ref", "cpp", "outputs.ts"),
      banner: stdout.split("\n")[0],
      check: (dir, entry) => checkCppEntry(dir, entry),
    };
  }
  const [{ module }, { module: compat }, pypyVer, cpyVer] = await Promise.all([
    runnerImport("/src/ref/py/index.ts"),
    runnerImport("/src/ref/py/compat.ts"),
    execFileAsync("pypy3", ["--version"]),
    execFileAsync("python3", ["--version"]),
  ]);
  const pypyLine = pypyVer.stdout.trim().replace(/\s+/g, " ");
  const cpyLine = cpyVer.stdout.trim();
  return {
    all: module.PY_ENTRIES,
    exportName: "PY_OUTPUTS",
    outputsFile: join(ROOT, "src", "ref", "py", "outputs.ts"),
    banner: `${pypyLine} | ${cpyLine}`,
    check: (dir, entry) => checkPyEntry(dir, entry, compat),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const lang = args.find((a) => !a.startsWith("--")) ?? "cpp";
  if (lang !== "cpp" && lang !== "py") {
    console.error(`unknown language ${lang} (expected cpp or py)`);
    process.exitCode = 2;
    return;
  }
  const write = args.includes("--write");
  const onlyAt = args.indexOf("--only");
  const only = onlyAt >= 0 ? args[onlyAt + 1] : undefined;

  const target = await loadLang(lang);
  const entries = only === undefined ? target.all : target.all.filter((e) => e.id === only);
  console.log(`ref:oracle ${lang}: ${String(entries.length)} entries, ${target.banner}`);

  const dir = mkdtempSync(join(tmpdir(), "popis-"));
  try {
    const results = await pool(entries, availableParallelism(), (e) => target.check(dir, e));
    const outputs = new Map(target.all.map((e) => [e.id, e.output]));
    let failures = 0;
    let mismatches = 0;
    entries.forEach((entry, i) => {
      const { problems, output } = results[i];
      if (output !== undefined && output !== entry.output) {
        if (write) outputs.set(entry.id, output);
        else {
          mismatches += 1;
          problems.push(`output differs\n--- recorded\n${entry.output}--- real\n${output}`);
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
      writeFileSync(target.outputsFile, formatOutputs(lang, target.exportName, target.all, outputs));
      await execFileAsync(PRETTIER, ["--write", target.outputsFile], { cwd: ROOT });
      console.log(`wrote ${target.outputsFile}`);
    }
    if (failures > 0) process.exitCode = 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

await main();
