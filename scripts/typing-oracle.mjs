// Syntax oracle for generated code typing snippets (ADR-T31-1).
//
//   npm run typing:oracle                check 500 seeds for C++ and 500 for Python
//   npm run typing:oracle -- --seeds 50  check N seeds per language
//
// Wraps each C++ snippet in `#include <bits/stdc++.h>`, the owner's template
// aliases and `int32_t main() { ... }`, and each Python snippet in a `def`,
// then checks them with `g++ -std=c++20 -fsyntax-only` and `python3 -m py_compile`.
// Needs `g++` and `python3` in PATH, so it stays out of `npm run check`.
import { execFile, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runnerImport } from "vite";

const DEFAULT_SEEDS = 500;
const CONCURRENCY = 8;
const PY_CHUNK = 100;

const CPP_PREAMBLE = [
  "#include <bits/stdc++.h>",
  "using namespace std;",
  "using ll = long long;",
  "using i32 = int32_t;",
  "using i64 = int64_t;",
  "using vi = vector<int>;",
  "using pii = pair<int, int>;",
  "",
].join("\n");

function indent(code, spaces = 4) {
  const pad = " ".repeat(spaces);
  return code
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
}

function wrapCpp(code) {
  return `#include "preamble.hpp"\nint32_t main() {\n${indent(code)}\n    return 0;\n}\n`;
}

function wrapPython(code) {
  return `def _snippet():\n${indent(code)}\n`;
}

function execAsync(cmd, args, options = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 30_000, ...options }, (error, stdout, stderr) => {
      resolve({ ok: !error, stdout, stderr: stderr || (error ? error.message : "") });
    });
  });
}

function parseSeedCount(argv) {
  const idx = argv.indexOf("--seeds");
  if (idx < 0) return DEFAULT_SEEDS;
  const parsed = Number(argv[idx + 1]);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new RangeError(`invalid --seeds value: ${String(argv[idx + 1])}`);
  }
  return parsed;
}

async function checkCpp(dir, generateCode, count) {
  const preamble = join(dir, "preamble.hpp");
  writeFileSync(preamble, CPP_PREAMBLE, "utf8");
  // Precompile the shared header once so checking 500 isolated main() files takes ~2s.
  execFileSync("g++", ["-std=c++20", "-x", "c++-header", preamble, "-o", `${preamble}.gch`], {
    stdio: "pipe",
  });

  const files = [];
  for (let seed = 0; seed < count; seed++) {
    const snippet = generateCode(seed, "cpp");
    const file = join(dir, `cpp-${String(seed)}.cpp`);
    writeFileSync(file, wrapCpp(snippet.text), "utf8");
    files.push({ seed, rule: snippet.rule, file });
  }

  const failures = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < files.length) {
      const job = files[cursor++];
      const res = await execAsync("g++", ["-std=c++20", "-fsyntax-only", "-I", dir, job.file]);
      if (!res.ok) {
        failures.push(`cpp seed=${String(job.seed)} (${job.rule}): ${res.stderr.trim()}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return failures;
}

async function checkPython(dir, generateCode, count) {
  const files = [];
  for (let seed = 0; seed < count; seed++) {
    const snippet = generateCode(seed, "python");
    const file = join(dir, `py-${String(seed)}.py`);
    writeFileSync(file, wrapPython(snippet.text), "utf8");
    files.push({ seed, rule: snippet.rule, file });
  }

  const failures = [];
  for (let offset = 0; offset < files.length; offset += PY_CHUNK) {
    const chunk = files.slice(offset, offset + PY_CHUNK);
    const batch = await execAsync("python3", ["-m", "py_compile", ...chunk.map((j) => j.file)]);
    if (batch.ok) continue;
    for (const job of chunk) {
      const single = await execAsync("python3", ["-m", "py_compile", job.file]);
      if (!single.ok) {
        failures.push(`python seed=${String(job.seed)} (${job.rule}): ${single.stderr.trim()}`);
      }
    }
  }
  return failures;
}

async function main() {
  const count = parseSeedCount(process.argv.slice(2));
  const { module } = await runnerImport("/src/typing/codegen/index.ts");
  const { generateCode } = module;

  const dir = mkdtempSync(join(tmpdir(), "typing-oracle-"));
  try {
    const cppFailures = await checkCpp(dir, generateCode, count);
    const pyFailures = await checkPython(dir, generateCode, count);

    for (const msg of [...cppFailures, ...pyFailures]) console.error(msg);

    const cppOk = count - cppFailures.length;
    const pyOk = count - pyFailures.length;
    console.log(
      `typing:oracle: cpp ${String(cppOk)}/${String(count)} ok, python ${String(pyOk)}/${String(count)} ok`,
    );
    if (cppFailures.length > 0 || pyFailures.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

await main();
