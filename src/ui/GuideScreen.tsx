import { useMemo, useState, type ReactNode } from "react";
import { GUIDE_ITEMS, GUIDE_SECTIONS, type GuideLink } from "../guide/content";
import {
  loadGuideState,
  resetGuideState,
  saveGuideState,
  toggleGuideItem,
  type GuideState,
} from "../storage/guide";
import type { KeyValueStore } from "../storage/history";
import { PanelTitle } from "./shell/panel";

export type GuideScreenProps = {
  readonly store: KeyValueStore;
  readonly onOpenLink: (link: GuideLink) => void;
};

/** Printable contest guide with persistent checklists and links to drills (T44 AC-2, ADR-T44-1). */
export function GuideScreen({ store, onOpenLink }: GuideScreenProps): ReactNode {
  const [state, setState] = useState<GuideState>(() => loadGuideState(store));
  const checkedSet = useMemo(() => new Set(state.checked), [state.checked]);

  const handleToggle = (id: string) => {
    const next = toggleGuideItem(state, id);
    saveGuideState(store, next);
    setState(next);
  };

  const handleReset = () => {
    setState(resetGuideState(store));
  };

  return (
    <div className="screen guide" data-testid="guide-screen">
      <PanelTitle title="Guia">
        Listas de checagem da maratona, imprimíveis em uma página A4 para o caderno do time.
      </PanelTitle>
      <div className="guide-bar" data-panel="options">
        <span className="muted" data-testid="guide-progress">
          {`${String(state.checked.length)}/${String(GUIDE_ITEMS.length)} marcados`}
        </span>
        <button type="button" onClick={handleReset}>
          Nova prova
        </button>
        <button
          type="button"
          onClick={() => {
            window.print();
          }}
        >
          Imprimir
        </button>
      </div>
      <div className="guide-sections" data-panel="area" data-testid="guide-sections">
        {GUIDE_SECTIONS.map((section) => (
          <section
            key={section.id}
            className="guide-section"
            aria-labelledby={`guide-section-${section.id}`}
          >
            <h2 id={`guide-section-${section.id}`}>{section.title}</h2>
            <ul className="guide-list">
              {section.items.map((item) => {
                const { link } = item;
                return (
                  <li key={item.id} className="guide-item">
                    <label className="guide-check">
                      <input
                        type="checkbox"
                        checked={checkedSet.has(item.id)}
                        onChange={() => {
                          handleToggle(item.id);
                        }}
                      />
                      <span>{item.text}</span>
                    </label>
                    {link !== undefined && (
                      <button
                        type="button"
                        className="link guide-link"
                        onClick={() => {
                          onOpenLink(link);
                        }}
                      >
                        {link.label}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
