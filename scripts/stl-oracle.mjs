// Verifies T42 STL output snippets against real g++ (-std=gnu++20 -O2, x86-64, ADR-T42-1).
//
//   npm run stl:oracle              check 50 seeds per model (19 x 50 = 950 snippets)
//   npm run stl:oracle -- --seeds N check N seeds per model
//
// Needs `g++` in PATH, so it stays out of `npm run check`.
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { runnerImport } from "vite";

const execFileAsync = promisify(execFile);
const MARKER = "===POPIS_STL_CASE===";

function parseSeedsArg(argv) {
  const idx = argv.indexOf("--seeds");
  if (idx >= 0 && argv[idx + 1] !== undefined) {
    const n = Number(argv[idx + 1]);
    if (Number.isInteger(n) && n >= 1) return n;
  }
  return 50;
}

function buildModelSource(items) {
  const fns = items.map((item, idx) => {
    const body = item.lines.map((l) => `  ${l}`).join("\n");
    return `static void case_${String(idx)}() {\n${body}\n}`;
  });
  const calls = items.map(
    (_, idx) =>
      `  cout << "${MARKER}\\n";\n  case_${String(idx)}();\n  cout << "\\n";\n  cout.flags(saved);`,
  );
  return (
    `#include <bits/stdc++.h>\n` +
    `using namespace std;\n\n` +
    `${fns.join("\n\n")}\n\n` +
    `int main() {\n` +
    `  auto saved = cout.flags();\n` +
    `${calls.join("\n")}\n` +
    `  return 0;\n` +
    `}\n`
  );
}

async function checkModel(dir, level, model, seedsCount, drillMod, checkMod) {
  const items = [];
  for (let s = 1; s <= seedsCount; s++) {
    items.push(drillMod.generateStlItem(s * 97 + 13, s % 7, level, [model]));
  }
  const srcPath = join(dir, `${model}.cpp`);
  const binPath = join(dir, model);
  writeFileSync(srcPath, buildModelSource(items));
  await execFileAsync("g++", ["-std=gnu++20", "-O2", srcPath, "-o", binPath], {
    cwd: dir,
    timeout: 60_000,
  });
  const { stdout } = await execFileAsync(binPath, [], {
    cwd: dir,
    timeout: 15_000,
    maxBuffer: 10 * 1024 * 1024,
  });

  const chunks = stdout.split(MARKER).slice(1);
  const failures = [];
  if (chunks.length !== items.length) {
    failures.push(
      `${model}: expected ${String(items.length)} outputs, got ${String(chunks.length)}`,
    );
    return { total: items.length, failures };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const actualTokens = checkMod.tokenizeOutput(chunks[i] ?? "");
    const expectedTokens = checkMod.tokenizeOutput(item.canonical);
    const actual = actualTokens.join(" ");
    const expected = expectedTokens.join(" ");
    if (actual !== expected) {
      failures.push(
        `${model} case=${String(i)} seed=${String(item.seed)}:\n  code:\n    ${item.lines.join("\n    ")}\n  g++:       "${actual}"\n  simulator: "${expected}"`,
      );
    }
  }

  return { total: items.length, failures };
}

async function main() {
  const seedsCount = parseSeedsArg(process.argv.slice(2));
  const { module: drillMod } = await runnerImport("/src/stl/drill.ts");
  const { module: checkMod } = await runnerImport("/src/stl/check.ts");

  const jobs = [];
  for (const level of drillMod.STL_LEVELS) {
    for (const model of drillMod.STL_LEVEL_MODELS[level]) {
      jobs.push({ level, model });
    }
  }

  const dir = mkdtempSync(join(tmpdir(), "popis-stl-"));
  try {
    const failures = [];
    let total = 0;
    let idx = 0;
    const CONCURRENCY = 6;
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        while (idx < jobs.length) {
          const job = jobs[idx++];
          try {
            const res = await checkModel(dir, job.level, job.model, seedsCount, drillMod, checkMod);
            total += res.total;
            failures.push(...res.failures);
          } catch (err) {
            failures.push(
              `${job.model}: compile/run failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }),
    );

    for (const line of failures) console.error(`FAIL: ${line}`);
    console.log(
      `stl oracle (g++ -std=gnu++20 -O2): ${String(total - failures.length)}/${String(total)} passed (${String(jobs.length)} models x ${String(seedsCount)} seeds)`,
    );
    if (failures.length > 0) process.exitCode = 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

await main();
