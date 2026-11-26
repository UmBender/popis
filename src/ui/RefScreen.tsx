import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { entriesOf, LANG_DOCS, LANG_LABEL, LANG_TARGET, sectionsOf } from "../ref/langs";
import { parseRefHash } from "../ref/link";
import { JUDGE_BADGE, type Entry, type Lang } from "../ref/model";
import { search } from "../ref/search";
import { PanelTitle } from "./shell/panel";
import { isField } from "./shell/Shell";

type Props = {
  readonly lang: Lang;
};

const sectionAnchor = (lang: Lang, id: string) => `ref-${lang}-${id}`;
const entryAnchor = (lang: Lang, id: string) => `${lang}-${id}`;

/** The entry the URL hash opens in this language, if it exists. */
function hashEntry(lang: Lang): string | null {
  const target = parseRefHash(window.location.hash);
  return target?.lang === lang && entriesOf(lang).some((e) => e.id === target.id)
    ? target.id
    : null;
}

/** The reader of one language of the reference (T46 AC-5, ADR-T46-1). */
export function RefScreen({ lang }: Props): ReactNode {
  const entries = entriesOf(lang);
  const sections = sectionsOf(lang);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(() => hashEntry(lang));
  const [copied, setCopied] = useState<string | null>(null);
  const box = useRef<HTMLInputElement>(null);
  const results = useMemo(() => search(entries, query), [entries, query]);

  // A link elsewhere in the app (or the address bar) opens an entry.
  useEffect(() => {
    const onHash = () => {
      const id = hashEntry(lang);
      setOpen(id);
      if (id !== null) setQuery("");
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
    };
  }, [lang]);

  useEffect(() => {
    if (open === null) return;
    const el = document.getElementById(entryAnchor(lang, open));
    el?.scrollIntoView({ block: "start" });
    el?.focus();
  }, [lang, open]);

  // "/" jumps to the search box, as in most documentation sites.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || isField(e.target)) return;
      e.preventDefault();
      box.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const copy = (entry: Entry) => {
    const clipboard = navigator.clipboard as Clipboard | undefined;
    if (clipboard === undefined) return;
    void clipboard.writeText(entry.example).then(() => {
      setCopied(entry.id);
    });
  };

  const card = (entry: Entry) => (
    <EntryCard
      key={entry.id}
      entry={entry}
      open={open === entry.id}
      copied={copied === entry.id}
      onOpen={() => {
        history.replaceState(null, "", `#${lang}/${entry.id}`);
        setOpen(entry.id);
      }}
      onCopy={() => {
        copy(entry);
      }}
    />
  );

  const filtering = query.trim() !== "";
  let body: ReactNode;
  if (!filtering) {
    body = sections.map((s) => (
      <section
        key={s.id}
        id={sectionAnchor(lang, s.id)}
        className="ref-section"
        aria-labelledby={`${sectionAnchor(lang, s.id)}-title`}
      >
        <h2 id={`${sectionAnchor(lang, s.id)}-title`}>{s.title}</h2>
        {entries.filter((e) => e.section === s.id).map(card)}
      </section>
    ));
  } else if (results.length > 0) {
    body = results.map(card);
  } else {
    body = <p className="muted">Nenhum verbete encontrado.</p>;
  }

  return (
    <div className="screen ref" data-testid="ref-screen">
      <PanelTitle title={LANG_LABEL[lang]}>
        {`Referência rápida para a maratona. Alvo: ${LANG_TARGET[lang]}.`}
      </PanelTitle>
      <div className="ref-bar" data-panel="options">
        <input
          ref={box}
          type="search"
          className="ref-search"
          aria-label="Buscar na referência"
          placeholder="/ para buscar"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery("");
          }}
        />
        <span className="muted" data-testid="ref-count">
          {`${String(results.length)} verbetes`}
        </span>
        <button
          type="button"
          onClick={() => {
            window.print();
          }}
        >
          imprimir
        </button>
      </div>
      <div className="ref-body" data-panel="area">
        <nav className="ref-sections" aria-label="Seções">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              className="link"
              onClick={() => {
                document
                  .getElementById(sectionAnchor(lang, s.id))
                  ?.scrollIntoView({ block: "start" });
              }}
            >
              {s.title}
            </button>
          ))}
        </nav>
        <div className="ref-entries" data-testid="ref-entries">
          {body}
        </div>
      </div>
    </div>
  );
}

type CardProps = {
  readonly entry: Entry;
  readonly open: boolean;
  readonly copied: boolean;
  readonly onOpen: () => void;
  readonly onCopy: () => void;
};

function EntryCard({ entry, open, copied, onOpen, onCopy }: CardProps): ReactNode {
  const anchor = entryAnchor(entry.lang, entry.id);
  const { complexity } = entry;
  const pair = entry.pair !== undefined ? parseRefHash(entry.pair) : null;
  return (
    <article
      id={anchor}
      className="ref-entry"
      aria-labelledby={`${anchor}-title`}
      aria-current={open ? "true" : undefined}
      tabIndex={-1}
    >
      <header className="ref-entry-head">
        <h3 id={`${anchor}-title`}>
          <a
            href={`#${entry.lang}/${entry.id}`}
            onClick={(e) => {
              e.preventDefault();
              onOpen();
            }}
          >
            {entry.title}
          </a>
        </h3>
        {entry.since !== undefined && <span className="ref-badge">{entry.since}</span>}
        {entry.judge === true && <span className="ref-badge ref-judge">{JUDGE_BADGE}</span>}
      </header>
      <pre className="ref-signature" data-testid="ref-signature">
        <code>{entry.signature}</code>
      </pre>
      {typeof complexity === "string" && (
        <p className="ref-complexity" data-testid="ref-complexity">
          <span className="muted">complexidade:</span> {complexity}
        </p>
      )}
      {complexity !== undefined && typeof complexity !== "string" && (
        <table className="ref-table" aria-label="Complexidade">
          <tbody>
            {complexity.map(([op, cost]) => (
              <tr key={op}>
                <td>
                  <code>{op}</code>
                </td>
                <td>{cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="ref-example-head">
        <span className="muted">exemplo</span>
        <button type="button" className="link ref-copy" onClick={onCopy}>
          {copied ? "copiado" : "copiar"}
        </button>
      </div>
      <pre className="ref-code" data-testid="ref-example">
        <code>{entry.example}</code>
      </pre>
      {entry.input !== undefined && (
        <>
          <span className="muted">entrada</span>
          <pre className="ref-io" data-testid="ref-input">
            {entry.input}
          </pre>
        </>
      )}
      <span className="muted">saída</span>
      <pre className="ref-io" data-testid="ref-output">
        {entry.output}
      </pre>
      <ul className="ref-pitfalls">
        {entry.pitfalls.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <footer className="ref-links">
        {entry.link !== undefined && (
          <a className="ref-link" href={entry.link} target="_blank" rel="noreferrer">
            {LANG_DOCS[entry.lang]}
          </a>
        )}
        {pair !== null && (
          <a className="ref-link" href={`#${pair.lang}/${pair.id}`}>
            {`em ${LANG_LABEL[pair.lang]}`}
          </a>
        )}
      </footer>
    </article>
  );
}
