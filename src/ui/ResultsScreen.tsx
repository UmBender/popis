import type { ReactNode } from "react";
import type { Attempt } from "../session/engine";
import { summarize } from "../session/stats";
import { MODES, type Mode } from "../modes";
import { answerText, seconds, skillLabel } from "./format";

/** How many of the slowest answers the results list. */
const SLOWEST = 10;

type Props = {
  readonly log: readonly Attempt[];
  readonly mode: Mode;
  readonly onPlayAgain: () => void;
  readonly onConfigure: () => void;
};

export function ResultsScreen({ log, mode, onPlayAgain, onConfigure }: Props): ReactNode {
  const summary = summarize(log, SLOWEST);
  const skipped = log.filter((a) => a.outcome === "skipped");
  const group = MODES[mode].group;

  return (
    <div className="screen results">
      <h1>Resultado</h1>
      <p className="score">
        Pontos: <strong data-testid="final-score">{summary.score}</strong>
      </p>
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

      <div className="actions">
        <button type="button" className="primary" autoFocus onClick={onPlayAgain}>
          Jogar de novo
        </button>
        <button type="button" onClick={onConfigure}>
          Configurar
        </button>
      </div>
    </div>
  );
}
