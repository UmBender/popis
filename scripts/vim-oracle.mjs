// Runs every case of src/vim/cases/ in `nvim --clean --headless` and fails when
// Neovim disagrees with the expected cursor (ADR-T13-1).
//
//   npm run vim:oracle                  check all cases
//   npm run vim:oracle -- --filter w:   only cases whose name contains "w:"
//   npm run vim:oracle -- --write       rewrite the case files with Neovim's cursor
//
// Needs `nvim` in the PATH, so it stays out of `npm run check`.
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const CASES_DIR = join(import.meta.dirname, "..", "src", "vim", "cases");
const NOT_CASES = new Set(["case.ts", "index.ts"]);
const CONCURRENCY = 8;

// The Lua script writes its answer to a file: Neovim prints mode messages on
// the standard output, which would corrupt it. `autoindent` is off because
// the inserted text goes in as typed (ADR-T14-1).
const LUA = `
local input = vim.json.decode(vim.fn.join(vim.fn.readfile(arg[1]), "\\n"))
vim.o.autoindent = false
-- Loading the text is not a change the user can undo.
local undolevels = vim.bo.undolevels
vim.bo.undolevels = -1
vim.api.nvim_buf_set_lines(0, 0, -1, false, vim.split(input.text, "\\n", { plain = true }))
vim.bo.undolevels = undolevels
vim.api.nvim_win_set_cursor(0, { input.line + 1, input.col })
local keys = vim.api.nvim_replace_termcodes(input.keys, true, false, true)
vim.api.nvim_feedkeys(keys, "ntx", false)
local pos = vim.api.nvim_win_get_cursor(0)
local mode = vim.api.nvim_get_mode().mode
local lines = vim.api.nvim_buf_get_lines(0, 0, -1, false)
local out = vim.json.encode({
  row = pos[1],
  col = pos[2],
  mode = mode,
  text = table.concat(lines, "\\n"),
  reg = vim.fn.getreg('"'),
  regtype = vim.fn.getregtype('"'),
})
vim.fn.writefile({ out }, arg[2])
`;

/** Neovim counts lines from 1; the cases count both from 0. The one place that converts. */
function toCursor(row, col) {
  return [row - 1, col];
}

/** An edit case has an object as its expectation; a motion case, a cursor. */
const isEditCase = (c) => !Array.isArray(c[4]);

function runCase(dir, id, [, text, from, keys]) {
  const input = join(dir, `${id}.json`);
  const output = join(dir, `${id}.out.json`);
  writeFileSync(input, JSON.stringify({ text, line: from[0], col: from[1], keys }));
  return new Promise((resolve, reject) => {
    execFile(
      "nvim",
      ["--clean", "--headless", "-l", join(dir, "oracle.lua"), input, output],
      { timeout: 20000 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`nvim failed on case ${String(id)}: ${stderr || error.message}`));
          return;
        }
        const out = JSON.parse(readFileSync(output, "utf8"));
        resolve({
          cursor: toCursor(out.row, out.col),
          mode: out.mode,
          text: out.text,
          reg: out.reg,
          regtype: out.regtype,
        });
      },
    );
  });
}

function source(group, cases) {
  const rows = cases.map((c) => `  ${JSON.stringify(c)},\n`).join("");
  const edit = cases.length > 0 && isEditCase(cases[0]);
  const type = edit ? "EditCase" : "VimCase";
  return (
    `import type { ${type} } from "./case";\n\n` +
    `export const ${group}: readonly ${type}[] = [\n${rows}];\n`
  );
}

/** What Neovim did, in the shape of an edit case's expectation. */
const asExpectation = (result) => ({
  text: result.text,
  cursor: result.cursor,
  reg: result.reg,
  regtype: result.regtype,
});

function disagrees(c, result) {
  const expect = c[4];
  if (result.mode !== "n") return true;
  if (!isEditCase(c)) return result.cursor[0] !== expect[0] || result.cursor[1] !== expect[1];
  return JSON.stringify(asExpectation(result)) !== JSON.stringify(expect);
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
      if (disagrees(job.c, result)) {
        const want = JSON.stringify(expect);
        const got = isEditCase(job.c)
          ? JSON.stringify(asExpectation(result))
          : `[${result.cursor}]`;
        bad.push(`${name}  keys ${keys}: expected ${want}, nvim ${got} in mode ${result.mode}`);
      }
    }

    if (write) {
      for (const { file, group, cases } of files) {
        const fixed = cases.map((c) => {
          const job = jobs.find((j) => j.c === c);
          const result = results.get(job);
          if (!result) return c;
          return [c[0], c[1], c[2], c[3], isEditCase(c) ? asExpectation(result) : result.cursor];
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
