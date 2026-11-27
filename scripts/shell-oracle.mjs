// Verifies T39 against real GNU bash 5.3 and g++ 16.2 (ADR-T39-1):
//   1. For a fixed sample of seeds of every Comandos drill kind (8 kinds), the canonical
//      command and every generated equivalent alternative produce the exact same observable
//      effect (exit code, stdout, stderr, probe output, and resulting files).
//   2. Every near-miss in src/shell/cases/near-misses.ts produces a DIFFERENT observable
//      effect from its canonical command.
//   2b. (T54, ADR-T54-1) every script equivalence has the same effect, every script
//      near-miss a different one, and every annotated lesson script passes `bash -n`.
//   3. Every Aprender lesson example transcript (units 1-11) matches live bash output
//      (with temp paths, usernames and timings masked).
//
//   npm run shell:oracle             check all three suites
//   npm run shell:oracle -- --write  record lesson transcripts from live bash
//
// Runs strictly inside mkdtemp(join(tmpdir(), "popis-shell-")) with HOME pointed to that
// temp folder and LC_ALL=C. Never touches the repository or the user's real $HOME.
import { execFile } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { promisify } from "node:util";
import { runnerImport } from "vite";

const execFileAsync = promisify(execFile);
const TRANSCRIPTS_FILE = join(import.meta.dirname, "..", "src", "shell", "cases", "transcripts.ts");

const CPP_A = `#include <iostream>
int main() {
  int x = 0;
  if (std::cin >> x) {
#ifdef __OPTIMIZE__
    std::cout << (x * 2) << " opt\\n";
#else
    std::cout << (x * 2) << " noopt\\n";
#endif
  }
  std::cerr << "dbg: x=" << x << "\\n";
  return 0;
}
`;

const CPP_B_DIFF = `#include <iostream>
int main() {
  int x = 0;
  if (std::cin >> x) {
    std::cout << (x * 3) << "\\n";
  }
  return 0;
}
`;

const CPP_GEN = `#include <cstdlib>
#include <fstream>
#include <iostream>
int main(int argc, char** argv) {
  int s = 1;
  if (argc > 1) {
    s = std::atoi(argv[1]);
  } else {
    {
      std::ifstream in(".gen_seed");
      if (in >> s) s += 1;
      else s = 1;
    }
    std::ofstream out(".gen_seed");
    out << s << "\\n";
  }
  std::cout << s << "\\n";
  return 0;
}
`;

const CPP_BRUTE = `#include <iostream>
int main() {
  int n = 0;
  if (std::cin >> n) std::cout << (n * n) << "\\n";
  return 0;
}
`;

const CPP_SOL = `#include <iostream>
int main() {
  int n = 0;
  if (std::cin >> n) std::cout << (n == 7 ? n * n + 1 : n * n) << "\\n";
  return 0;
}
`;

// Popis-authored contest .bashrc (inspired by GEMPRO Notebook: c, cs, gen, rr, chk).
const POPIS_BASHRC = `# Contest setup (inspirado no .bashrc do GEMPRO Notebook)
c()   { g++ -O2 -std=gnu++20 -Wall -Wextra -Wshadow "$1.cpp" -o "$1"; }
cs()  { g++ -g -std=gnu++20 -fsanitize=address,undefined -D_GLIBCXX_DEBUG "$1.cpp" -o "$1"; }
gen() { g++ -O2 -std=gnu++20 "$1.cpp" -o "$1"; }
rr()  { for f in in*; do echo "=== $f ==="; "./$1" < "$f"; done; }
chk() { for i in $(seq 1 "\${4:-50}"); do "./$1" "$i" > in && "./$2" < in > o1 && "./$3" < in > o2 && diff -Z o1 o2 || { echo "WA seed $i"; break; }; done; }
`;

async function compileFixtures(binDir) {
  mkdirSync(binDir, { recursive: true });
  const writeAndBuild = async (name, src, flags) => {
    const cpp = join(binDir, `${name}.cpp`);
    const out = join(binDir, name);
    writeFileSync(cpp, src);
    await execFileAsync("g++", [...flags, cpp, "-o", out], { timeout: 30_000 });
    chmodSync(out, 0o755);
  };
  await Promise.all([
    writeAndBuild("a", CPP_A, ["-O2", "-std=gnu++20"]),
    writeAndBuild("b_diff", CPP_B_DIFF, ["-O2", "-std=gnu++20"]),
    writeAndBuild("gen", CPP_GEN, ["-O2", "-std=gnu++20"]),
    writeAndBuild("brute", CPP_BRUTE, ["-O2", "-std=gnu++20"]),
    writeAndBuild("sol", CPP_SOL, ["-O2", "-std=gnu++20"]),
  ]);
}

function setupFixture(workDir, workHome, binDir, fixture) {
  mkdirSync(workDir, { recursive: true });
  mkdirSync(workHome, { recursive: true });
  writeFileSync(join(workHome, ".bashrc"), POPIS_BASHRC);

  const cpBin = (srcName, dstName) => {
    const dst = join(workDir, dstName);
    copyFileSync(join(binDir, srcName), dst);
    chmodSync(dst, 0o755);
  };

  if (fixture === "files" || fixture === "files-prev") {
    for (const f of ["a.cpp", "b.cpp", "c.cpp", "sol.cpp"]) {
      writeFileSync(join(workDir, f), CPP_A);
    }
    writeFileSync(join(workDir, "in1"), "5\n");
    writeFileSync(join(workDir, "in2"), "6\n");
    writeFileSync(join(workDir, "in.txt"), "5\n");
    writeFileSync(join(workDir, "out1"), "10\n");
    writeFileSync(join(workDir, "tmp.out"), "tmp\n");
    writeFileSync(join(workDir, "debug.log"), "dbg\n");
    writeFileSync(join(workDir, "old.out"), "old\n");
    writeFileSync(join(workDir, ".hidden"), "secret\n");
    mkdirSync(join(workDir, "sub"), { recursive: true });
    mkdirSync(join(workDir, "tests"), { recursive: true });
    mkdirSync(join(workDir, "tmp"), { recursive: true });
    writeFileSync(join(workDir, "sub", "note.txt"), "sub\n");
  } else if (fixture === "compile") {
    for (const f of ["a.cpp", "b.cpp", "c.cpp", "sol.cpp"]) {
      writeFileSync(join(workDir, f), CPP_A);
    }
    writeFileSync(join(workDir, "in1"), "21\n");
  } else if (fixture === "run") {
    cpBin("a", "a");
    cpBin("b_diff", "b");
    cpBin("a", "sol");
    writeFileSync(join(workDir, "in1"), "5\n");
    writeFileSync(join(workDir, "in2"), "6\n");
    writeFileSync(join(workDir, "in.txt"), "5\n");
  } else if (fixture === "compare") {
    cpBin("sol", "sol");
    cpBin("brute", "brute");
    cpBin("sol", "a");
    cpBin("brute", "b");
    writeFileSync(join(workDir, "in1"), "5\n");
    writeFileSync(join(workDir, "in2"), "6\n");
    writeFileSync(join(workDir, "in.txt"), "5\n");
    writeFileSync(join(workDir, "out1"), "25 \n");
    writeFileSync(join(workDir, "ans1"), "25\n");
    writeFileSync(join(workDir, "out2"), "36 \n");
    writeFileSync(join(workDir, "ans2"), "36\n");
    writeFileSync(join(workDir, "out_inner"), "1  2\n");
    writeFileSync(join(workDir, "ans_inner"), "1 2\n");
  } else if (fixture === "stress") {
    cpBin("gen", "gen");
    cpBin("sol", "sol");
    cpBin("brute", "brute");
  } else if (fixture === "scripts") {
    // T54: run.sh gets one OK (in1) and one WA (in2); stress.sh finds sol != brute at test 7.
    writeFileSync(join(workDir, "a.cpp"), CPP_A);
    cpBin("a", "a");
    cpBin("sol", "sol");
    cpBin("brute", "brute");
    cpBin("gen", "gen");
    writeFileSync(join(workDir, "in1"), "5\n");
    writeFileSync(join(workDir, "in2"), "6\n");
    writeFileSync(join(workDir, "out1"), "10 opt\n");
    writeFileSync(join(workDir, "out2"), "13 opt\n");
    writeFileSync(join(workDir, "ans1"), "10\n");
  } else if (fixture === "spaces") {
    writeFileSync(join(workDir, "meu arquivo"), "conteúdo\n");
    writeFileSync(join(workDir, "meu"), "só meu\n");
    writeFileSync(join(workDir, "in1"), "5\n");
  } else if (fixture === "limits") {
    writeFileSync(join(workDir, "in1"), "5\n");
  } else if (fixture === "text") {
    const lines = Array.from({ length: 15 }, (_, i) => `line ${i + 1}`).join("\n") + "\n";
    writeFileSync(join(workDir, "out1"), lines);
    writeFileSync(join(workDir, "nums.txt"), "10\n2\n1\n20\n3\n");
    writeFileSync(join(workDir, "words.txt"), "wa\nac\nwa\ntle\nac\nwa\n");
    writeFileSync(
      join(workDir, "log.txt"),
      "ok 1\nERR seed 4\nok 2\nWA case 7\nERR seed 9\nok 3\n",
    );
    writeFileSync(join(workDir, "data.txt"), `${lines}ERR case 1\nWA case 2\nseed 7\n`);
  } else if (fixture === "setup") {
    writeFileSync(join(workDir, "a.cpp"), CPP_A);
    writeFileSync(join(workDir, "in1"), "21\n");
  } else if (fixture === "shortcuts") {
    writeFileSync(join(workDir, "in1"), "42\n");
  }
}

function maskOutput(text, workDir, workHome) {
  let s = text.replace(/\r\n/g, "\n");
  if (workDir) s = s.split(workDir).join("/home/contest");
  if (workHome) s = s.split(workHome).join("/home/contest");
  // Mask `time` durations so timings are deterministic.
  s = s.replace(/\b(\d+)m\d+\.\d+s\b/g, "$1m0.00Xs");
  // Mask user/group/timestamp columns in `ls -l` output.
  s = s.replace(
    /^([dl-][rwx-]{9}[.+]?)\s+(\d+)\s+\S+\s+\S+\s+(\S+)\s+[A-Z][a-z]{2}\s+\d+\s+[\d:]+\s+/gm,
    "$1 $2 contest contest $3 Nov 25 00:00 ",
  );
  // Mask total block line of `ls -l` (filesystem-dependent).
  s = s.replace(/^total \d+K?$/gm, "total N");
  return s;
}

function snapshotFiles(dir) {
  const entries = [];
  const walk = (cur) => {
    for (const name of readdirSync(cur).sort()) {
      if (name === ".gen_seed") continue;
      const full = join(cur, name);
      const st = statSync(full);
      const rel = relative(dir, full);
      if (st.isDirectory()) {
        entries.push([rel, "<dir>"]);
        walk(full);
      } else {
        const buf = readFileSync(full);
        const isElf =
          buf.length >= 4 &&
          buf[0] === 0x7f &&
          buf[1] === 0x45 &&
          buf[2] === 0x4c &&
          buf[3] === 0x46;
        entries.push([rel, isElf ? "<elf>" : buf.toString("utf8")]);
      }
    }
  };
  walk(dir);
  return JSON.stringify(entries);
}

async function runInBash(root, binDir, fixture, cmd, probe) {
  const caseDir = mkdtempSync(join(root, "case-"));
  const workDir = join(caseDir, "work");
  const workHome = join(caseDir, "home");
  setupFixture(workDir, workHome, binDir, fixture);

  const MARK = "===POPIS_PROBE===";
  const prefix = fixture === "files-prev" ? "cd sub\n" : "";
  // Ensure `grep`/`sed` resolve reliably to standard GNU binaries on PATH.
  const script =
    probe !== undefined
      ? `${prefix}${cmd}\n__ec=$?\nprintf "${MARK}\\n"\n${probe}\n__pec=$?\nprintf "${MARK}%d:%d\\n" "$__ec" "$__pec"\n`
      : `${prefix}${cmd}\n`;

  const env = {
    ...process.env,
    HOME: workHome,
    LC_ALL: "C",
    LANG: "C",
  };

  try {
    let stdout = "";
    let stderr = "";
    let exitCode = 0;
    try {
      const res = await execFileAsync("bash", ["--noprofile", "--norc", "-c", script], {
        cwd: workDir,
        env,
        timeout: 20_000,
      });
      stdout = res.stdout;
      stderr = res.stderr;
    } catch (err) {
      stdout = String(err.stdout ?? "");
      stderr = String(err.stderr ?? "");
      exitCode = typeof err.code === "number" ? err.code : 1;
    }

    let mainOut = stdout;
    let probeOut = "";
    let probeCode = 0;
    if (probe !== undefined) {
      const parts = stdout.split(`${MARK}\n`);
      mainOut = parts[0] ?? "";
      const rest = parts[1] ?? "";
      const tailParts = rest.split(MARK);
      probeOut = tailParts[0] ?? "";
      const codes = (tailParts[1] ?? "").trim().split(":");
      exitCode = Number(codes[0] ?? exitCode);
      probeCode = Number(codes[1] ?? 0);
    }

    return {
      code: exitCode,
      stdout: maskOutput(mainOut, workDir, workHome),
      stderr: maskOutput(stderr, workDir, workHome),
      probeOut: maskOutput(probeOut, workDir, workHome),
      probeCode,
      files: snapshotFiles(workDir),
    };
  } finally {
    rmSync(caseDir, { recursive: true, force: true });
  }
}

function sameEffect(a, b) {
  return (
    a.code === b.code &&
    a.stdout === b.stdout &&
    a.stderr === b.stderr &&
    a.probeOut === b.probeOut &&
    a.probeCode === b.probeCode &&
    a.files === b.files
  );
}

/** 1. Check canonical vs equivalent forms for a fixed sample of seeds of all 8 drill kinds. */
async function checkDrillEquivalences(root, binDir, drillMod) {
  const { SHELL_DRILL_KINDS, generateShellItem } = drillMod;
  const SEEDS = [1, 7, 19, 42, 73];
  const failures = [];
  let checked = 0;

  for (const kind of SHELL_DRILL_KINDS) {
    for (const seed of SEEDS) {
      const item = generateShellItem(seed, 0, [kind]);
      const base = await runInBash(
        root,
        binDir,
        item.oracleFixture,
        item.canonical,
        item.oracleProbe,
      );
      for (const alt of item.alternatives) {
        checked += 1;
        const got = await runInBash(root, binDir, item.oracleFixture, alt, item.oracleProbe);
        if (!sameEffect(base, got)) {
          failures.push(
            `${kind} seed=${seed} "${item.canonical}" vs "${alt}":\n` +
              `  canon: code=${base.code} probe=${base.probeCode} out=${JSON.stringify(base.stdout)} probeOut=${JSON.stringify(base.probeOut)} err=${JSON.stringify(base.stderr)}\n` +
              `  alt:   code=${got.code} probe=${got.probeCode} out=${JSON.stringify(got.stdout)} probeOut=${JSON.stringify(got.probeOut)} err=${JSON.stringify(got.stderr)}`,
          );
        }
      }
    }
  }

  return { checked, failures };
}

/** 2b. Every script equivalence (T54 AC-2) has the SAME observable effect in bash. */
async function checkScriptEquivalences(root, binDir, nearMissMod) {
  const { SCRIPT_EQUIVALENT_CASES } = nearMissMod;
  const failures = [];
  for (const c of SCRIPT_EQUIVALENT_CASES) {
    const base = await runInBash(root, binDir, c.fixture, c.canonical, c.probe);
    const alt = await runInBash(root, binDir, c.fixture, c.equivalent, c.probe);
    if (!sameEffect(base, alt)) {
      failures.push(
        `script equivalence ${c.id}: "${c.equivalent}" differs from "${c.canonical}"\n` +
          `  canon: code=${base.code} out=${JSON.stringify(base.stdout)} err=${JSON.stringify(base.stderr)}\n` +
          `  alt:   code=${alt.code} out=${JSON.stringify(alt.stdout)} err=${JSON.stringify(alt.stderr)}`,
      );
    }
  }
  return { checked: SCRIPT_EQUIVALENT_CASES.length, failures };
}

/** 2. Verify every near-miss (T39 and T54 script tables) has a DIFFERENT observable effect. */
async function checkNearMisses(root, binDir, nearMissMod) {
  const cases = [...nearMissMod.NEAR_MISS_CASES, ...nearMissMod.SCRIPT_NEAR_MISS_CASES];
  const failures = [];
  for (const c of cases) {
    const base = await runInBash(root, binDir, c.fixture, c.canonical, c.probe);
    const miss = await runInBash(root, binDir, c.fixture, c.nearMiss, c.probe);
    if (sameEffect(base, miss)) {
      failures.push(
        `near-miss ${c.id} ("${c.nearMiss}") produced the SAME effect as "${c.canonical}"`,
      );
    }
  }
  return { checked: cases.length, failures };
}

/**
 * Writes the lesson's annotated scripts (T54 AC-3) into the work folder and checks each
 * with `bash -n`; returns the syntax failures.
 */
async function writeLessonScripts(workDir, lesson) {
  const failures = [];
  for (const script of lesson.example.scripts ?? []) {
    const path = join(workDir, script.file);
    writeFileSync(path, script.lines.map((l) => l.code).join("\n") + "\n");
    try {
      await execFileAsync("bash", ["-n", path], { timeout: 10_000 });
    } catch (err) {
      failures.push(`bash -n ${lesson.id}/${script.file}: ${String(err.stderr ?? err)}`);
    }
  }
  return failures;
}

/** 3. Record or verify live bash transcripts for every Aprender lesson (units 1-11). */
async function recordLessonTranscript(root, binDir, lesson, syntaxFailures) {
  const caseDir = mkdtempSync(join(root, "lesson-"));
  const workDir = join(caseDir, "work");
  const workHome = join(caseDir, "home");
  setupFixture(workDir, workHome, binDir, lesson.example.fixture);
  syntaxFailures.push(...(await writeLessonScripts(workDir, lesson)));

  const MARK_STEP = "===POPIS_STEP===";
  const MARK_META = "===POPIS_META===";

  const listFilesCmd = `ls -1A | tr '\\n' '|'`;
  const lines = [];
  if (lesson.example.fixture === "shortcuts") {
    lines.push("set -o history");
    lines.push("set -H");
  }
  for (const s of lesson.example.setup ?? []) lines.push(s);
  lines.push(`printf "${MARK_META}%s\\t%s\\n" "$(pwd)" "$(${listFilesCmd})"`);
  for (const step of lesson.example.steps) {
    lines.push(`printf "${MARK_STEP}\\n"`);
    lines.push(`{ ${step.cmd}; } 2>&1`);
    lines.push(`printf "${MARK_META}%s\\t%s\\n" "$(pwd)" "$(${listFilesCmd})"`);
  }

  const script = lines.join("\n") + "\n";
  const env = { ...process.env, HOME: workHome, LC_ALL: "C", LANG: "C" };

  try {
    if (lesson.example.fixture === "shortcuts") {
      // Progressive isolated runs with `set -o history; set -H` so `!!` and `!$`
      // expand the real previous user command with no marker commands in between.
      const initFiles = readdirSync(workDir).sort();
      const frames = [
        {
          cmd: null,
          cwd: "~/contest",
          files: initFiles,
          output: [],
        },
      ];
      let prevLines = [];
      for (let i = 0; i < lesson.example.steps.length; i++) {
        const shPath = join(caseDir, `step-${String(i)}.sh`);
        const cmds = lesson.example.steps.slice(0, i + 1).map((s) => s.cmd);
        writeFileSync(shPath, ["set -o history", "set -H", "exec 2>&1", ...cmds].join("\n") + "\n");
        let combined = "";
        try {
          const res = await execFileAsync("bash", ["--noprofile", "--norc", shPath], {
            cwd: workDir,
            env,
            timeout: 20_000,
          });
          combined = res.stdout;
        } catch (err) {
          combined = String(err.stdout ?? "") + "\n" + String(err.stderr ?? "");
        }
        const allLines = maskOutput(combined, workDir, workHome)
          .split("\n")
          .map((l) => l.trimEnd())
          .filter((l) => l.length > 0);
        const stepOut = allLines.slice(prevLines.length).slice(0, 12);
        prevLines = allLines;
        frames.push({
          cmd: lesson.example.steps[i].cmd,
          cwd: "~/contest",
          files: readdirSync(workDir).sort(),
          output: stepOut,
        });
      }
      return { fixture: lesson.example.fixture, frames };
    }

    let rawOut = "";
    try {
      const res = await execFileAsync("bash", ["--noprofile", "--norc", "-c", script], {
        cwd: workDir,
        env,
        timeout: 20_000,
      });
      rawOut = res.stdout;
    } catch (err) {
      rawOut = String(err.stdout ?? "");
    }

    const masked = maskOutput(rawOut, workDir, workHome);
    const chunks = masked.split(`${MARK_STEP}\n`);
    const parseChunk = (chunk) => {
      const idx = chunk.lastIndexOf(MARK_META);
      const body = idx >= 0 ? chunk.slice(0, idx) : chunk;
      const meta = idx >= 0 ? chunk.slice(idx + MARK_META.length).trim() : "";
      const [cwdRaw = "/home/contest", filesRaw = ""] = meta.split("\t");
      const cwd = cwdRaw.replace(/^\/home\/contest/, "~/contest");
      const files = filesRaw
        .split("|")
        .map((f) => f.trim())
        .filter((f) => f.length > 0 && f !== ".gen_seed");
      const output = body
        .split("\n")
        .map((l) => l.trimEnd())
        .filter((l) => l.length > 0)
        .slice(0, 12);
      return { cwd, files, output };
    };

    const init = parseChunk(chunks[0] ?? "");
    const frames = [
      {
        cmd: null,
        cwd: init.cwd,
        files: init.files,
        output: [],
      },
    ];
    for (let i = 0; i < lesson.example.steps.length; i++) {
      const step = lesson.example.steps[i];
      const parsed = parseChunk(chunks[i + 1] ?? "");
      frames.push({
        cmd: step.cmd,
        cwd: parsed.cwd,
        files: parsed.files,
        output: parsed.output,
      });
    }

    return { fixture: lesson.example.fixture, frames };
  } finally {
    rmSync(caseDir, { recursive: true, force: true });
  }
}

function renderTranscriptsTs(map) {
  const header = `export type ShellTranscriptFrame = {
  readonly cmd: string | null;
  readonly cwd: string;
  readonly files: readonly string[];
  readonly output: readonly string[];
};

export type ShellLessonTranscript = {
  readonly fixture: string;
  readonly frames: readonly ShellTranscriptFrame[];
};

// Recorded from real GNU bash 5.3 and g++ 16.2 by \`npm run shell:oracle -- --write\` (ADR-T39-1).
export const SHELL_TRANSCRIPTS: Readonly<Record<string, ShellLessonTranscript>> = `;
  return `${header}${JSON.stringify(map, null, 2)};\n`;
}

async function main() {
  const writeMode = process.argv.includes("--write");
  const root = mkdtempSync(join(tmpdir(), "popis-shell-"));
  const binDir = join(root, "bin");

  try {
    await compileFixtures(binDir);

    const [
      { module: drillMod },
      { module: nearMissMod },
      { module: curriculumMod },
      { module: transcriptsMod },
    ] = await Promise.all([
      runnerImport("/src/shell/drill.ts"),
      runnerImport("/src/shell/cases/near-misses.ts"),
      runnerImport("/src/shell/curriculum.ts"),
      runnerImport("/src/shell/cases/transcripts.ts"),
    ]);

    const eqRes = await checkDrillEquivalences(root, binDir, drillMod);
    const nmRes = await checkNearMisses(root, binDir, nearMissMod);
    const seRes = await checkScriptEquivalences(root, binDir, nearMissMod);

    const recorded = {};
    const transcriptFailures = [];
    const syntaxFailures = [];
    for (const lesson of curriculumMod.SHELL_LESSONS) {
      const got = await recordLessonTranscript(root, binDir, lesson, syntaxFailures);
      recorded[lesson.id] = got;
      if (!writeMode) {
        const expected = transcriptsMod.SHELL_TRANSCRIPTS[lesson.id];
        if (JSON.stringify(got) !== JSON.stringify(expected)) {
          transcriptFailures.push(`transcript mismatch for ${lesson.id}`);
        }
      }
    }

    if (writeMode) {
      writeFileSync(TRANSCRIPTS_FILE, renderTranscriptsTs(recorded));
      console.log(
        `Wrote ${Object.keys(recorded).length} lesson transcripts to src/shell/cases/transcripts.ts`,
      );
    }

    console.log(
      `shell:oracle summary: equivalences=${eqRes.checked} (failures=${eqRes.failures.length}), ` +
        `near-misses=${nmRes.checked} (failures=${nmRes.failures.length}), ` +
        `script-equivalences=${seRes.checked} (failures=${seRes.failures.length}), ` +
        `scripts bash -n failures=${syntaxFailures.length}, ` +
        `transcripts=${Object.keys(recorded).length} (failures=${transcriptFailures.length})`,
    );

    const allFailures = [
      ...eqRes.failures,
      ...nmRes.failures,
      ...seRes.failures,
      ...syntaxFailures,
      ...transcriptFailures,
    ];
    if (allFailures.length > 0) {
      for (const f of allFailures) console.error("FAIL:", f);
      process.exitCode = 1;
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

await main();
