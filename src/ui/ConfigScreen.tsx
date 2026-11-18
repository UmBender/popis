import type { FormEvent, ReactNode } from "react";
import {
  validateArithmetic,
  type ArithmeticSettings,
  type Operation,
  type Range,
  type SettingsError,
} from "../gen/arithmetic";
import { DURATIONS_S } from "../session/engine";
import type { StoredSettings } from "../storage/history";

const ERROR_MESSAGES: Record<SettingsError, string> = {
  "no-operation": "Escolha pelo menos uma operação.",
  "inverted-range": "Uma faixa tem o mínimo maior que o máximo.",
  "non-integer": "As faixas aceitam só números inteiros.",
  "out-of-bounds": "As faixas vão de 0 a 1.000.000.",
  "division-by-zero": "Na divisão, a faixa à esquerda da multiplicação não pode incluir 0.",
};

type RangeKey = "addLeft" | "addRight" | "mulLeft" | "mulRight";

type Props = {
  readonly settings: StoredSettings;
  readonly onChange: (settings: StoredSettings) => void;
  readonly onStart: () => void;
};

export function ConfigScreen({ settings, onChange, onStart }: Props): ReactNode {
  const { arithmetic } = settings;
  const errors = validateArithmetic(arithmetic);

  const setArithmetic = (patch: Partial<ArithmeticSettings>) => {
    onChange({ ...settings, arithmetic: { ...arithmetic, ...patch } });
  };

  const toggle = (op: Operation) => {
    const enabled = arithmetic.operations.includes(op);
    setArithmetic({
      operations: enabled
        ? arithmetic.operations.filter((o) => o !== op)
        : [...arithmetic.operations, op],
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (errors.length === 0) onStart();
  };

  const checkbox = (op: Operation, label: string) => (
    <label className="op">
      <input
        type="checkbox"
        checked={arithmetic.operations.includes(op)}
        onChange={() => {
          toggle(op);
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
          setArithmetic({ [key]: { ...arithmetic[key], [end]: e.target.valueAsNumber } });
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
    <form className="screen config" onSubmit={submit}>
      <h1>Popis</h1>
      <p className="muted">Aritmética: responda o máximo de contas antes do tempo acabar.</p>

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
