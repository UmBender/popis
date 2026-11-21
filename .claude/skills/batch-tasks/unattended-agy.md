
## Running under agy (Antigravity CLI)

- Every tool call passes a gate (`.agents/hooks.json` runs
  `.claude/skills/batch-tasks/agy-gate.py`) that applies the allow/deny
  list of `.batch/settings.json`. The rules are written in Claude Code
  syntax: `Bash(<glob>)` rules apply to `run_command`, one plain command
  per call (a pipe to `tail` or `grep` is fine); `WebFetch(domain:<d>)`
  rules apply to URL tools. A denied call comes back with the reason:
  follow it; never retry the same call or work around it.
- Where these rules name Claude Code tools (Read, Edit, Write, Grep,
  AskUserQuestion), use your equivalents (the view, edit and write file
  tools, the search tool). Asking the user is denied: nobody answers.
- Skills live in `.claude/skills/<name>/SKILL.md` (also reachable as
  `.agents/skills`). `AGENTS.md` is the project's rulebook: follow it
  exactly, including commits with no `Co-Authored-By` or agent trailer.
- Commit with `git commit -m "<message>"` (one `-m` per paragraph); the
  message ends with the `Refs:` line, nothing after it.
