---
name: implement-task
description: Implement one task from docs/tasks (e.g. "T06") in the popis repo following the SDD+TDD workflow of AGENTS.md — task branch, spec → failing tests → models → behaviour → quality → docs, one atomic commit per step, all quality gates green. Use whenever asked to implement, continue or finish a task by id.
argument-hint: <task-id, e.g. T06>
---

# implement-task

Implements task `$ARGUMENTS` end to end. The source of truth for the process
is `AGENTS.md` and the Obsidian vault in `docs/`. Read before starting:

- `AGENTS.md` — workflow, tests, regression tests, gates, commits, decisions
- `docs/tasks/$ARGUMENTS *.md` — the task note (spec, files owned, subtasks)
- `docs/decisions/` — ADRs the task builds on (listed in its `adrs`)
- `src/modes.ts` — how a new mode is registered (most tasks add one)

## Hard rules

1. **Authorship**: commits are by the configured git user only. Never add
   `Co-Authored-By`, "Generated with", or any mention of an AI/agent to a
   commit message, branch name, PR or doc. Never pass `--author` or trailers.
2. **Tests before code**: the `test` commit comes before any commit that adds
   the code under test, and the new tests fail for the right reason.
3. **Never weaken a test** (AGENTS.md): no changed expectations, loosened
   assertions, deleted cases, `.skip`/`.only`, fewer property runs. A test
   that is wrong is fixed in its own `test(...)` commit with the reason.
4. **Files owned**: touch only files listed in the task note plus its own
   docs (task note, new ADRs). Needing another file means the plan is wrong:
   add it to *Files owned* with the reason in the *Log*, or stop and report.
5. **Never rewrite an accepted ADR.** New decisions → new
   `docs/decisions/ADR-$ARGUMENTS-<n> <Title>.md` from `docs/templates/ADR.md`.
6. **Colours** only through tokens of `docs/architecture/Theme.md`.
7. **No new dependency** without an ADR.
8. Check exit codes directly: never pipe a gate into `head`/`grep` and trust
   the pipeline's status (`npx tsc --noEmit; echo $?`).

## Procedure

0. **Preflight** — every `depends_on` task has `status: done`; the working
   tree is clean; `npm run check` is green on `main`.
1. **Branch** — `git switch -c task/$ARGUMENTS-<slug> main` (skip if already
   on it or in a dedicated worktree).
2. **Spec** (`docs`) — each `AC-n` names its test(s); new ADRs; set
   `status: in-progress`; fill *Files owned* and *Subtasks*.
   Commit `docs($ARGUMENTS): specify <topic> acceptance criteria`.
3. **Tests** (`test`) — unit tests next to the code, `*.prop.test.ts` with
   fast-check for every generator (canonical answer accepted, the answer
   satisfies its definition, same seed → same problem), component tests in
   `src/ui/App.test.tsx`, e2e in `tests/e2e/` for flows only the real app
   shows. Run `npx vitest run` and confirm they fail for the right reason.
   Commit `test($ARGUMENTS): add failing tests for <topic>`.
   **Bug fixes** follow AGENTS.md → *Testes de regressão*:
   `tests/regressions/<ID>-<slug>.test.ts`, red before the fix, never deleted.
4. **Models** (`feat`) — types, signatures, registry entries; bodies throw
   `new Error("todo")`. `npx tsc --noEmit` passes.
   Commit `feat($ARGUMENTS): add <types>`.
5. **Behaviour** (`feat`) — implement until `npx vitest run` and
   `npm run test:e2e` are green.
   Commit `feat($ARGUMENTS): implement <behaviour>`.
6. **Quality** (`chore`/`refactor`) — `npm run check`, `npm run coverage`
   (raise a threshold in `vite.config.ts` when coverage rose, never lower
   one), `npm run test:fuzz`. Remove every `todo`.
   Commit `chore($ARGUMENTS): pass lint, format and coverage ratchet`
   (skip when nothing changed and say so in the *Log*).
7. **Docs** (`docs`) — tick the subtasks, fill the *Log* (deviations, why,
   gate results), set `status: review`.
   Commit `docs($ARGUMENTS): record <topic> log`.
8. **Report** — branch, `git log --oneline main..`, gate results, deviations
   from the spec or *Files owned*, new ADRs.

## Commit message template

```
<type>(<ID>): <imperative summary ≤ 72 chars>

<what and why, wrapped at 72>

Refs: docs/tasks/<ID> <Title>.md
```

Use `git commit -F -` with a heredoc.
