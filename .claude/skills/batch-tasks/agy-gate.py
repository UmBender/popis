#!/usr/bin/env python3
"""PreToolUse gate for unattended `agy` sessions (skill batch-tasks).

agy has no allow/deny list on the command line, so the batch runner sets
BATCH_TASK_ID and this hook (wired in .agents/hooks.json) decides every
tool call with the same rules Claude Code would apply from
.batch/settings.json:

- run_command: the command must match an allow rule `Bash(<glob>)` as a
  whole, or every part of it (split on && || ; |) must; a deny rule
  matching the whole command or any part wins.
- tools that write (name contains write, edit, replace, create, delete,
  move or rename): every path argument must be inside the repository and
  outside the runner's own files.
- tools that reach the network (url, web, browser, fetch, search, http):
  every URL must be on a `WebFetch(domain:<d>)` rule; no URL means deny.
- tools that ask the user: denied, nobody answers.
- any other tool: allowed (reads, listings).

An allowed run_command is rewritten to run outside agy's terminal sandbox
(`BypassSandbox`): the sandbox mounts .git read-only, so `git add` and
`git commit` fail, and it breaks the test runners. The allow list above is
what keeps the session in bounds.

Every call is logged to .batch/logs/<ID>-tools.jsonl, and the
conversation id to .batch/logs/<ID>.conversation so the runner can
resume it. Outside a batch (BATCH_TASK_ID unset) the hook answers "ask",
which leaves interactive use as it was.
"""

import fnmatch
import json
import os
import re
import sys

WRITE = re.compile(r"write|edit|replace|create|delete|remove|move|rename", re.I)
NETWORK = re.compile(r"url|web|browser|fetch|search|http", re.I)
ASK = re.compile(r"ask_user|ask_question|request_user|user_input|notify_user", re.I)
URL = re.compile(r"https?://([^/\s:\"']+)", re.I)
RUNNER_FILES = (".batch/state", ".batch/queue", ".batch/settings.json", ".agents", ".git/")


def answer(decision, reason="", overwrite=None):
    out = {"decision": decision}
    if reason:
        out["reason"] = reason
    if overwrite:
        out["overwrite"] = overwrite
    print(json.dumps(out))
    sys.exit(0)


def rules(settings, kind):
    """Bash globs or WebFetch domains of an allow or deny list."""
    perms = settings.get("permissions", {})
    bash, domains = [[], []], [[], []]
    for i, key in enumerate(("allow", "deny")):
        for rule in perms.get(key, []):
            m = re.fullmatch(r"Bash\((.*)\)", rule, re.S)
            if m:
                bash[i].append(m.group(1))
            m = re.fullmatch(r"WebFetch\(domain:(.*)\)", rule)
            if m:
                domains[i].append(m.group(1).lower())
    return bash if kind == "bash" else domains


def split_command(command):
    """Parts of a compound command, split on && || ; | outside quotes."""
    parts, buf, quote, i = [], "", None, 0
    while i < len(command):
        c = command[i]
        if quote:
            buf += c
            if c == quote:
                quote = None
        elif c in "'\"":
            quote = c
            buf += c
        elif command.startswith(("&&", "||"), i):
            parts.append(buf)
            buf = ""
            i += 1
        elif c in ";|\n":
            parts.append(buf)
            buf = ""
        else:
            buf += c
        i += 1
    parts.append(buf)
    return [p.strip() for p in parts if p.strip()]


def matches(command, globs):
    return next((g for g in globs if fnmatch.fnmatchcase(command, g)), None)


def gate_command(command, settings):
    allow, deny = rules(settings, "bash")
    parts = split_command(command)
    for piece in [command.strip()] + parts:
        hit = matches(piece, deny)
        if hit:
            return f"`{piece}` matches the deny rule Bash({hit}) of this batch"
    if matches(command.strip(), allow):
        return None
    for piece in parts:
        if not matches(piece, allow):
            return (
                f"`{piece}` is not on the allow list of this batch (.batch/settings.json). "
                "Run one simple allowed command per call, use the file tools instead of "
                "shell edits, or block the task naming the command"
            )
    return None


def paths(args):
    for key, value in args.items():
        if isinstance(value, str) and re.search(r"path|file|dir|target|dest|source", key, re.I):
            yield value


def gate_write(args, root):
    for p in paths(args):
        full = os.path.realpath(os.path.join(root, p))
        if not (full == root or full.startswith(root + os.sep)):
            return f"{p} is outside the repository"
        rel = os.path.relpath(full, root)
        if rel.startswith(RUNNER_FILES):
            return f"{rel} belongs to the batch runner"
    return None


def gate_network(args, settings):
    allow, deny = rules(settings, "domains")
    urls = URL.findall(json.dumps(args))
    if not urls:
        return "web search and browsing are not allowed in this batch"
    for host in urls:
        host = host.lower()
        ok = any(host == d or host.endswith("." + d) for d in allow)
        if not ok or any(host == d or host.endswith("." + d) for d in deny):
            return f"{host} is not an allowed domain for this batch"
    return None


def main():
    task = os.environ.get("BATCH_TASK_ID")
    try:
        event = json.load(sys.stdin)
    except ValueError:
        event = {}
    if not task:
        answer("ask")
    root = os.path.realpath(os.environ.get("BATCH_ROOT", os.getcwd()))
    batch = os.path.join(root, ".batch")
    logs = os.path.join(batch, "logs")
    os.makedirs(logs, exist_ok=True)
    if event.get("conversationId"):
        with open(os.path.join(logs, f"{task}.conversation"), "w") as f:
            f.write(event["conversationId"] + "\n")
    call = event.get("toolCall") or {}
    name, args = call.get("name", ""), call.get("args") or {}
    try:
        with open(os.path.join(batch, "settings.json")) as f:
            settings = json.load(f)
    except (OSError, ValueError):
        settings = {}

    if name == "run_command":
        why = gate_command(str(args.get("CommandLine", "")), settings)
    elif ASK.search(name):
        why = "nobody is at the keyboard: follow .batch/plan.md, decide-and-record, or block"
    elif NETWORK.search(name):
        why = gate_network(args, settings)
    elif WRITE.search(name):
        why = gate_write(args, root)
    else:
        why = None

    with open(os.path.join(logs, f"{task}-tools.jsonl"), "a") as f:
        f.write(json.dumps({"tool": name, "args": json.dumps(args)[:300], "denied": why}) + "\n")
    if why:
        answer("deny", why)
    if name == "run_command":
        # agy's terminal sandbox mounts .git read-only (git add/commit fail)
        # and breaks test runners; this gate already enforces the batch's
        # allow list, so allowed commands run outside it.
        answer("allow", overwrite={"BypassSandbox": True})
    answer("allow")


if __name__ == "__main__":
    main()
