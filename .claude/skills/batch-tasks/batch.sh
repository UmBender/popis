#!/usr/bin/env bash
# Unattended runner for a planned batch of tasks (skill: batch-tasks).
#
# Runs one non-interactive agent session per task (Claude Code, or Google's
# Antigravity CLI `agy`), strictly one at a time, in the order of
# .batch/queue. Survives what usually kills a night
# run: usage limits (waits for the reset and resumes the same session),
# network loss (waits for the network), crashes and reboots (run again: the
# interrupted task resumes), and commands that were not allowed (the session
# is told to block the task and the batch moves on).
#
# Usage: batch.sh check|run|status|report|reset <ID>|unblock <ID>
#
# Environment (all optional):
#   BATCH_TASK_TIMEOUT   seconds per session attempt        (default 14400)
#   BATCH_MAX_ATTEMPTS   failed attempts before giving up   (default 2)
#   BATCH_AGENT          default agent: claude or agy       (default claude)
#   BATCH_MODEL          default model of a session         (default sonnet
#                        for claude, gemini-4-hydrogen-high for agy)
#   BATCH_EFFORT         default effort level of a session  (default medium;
#                        agy gets --effort only from a queue line)
#                        A queue line can override all three for its task:
#                        `T18 after:T22 agent=agy model=gemini-4-argon-high`.
#                        agy sessions get the allow/deny list of
#                        .batch/settings.json through the PreToolUse hook in
#                        .agents/hooks.json (agy-gate.py).
#   BATCH_LIMIT_WAIT     seconds between checks while a usage limit
#                        lasts (no cap: waits until it is restored)
#                                                           (default 900)
#   BATCH_NET_WAIT       seconds between network checks     (default 120)
#   BATCH_STOP_AT        epoch seconds: start nothing new after this
#   BATCH_MIN_FREE_GB    free disk space required           (default 5)
#   CLAUDE_BIN           claude executable                  (default claude)
#   AGY_BIN              agy executable                     (default agy)
#   BATCH_VERIFY         gates re-run on a branch in review
#                        (default: npm run check && npm run coverage)
set -uo pipefail

ROOT=$(git rev-parse --show-toplevel) || exit 2
cd "$ROOT" || exit 2
SKILL_DIR=$(cd "$(dirname "$0")" && pwd)
B="$ROOT/.batch"
CLAUDE_BIN=${CLAUDE_BIN:-claude}
AGY_BIN=${AGY_BIN:-agy}
AGENT=${BATCH_AGENT:-claude}
TASK_TIMEOUT=${BATCH_TASK_TIMEOUT:-14400}
MAX_ATTEMPTS=${BATCH_MAX_ATTEMPTS:-2}
MODEL=${BATCH_MODEL:-}
EFFORT=${BATCH_EFFORT:-medium}
LIMIT_WAIT=${BATCH_LIMIT_WAIT:-900}
NET_WAIT=${BATCH_NET_WAIT:-120}
STOP_AT=${BATCH_STOP_AT:-}
MIN_FREE_GB=${BATCH_MIN_FREE_GB:-5}
if [[ $AGENT == agy ]]; then NET_URL=${BATCH_NET_URL:-https://www.googleapis.com}; else NET_URL=${BATCH_NET_URL:-https://api.anthropic.com}; fi
VERIFY=${BATCH_VERIFY:-npm run check && npm run coverage}

log() {
    mkdir -p "$B"
    printf '%s %s\n' "$(date -Is)" "$*" | tee -a "$B/runner.log" >&2
}

die() {
    log "ERROR: $*"
    exit 1
}

# --- per-task state: .batch/state/<ID>, lines key=value ---------------------

get() { # get ID key
    local file="$B/state/$1"
    [[ -f $file ]] || { [[ $2 == status ]] && echo pending; return; }
    local line
    line=$(grep -m1 "^$2=" "$file") || { [[ $2 == status ]] && echo pending; [[ $2 =~ ^(attempts|limit_waits)$ ]] && echo 0; return; }
    printf '%s\n' "${line#*=}"
}

set_state() { # set_state ID key value — atomic rewrite, survives a crash
    local file="$B/state/$1" tmp
    mkdir -p "$B/state"
    tmp=$(mktemp "$B/state/.$1.XXXX")
    { [[ -f $file ]] && grep -v "^$2=" "$file"; printf '%s=%s\n' "$2" "$3"; } >"$tmp"
    mv -f "$tmp" "$file"
}

# --- task notes ----------------------------------------------------------------

task_note() { # path of docs/tasks/<ID> *.md
    local f
    for f in "docs/tasks/$1 "*.md; do [[ -f $f ]] && { printf '%s\n' "$f"; return 0; }; done
    return 1
}

front() { # front ID key — a frontmatter value
    local note
    note=$(task_note "$1") || return 1
    sed -n '/^---$/,/^---$/p' "$note" | grep -m1 "^$2:" | sed "s/^$2:[[:space:]]*//"
}

task_branch() { front "$1" branch; }

task_deps() { # space-separated ids from `depends_on: [T73, T74]`
    front "$1" depends_on | tr -d '[]' | tr ',' ' ' | xargs -n1 2>/dev/null | grep -E '^T[0-9]+' | xargs
}

queue_lines() { # .batch/queue without comments and blanks
    grep -vE '^[[:space:]]*(#|$)' "$B/queue"
}

queue() { # lines "ID BASE" of .batch/queue (options after BASE dropped)
    queue_lines | awk '{print $1, $2}'
}

task_opt() { # task_opt ID KEY → value of KEY=value on ID's queue line, if any
    queue_lines | awk -v id="$1" -v k="$2" '$1 == id {
        for (i = 3; i <= NF; i++) if (index($i, k "=") == 1) { print substr($i, length(k) + 2); exit }
    }'
}

task_agent() { local a; a=$(task_opt "$1" agent); echo "${a:-$AGENT}"; }
task_model() {
    local m; m=$(task_opt "$1" model)
    [[ -n $m ]] && { echo "$m"; return; }
    [[ -n $MODEL ]] && { echo "$MODEL"; return; }
    [[ $(task_agent "$1") == agy ]] && echo gemini-4-hydrogen-high || echo sonnet
}
task_effort() { local e; e=$(task_opt "$1" effort); echo "${e:-$EFFORT}"; }

in_queue() { queue | awk '{print $1}' | grep -qx "$1"; }

base_branch() { # BASE is `main` or `after:<ID>` (that task's branch)
    case $1 in
        after:*) task_branch "${1#after:}" ;;
        *) printf '%s\n' "$1" ;;
    esac
}

# --- environment ---------------------------------------------------------------

network_ok() { curl -sS -o /dev/null --max-time 15 "$NET_URL" 2>/dev/null; }

wait_network() {
    network_ok && return 0
    log "network down; waiting"
    until network_ok; do
        past_stop && return 1
        sleep "$NET_WAIT"
    done
    log "network back"
}

past_stop() { [[ -n $STOP_AT ]] && (($(date +%s) >= STOP_AT)); }

free_gb() { df -Pk "$ROOT" | awk 'NR==2 {print int($4 / 1048576)}'; }

tree_clean() { [[ -z $(git status --porcelain --untracked-files=normal) ]]; }

current_branch() { git rev-parse --abbrev-ref HEAD; }

running_on_branch() { # the running task whose branch is checked out, if any
    local id base
    [[ -f $B/queue ]] || return 0
    while read -r id base; do
        if [[ $(get "$id" status) == running && $(task_branch "$id") == "$(current_branch)" ]]; then
            echo "$id"
            return 0
        fi
    done < <(queue)
}

# --- check ---------------------------------------------------------------------

cmd_check() {
    local ok=0 id base dep tool
    say() { printf '%-6s %s\n' "$1" "$2"; [[ $1 == FAIL ]] && ok=1; return 0; }
    [[ -f $B/plan.md ]] && say ok "plan: $B/plan.md" || say FAIL "no $B/plan.md (run the plan phase first)"
    [[ -f $B/queue ]] && say ok "queue: $(queue | wc -l) task(s)" || { say FAIL "no $B/queue"; return 1; }
    if [[ -f $B/settings.json ]] && jq -e '.permissions.allow | length > 0' "$B/settings.json" >/dev/null 2>&1; then
        say ok "permissions: $(jq '.permissions.allow | length' "$B/settings.json") allowed, $(jq '.permissions.deny // [] | length' "$B/settings.json") denied"
    else
        say FAIL "$B/settings.json missing or has no permissions.allow"
    fi
    local agents a
    agents=$(while read -r id base; do task_agent "$id"; done < <(queue) | sort -u)
    for a in $agents; do
        case $a in
            claude) command -v "$CLAUDE_BIN" >/dev/null && say ok "claude: $("$CLAUDE_BIN" --version 2>/dev/null | head -1)" || say FAIL "claude not found ($CLAUDE_BIN)" ;;
            agy)
                command -v "$AGY_BIN" >/dev/null && say ok "agy: $("$AGY_BIN" --version 2>/dev/null | head -1)" || say FAIL "agy not found ($AGY_BIN)"
                [[ -f .agents/hooks.json ]] && grep -q agy-gate .agents/hooks.json && say ok "agy: permission gate in .agents/hooks.json" || say FAIL "agy: .agents/hooks.json does not run agy-gate.py (no allow/deny list)"
                command -v python3 >/dev/null && say ok "python3 (agy gate)" || say FAIL "python3 missing (agy gate)"
                ;;
            *) say FAIL "unknown agent '$a' (claude or agy)" ;;
        esac
    done
    git check-ignore -q "$B/queue" && say ok ".batch/ is git-ignored" || say FAIL ".batch/ is not git-ignored"
    if tree_clean; then
        say ok "working tree clean ($(current_branch))"
    elif [[ -n $(running_on_branch) ]]; then
        say WARN "working tree dirty on $(current_branch): the interrupted task $(running_on_branch) resumes there"
    else
        say FAIL "working tree not clean on $(current_branch)"
    fi
    network_ok && say ok "network: $NET_URL reachable" || say FAIL "network: $NET_URL unreachable"
    (($(free_gb) >= MIN_FREE_GB)) && say ok "disk: $(free_gb) GB free" || say FAIL "disk: only $(free_gb) GB free (< $MIN_FREE_GB)"
    command -v systemd-inhibit >/dev/null && say ok "systemd-inhibit: sleep will be blocked" || say WARN "no systemd-inhibit: disable suspend yourself"
    [[ -d node_modules ]] && say ok "node_modules installed" || say FAIL "node_modules missing (run npm ci)"
    if [[ -f $B/requires ]]; then
        while read -r tool; do
            [[ -z $tool || $tool == \#* ]] && continue
            command -v "$tool" >/dev/null && say ok "tool: $tool" || say FAIL "tool missing: $tool"
        done <"$B/requires"
    fi
    while read -r id base; do
        task_note "$id" >/dev/null || { say FAIL "$id: no task note"; continue; }
        [[ -n $(task_branch "$id") ]] || say FAIL "$id: task note has no branch"
        [[ -n $(base_branch "$base") ]] || say FAIL "$id: bad base '$base'"
        for dep in $(task_deps "$id"); do
            in_queue "$dep" && continue
            [[ $(front "$dep" status) == done ]] || say WARN "$id: depends on $dep, which is not done and not in the queue"
        done
        case $(task_effort "$id") in low | medium | high | xhigh | max) ;; *) say FAIL "$id: bad effort '$(task_effort "$id")'" ;; esac
        say ok "$id: $(get "$id" status), base $base, $(task_agent "$id") $(task_model "$id")/$(task_effort "$id")"
    done < <(queue)
    return $ok
}

# --- one task ------------------------------------------------------------------

ended_in_error() { # ended_in_error RC JSONFILE: non-zero exit or an error result
    (($1 != 0)) || jq -e '.is_error == true or ((.status // "SUCCESS") != "SUCCESS")' "$2" >/dev/null 2>&1
}

rate_limited() { # rate_limited LOGFILE...
    grep -qiE 'usage limit|hit your (usage )?limit|rate.?limit|limit reached|resets (at )?[0-9]|overloaded|API Error: (429|529)|Too Many Requests|quota|RESOURCE_EXHAUSTED|exhausted|out of capacity' "$@" 2>/dev/null
}

network_error() {
    grep -qiE 'ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|network error|fetch failed|socket hang up|Connection error' "$@" 2>/dev/null
}

no_session() { grep -qiE 'no conversation found|session .* not found|conversation .*not found|unknown conversation|invalid conversation' "$@" 2>/dev/null; }

service_ok() { # service_ok [ID]: a one-line probe session (that task's agent and model) answers
    local out agent=${1:+$(task_agent "$1")}
    agent=${agent:-$AGENT}
    if [[ $agent == agy ]]; then
        out=$(timeout 300 "$AGY_BIN" -p "Reply with the single word OK." --output-format json \
            --model "$(if [[ -n ${1:-} ]]; then task_model "$1"; else echo "${MODEL:-gemini-4-hydrogen-high}"; fi)" </dev/null 2>&1) || return 1
    else
        out=$(timeout 300 "$CLAUDE_BIN" -p --output-format json --no-session-persistence \
            --permission-mode dontAsk --permission-prompts none \
            "Reply with the single word OK." </dev/null 2>&1) || return 1
    fi
    jq -e '.is_error != true and ((.status // "SUCCESS") == "SUCCESS")' <<<"$out" >/dev/null 2>&1
}

wait_until_available() { # wait_until_available ID LOGFILE...: no cap
    local task=$1; shift
    local reset now
    reset=$(grep -ohE 'limit reached\|[0-9]{10}' "$@" 2>/dev/null | head -1 | cut -d'|' -f2)
    now=$(date +%s)
    if [[ -n $reset ]] && ((reset > now)); then
        log "usage limit: waiting until the printed reset, $(date -d "@$reset" -Is)"
        sleep $((reset - now + 60))
    fi
    until service_ok "$task"; do
        past_stop && return 1
        log "usage limit (or service unavailable): checking again in ${LIMIT_WAIT}s"
        sleep "$LIMIT_WAIT"
        wait_network || return 1
    done
    log "service available again"
}

prompt_start() { # prompt_start ID BASE
    printf '/implement-task %s\n\nUnattended batch run (skill batch-tasks). Base branch: %s. Follow the unattended rules in your system prompt and the plan section for %s in .batch/plan.md. End by writing .batch/out/%s.status.\n' "$1" "$(base_branch "$2")" "$1" "$1"
}

prompt_start_agy() { # prompt_start_agy ID BASE (agy: the skill is read from its file)
    printf 'Implement task %s of this repository: read .claude/skills/implement-task/SKILL.md (skill implement-task) and follow it.\n\nUnattended batch run (skill batch-tasks). Base branch: %s. Follow the unattended rules above and the plan section for %s in .batch/plan.md. End by writing .batch/out/%s.status.\n' "$1" "$(base_branch "$2")" "$1" "$1"
}

prompt_resume() { # prompt_resume ID BASE REASON
    printf 'You were interrupted (%s). Continue task %s (base branch %s) from where the repository says you are: check git status, the current branch, `git log --oneline %s..HEAD` and the task note before doing anything; never redo a committed step. Then finish and write .batch/out/%s.status.\n' "$3" "$1" "$(base_branch "$2")" "$(base_branch "$2")" "$1"
}

session() { # session ID BASE MODE(start|resume) REASON → exit code; output in logs
    local id=$1 base=$2 mode=$3 reason=$4 sid n out err
    n=$(($(ls "$B/logs/$id"-*.json 2>/dev/null | wc -l) + 1))
    out="$B/logs/$id-$n.json"
    err="$B/logs/$id-$n.err"
    mkdir -p "$B/logs" "$B/out"
    if [[ $(task_agent "$id") == agy ]]; then
        session_agy "$id" "$base" "$mode" "$reason" "$n" "$out" "$err"
        return
    fi
    local -a common=(
        -p --output-format json
        --model "$(task_model "$id")" --effort "$(task_effort "$id")"
        --permission-mode dontAsk --permission-prompts none
        --settings "$B/settings.json"
        --disallowedTools AskUserQuestion
        --append-system-prompt "$(cat "$SKILL_DIR/unattended.md")"
    )
    if [[ $mode == resume && $(get "$id" session_agent) == agy ]]; then
        mode=start
        log "$id: the last session was an agy conversation; claude starts over from the git state"
    fi
    if [[ $mode == resume ]]; then
        sid=$(get "$id" session)
        log "$id: session run $n (claude $(task_model "$id")/$(task_effort "$id")), resuming session $sid ($reason)"
        timeout --kill-after=60 "$TASK_TIMEOUT" "$CLAUDE_BIN" "${common[@]}" --resume "$sid" \
            "$(prompt_resume "$id" "$base" "$reason")" >"$out" 2>"$err" </dev/null
    else
        sid=$(uuidgen)
        set_state "$id" session "$sid"
        set_state "$id" session_agent claude
        log "$id: session run $n (claude $(task_model "$id")/$(task_effort "$id")), new session $sid"
        timeout --kill-after=60 "$TASK_TIMEOUT" "$CLAUDE_BIN" "${common[@]}" --session-id "$sid" \
            "$(prompt_start "$id" "$base")" >"$out" 2>"$err" </dev/null
    fi
    local rc=$?
    echo "$out $err $rc"
}

agy_rules() { # the unattended rules, sent in the first prompt (agy has no system-prompt flag)
    cat "$SKILL_DIR/unattended.md" "$SKILL_DIR/unattended-agy.md"
}

session_agy() { # session_agy ID BASE MODE REASON N OUT ERR
    local id=$1 base=$2 mode=$3 reason=$4 n=$5 out=$6 err=$7 sid prompt e rc
    # --dangerously-skip-permissions: agy's own approval prompts (file
    # writes, commands leaving its sandbox) have nobody to answer them, and
    # one waited 30 s and was denied. The gate hook (agy-gate.py) is the
    # authority: its deny still blocks with this flag on.
    local -a cmd=("$AGY_BIN" --dangerously-skip-permissions --output-format json --model "$(task_model "$id")")
    e=$(task_opt "$id" effort)
    [[ -n $e ]] && cmd+=(--effort "$e")
    sid=""
    [[ $(get "$id" session_agent) == agy ]] && sid=$(get "$id" session)
    [[ -z $sid && -s $B/logs/$id.conversation ]] && sid=$(head -1 "$B/logs/$id.conversation")
    if [[ $mode == resume && -n $sid ]]; then
        log "$id: session run $n (agy $(task_model "$id")${e:+/$e}), resuming conversation $sid ($reason)"
        prompt=$(prompt_resume "$id" "$base" "$reason")
        cmd+=(--conversation "$sid")
    else
        rm -f "$B/logs/$id.conversation"
        set_state "$id" session ""
        if [[ $mode == resume ]]; then
            log "$id: session run $n (agy $(task_model "$id")${e:+/$e}), new conversation continuing from git ($reason)"
            prompt="$(agy_rules)"$'\n\n'"$(prompt_resume "$id" "$base" "$reason")"
        else
            log "$id: session run $n (agy $(task_model "$id")${e:+/$e}), new conversation"
            prompt="$(agy_rules)"$'\n\n'"$(prompt_start_agy "$id" "$base")"
        fi
    fi
    BATCH_TASK_ID=$id BATCH_ROOT=$ROOT timeout --kill-after=60 "$TASK_TIMEOUT" "${cmd[@]}" -p "$prompt" \
        >"$out" 2>"$err" </dev/null
    rc=$?
    sid=$(jq -r '.conversation_id // empty' "$out" 2>/dev/null)
    [[ -z $sid && -s $B/logs/$id.conversation ]] && sid=$(head -1 "$B/logs/$id.conversation")
    if [[ -n $sid ]]; then
        set_state "$id" session "$sid"
        set_state "$id" session_agent agy
    fi
    echo "$out $err $rc"
}

verify_review() { # the session says review: the branch must exist and be green
    local id=$1 branch prev
    branch=$(task_branch "$id")
    git rev-parse --verify -q "$branch" >/dev/null || { echo "branch $branch does not exist"; return 1; }
    tree_clean || { echo "working tree left dirty"; return 1; }
    prev=$(current_branch)
    git switch -q "$branch" || { echo "cannot switch to $branch"; return 1; }
    if ! bash -c "$VERIFY" >"$B/logs/$id-verify.log" 2>&1; then
        git switch -q "$prev"
        echo "gates red on $branch: $VERIFY (see .batch/logs/$id-verify.log)"
        return 1
    fi
    git switch -q "$prev"
}

run_task() { # run_task ID BASE → 0 done (any final status), 1 stop the batch
    local id=$1 base=$2 mode=start reason="" result out err rc status note attempts
    # A crash during a task's first agy session leaves the conversation id
    # only in the gate's file: resume it as well.
    [[ $(get "$id" status) == running && ( -n $(get "$id" session) || -s $B/logs/$id.conversation ) ]] &&
        { mode=resume; reason="runner restarted"; }
    while :; do
        past_stop && { log "stop time reached; $id stays $(get "$id" status)"; return 1; }
        wait_network || return 1
        (($(free_gb) >= MIN_FREE_GB)) || { log "disk below ${MIN_FREE_GB} GB; stopping"; return 1; }
        if ! tree_clean && [[ $(current_branch) != "$(task_branch "$id")" ]]; then
            log "working tree dirty on $(current_branch), not $id's branch; stopping the batch"
            return 1
        fi
        attempts=$(get "$id" attempts)
        if ((attempts >= MAX_ATTEMPTS)); then
            set_state "$id" status failed
            set_state "$id" note "gave up after $attempts failed attempts (see .batch/logs/$id-*)"
            log "$id: failed after $attempts attempts"
            return 0
        fi
        rm -f "$B/out/$id.status"
        set_state "$id" status running
        set_state "$id" started "$(date -Is)"
        read -r out err rc < <(session "$id" "$base" "$mode" "$reason")

        if [[ -f $B/out/$id.status ]]; then
            status=$(head -1 "$B/out/$id.status" | tr -d '[:space:]')
            note=$(sed -n '2,$p' "$B/out/$id.status" | tr '\n' ' ' | cut -c1-400)
            case $status in
                review)
                    if result=$(verify_review "$id"); then
                        set_state "$id" status review
                    else
                        status=blocked
                        note="session said review, but $result"
                        set_state "$id" status blocked
                    fi
                    ;;
                blocked) set_state "$id" status blocked ;;
                *)
                    status=blocked
                    note="unknown status '$status' in .batch/out/$id.status: $note"
                    set_state "$id" status blocked
                    ;;
            esac
            set_state "$id" note "$note"
            set_state "$id" finished "$(date -Is)"
            log "$id: $status — $note"
            return 0
        fi

        if no_session "$out" "$err"; then
            log "$id: session not found; starting a new one from the repository state"
            mode=start
            continue
        fi
        if { ended_in_error "$rc" "$out" && network_error "$out" "$err"; } || ! network_ok; then
            wait_network || return 1
            mode=resume reason="network loss"
            continue
        fi
        # A usage limit, recognised by its message or not: the probe fails
        # while it lasts. Wait until it is restored; not a failed attempt.
        if ended_in_error "$rc" "$out" && { rate_limited "$out" "$err" || ! service_ok "$id"; }; then
            set_state "$id" limit_waits $(($(get "$id" limit_waits) + 1))
            wait_until_available "$id" "$out" "$err" || return 1
            mode=resume reason="usage limit"
            continue
        fi
        set_state "$id" attempts $((attempts + 1))
        if ((rc == 124 || rc == 137)); then
            reason="the attempt timed out after ${TASK_TIMEOUT}s"
        else
            reason="the session ended (exit $rc) without writing the status file"
        fi
        log "$id: $reason"
        mode=resume
    done
}

skip_reason() { # skip_reason ID BASE: why ID cannot run now, if a queued
    # dependency or the task it branches from (`after:<ID>`) did not finish
    local dep st after=""
    [[ ${2:-} == after:* ]] && after=${2#after:}
    for dep in $(task_deps "$1") $after; do
        in_queue "$dep" || continue
        st=$(get "$dep" status)
        case $st in
            review | done) ;;
            blocked | failed | skipped) echo "dependency $dep is $st"; return 0 ;;
            *) echo "dependency $dep is still $st (queue order?)"; return 0 ;;
        esac
    done
    return 1
}

cmd_run() {
    mkdir -p "$B"
    if [[ -z ${BATCH_INHIBITED:-} ]] && command -v systemd-inhibit >/dev/null; then
        export BATCH_INHIBITED=1
        exec systemd-inhibit --what=sleep:idle:handle-lid-switch --who=batch-tasks \
            --why="unattended task batch" bash "$0" run
    fi
    exec 9>"$B/lock"
    flock -n 9 || die "another runner holds $B/lock"
    cmd_check >"$B/check.log" 2>&1 || die "pre-flight check failed (see $B/check.log)"
    log "batch started (pid $$)"
    local id base why
    while read -r id base; do
        case $(get "$id" status) in review | blocked | failed | skipped | done) continue ;; esac
        if why=$(skip_reason "$id" "$base"); then
            set_state "$id" status skipped
            set_state "$id" note "$why"
            log "$id: skipped — $why"
            continue
        fi
        run_task "$id" "$base" || { log "batch stopped"; cmd_report >/dev/null; exit 1; }
        if tree_clean && [[ $(current_branch) != main ]]; then git switch -q main; fi
    done < <(queue)
    log "batch finished"
    cmd_report
}

# --- status, report, reset -------------------------------------------------------

cmd_status() {
    local id base
    printf '%-5s %-9s %-8s %s\n' TASK STATUS ATTEMPTS NOTE
    while read -r id base; do
        printf '%-5s %-9s %-8s %s\n' "$id" "$(get "$id" status)" "$(get "$id" attempts)" "$(get "$id" note | cut -c1-100)"
    done < <(queue)
    [[ -f $B/lock ]] && flock -n "$B/lock" true 2>/dev/null || echo "(a runner is active)"
}

cmd_report() {
    local id base branch from report="$B/report.md"
    {
        echo "# Batch report — $(date -Is)"
        echo
        while read -r id base; do
            branch=$(task_branch "$id")
            from=$(base_branch "$base")
            echo "## $id — $(get "$id" status)"
            echo
            echo "- branch: \`$branch\` (base \`$from\`), attempts: $(get "$id" attempts), usage-limit waits: $(get "$id" limit_waits)"
            [[ -n $(get "$id" note) ]] && echo "- note: $(get "$id" note)"
            echo "- logs: \`.batch/logs/$id-*\`"
            if git rev-parse --verify -q "$branch" >/dev/null; then
                echo
                echo '```'
                git log --oneline "$from..$branch" 2>/dev/null
                echo '```'
            fi
            echo
        done < <(queue)
        echo "## Runner log (last 30 lines)"
        echo
        echo '```'
        tail -30 "$B/runner.log" 2>/dev/null
        echo '```'
    } >"$report"
    cat "$report"
}

cmd_reset() { # forget everything about a task: it runs from scratch
    [[ -n ${1:-} ]] || die "usage: batch.sh reset <ID>"
    rm -f "$B/state/$1" "$B/out/$1.status"
    log "$1: reset to pending"
}

cmd_unblock() { # run again, resuming its last session
    [[ -n ${1:-} ]] || die "usage: batch.sh unblock <ID>"
    set_state "$1" status running
    set_state "$1" attempts 0
    rm -f "$B/out/$1.status"
    log "$1: unblocked; it resumes its last session on the next run"
}

# --- the runner runs from a copy of main's skill --------------------------------
# Task branches made before a runner change carry an older batch.sh (and
# no agy gate), and the runner switches branches while it runs. So `run`
# and `check` re-exec from .batch/runner, extracted from `main`.

RUNNER_DIR="$B/runner"

install_runner() {
    local tmp
    mkdir -p "$B"
    tmp=$(mktemp -d "$B/.runner.XXXX")
    if git archive main .claude/skills/batch-tasks | tar -x -C "$tmp"; then
        rm -rf "$RUNNER_DIR"
        mv "$tmp/.claude/skills/batch-tasks" "$RUNNER_DIR"
        rm -rf "$tmp"
    else
        rm -rf "$tmp"
        return 1
    fi
}

uses_agy() { local id base; while read -r id base; do [[ $(task_agent "$id") == agy ]] && return 0; done < <(queue); return 1; }

install_agy() { # .agents/ (locally ignored): the permission gate and the skills
    local exclude
    mkdir -p .agents
    [[ -e .agents/skills ]] || ln -s ../.claude/skills .agents/skills
    if [[ ! -f .agents/hooks.json ]] || grep -q agy-gate .agents/hooks.json; then
        cat >.agents/hooks.json <<'JSON'
{
  "batch-gate": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "command", "command": "python3 ../.batch/runner/agy-gate.py", "timeout": 10 }
        ]
      }
    ]
  }
}
JSON
    fi
    exclude=$(git rev-parse --git-path info/exclude)
    mkdir -p "$(dirname "$exclude")"
    grep -qx '/.agents/' "$exclude" 2>/dev/null || echo '/.agents/' >>"$exclude"
}

if [[ ${1:-} =~ ^(run|check)$ && $(cd "$SKILL_DIR" && pwd -P) != "$(cd "$RUNNER_DIR" 2>/dev/null && pwd -P)" ]]; then
    install_runner || die "cannot extract .claude/skills/batch-tasks from main into $RUNNER_DIR"
    exec bash "$RUNNER_DIR/batch.sh" "$@"
fi
[[ ${1:-} =~ ^(run|check)$ ]] && [[ -f $B/queue ]] && uses_agy && install_agy

case ${1:-} in
    check) cmd_check ;;
    run) cmd_run ;;
    status) cmd_status ;;
    report) cmd_report ;;
    reset) cmd_reset "${2:-}" ;;
    unblock) cmd_unblock "${2:-}" ;;
    *) sed -n '2,25p' "$0"; exit 2 ;;
esac
