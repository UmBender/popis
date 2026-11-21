import type { FormEvent, ReactNode } from "react";
import type { AlgebraKind } from "../gen/algebra";
import type { ArithmeticSettings, Operation, Range } from "../gen/arithmetic";
import type { DivisionKind } from "../gen/division";
import type { EstimationKind } from "../gen/estimation";
import { LEVELS, type FactoringSettings, type Level } from "../gen/factoring";
import type { KindSettings } from "../gen/kinds";
import { PRIMES_LIMITS, type PrimesLimit } from "../gen/primes";
import type { SumsKind } from "../gen/sums";
import { MODES, type Mode } from "../modes";
import { DURATIONS_S } from "../session/engine";
import { TARGET_ACCURACY_STEPS } from "../stats/elo";
import type { Plateau } from "../stats/learning";
import type { Recommendation } from "../stats/recommend";
import type { StoredSettings } from "../storage/history";
import type { VimReviewCard } from "../storage/review";
import { Recommendations } from "./Recommendations";
import { RoundHistory } from "./shell/History";
import { PanelTitle } from "./shell/panel";

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  "no-operation": "Escolha pelo menos uma operação.",
  "inverted-range": "Uma faixa tem o mínimo maior que o máximo.",
  "non-integer": "As faixas aceitam só números inteiros.",
  "out-of-bounds": "As faixas vão de 0 a 1.000.000.",
  "division-by-zero": "Na divisão, a faixa à esquerda da multiplicação não pode incluir 0.",
  "no-level": "Escolha pelo menos um nível.",
  "no-kind": "Escolha pelo menos um tipo.",
  "nothing-to-review": "Nada para revisar ainda.",
};

/** A checkbox of a kind-based mode: its label and a sample. */
type KindOption<K extends string> = {
  readonly kind: K;
  readonly label: string;
  readonly example: string;
};

const DIVISION_OPTIONS: readonly KindOption<DivisionKind>[] = [
  { kind: "cpp-div", label: "C++: a / b", example: "−7 / 2 → −3" },
  { kind: "cpp-mod", label: "C++: a % b", example: "−7 % 3 → −1" },
  { kind: "floor", label: "Piso ⌊a / b⌋", example: "⌊−7 / 2⌋ → −4" },
  { kind: "ceil", label: "Teto ⌈a / b⌉", example: "⌈−7 / 2⌉ → −3" },
  { kind: "mod", label: "a mod b", example: "−7 mod 3 → 2" },
  { kind: "inequality", label: "Desigualdades", example: "maior x com 3x + 7 ≤ 50 → 14" },
];

const ALGEBRA_OPTIONS: readonly KindOption<AlgebraKind>[] = [
  { kind: "expand", label: "Expandir", example: "(2x − 3)(x + 5)" },
  { kind: "simplify", label: "Simplificar", example: "3(x − 2) − 2(x + 1) + x" },
  { kind: "square", label: "Completar o quadrado", example: "x² + 6x + 2 → (x + 3)² − 7" },
  { kind: "divide", label: "Dividir por (x − a)", example: "(x³ − 1) ÷ (x − 1)" },
];

const ESTIMATION_OPTIONS: readonly KindOption<EstimationKind>[] = [
  { kind: "complexity", label: "Complexidade", example: "n ≤ 2·10⁵, 1 s → O(n log n)" },
  { kind: "magnitude", label: "Ordem de grandeza", example: "O(n²) com n = 3·10⁴ → 10⁹" },
  { kind: "overflow", label: "Overflow", example: "20! → int64" },
];

const SUMS_OPTIONS: readonly KindOption<SumsKind>[] = [
  { kind: "sum", label: "Somatório Σ", example: "Σᵢ₌₁ⁿ i → n(n + 1)/2" },
  {
    kind: "loop",
    label: "Laços aninhados",
    example: "for i < n, for j < i: ops++ → (n² − n)/2",
  },
];

/** Error codes of the chosen mode's settings. */
function errorsOf<M extends Mode>(mode: M, settings: StoredSettings): readonly string[] {
  return MODES[mode].validate(settings[mode]);
}

/** Why the chosen mode cannot start now; empty when it can. */
export function configErrors(settings: StoredSettings, reviewCount: number): readonly string[] {
  return [
    ...errorsOf(settings.mode, settings),
    ...(settings.mode === "review" && reviewCount === 0 ? ["nothing-to-review"] : []),
  ];
}

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
  /** How many problems the review mode would replay now. */
  readonly reviewCount: number;
  readonly onChange: (settings: StoredSettings) => void;
  readonly onStart: () => void;
  /** Scores of the last rounds in this configuration, oldest first (T18). */
  readonly history: readonly number[];
  readonly weeklyRate?: number | null;
  readonly plateau?: Plateau | null;
  readonly onProgress?: () => void;
  /** Auto-level options for drills with levels/tiers (T24 AC-2). */
  readonly autoLevel?: boolean;
  readonly autoLevelCurrent?: number;
  readonly targetAccuracy?: number;
  readonly onAutoLevelChange?: (enabled: boolean) => void;
  readonly onTargetAccuracyChange?: (target: number) => void;
  /** Honest recommendations for this drill (T24 AC-5). */
  readonly recommendations?: readonly Recommendation[];
  /** Due Vim command cards shown in Revisar (T24 AC-3). */
  readonly vimReviewCards?: readonly VimReviewCard[];
  readonly onMarkVimCard?: (cardId: string, rating: 1 | 2 | 3 | 4) => void;
};

export function ConfigScreen({
  settings,
  reviewCount,
  onChange,
  onStart,
  history,
  weeklyRate,
  plateau,
  onProgress,
  autoLevel = false,
  autoLevelCurrent,
  targetAccuracy = 0.85,
  onAutoLevelChange,
  onTargetAccuracyChange,
  recommendations = [],
  vimReviewCards = [],
  onMarkVimCard,
}: Props): ReactNode {
  const reviewing = settings.mode === "review";
  const errors = configErrors(settings, reviewCount);
  const supportsAutoLevel =
    settings.mode === "arithmetic" ||
    settings.mode === "estimation" ||
    settings.mode === "sums";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (errors.length === 0) onStart();
  };

  return (
    <form className="screen config" onSubmit={submit}>
      <PanelTitle title={MODES[settings.mode].label}>{MODES[settings.mode].hint}</PanelTitle>

      <div className="fields" data-panel="options">
        {reviewing && reviewCount > 0 && (
          <p data-testid="review-count">
            {reviewCount === 1
              ? "1 questão para revisar"
              : `${String(reviewCount)} questões para revisar`}
          </p>
        )}

        {reviewing && vimReviewCards.length > 0 && (
          <div className="vim-review-list" data-testid="vim-review-cards">
            <h3>Comandos de Vim vencidos</h3>
            <ul>
              {vimReviewCards.map((card) => (
                <li key={card.id} className="vim-review-card">
                  <span>{card.label}</span>
                  {onMarkVimCard !== undefined && (
                    <span className="vim-review-actions">
                      <button
                        type="button"
                        onClick={() => {
                          onMarkVimCard(card.id, 3);
                        }}
                      >
                        Acertei
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onMarkVimCard(card.id, 1);
                        }}
                      >
                        Errei
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {settings.mode === "arithmetic" && (
          <ArithmeticFields
            arithmetic={settings.arithmetic}
            onChange={(arithmetic) => {
              onChange({ ...settings, arithmetic });
            }}
          />
        )}
        {settings.mode === "factoring" && (
          <FactoringFields
            factoring={settings.factoring}
            onChange={(factoring) => {
              onChange({ ...settings, factoring });
            }}
          />
        )}
        {settings.mode === "algebra" && (
          <KindFields
            options={ALGEBRA_OPTIONS}
            settings={settings.algebra}
            onChange={(algebra) => {
              onChange({ ...settings, algebra });
            }}
          />
        )}
        {settings.mode === "sums" && (
          <KindFields
            options={SUMS_OPTIONS}
            settings={settings.sums}
            onChange={(sums) => {
              onChange({ ...settings, sums });
            }}
          />
        )}
        {settings.mode === "primes" && (
          <label className="row">
            Limite
            <select
              value={settings.primes.limit}
              onChange={(e) => {
                onChange({ ...settings, primes: { limit: Number(e.target.value) as PrimesLimit } });
              }}
            >
              {PRIMES_LIMITS.map((limit) => (
                <option key={limit} value={limit}>
                  {limit.toLocaleString("pt-BR")}
                </option>
              ))}
            </select>
          </label>
        )}
        {settings.mode === "division" && (
          <KindFields
            options={DIVISION_OPTIONS}
            settings={settings.division}
            onChange={(division) => {
              onChange({ ...settings, division });
            }}
          />
        )}
        {settings.mode === "estimation" && (
          <KindFields
            options={ESTIMATION_OPTIONS}
            settings={settings.estimation}
            onChange={(estimation) => {
              onChange({ ...settings, estimation });
            }}
          />
        )}

        {supportsAutoLevel && onAutoLevelChange !== undefined && (
          <div className="auto-level-controls">
            <label className="op">
              <input
                type="checkbox"
                checked={autoLevel}
                onChange={(e) => {
                  onAutoLevelChange(e.target.checked);
                }}
              />
              {autoLevel && autoLevelCurrent !== undefined
                ? `Nível automático (nível ${String(autoLevelCurrent)})`
                : "Nível automático"}
            </label>
            {autoLevel && onTargetAccuracyChange !== undefined && (
              <label className="row">
                Meta de acerto
                <select
                  aria-label="Meta de acerto"
                  value={String(targetAccuracy)}
                  onChange={(e) => {
                    onTargetAccuracyChange(Number(e.target.value));
                  }}
                >
                  {TARGET_ACCURACY_STEPS.map((step) => (
                    <option key={step} value={String(step)}>
                      {`${String(Math.round(step * 100))}%`}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
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

        <Recommendations items={recommendations} />
      </div>

      <RoundHistory
        scores={history}
        weeklyRate={weeklyRate}
        plateau={plateau}
        onProgress={onProgress}
        testId="mode-history"
        sparkTestId="mode-spark"
      />

      <div className="actions">
        <button
          type="submit"
          className="primary start"
          aria-label="Começar"
          disabled={errors.length > 0}
        >
          Começar <kbd>Enter</kbd>
        </button>
      </div>
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
      <span className="range-group">
        ({bound(left, "min", `${name}: mínimo à esquerda`)} a{" "}
        {bound(left, "max", `${name}: máximo à esquerda`)})
      </span>{" "}
      <span className="range-op">{symbol}</span>{" "}
      <span className="range-group">
        ({bound(right, "min", `${name}: mínimo à direita`)} a{" "}
        {bound(right, "max", `${name}: máximo à direita`)})
      </span>
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

function KindFields<K extends string>({
  options,
  settings,
  onChange,
}: {
  readonly options: readonly KindOption<K>[];
  readonly settings: KindSettings<K>;
  readonly onChange: (settings: KindSettings<K>) => void;
}): ReactNode {
  return (
    <div className="levels">
      {options.map(({ kind, label, example }) => {
        const enabled = settings.kinds.includes(kind);
        return (
          <label key={kind} className="op">
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => {
                onChange({
                  kinds: enabled
                    ? settings.kinds.filter((k) => k !== kind)
                    : options
                        .map((o) => o.kind)
                        .filter((k) => k === kind || settings.kinds.includes(k)),
                });
              }}
            />
            {label}
            <span className="muted example">{example}</span>
          </label>
        );
      })}
    </div>
  );
}
