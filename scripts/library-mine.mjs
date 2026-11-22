// Mines the owner's competitive programming repository into src/typing/library/
// and writes the review report at docs/architecture/Biblioteca de trechos.md.
//
//   npm run library:mine -- /home/bender/comp
//
// Loads the pure TypeScript modules under src/typing/mine/ through Vite's
// runnerImport so extensionless imports work with zero extra dependencies.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { runnerImport } from "vite";

const SOURCE_EXTENSIONS = [".cpp", ".cc", ".h", ".hpp", ".py"];
const MAX_FILE_BYTES = 200 * 1024;
const REPO_ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_OUT_DIR = join(REPO_ROOT, "src", "typing", "library");
const DEFAULT_REPORT_PATH = join(REPO_ROOT, "docs", "architecture", "Biblioteca de trechos.md");

function isSourcePath(filePath) {
  const lower = filePath.toLowerCase();
  return SOURCE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function runGit(repoDir, args) {
  return execFileSync("git", ["-C", repoDir, "-c", "core.quotepath=false", ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function readCreationDates(repoDir) {
  const logOutput = runGit(repoDir, ["log", "--diff-filter=A", "--name-only", "--format=@@@%cI"]);
  const dates = new Map();
  let currentDate = "";
  for (const rawLine of logOutput.split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    if (line.startsWith("@@@")) {
      currentDate = line.slice(3);
    } else if (currentDate.length > 0) {
      // git log runs newest-to-oldest, so overwriting keeps the earliest addition date.
      dates.set(line, currentDate);
    }
  }
  return dates;
}

function loadRepoFiles(repoDir) {
  const commitSha = runGit(repoDir, ["rev-parse", "HEAD"]).trim();
  const createdDates = readCreationDates(repoDir);
  const tracked = runGit(repoDir, ["ls-files"])
    .split("\n")
    .filter((p) => p.length > 0);
  const files = [];

  for (const relPath of tracked) {
    if (!isSourcePath(relPath)) continue;
    const fullPath = join(repoDir, relPath);
    if (!existsSync(fullPath)) continue;
    const stat = statSync(fullPath);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) continue;
    const buf = readFileSync(fullPath);
    if (buf.includes(0)) continue;
    const createdAt = createdDates.get(relPath);
    if (!createdAt) continue;
    files.push({ path: relPath, content: buf.toString("utf8"), createdAt });
  }

  return { commitSha, files };
}

function writeOutputs(outDir, reportPath, result) {
  mkdirSync(outDir, { recursive: true });
  for (const existing of readdirSync(outDir)) {
    if (existing.endsWith(".cpp") || existing.endsWith(".py") || existing.endsWith(".json")) {
      rmSync(join(outDir, existing));
    }
  }
  for (const file of result.files) {
    writeFileSync(join(outDir, file.filename), file.content, "utf8");
  }
  writeFileSync(reportPath, result.report, "utf8");
}

async function main() {
  const repoArg = process.argv[2];
  if (!repoArg) {
    console.error("Usage: npm run library:mine -- <path-to-comp-repo>");
    process.exitCode = 1;
    return;
  }

  const repoDir = resolve(repoArg);
  const { commitSha, files } = loadRepoFiles(repoDir);
  const { module } = await runnerImport("/src/typing/mine/output.ts");
  const result = module.mineLibrary(files, { commitSha });
  writeOutputs(DEFAULT_OUT_DIR, DEFAULT_REPORT_PATH, result);

  const snippetCount = result.snippets.length;
  console.log(
    `mined comp@${commitSha.slice(0, 7)}: ${result.inventory.owned.length} owned, ` +
      `${result.inventory.thirdParty.length} third-party, ${result.inventory.duplicates.length} duplicates, ` +
      `${result.inventory.flagged.length} flagged -> ${snippetCount} snippets` +
      (result.template ? " + template.cpp" : "") +
      " + profile.json",
  );
}

await main();
