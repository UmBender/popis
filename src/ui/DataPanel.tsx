import { useState, type ChangeEvent, type ReactNode } from "react";
import type { Clock } from "../core/clock";
import { backupFileName, exportData, importData, type ImportResult } from "../storage/backup";
import { clearQuotaNotice, quotaNoticePending } from "../storage/daily";
import type { KeyValueStore } from "../storage/history";
import { saveFile } from "./download";

export type DataPanelProps = {
  readonly store: KeyValueStore;
  readonly clock: Clock;
  /** Hands a file to the player; the browser's download by default. */
  readonly save?: (name: string, text: string) => void;
};

const ERRORS = {
  invalid: "Arquivo inválido: não é um backup do POPIS.",
  app: "Este arquivo é de outro app.",
  version: "Este backup tem uma versão que o app não entende.",
} as const;

function readText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(String(reader.result));
    };
    reader.readAsText(file);
  });
}

function describe(result: ImportResult): { readonly status?: string; readonly error?: string } {
  if (!result.ok) return { error: ERRORS[result.error] };
  const noun = result.added === 1 ? "registro novo" : "registros novos";
  return { status: `Importado: ${String(result.added)} ${noun}.` };
}

/** Export and import of everything the app stores (ADR-T22-1). */
export function DataPanel({ store, clock, save = saveFile }: DataPanelProps): ReactNode {
  const [outcome, setOutcome] = useState<ReturnType<typeof describe>>({});
  const [notice, setNotice] = useState(() => quotaNoticePending(store));

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (file === undefined) return;
    void readText(file).then((text) => {
      setOutcome(describe(importData(store, text, clock.wallTime())));
    });
    input.value = "";
  };

  return (
    <fieldset className="modes data-panel">
      <legend>Dados</legend>
      {notice && (
        <p role="alert" className="errors">
          O armazenamento do navegador encheu, e os registros mais antigos foram resumidos. Exporte
          seus dados para guardar uma cópia.{" "}
          <button
            type="button"
            onClick={() => {
              clearQuotaNotice(store);
              setNotice(false);
            }}
          >
            Entendi
          </button>
        </p>
      )}
      <div className="actions">
        <button
          type="button"
          onClick={() => {
            const now = clock.wallTime();
            save(backupFileName(now), exportData(store, now));
          }}
        >
          Exportar dados
        </button>
        <label className="op">
          Importar dados
          <input type="file" accept="application/json,.json" onChange={pick} />
        </label>
      </div>
      {outcome.status !== undefined && <p role="status">{outcome.status}</p>}
      {outcome.error !== undefined && (
        <p role="alert" className="errors">
          {outcome.error}
        </p>
      )}
    </fieldset>
  );
}
