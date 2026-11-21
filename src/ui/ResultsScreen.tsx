import type { ReactNode } from "react";
import type { Attempt } from "../session/engine";
import { summarize } from "../session/stats";
import { MODES, type Mode } from "../modes";
import { answerText, seconds, skillLabel } from "./format";
import { Result } from "./shell/Result";
import { scoreboard } from "./verdicts";

/** How many of the slowest answers the results list. */
const SLOWEST = 10;

type Props = {
  readonly log: readonly Attempt[];
  readonly mode: Mode;
  /** Seed and length of the round (T18). */
  readonly seed: number;
  readonly durationMs: number;
  /** The best score in this configuration, this round included. */
  readonly best: number;
  readonly onPlayAgain: () => void;
  readonly onConfigure: () => void;
};

export function ResultsScreen({
  log,
  mode,
  seed,
  durationMs,
  best,
  onPlayAgain,
  onConfigure,
}: Props): ReactNode {
  const summary = summarize(log, SLOWEST);
  const skipped = log.filter((a) => a.outcome === "skipped");
  const group = MODES[mode].group;
  const wrong = log.reduce((n, a) => n + a.corrections, 0);
  const board = scoreboard(log);
  const columns = Math.max(0, ...board.map((row) => row.cells.length));

  return (
    <div className="screen results">
      <Result
        headline={
          <>
            <strong data-testid="final-score">{summary.score}</strong>
            {` resolvidas em ${String(Math.round(durationMs / 1000))} s`}
          </>
        }
        headlineTestId="results-solved"
        pairs={[
          { label: "tentativas erradas", value: wrong },
          { label: "puladas", value: summary.skipped },
          { label: "seu recorde", value: best },
        ]}
        pairsTestId="results-pairs"
        extra={
          board.length > 0 ? (
            <div className="standings-wrap">
              <table className="standings" aria-label="Placar da rodada">
                <thead>
                  <tr>
                    <th scope="col">{group.column}</th>
                    {Array.from({ length: columns }, (_, i) => (
                      <th key={i} scope="col">
                        {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {board.map((row) => (
                    <tr key={row.skill}>
                      <td>{row.skill}</td>
                      {Array.from({ length: columns }, (_, i) => {
                        const cell = row.cells[i];
                        return cell === undefined ? (
                          <td key={i} />
                        ) : (
                          <td key={i} className={cell.tone}>
                            {cell.mark}
                            <small>{cell.note}</small>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : undefined
        }
        seed={`seed ${String(seed)}`}
        seedTestId="results-seed"
        onPlayAgain={onPlayAgain}
        actions={
          <button type="button" onClick={onConfigure}>
            Configurar
          </button>
        }
      />

      {summary.meanMs !== null && (
        <p className="muted">Tempo médio por acerto: {seconds(summary.meanMs)}</p>
      )}
      {summary.skipped > 0 && <p className="muted">Puladas: {summary.skipped}</p>}

      {summary.bySkill.length > 0 && (
        <table>
          <caption>{group.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{group.column}</th>
              <th scope="col">Acertos</th>
              <th scope="col">Tempo médio</th>
            </tr>
          </thead>
          <tbody>
            {summary.bySkill.map((s) => (
              <tr key={s.skill}>
                <td>{skillLabel(s.skill)}</td>
                <td>{s.count}</td>
                <td>{seconds(s.meanMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {summary.slowest.length > 0 && (
        <table>
          <caption>Mais lentas</caption>
          <thead>
            <tr>
              <th scope="col">Questão</th>
              <th scope="col">Resposta</th>
              <th scope="col">Tempo</th>
              <th scope="col">Correções</th>
              <th scope="col">Seed</th>
            </tr>
          </thead>
          <tbody>
            {summary.slowest.map((a, i) => (
              <tr key={i}>
                <td>{a.problem.prompt}</td>
                <td>{answerText(a.problem)}</td>
                <td>{seconds(a.timeMs)}</td>
                <td>{a.corrections}</td>
                <td className="seed">{a.problem.seed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {skipped.length > 0 && (
        <table>
          <caption>Puladas</caption>
          <thead>
            <tr>
              <th scope="col">Questão</th>
              <th scope="col">Resposta</th>
              <th scope="col">Seed</th>
            </tr>
          </thead>
          <tbody>
            {skipped.map((a, i) => (
              <tr key={i}>
                <td>{a.problem.prompt}</td>
                <td>{answerText(a.problem)}</td>
                <td className="seed">{a.problem.seed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
