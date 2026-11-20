// Runs every case of src/vim/cases/ in `nvim --clean --headless` and fails when
// Neovim disagrees with the expected cursor (ADR-T13-1).
//
//   npm run vim:oracle                  check all cases
//   npm run vim:oracle -- --filter w:   only cases whose name contains "w:"
//   npm run vim:oracle -- --write       rewrite the case files with Neovim's cursor
//
// Needs `nvim` in the PATH, so it stays out of `npm run check`.
import { execFile } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const CASES_DIR = join(import.meta.dirname, "..", "src", "vim", "cases");
const NOT_CASES = new Set(["case.ts", "index.ts"]);
const CONCURRENCY = 8;

const LUA = `
local input = vim.json.decode(vim.fn.join(vim.fn.readfile(arg[1]), "\\n"))
vim.api.nvim_buf_set_lines(0, 0, -1, false, vim.split(input.text, "\\n", { plain = true }))
vim.api.nvim_win_set_cursor(0, { input.line + 1, input.col })
local keys = vim.api.nvim_replace_termcodes(input.keys, true, false, true)
vim.api.nvim_feedkeys(keys, "ntx", false)
local pos = vim.api.nvim_win_get_cursor(0)
local mode = vim.api.nvim_get_mode().mode
io.stdout:write(vim.json.encode({ row = pos[1], col = pos[2], mode = mode }))
`;

/** Neovim counts lines from 1; the cases count both from 0. The one place that converts. */
function toCursor(row, col) {
  return [row - 1, col];
}

function runCase(dir, id, [, text, from, keys]) {
  const input = join(dir, `${id}.json`);
  writeFileSync(input, JSON.stringify({ text, line: from[0], col: from[1], keys }));
  return new Promise((resolve, reject) => {
    execFile(
      "nvim",
      ["--clean", "--headless", "-l", join(dir, "oracle.lua"), input],
      { timeout: 20000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`nvim failed on case ${String(id)}: ${stderr || error.message}`));
          return;
        }
        const out = JSON.parse(stdout);
        resolve({ cursor: toCursor(out.row, out.col), mode: out.mode });
      },
    );
  });
}

function source(group, cases) {
  const rows = cases.map((c) => `  ${JSON.stringify(c)},\n`).join("");
  return (
    `import type { VimCase } from "./case";\n\n` +
    `export const ${group}: readonly VimCase[] = [\n${rows}];\n`
  );
}

async function loadFiles() {
  const files = readdirSync(CASES_DIR)
    .filter((f) => f.endsWith(".ts") && !NOT_CASES.has(f))
    .sort();
  const loaded = [];
  for (const file of files) {
    const module = await import(pathToFileURL(join(CASES_DIR, file)).href);
    // One group (export) per file, so --write can regenerate the file.
    const [[group, cases]] = Object.entries(module);
    loaded.push({ file, group, cases });
  }
  return loaded;
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const filterAt = args.indexOf("--filter");
  const filter = filterAt >= 0 ? (args[filterAt + 1] ?? "") : "";

  const dir = mkdtempSync(join(tmpdir(), "vim-oracle-"));
  writeFileSync(join(dir, "oracle.lua"), LUA);
  try {
    const files = await loadFiles();
    const jobs = files.flatMap(({ file, group, cases }) =>
      cases.map((c, i) => ({ file, group, index: i, c })),
    );
    const wanted = jobs.filter(({ c }) => c[0].includes(filter));
    const results = new Map();
    let next = 0;
    const worker = async () => {
      while (next < wanted.length) {
        const job = wanted[next++];
        results.set(job, await runCase(dir, next, job.c));
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const bad = [];
    for (const [job, result] of results) {
      const [name, , , keys, expect] = job.c;
      const same = result.cursor[0] === expect[0] && result.cursor[1] === expect[1];
      if (!same || result.mode !== "n") {
        bad.push(
          `${name}  keys ${keys}: expected [${expect}], nvim [${result.cursor}] in mode ${result.mode}`,
        );
      }
    }

    if (write) {
      for (const { file, group, cases } of files) {
        const fixed = cases.map((c) => {
          const job = jobs.find((j) => j.c === c);
          const result = results.get(job);
          return result ? [c[0], c[1], c[2], c[3], result.cursor] : c;
        });
        writeFileSync(join(CASES_DIR, file), source(group, fixed));
      }
      console.log(`wrote ${String(results.size)} cases; ${String(bad.length)} changed`);
      return;
    }

    for (const line of bad) console.error(line);
    console.log(`${String(wanted.length - bad.length)}/${String(wanted.length)} cases agree`);
    if (bad.length > 0) process.exitCode = 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

await main();
