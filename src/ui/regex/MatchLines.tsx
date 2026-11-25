import { Fragment, type ReactNode } from "react";
import type { CasarEval, ExtrairEval, LerEval, TrocarEval } from "../../regex/check";
import type { MatchSpan } from "../../regex/compile";
import type { CasarItem, ExtrairItem, LerItem, TrocarItem } from "../../regex/types";

/** Renders `text` with every non-overlapping matched span underlined and highlighted. */
export function HighlightedText({
  text,
  spans,
}: {
  readonly text: string;
  readonly spans: readonly MatchSpan[];
}): ReactNode {
  if (spans.length === 0) return text;
  const parts: ReactNode[] = [];
  let cursor = 0;
  spans.forEach((span, idx) => {
    if (span.start > cursor) {
      parts.push(<Fragment key={`t-${String(idx)}`}>{text.slice(cursor, span.start)}</Fragment>);
    }
    const piece = text.slice(span.start, span.end);
    parts.push(
      <mark
        key={`m-${String(idx)}`}
        className={piece.length === 0 ? "regex-match regex-match-empty" : "regex-match"}
        data-testid="regex-match-span"
      >
        {piece.length === 0 ? "▏" : piece}
      </mark>,
    );
    cursor = span.end;
  });
  if (cursor < text.length) {
    parts.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
  }
  return parts;
}

function LineCode({
  text,
  spans,
}: {
  readonly text: string;
  readonly spans: readonly MatchSpan[];
}): ReactNode {
  const showEol = text.length === 0 || text.endsWith(" ");
  return (
    <code className="regex-line-code">
      <HighlightedText text={text} spans={spans} />
      {showEol && (
        <span className="regex-eol muted" aria-hidden="true">
          ↵
        </span>
      )}
    </code>
  );
}

function StatusMark({ ok }: { readonly ok: boolean | null }): ReactNode {
  if (ok === null) {
    return (
      <span className="regex-mark muted" aria-hidden="true">
        –
      </span>
    );
  }
  return (
    <span className={ok ? "regex-mark regex-mark-ok" : "regex-mark regex-mark-bad"}>
      {ok ? "✓" : "✗"}
    </span>
  );
}

export function CasarLines({
  item,
  evaluation,
  idle,
}: {
  readonly item: CasarItem;
  readonly evaluation: CasarEval | null;
  readonly idle: boolean;
}): ReactNode {
  const valid = !idle && evaluation !== null && evaluation.ok ? evaluation : null;
  const posCount = item.positive.length;
  const posRows = item.positive.map((line, i) => ({
    line,
    ev: valid !== null ? valid.lines[i]! : null,
  }));
  const negRows = item.negative.map((line, i) => ({
    line,
    ev: valid !== null ? valid.lines[posCount + i]! : null,
  }));

  return (
    <div className="regex-groups">
      <div className="regex-group">
        <h3 className="regex-group-title">Deve casar</h3>
        <ul className="regex-list">
          {posRows.map(({ line, ev }, idx) => (
            <li key={`pos-${String(idx)}`} className="regex-row" data-testid="regex-line">
              <StatusMark ok={ev === null ? null : ev.ok} />
              <LineCode text={line} spans={ev?.span == null ? [] : [ev.span]} />
            </li>
          ))}
        </ul>
      </div>
      <div className="regex-group">
        <h3 className="regex-group-title">Não deve casar</h3>
        <ul className="regex-list">
          {negRows.map(({ line, ev }, idx) => (
            <li key={`neg-${String(idx)}`} className="regex-row" data-testid="regex-line">
              <StatusMark ok={ev === null ? null : ev.ok} />
              <LineCode text={line} spans={ev?.span == null ? [] : [ev.span]} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ExtrairLines({
  item,
  evaluation,
  idle,
}: {
  readonly item: ExtrairItem;
  readonly evaluation: ExtrairEval | null;
  readonly idle: boolean;
}): ReactNode {
  const valid = !idle && evaluation !== null && evaluation.ok ? evaluation : null;
  return (
    <div className="regex-group">
      <h3 className="regex-group-title">Linhas e grupo 1 esperado</h3>
      <ul className="regex-list">
        {item.cases.map((c, idx) => {
          const ev = valid !== null ? valid.cases[idx]! : null;
          return (
            <li
              key={`ext-${String(idx)}`}
              className="regex-row regex-row-wrap"
              data-testid="regex-line"
            >
              <StatusMark ok={ev === null ? null : ev.ok} />
              <LineCode text={c.line} spans={ev?.span == null ? [] : [ev.span]} />
              <span className="regex-meta muted">
                esperado: <code>{c.expected ?? "(não casa)"}</code>
                {ev !== null && (
                  <>
                    {" · "}grupo 1: <code>{ev.actual ?? "(vazio)"}</code>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TrocarLines({
  item,
  evaluation,
  idle,
}: {
  readonly item: TrocarItem;
  readonly evaluation: TrocarEval | null;
  readonly idle: boolean;
}): ReactNode {
  const valid = !idle && evaluation !== null && evaluation.ok ? evaluation : null;
  return (
    <div className="regex-group">
      <h3 className="regex-group-title">Antes → depois</h3>
      <ul className="regex-list">
        {item.cases.map((c, idx) => {
          const ev = valid !== null ? valid.cases[idx]! : null;
          return (
            <li
              key={`sub-${String(idx)}`}
              className="regex-row regex-row-col"
              data-testid="regex-line"
            >
              <div className="regex-row-head">
                <StatusMark ok={ev === null ? null : ev.ok} />
                <LineCode text={c.before} spans={ev === null ? [] : ev.spans} />
              </div>
              <div className="regex-sub-pair muted">
                <span>
                  esperado: <code>{c.after}</code>
                </span>
                {ev !== null && (
                  <span>
                    atual: <code>{ev.actual}</code>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function LerLines({
  item,
  selected,
  onToggle,
  revealed,
  evaluation,
}: {
  readonly item: LerItem;
  readonly selected: readonly boolean[];
  readonly onToggle: (index: number) => void;
  readonly revealed: boolean;
  readonly evaluation: LerEval | null;
}): ReactNode {
  return (
    <div className="regex-group">
      <div className="regex-pattern-box" data-testid="regex-ler-pattern">
        <code>{item.pattern}</code>
      </div>
      <ul className="regex-list">
        {item.lines.map((line, idx) => {
          const checked = selected[idx] === true;
          const ev = revealed && evaluation !== null ? evaluation.lines[idx]! : null;
          return (
            <li key={`ler-${String(idx)}`} className="regex-row" data-testid="regex-line">
              <label className="regex-ler-label">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={revealed}
                  aria-label={`Linha ${String(idx + 1)}: ${line}`}
                  onChange={() => {
                    onToggle(idx);
                  }}
                />
                {ev !== null && <StatusMark ok={ev.expected} />}
                <LineCode text={line} spans={ev?.span == null ? [] : [ev.span]} />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
