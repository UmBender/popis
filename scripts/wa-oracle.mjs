// Verifies T41 WA hunt cases against real g++ (`-std=c++20 -O2`) and independent
// brute-force C++ solutions (ADR-T41-1).
//
//   npm run wa:oracle             check every case against recorded outputs + 200 random tests
//   npm run wa:oracle -- --write  record verified outputs into src/wa/cases/outputs.ts
//   npm run wa:oracle -- --only <id>  run a single case
//
// Needs `g++` in PATH, so it stays out of `npm run check`.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runnerImport } from "vite";

const ROOT = join(import.meta.dirname, "..");
const BRUTE_DIR = join(ROOT, "src", "wa", "cases", "brute");
const OUTPUTS_FILE = join(ROOT, "src", "wa", "cases", "outputs.ts");
const BASE_ENV = { ...process.env, LC_ALL: "C" };

const RANDOM_RUNS = 200;
const TLE_MIN_MS = 2000;
const TLE_FIXED_MAX_MS = 500;
const TLE_KILL_MS = 5000;
const NORMAL_TIMEOUT_MS = 3000;

function makeRng(seed) {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(lo, hi) {
      return lo + Math.floor(this.next() * (hi - lo + 1));
    },
  };
}

function hashId(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function randArray(rng, n, lo, hi) {
  return Array.from({ length: n }, () => rng.int(lo, hi));
}

function randWord(rng, minLen, maxLen) {
  const len = rng.int(minLen, maxLen);
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[rng.int(0, chars.length - 1)];
  return s;
}

function randLine(rng) {
  const words = rng.int(1, 4);
  return Array.from({ length: words }, () => randWord(rng, 1, 6)).join(" ");
}

/** Small-input generators used to stress-test `fixed` vs `brute` on 200 random inputs per case. */
const GENERATORS = {
  "overflow-sum-int": (rng) => {
    const n = rng.int(1, 12);
    return `${n}\n${randArray(rng, n, 1, 1000000000).join(" ")}\n`;
  },
  "overflow-mul-mod": (rng) => `${rng.int(0, 1000000000)} ${rng.int(0, 1000000000)}\n`,
  "overflow-shift-bit": (rng, i) => `${i < 51 ? i : rng.int(0, 50)}\n`,
  "overflow-accumulate": (rng) => {
    const n = rng.int(1, 12);
    return `${n}\n${randArray(rng, n, 1, 1000000000).join(" ")}\n`;
  },
  "precisao-double-eq": (rng) => {
    const a = rng.int(1, 50);
    const b = rng.int(1, 50);
    const c = rng.int(0, 1) === 0 ? a + b : rng.int(2, 100);
    return `${(a / 10).toFixed(1)} ${(b / 10).toFixed(1)} ${(c / 10).toFixed(1)}\n`;
  },
  "precisao-sqrt-floor": (rng, i) => {
    if (i < 50) return `${i + 1}\n`;
    if (i < 100) {
      const base = BigInt(rng.int(1, 1000000000));
      const delta = BigInt(rng.int(-2, 2));
      const val = base * base + delta;
      return `${val < 1n ? 1n : val}\n`;
    }
    const hi = BigInt(rng.int(1, 1000000000));
    const lo = BigInt(rng.int(0, 999999999));
    return `${hi * 1000000000n - lo}\n`;
  },
  "precisao-cout-digits": (rng) => `${rng.int(1, 500)} ${rng.int(1, 500)}\n`,
  "precisao-float-vs-double": (rng) => `${rng.int(1, 100000)} ${rng.int(1, 1000)}\n`,
  "limite-off-by-one-loop": (rng) => {
    const n = rng.int(1, 15);
    return `${n}\n${randArray(rng, n, 1, 1000).join(" ")}\n`;
  },
  "limite-prefix-query": (rng) => {
    const n = rng.int(1, 15);
    const l = rng.int(1, n);
    const r = rng.int(l, n);
    return `${n}\n${randArray(rng, n, -50, 50).join(" ")}\n${l} ${r}\n`;
  },
  "limite-bsearch-high": (rng) => {
    const n = rng.int(1, 15);
    const arr = randArray(rng, n, -20, 20).sort((a, b) => a - b);
    const x = rng.int(-25, 25);
    return `${n} ${x}\n${arr.join(" ")}\n`;
  },
  "limite-maxn-small": (rng, i) => `${i < 40 ? i + 1 : rng.int(1, 5000)}\n`,
  "borda-neg-mod": (rng) => `${rng.int(-5000, 5000)} ${rng.int(1, 500)}\n`,
  "borda-all-equal": (rng) => {
    const n = rng.int(1, 10);
    if (rng.int(0, 3) === 0) {
      const v = rng.int(1, 20);
      return `${n}\n${Array.from({ length: n }, () => v).join(" ")}\n`;
    }
    return `${n}\n${randArray(rng, n, 1, 15).join(" ")}\n`;
  },
  "borda-n-equals-1": (rng, i) => `${i < 60 ? i + 1 : rng.int(1, 5000)}\n`,
  "borda-empty-answer": (rng) => {
    const n = rng.int(1, 12);
    const hi = rng.int(0, 2) === 0 ? 0 : 20;
    return `${n}\n${randArray(rng, n, -20, hi).join(" ")}\n`;
  },
  "multitest-static-acc": (rng) => {
    const t = rng.int(1, 5);
    const parts = [String(t)];
    for (let k = 0; k < t; k++) {
      const n = rng.int(1, 8);
      parts.push(String(n), randArray(rng, n, -100, 100).join(" "));
    }
    return `${parts.join("\n")}\n`;
  },
  "multitest-break-read": (rng) => {
    const t = rng.int(1, 5);
    const parts = [String(t)];
    for (let k = 0; k < t; k++) {
      const n = rng.int(1, 8);
      parts.push(String(n), randArray(rng, n, 0, 5).join(" "));
    }
    return `${parts.join("\n")}\n`;
  },
  "multitest-partial-clear": (rng) => {
    const t = rng.int(1, 5);
    const parts = [String(t)];
    for (let k = 0; k < t; k++) {
      const n = rng.int(2, 10);
      const m = rng.int(0, 10);
      parts.push(`${n} ${m}`);
      for (let e = 0; e < m; e++) {
        const u = rng.int(1, n);
        let v = rng.int(1, n);
        if (v === u) v = (u % n) + 1;
        parts.push(`${u} ${v}`);
      }
    }
    return `${parts.join("\n")}\n`;
  },
  "multitest-global-best": (rng) => {
    const t = rng.int(1, 5);
    const parts = [String(t)];
    for (let k = 0; k < t; k++) {
      const n = rng.int(1, 8);
      parts.push(String(n), randArray(rng, n, 1, 50).join(" "));
    }
    return `${parts.join("\n")}\n`;
  },
  "leitura-scanf-newline": (rng) => {
    const t = rng.int(1, 10);
    const letters = "ABCD";
    const parts = [String(t)];
    for (let k = 0; k < t; k++) parts.push(letters[rng.int(0, letters.length - 1)]);
    return `${parts.join("\n")}\n`;
  },
  "leitura-cin-vs-getline": (rng) => `${rng.int(1, 50)}\n${randLine(rng)}\n`,
  "leitura-trailing-space": (rng) => {
    const n = rng.int(1, 12);
    return `${n}\n${randArray(rng, n, -20, 20).join(" ")}\n`;
  },
  "leitura-case-header": (rng) => {
    const t = rng.int(1, 6);
    const parts = [String(t)];
    for (let k = 0; k < t; k++) parts.push(`${rng.int(-100, 100)} ${rng.int(-100, 100)}`);
    return `${parts.join("\n")}\n`;
  },
  "desempenho-vec-copy": (rng, i) => `${i < 25 ? i + 1 : rng.int(1, 60)}\n`,
  "desempenho-memset-loop": (rng) => `${rng.int(1, 40)} ${rng.int(1, 25)}\n`,
  "desempenho-map-vs-vector": (rng) => `${rng.int(1, 80)} ${rng.int(1, 40)}\n`,
  "desempenho-string-concat": (rng, i) => `${i < 30 ? i + 1 : rng.int(1, 200)}\n`,
  "stl-lower-vs-upper": (rng) => {
    const n = rng.int(1, 15);
    const arr = randArray(rng, n, -15, 15).sort((a, b) => a - b);
    const x = rng.int(-18, 18);
    return `${n} ${x}\n${arr.join(" ")}\n`;
  },
  "stl-multiset-erase": (rng) => {
    const q = rng.int(1, 20);
    const parts = [String(q)];
    for (let k = 0; k < q; k++) {
      const op = rng.int(0, 2) === 0 ? "-" : "+";
      parts.push(`${op} ${rng.int(1, 5)}`);
    }
    return `${parts.join("\n")}\n`;
  },
  "stl-non-strict-cmp": (rng) => {
    const n = rng.int(1, 25);
    return `${n}\n${randArray(rng, n, -5, 5).join(" ")}\n`;
  },
  "stl-size-underflow": (rng) => {
    const n = rng.int(0, 15);
    return n === 0 ? "0\n" : `${n}\n${randArray(rng, n, 0, 4).join(" ")}\n`;
  },
};

function compileCpp(dir, name, source, flags) {
  const srcPath = join(dir, `${name}.cpp`);
  const binPath = join(dir, name);
  writeFileSync(srcPath, `${source}\n`);
  const comp = spawnSync("g++", [...flags, srcPath, "-o", binPath], {
    cwd: dir,
    encoding: "utf8",
    env: BASE_ENV,
    timeout: 30_000,
  });
  if (comp.status !== 0) {
    throw new Error(`compile failed for ${name}:\n${comp.stderr ?? ""}`);
  }
  return binPath;
}

function runBin(binPath, input, timeoutMs) {
  const t0 = performance.now();
  const res = spawnSync(binPath, [], {
    input,
    encoding: "utf8",
    env: BASE_ENV,
    timeout: timeoutMs,
    maxBuffer: 16 * 1024 * 1024,
  });
  const ms = performance.now() - t0;
  return { ...res, ms };
}

function verifyCase(dir, c, flags) {
  const gen = GENERATORS[c.id];
  if (gen === undefined) throw new Error(`case ${c.id}: missing random generator`);
  const bruteSource = readFileSync(join(BRUTE_DIR, `${c.id}.cpp`), "utf8");

  const codeBin = compileCpp(dir, `${c.id}-code`, c.code, flags);
  const fixedBin = compileCpp(dir, `${c.id}-fixed`, c.fixed, flags);
  const bruteBin = compileCpp(dir, `${c.id}-brute`, bruteSource, flags);

  // 1. Sample input: code, fixed and brute must all succeed and produce identical stdout.
  const codeSample = runBin(codeBin, c.sample_input, NORMAL_TIMEOUT_MS);
  const fixedSample = runBin(fixedBin, c.sample_input, NORMAL_TIMEOUT_MS);
  const bruteSample = runBin(bruteBin, c.sample_input, NORMAL_TIMEOUT_MS);

  for (const [label, r] of [
    ["code", codeSample],
    ["fixed", fixedSample],
    ["brute", bruteSample],
  ]) {
    if (r.status !== 0 || r.signal !== null) {
      throw new Error(
        `case ${c.id}: ${label} failed on sample (status=${String(r.status)}, signal=${String(r.signal)})`,
      );
    }
  }
  if (codeSample.stdout !== fixedSample.stdout) {
    throw new Error(
      `case ${c.id}: code and fixed differ on sample\n  code: ${JSON.stringify(codeSample.stdout)}\n  fixed: ${JSON.stringify(fixedSample.stdout)}`,
    );
  }
  if (fixedSample.stdout !== bruteSample.stdout) {
    throw new Error(
      `case ${c.id}: fixed and brute differ on sample\n  fixed: ${JSON.stringify(fixedSample.stdout)}\n  brute: ${JSON.stringify(bruteSample.stdout)}`,
    );
  }

  // 2. Breaking input: fixed succeeds; code fails according to expected_verdict.
  const fixedBreak = runBin(fixedBin, c.breaking_input, NORMAL_TIMEOUT_MS);
  if (fixedBreak.status !== 0 || fixedBreak.signal !== null) {
    throw new Error(
      `case ${c.id}: fixed failed on breaking_input (status=${String(fixedBreak.status)}, signal=${String(fixedBreak.signal)})`,
    );
  }

  const codeBreak = runBin(
    codeBin,
    c.breaking_input,
    c.expected_verdict === "TLE" ? TLE_KILL_MS : NORMAL_TIMEOUT_MS,
  );

  let verdict;
  let wrong_output;
  if (c.expected_verdict === "TLE") {
    const timedOut = codeBreak.error?.code === "ETIMEDOUT" || codeBreak.signal === "SIGTERM";
    if (!timedOut && codeBreak.ms <= TLE_MIN_MS) {
      throw new Error(
        `case ${c.id}: expected TLE (> ${String(TLE_MIN_MS)} ms), code finished in ${codeBreak.ms.toFixed(1)} ms`,
      );
    }
    if (fixedBreak.ms >= TLE_FIXED_MAX_MS) {
      throw new Error(
        `case ${c.id}: fixed too slow on breaking_input (${fixedBreak.ms.toFixed(1)} ms >= ${String(TLE_FIXED_MAX_MS)} ms)`,
      );
    }
    verdict = "TLE";
    wrong_output = "TLE (> 2.0 s)\n";
  } else if (c.expected_verdict === "RTE") {
    if (codeBreak.signal === null) {
      throw new Error(
        `case ${c.id}: expected RTE signal, got status=${String(codeBreak.status)} stdout=${JSON.stringify(codeBreak.stdout)}`,
      );
    }
    verdict = "RTE";
    wrong_output = `RTE (sinal ${codeBreak.signal})\n`;
  } else {
    if (codeBreak.status !== 0 || codeBreak.signal !== null) {
      throw new Error(
        `case ${c.id}: expected WA exit 0, got status=${String(codeBreak.status)} signal=${String(codeBreak.signal)}`,
      );
    }
    if (codeBreak.stdout === fixedBreak.stdout) {
      throw new Error(
        `case ${c.id}: code and fixed produced the same output on breaking_input: ${JSON.stringify(codeBreak.stdout)}`,
      );
    }
    verdict = "WA";
    wrong_output = codeBreak.stdout;
  }

  // 3. Stress-test fixed against brute on 200 small random inputs.
  const rng = makeRng(hashId(c.id));
  for (let i = 0; i < RANDOM_RUNS; i++) {
    const input = gen(rng, i);
    const fRes = runBin(fixedBin, input, NORMAL_TIMEOUT_MS);
    const bRes = runBin(bruteBin, input, NORMAL_TIMEOUT_MS);
    if (fRes.status !== 0 || fRes.signal !== null || bRes.status !== 0 || bRes.signal !== null) {
      throw new Error(
        `case ${c.id}: crash on random test #${String(i)} (fixed=${String(fRes.status)}/${String(fRes.signal)}, brute=${String(bRes.status)}/${String(bRes.signal)})`,
      );
    }
    if (fRes.stdout !== bRes.stdout) {
      throw new Error(
        `case ${c.id}: fixed differs from brute on random test #${String(i)}\n  input: ${JSON.stringify(input)}\n  fixed: ${JSON.stringify(fRes.stdout)}\n  brute: ${JSON.stringify(bRes.stdout)}`,
      );
    }
  }

  return {
    output: {
      sample_output: fixedSample.stdout,
      wrong_output,
      expected_output: fixedBreak.stdout,
      verdict,
    },
    codeMs: codeBreak.ms,
    fixedMs: fixedBreak.ms,
  };
}

function formatOutputsFile(map) {
  return (
    `import type { WaRecordedOutput } from "./index";\n\n` +
    `// Recorded from real g++ 16.2 (\`-std=c++20 -O2\`) by \`npm run wa:oracle -- --write\` (ADR-T41-1).\n` +
    `export const RECORDED_WA_OUTPUTS: Readonly<Record<string, WaRecordedOutput>> = ${JSON.stringify(map, null, 2)};\n`
  );
}

async function main() {
  const write = process.argv.includes("--write");
  const onlyIdx = process.argv.indexOf("--only");
  const onlyId = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null;

  const { module: casesMod } = await runnerImport("/src/wa/cases/cases.ts");
  const { module: indexMod } = await runnerImport("/src/wa/cases/index.ts");
  const { module: outputsMod } = await runnerImport("/src/wa/cases/outputs.ts");

  const { WA_CASE_DEFS } = casesMod;
  const { WA_JUDGE_FLAGS } = indexMod;
  const { RECORDED_WA_OUTPUTS } = outputsMod;

  const target = onlyId !== null ? WA_CASE_DEFS.filter((c) => c.id === onlyId) : WA_CASE_DEFS;
  if (target.length === 0) {
    throw new Error(`no case matches --only ${String(onlyId)}`);
  }

  const dir = mkdtempSync(join(tmpdir(), "popis-wa-"));
  const recorded = {};
  const failures = [];

  try {
    for (const c of target) {
      try {
        const { output, codeMs, fixedMs } = verifyCase(dir, c, WA_JUDGE_FLAGS);
        recorded[c.id] = output;
        if (!write) {
          const expected = RECORDED_WA_OUTPUTS[c.id];
          if (JSON.stringify(output) !== JSON.stringify(expected)) {
            failures.push(
              `case ${c.id}: live output differs from recorded\n  live: ${JSON.stringify(output)}\n  recorded: ${JSON.stringify(expected)}`,
            );
            continue;
          }
        }
        const timing =
          c.expected_verdict === "TLE"
            ? ` (code=${codeMs.toFixed(0)}ms, fixed=${fixedMs.toFixed(0)}ms)`
            : "";
        console.log(`  ok  ${c.id} [${output.verdict}]${timing}`);
      } catch (err) {
        failures.push(err instanceof Error ? err.message : String(err));
      }
    }

    if (write && onlyId === null && failures.length === 0) {
      writeFileSync(OUTPUTS_FILE, formatOutputsFile(recorded));
      console.log(`wrote ${String(Object.keys(recorded).length)} case outputs from real g++`);
    }

    for (const line of failures) console.error(`FAIL: ${line}`);
    const passed = target.length - failures.length;
    console.log(
      `wa oracle: ${String(passed)}/${String(target.length)} cases ok (${String(RANDOM_RUNS)} random brute-force tests each)`,
    );
    if (failures.length > 0) process.exitCode = 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

await main();
