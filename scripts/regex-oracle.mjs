// Verifies T45 against real Python 3 (`re`), GNU `/usr/bin/grep -E` and GNU `/usr/bin/sed -E`
// (ADR-T45-1):
//   1. Python `re` parity: every Python Aprender example step & exercise + 80 generated drill items
//      (seeds 1..20 x 4 kinds), checking match boolean, [start, end] span, group(1) and re.sub.
//   2. GNU `/usr/bin/grep -E` parity: POSIX class translations, every ERE Aprender example &
//      casar/ler exercise, and 30 generated ERE drill items (seeds 1..15 x casar/ler).
//   3. GNU `/usr/bin/sed -E` parity: every ERE Aprender replacement example & trocar exercise,
//      and 15 generated ERE trocar drill items (seeds 1..15).
//
//   npm run regex:oracle
//
// Needs `python3`, `/usr/bin/grep` and `/usr/bin/sed`, so it stays out of `npm run check`.
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { runnerImport } from "vite";

const execFileAsync = promisify(execFile);
const GREP_BIN = "/usr/bin/grep";
const SED_BIN = "/usr/bin/sed";
const C_ENV = { ...process.env, LC_ALL: "C" };

const PY_RUNNER = `
import json, re, sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    tasks = json.load(f)

out = []
for t in tasks:
    op = t["op"]
    pat = t["pattern"]
    line = t["line"]
    if op == "search":
        m = re.search(pat, line)
        out.append(None if m is None else {
            "start": m.start(),
            "end": m.end(),
            "groups": list(m.groups()),
        })
    elif op == "fullmatch":
        m = re.fullmatch(pat, line)
        out.append(None if m is None else {
            "start": m.start(),
            "end": m.end(),
            "groups": list(m.groups()),
        })
    elif op == "sub":
        out.append(re.sub(pat, t["replacement"], line))
    else:
        raise ValueError(f"unknown op: {op}")

print(json.dumps(out))
`;

function pickDelimiter(pattern, replacement) {
  for (const d of ["|", "#", "~", "@", "%", "!"]) {
    if (!pattern.includes(d) && !replacement.includes(d)) return d;
  }
  throw new Error(`no clean sed delimiter for ${pattern} -> ${replacement}`);
}

async function runGrep(dir, pattern, mode, lines) {
  const inputPath = join(dir, "grep-in.txt");
  writeFileSync(inputPath, lines.map((l) => `${l}\n`).join(""), "utf8");
  const args = [mode === "fullmatch" ? "-Exn" : "-En", "-e", pattern, inputPath];
  try {
    const { stdout } = await execFileAsync(GREP_BIN, args, {
      cwd: dir,
      env: C_ENV,
      timeout: 15_000,
    });
    const matched = new Set();
    for (const row of stdout.split("\n")) {
      if (row.length === 0) continue;
      const colon = row.indexOf(":");
      matched.add(Number(row.slice(0, colon)) - 1);
    }
    return lines.map((_, i) => matched.has(i));
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === 1) {
      return lines.map(() => false);
    }
    throw err;
  }
}

async function runSed(dir, pattern, replacement, lines) {
  const inputPath = join(dir, "sed-in.txt");
  writeFileSync(inputPath, lines.map((l) => `${l}\n`).join(""), "utf8");
  const d = pickDelimiter(pattern, replacement);
  const expr = `s${d}${pattern}${d}${replacement}${d}g`;
  const { stdout } = await execFileAsync(SED_BIN, ["-E", "-e", expr, inputPath], {
    cwd: dir,
    env: C_ENV,
    timeout: 15_000,
  });
  const outLines = stdout.split("\n");
  // Drop trailing empty split element after final newline.
  if (outLines[outLines.length - 1] === "") outLines.pop();
  return outLines;
}

function collectPythonTasks(compileMod, curriculumMod, drillMod) {
  const { applyReplace, compile } = compileMod;
  const { REGEX_LESSONS } = curriculumMod;
  const { generateRegexItem } = drillMod;

  const tasks = [];
  const expected = [];

  const pushMatch = (label, pattern, mode, line) => {
    const res = compile(pattern, "python", mode);
    if (!res.ok) throw new Error(`JS compile failed (${label}): ${res.error}`);
    const span = res.matcher.exec(line);
    tasks.push({ op: mode, pattern, line });
    expected.push({
      label,
      value:
        span === null
          ? null
          : {
              start: span.start,
              end: span.end,
              groups: span.groups.map((g) => (g === undefined ? null : g)),
            },
    });
  };

  const pushSub = (label, pattern, replacement, line) => {
    const res = compile(pattern, "python", "search");
    if (!res.ok) throw new Error(`JS compile failed (${label}): ${res.error}`);
    const replaced = applyReplace(res.matcher, line, replacement);
    if (!replaced.ok) throw new Error(`JS replace failed (${label}): ${replaced.error}`);
    tasks.push({ op: "sub", pattern, replacement, line });
    expected.push({ label, value: replaced.output });
  };

  const pushItem = (prefix, item) => {
    if (item.kind === "casar") {
      for (const line of [...item.positive, ...item.negative]) {
        pushMatch(`${prefix}:${item.id}`, item.canonical, item.mode, line);
      }
    } else if (item.kind === "extrair") {
      for (const c of item.cases) {
        pushMatch(`${prefix}:${item.id}`, item.canonical, item.mode, c.line);
      }
    } else if (item.kind === "trocar") {
      for (const c of item.cases) {
        pushSub(`${prefix}:${item.id}`, item.canonical, item.canonicalReplacement, c.before);
      }
    } else {
      for (const line of item.lines) {
        pushMatch(`${prefix}:${item.id}`, item.pattern, item.mode, line);
      }
    }
  };

  for (const lesson of REGEX_LESSONS) {
    if (lesson.example.dialect === "python") {
      for (const [si, step] of lesson.example.steps.entries()) {
        for (const line of lesson.example.lines) {
          pushMatch(`example:${lesson.id}#${si}`, step.pattern, lesson.example.mode, line);
          if (step.replacement !== undefined) {
            pushSub(`example-sub:${lesson.id}#${si}`, step.pattern, step.replacement, line);
          }
        }
      }
    }
    for (const ex of lesson.exercises) {
      if (ex.dialect === "python") pushItem(`lesson:${lesson.id}`, ex);
    }
  }

  for (let seed = 1; seed <= 20; seed++) {
    for (const kind of ["casar", "extrair", "trocar", "ler"]) {
      const item = generateRegexItem(seed, seed % 5, "python", [kind]);
      pushItem(`drill:s${seed}`, item);
    }
  }

  return { tasks, expected };
}

async function checkPython(dir, compileMod, curriculumMod, drillMod) {
  const { tasks, expected } = collectPythonTasks(compileMod, curriculumMod, drillMod);
  const casesPath = join(dir, "py-cases.json");
  writeFileSync(casesPath, JSON.stringify(tasks), "utf8");
  const { stdout } = await execFileAsync("python3", ["-c", PY_RUNNER, casesPath], {
    cwd: dir,
    env: C_ENV,
    timeout: 30_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const actual = JSON.parse(stdout);
  const failures = [];
  for (let i = 0; i < expected.length; i++) {
    if (JSON.stringify(actual[i]) !== JSON.stringify(expected[i].value)) {
      failures.push(
        `[python] ${expected[i].label} (${tasks[i].op} ${JSON.stringify(tasks[i].pattern)} on ${JSON.stringify(tasks[i].line)}): engine=${JSON.stringify(expected[i].value)} python=${JSON.stringify(actual[i])}`,
      );
    }
  }
  return { total: expected.length, failures };
}

async function checkGrep(dir, compileMod, curriculumMod, drillMod) {
  const { compile } = compileMod;
  const { REGEX_LESSONS } = curriculumMod;
  const { generateRegexItem } = drillMod;

  const probes = [];

  // POSIX character class parity probes.
  const asciiSample = [
    "abcXYZ",
    "0123456789",
    "deadBEEF09",
    "var_42",
    "   ",
    "\t",
    "a b",
    "Case #3: 17",
    "",
  ];
  for (const cls of [
    "^[[:digit:]]+$",
    "^[[:alpha:]]+$",
    "^[[:alnum:]]+$",
    "^[[:lower:]]+$",
    "^[[:upper:]]+$",
    "^[[:xdigit:]]+$",
    "^[[:space:]]+$",
    "^[[:blank:]]+$",
  ]) {
    probes.push({ label: `posix:${cls}`, pattern: cls, mode: "search", lines: asciiSample });
  }

  for (const lesson of REGEX_LESSONS) {
    if (lesson.example.dialect === "ere") {
      for (const [si, step] of lesson.example.steps.entries()) {
        probes.push({
          label: `example:${lesson.id}#${si}`,
          pattern: step.pattern,
          mode: lesson.example.mode,
          lines: lesson.example.lines,
        });
      }
    }
    for (const ex of lesson.exercises) {
      if (ex.dialect !== "ere") continue;
      if (ex.kind === "casar") {
        probes.push({
          label: `lesson:${lesson.id}/${ex.id}`,
          pattern: ex.canonical,
          mode: ex.mode,
          lines: [...ex.positive, ...ex.negative],
        });
      } else if (ex.kind === "ler") {
        probes.push({
          label: `lesson:${lesson.id}/${ex.id}`,
          pattern: ex.pattern,
          mode: ex.mode,
          lines: ex.lines,
        });
      }
    }
  }

  for (let seed = 1; seed <= 15; seed++) {
    for (const kind of ["casar", "ler"]) {
      const item = generateRegexItem(seed, seed % 5, "ere", [kind]);
      if (item.kind === "casar") {
        probes.push({
          label: `drill:s${seed}:${item.family}`,
          pattern: item.canonical,
          mode: item.mode,
          lines: [...item.positive, ...item.negative],
        });
      } else if (item.kind === "ler") {
        probes.push({
          label: `drill:s${seed}:${item.family}`,
          pattern: item.pattern,
          mode: item.mode,
          lines: item.lines,
        });
      }
    }
  }

  let totalLines = 0;
  const failures = [];
  for (const p of probes) {
    const compiled = compile(p.pattern, "ere", p.mode);
    if (!compiled.ok) {
      failures.push(`[grep] compile failed ${p.label}: ${compiled.error}`);
      continue;
    }
    const expected = p.lines.map((l) => compiled.matcher.test(l));
    const actual = await runGrep(dir, p.pattern, p.mode, p.lines);
    totalLines += p.lines.length;
    for (let i = 0; i < p.lines.length; i++) {
      if (expected[i] !== actual[i]) {
        failures.push(
          `[grep] ${p.label} (${p.mode} ${JSON.stringify(p.pattern)} on ${JSON.stringify(p.lines[i])}): engine=${expected[i]} grep=${actual[i]}`,
        );
      }
    }
  }
  return { probes: probes.length, totalLines, failures };
}

async function checkSed(dir, compileMod, curriculumMod, drillMod) {
  const { applyReplace, compile } = compileMod;
  const { REGEX_LESSONS } = curriculumMod;
  const { generateRegexItem } = drillMod;

  const probes = [];

  for (const lesson of REGEX_LESSONS) {
    if (lesson.example.dialect === "ere") {
      for (const [si, step] of lesson.example.steps.entries()) {
        if (step.replacement !== undefined) {
          probes.push({
            label: `example:${lesson.id}#${si}`,
            pattern: step.pattern,
            replacement: step.replacement,
            lines: lesson.example.lines,
          });
        }
      }
    }
    for (const ex of lesson.exercises) {
      if (ex.dialect === "ere" && ex.kind === "trocar") {
        probes.push({
          label: `lesson:${lesson.id}/${ex.id}`,
          pattern: ex.canonical,
          replacement: ex.canonicalReplacement,
          lines: ex.cases.map((c) => c.before),
        });
      }
    }
  }

  for (let seed = 1; seed <= 15; seed++) {
    const item = generateRegexItem(seed, seed % 5, "ere", ["trocar"]);
    if (item.kind === "trocar") {
      probes.push({
        label: `drill:s${seed}:${item.family}`,
        pattern: item.canonical,
        replacement: item.canonicalReplacement,
        lines: item.cases.map((c) => c.before),
      });
    }
  }

  let totalLines = 0;
  const failures = [];
  for (const p of probes) {
    const compiled = compile(p.pattern, "ere", "search");
    if (!compiled.ok) {
      failures.push(`[sed] compile failed ${p.label}: ${compiled.error}`);
      continue;
    }
    const expected = p.lines.map((l) => {
      const r = applyReplace(compiled.matcher, l, p.replacement);
      if (!r.ok) throw new Error(`JS replace failed (${p.label}): ${r.error}`);
      return r.output;
    });
    const actual = await runSed(dir, p.pattern, p.replacement, p.lines);
    totalLines += p.lines.length;
    for (let i = 0; i < p.lines.length; i++) {
      if (expected[i] !== actual[i]) {
        failures.push(
          `[sed] ${p.label} (s/${p.pattern}/${p.replacement}/g on ${JSON.stringify(p.lines[i])}): engine=${JSON.stringify(expected[i])} sed=${JSON.stringify(actual[i])}`,
        );
      }
    }
  }
  return { probes: probes.length, totalLines, failures };
}

async function main() {
  const { module: compileMod } = await runnerImport("/src/regex/compile.ts");
  const { module: curriculumMod } = await runnerImport("/src/regex/curriculum.ts");
  const { module: drillMod } = await runnerImport("/src/regex/drill.ts");

  const dir = mkdtempSync(join(tmpdir(), "popis-"));
  try {
    const py = await checkPython(dir, compileMod, curriculumMod, drillMod);
    const grep = await checkGrep(dir, compileMod, curriculumMod, drillMod);
    const sed = await checkSed(dir, compileMod, curriculumMod, drillMod);

    const allFailures = [...py.failures, ...grep.failures, ...sed.failures];
    console.log(
      `regex:oracle summary: python3=${py.total} checks (${py.failures.length} fail), ` +
        `grep -E=${grep.probes} patterns/${grep.totalLines} lines (${grep.failures.length} fail), ` +
        `sed -E=${sed.probes} patterns/${sed.totalLines} lines (${sed.failures.length} fail)`,
    );
    if (allFailures.length > 0) {
      for (const f of allFailures.slice(0, 20)) console.error(f);
      process.exitCode = 1;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

await main();
