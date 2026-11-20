import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Clock } from "../../core/clock";
import type { KeyValueStore } from "../../storage/history";
import {
  appendVimEditResult,
  loadVimEditResults,
  parseVimEditSettings,
  saveVimEditSettings,
  vimEditSummary,
  type VimEditSettings,
} from "../../storage/vim";
import { diffText } from "../../vim/diff";
import { EDIT_KIND_LABELS, EDIT_KINDS, type EditKind } from "../../vim/drills/edit";
import { EDIT_HELP } from "../../vim/edit-help";
import {
  editEfficiency,
  editRemainingMs,
  editRoundStats,
  isEditRoundFinished,
  pressEditRoundKey,
  skipEdit,
  startEditRound,
  tickEditRound,
  type EditResult,
  type EditRound,
} from "../../vim/edit-round";
import { formatKeys, keyFromEvent, type Key } from "../../vim/keys";
import { ROUND_DURATIONS_S } from "../../vim/round";
import type { VimState } from "../../vim/state";
import { selectionRange } from "../../vim/visual";
import { DrillSelect } from "./DrillSelect";

type Props = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  /** Seed of each new round. */
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly settings: VimEditSettings;
  /** Called with the settings the screen saved. */
  readonly onSettings: (settings: VimEditSettings) => void;
};

const TICK_MS = 100;

/** One round being played. `run` changes on every new round, to refocus the box. */
type Run = {
  readonly settings: VimEditSettings;
  readonly round: EditRound;
  readonly run: number;
};

function newRun(settings: VimEditSettings, seed: number, run: number): Run {
  const round = startEditRound({
    durationMs: settings.durationS * 1000,
    seed,
    kinds: settings.kinds,
  });
  return { settings, round, run };
}

/** The mode as the status bar of Vim shows it. */
function modeLabel(vim: VimState): string {
  if (vim.mode === "insert") return "INSERT";
  if (vim.mode === "visual") {
    const kind = vim.visual?.kind;
    return kind === "line" ? "V-LINE" : kind === "block" ? "V-BLOCK" : "VISUAL";
  }
  return "NORMAL";
}

const percent = (fraction: number): string => `${String(Math.round(fraction * 100))}%`;

/** The Vim edit drill (ADR-T14-1): make the buffer equal to the after. */
export function EditDrill({
  clock,
  store,
  newSeed,
  onBack,
  settings,
  onSettings,
}: Props): ReactNode {
  const [current, setCurrent] = useState<Run>(() => newRun(settings, newSeed(), 0));
  const [results, setResults] = useState(() => loadVimEditResults(store));
  const [now, setNow] = useState(() => clock.now());
  // The latest run, read by the event handlers between renders.
  const latest = useRef(current);
  const box = useRef<HTMLTextAreaElement>(null);

  const show = useCallback((next: Run) => {
    latest.current = next;
    setCurrent(next);
  }, []);

  const apply = useCallback(
    (round: EditRound) => {
      const run = latest.current;
      if (round === run.round) return;
      if (!isEditRoundFinished(run.round) && isEditRoundFinished(round)) {
        const stats = editRoundStats(round);
        appendVimEditResult(store, {
          version: 1,
          kind: "edit",
          durationS: round.config.durationMs / 1000,
          seed: round.config.seed,
          reached: stats.reached,
          skipped: stats.skipped,
          efficiency: stats.efficiency,
          finishedAt: clock.wallTime(),
        });
        setResults(loadVimEditResults(store));
      }
      show({ ...run, round });
    },
    [clock, show, store],
  );

  const { round } = current;
  const finished = isEditRoundFinished(round);
  const running = round.startedAt !== null && !finished;

  useEffect(() => {
    box.current?.focus();
  }, [current.run]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const t = clock.now();
      setNow(t);
      apply(tickEditRound(latest.current.round, t));
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [apply, clock, running]);

  const feed = (key: Key) => {
    apply(pressEditRoundKey(latest.current.round, key, clock.now()));
  };

  const typed = (text: string) => {
    for (const ch of text.replace(/[\r\n]/g, "")) feed(ch);
  };

  const restart = (next = latest.current.settings) => {
    show(newRun(next, newSeed(), latest.current.run + 1));
  };

  /** Applies an option from the form, validated like stored settings. */
  const change = (patch: Readonly<Record<string, unknown>>) => {
    const updated = parseVimEditSettings({ ...latest.current.settings, ...patch });
    saveVimEditSettings(store, updated);
    onSettings(updated);
    restart(updated);
  };

  const toggleKind = (kind: EditKind, on: boolean) => {
    // The last kind left on has its checkbox disabled, so the list is never empty.
    change({
      kinds: EDIT_KINDS.filter((k) =>
        k === kind ? on : latest.current.settings.kinds.includes(k),
      ),
    });
  };

  const { target, vim } = round;
  const masks = useMemo(
    () => diffText(vim.lines.join("\n"), target.after.join("\n")),
    [vim.lines, target.after],
  );
  const summary = vimEditSummary(results, current.settings.durationS);
  const remainingS = Math.ceil(
    editRemainingMs(round, Math.max(now, round.startedAt ?? now)) / 1000,
  );
  const insert = vim.mode === "insert";

  return (
    <div className="screen vim">
      <h1>Vim</h1>

      <div className="typing-area">
        <textarea
          ref={box}
          className="typing-input"
          aria-label="Teclas do Vim"
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            // Dead keys compose first; their text arrives at compositionend.
            if ((e.nativeEvent as InputEvent).isComposing) return;
            const text = e.target.value;
            e.target.value = "";
            typed(text);
          }}
          onCompositionEnd={(e) => {
            const text = e.currentTarget.value;
            e.currentTarget.value = "";
            typed(text);
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              apply(skipEdit(latest.current.round, clock.now()));
              return;
            }
            const key = keyFromEvent(e);
            // Dead keys have no Vim key: they must reach the composition.
            if (key === null) return;
            e.preventDefault();
            feed(key);
          }}
        />

        {finished ? (
          <EditResults
            round={round}
            settings={current.settings}
            onNext={() => {
              restart();
            }}
          />
        ) : (
          <>
            <p className="vim-time" data-testid="vim-time">
              {remainingS}
            </p>
            <pre
              className="vim-code"
              data-testid="vim-code"
              data-edit-index={target.index}
              onClick={() => {
                box.current?.focus();
              }}
            >
              <Buffer
                lines={vim.lines}
                mask={masks.aMask}
                mark="vim-diff-del"
                cursor={vim.mode === "cmdline" ? null : vim.cursor}
                insert={insert}
                selection={(line) => selectionRange(vim, line)}
              />
            </pre>
            <pre className="vim-after" data-testid="vim-after" data-reference={target.reference}>
              <Buffer lines={target.after} mask={masks.bMask} mark="vim-diff-add" cursor={null} />
            </pre>
            <p className="vim-status" data-testid="vim-status">
              {vim.mode === "cmdline" ? (
                <span className="vim-pending">{`:${vim.cmdline ?? ""}`}</span>
              ) : (
                <>
                  <strong>{modeLabel(vim)}</strong>{" "}
                  <span className="vim-pending">{formatKeys(vim.pending)}</span>
                </>
              )}
            </p>
            {round.last !== null && <LastEdit result={round.last} />}
            <p className="muted hint">Ctrl+Enter pula a edição · Esc volta ao modo normal.</p>
          </>
        )}
      </div>

      <fieldset className="vim-options">
        <legend>Opções</legend>
        <DrillSelect
          value="edit"
          onChange={(drill) => {
            const updated = parseVimEditSettings({ ...latest.current.settings, drill });
            saveVimEditSettings(store, updated);
            onSettings(updated);
          }}
        />
        <label htmlFor="vim-duration">Duração</label>
        <select
          id="vim-duration"
          value={current.settings.durationS}
          onChange={(e) => {
            change({ durationS: Number(e.target.value) });
          }}
        >
          {ROUND_DURATIONS_S.map((s) => (
            <option key={s} value={s}>
              {`${String(s)} s`}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend>Tipos de edição</legend>
        <div className="vim-kinds">
          {EDIT_KINDS.map((kind) => {
            const on = current.settings.kinds.includes(kind);
            return (
              <label key={kind}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={on && current.settings.kinds.length === 1}
                  onChange={(e) => {
                    toggleKind(kind, e.target.checked);
                  }}
                />
                {EDIT_KIND_LABELS[kind]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="vim-commands">
        <legend>Comandos</legend>
        <ul>
          {EDIT_HELP.map((help) => (
            <li key={help.keys}>
              <code>{help.keys}</code> — {help.text}
              {help.example !== undefined && (
                <>
                  <br />
                  <span className="muted">ex.: {help.example}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      </fieldset>

      <p data-testid="vim-summary" className="muted typing-summary">
        {summary === null
          ? "Sem resultados nesta configuração."
          : `melhor ${String(Math.round(summary.best))} edições · ` +
            `média dos últimos 10: ${String(Math.round(summary.recentMean))} edições`}
      </p>

      <div className="actions">
        <button type="button" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}

/** "você: 9 · referência: 4 (ci(x<Esc>)". */
function Comparison({ result }: { readonly result: EditResult }): ReactNode {
  return (
    <>
      {result.skipped ? "pulado" : `você: ${String(result.keys)}`} · referência:{" "}
      {result.referenceKeys} (<code>{result.reference}</code>)
    </>
  );
}

function LastEdit({ result }: { readonly result: EditResult }): ReactNode {
  return (
    <p className="vim-last" data-testid="vim-last">
      <Comparison result={result} />
    </p>
  );
}

function EditResults({
  round,
  settings,
  onNext,
}: {
  readonly round: EditRound;
  readonly settings: VimEditSettings;
  readonly onNext: () => void;
}): ReactNode {
  const stats = editRoundStats(round);
  return (
    <div className="typing-results">
      <p className="score">
        <strong data-testid="vim-reached">{stats.reached}</strong> edições · puladas{" "}
        <span data-testid="vim-skipped">{stats.skipped}</span> · eficiência média{" "}
        <span data-testid="vim-efficiency">{percent(stats.efficiency)}</span>
      </p>
      {stats.efficiency > 1 && (
        <p className="vim-better" data-testid="vim-better">
          melhor que a referência
        </p>
      )}
      <ul className="vim-worst" data-testid="vim-worst">
        {stats.worst.map((result) => (
          <li key={result.index}>
            <Comparison result={result} /> · {percent(editEfficiency(result))}
          </li>
        ))}
      </ul>
      <p className="seed">
        <span data-testid="vim-config">{`${String(settings.durationS)} s`}</span> · seed{" "}
        <span data-testid="vim-seed">{round.config.seed}</span>
      </p>
      <button type="button" className="primary" autoFocus onClick={onNext}>
        Próximo
      </button>
    </div>
  );
}

/**
 * The lines with the characters of `mask` marked, and the block cursor. In
 * insert mode the cursor is a bar and may sit past the last character.
 */
function Buffer({
  lines,
  mask,
  mark,
  cursor,
  insert = false,
  selection,
}: {
  readonly lines: readonly string[];
  readonly mask: readonly boolean[];
  readonly mark: string;
  readonly cursor: { readonly line: number; readonly col: number } | null;
  readonly insert?: boolean;
  /** The columns `[from, to)` of a line that are selected (visual mode). */
  readonly selection?: (line: number) => { readonly from: number; readonly to: number } | null;
}): ReactNode {
  // Where each line starts in the text the mask was made from.
  const starts = lines.map((_, i) => lines.slice(0, i).reduce((sum, l) => sum + l.length + 1, 0));
  return (
    <>
      {lines.map((text, line) => {
        const base = starts[line] as number;
        const at = cursor !== null && cursor.line === line ? cursor.col : -1;
        const chars = [...text];
        if (at >= chars.length) chars.push(" ");
        const selected = selection?.(line) ?? null;
        return (
          <Fragment key={line}>
            {line > 0 ? "\n" : null}
            {chars.map((ch, col) => {
              const marked = mask[base + col] === true && col < text.length;
              const picked = selected !== null && col >= selected.from && col < selected.to;
              const className = [
                col === at ? `vim-cursor${insert ? " vim-insert" : ""}` : "",
                marked ? mark : "",
                picked && col < text.length ? "vim-selected" : "",
              ]
                .filter(Boolean)
                .join(" ");
              if (className === "") return ch;
              return col === at ? (
                <span
                  key={col}
                  className={className}
                  data-testid="vim-cursor"
                  data-line={line}
                  data-col={col}
                >
                  {ch}
                </span>
              ) : (
                <span key={col} className={className}>
                  {ch}
                </span>
              );
            })}
          </Fragment>
        );
      })}
    </>
  );
}
