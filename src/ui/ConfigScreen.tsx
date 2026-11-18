import type { FormEvent, ReactNode } from "react";
import {
  validateArithmetic,
  type ArithmeticSettings,
  type Operation,
  type Range,
  type SettingsError,
} from "../gen/arithmetic";
import {
  LEVELS,
  validateFactoring,
  type FactoringError,
  type FactoringSettings,
  type Level,
} from "../gen/factoring";
import { DURATIONS_S } from "../session/engine";
import type { Mode, StoredSettings } from "../storage/history";

const ERROR_MESSAGES: Record<SettingsError | FactoringError, string> = {
  "no-operation": "Escolha pelo menos uma operação.",
  "inverted-range": "Uma faixa tem o mínimo maior que o máximo.",
  "non-integer": "As faixas aceitam só números inteiros.",
  "out-of-bounds": "As faixas vão de 0 a 1.000.000.",
  "division-by-zero": "Na divisão, a faixa à esquerda da multiplicação não pode incluir 0.",
  "no-level": "Escolha pelo menos um nível.",
};

const MODES: readonly { mode: Mode; label: string; hint: string }[] = [
  {
    mode: "arithmetic",
    label: "Aritmética",
    hint: "Responda o máximo de contas antes do tempo acabar.",
  },
  {
    mode: "factoring",
    label: "Fatoração",
    hint: "Digite a forma fatorada, como (x-5)(x+3). Enter pula a questão.",
  },
];

const LEVEL_LABELS: Readonly<Record<Level, { name: string; example: string }>> = {
  1: { name: "quadrática mônica", example: "x² − 2x − 15" },
  2: { name: "quadrática não mônica", example: "6x² + x − 2" },
  3: { name: "fator comum", example: "3x² − 12x + 9" },
  4: { name: "produtos notáveis", example: "4x² − 25, x³ − 8" },
  5: { name: "cúbica com 3 raízes", example: "x³ − 7x + 6" },
  6: { name: "duas variáveis", example: "x² − 5xy + 6y²" },
};

type RangeKey = "addLeft" | "addRight" | "mulLeft" | "mulRight";

type Props = {
  readonly settings: StoredSettings;
  readonly onChange: (settings: StoredSettings) => void;
  readonly onStart: () => void;
};

export function ConfigScreen({ settings, onChange, onStart }: Props): ReactNode {
  const errors =
    settings.mode === "arithmetic"
      ? validateArithmetic(settings.arithmetic)
      : validateFactoring(settings.factoring);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (errors.length === 0) onStart();
  };

  return (
    <form className="screen config" onSubmit={submit}>
      <h1>Popis</h1>

      <fieldset className="modes">
        <legend>Modo</legend>
        {MODES.map(({ mode, label }) => (
          <label key={mode} className="op">
            <input
              type="radio"
              name="mode"
              checked={settings.mode === mode}
              onChange={() => {
                onChange({ ...settings, mode });
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <p className="muted">{MODES.find((m) => m.mode === settings.mode)?.hint}</p>

      {settings.mode === "arithmetic" ? (
        <ArithmeticFields
          arithmetic={settings.arithmetic}
          onChange={(arithmetic) => {
            onChange({ ...settings, arithmetic });
          }}
        />
      ) : (
        <FactoringFields
          factoring={settings.factoring}
          onChange={(factoring) => {
            onChange({ ...settings, factoring });
          }}
        />
      )}

      <label className="row">
        Duração
        <select
          value={settings.durationS}
          onChange={(e) => {
            onChange({ ...settings, durationS: Number(e.target.value) });
          }}
        >
          {DURATIONS_S.map((s) => (
            <option key={s} value={s}>
              {s} s
            </option>
          ))}
        </select>
      </label>

      {errors.length > 0 && (
        <ul role="alert" className="errors">
          {errors.map((e) => (
            <li key={e}>{ERROR_MESSAGES[e]}</li>
          ))}
        </ul>
      )}

      <button type="submit" className="primary" disabled={errors.length > 0}>
        Começar
      </button>
    </form>
  );
}

function ArithmeticFields({
  arithmetic,
  onChange,
}: {
  readonly arithmetic: ArithmeticSettings;
  readonly onChange: (arithmetic: ArithmeticSettings) => void;
}): ReactNode {
  const patch = (changes: Partial<ArithmeticSettings>) => {
    onChange({ ...arithmetic, ...changes });
  };

  const checkbox = (op: Operation, label: string) => (
    <label className="op">
      <input
        type="checkbox"
        checked={arithmetic.operations.includes(op)}
        onChange={() => {
          const enabled = arithmetic.operations.includes(op);
          patch({
            operations: enabled
              ? arithmetic.operations.filter((o) => o !== op)
              : [...arithmetic.operations, op],
          });
        }}
      />
      {label}
    </label>
  );

  const bound = (key: RangeKey, end: keyof Range, label: string) => {
    const value = arithmetic[key][end];
    return (
      <input
        type="number"
        className="bound"
        aria-label={label}
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) => {
          patch({ [key]: { ...arithmetic[key], [end]: e.target.valueAsNumber } });
        }}
      />
    );
  };

  const rangePair = (name: string, left: RangeKey, right: RangeKey, symbol: string) => (
    <span className="ranges">
      ({bound(left, "min", `${name}: mínimo à esquerda`)} a{" "}
      {bound(left, "max", `${name}: máximo à esquerda`)}) {symbol} (
      {bound(right, "min", `${name}: mínimo à direita`)} a{" "}
      {bound(right, "max", `${name}: máximo à direita`)})
    </span>
  );

  return (
    <>
      <div className="row">
        {checkbox("add", "Adição")}
        {rangePair("Adição", "addLeft", "addRight", "+")}
      </div>
      <div className="row">
        {checkbox("sub", "Subtração")}
        <span className="muted">Adição ao contrário</span>
      </div>
      <div className="row">
        {checkbox("mul", "Multiplicação")}
        {rangePair("Multiplicação", "mulLeft", "mulRight", "×")}
      </div>
      <div className="row">
        {checkbox("div", "Divisão")}
        <span className="muted">Multiplicação ao contrário</span>
      </div>
    </>
  );
}

function FactoringFields({
  factoring,
  onChange,
}: {
  readonly factoring: FactoringSettings;
  readonly onChange: (factoring: FactoringSettings) => void;
}): ReactNode {
  return (
    <div className="levels">
      {LEVELS.map((level) => {
        const enabled = factoring.levels.includes(level);
        const { name, example } = LEVEL_LABELS[level];
        return (
          <label key={level} className="op">
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => {
                onChange({
                  levels: enabled
                    ? factoring.levels.filter((l) => l !== level)
                    : LEVELS.filter((l) => l === level || factoring.levels.includes(l)),
                });
              }}
            />
            Nível {level}: {name}
            <span className="muted example">{example}</span>
          </label>
        );
      })}
    </div>
  );
}
