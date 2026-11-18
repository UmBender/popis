---
id: T06
title: Revisar erros
status: in-progress
depends_on: [T05]
branch: task/T06-review
adrs: [ADR-T06-1]
tags: [task]
---

# T06 Revisar erros

## Goal

Um modo "Revisar" que refaz as questões em que a pessoa errou, pulou ou
foi lenta, regeradas a partir das seeds do histórico. Não precisa de
gerador novo: cada questão volta pelo gerador do modo em que apareceu.

## Spec

- **AC-1**: Os itens de revisão saem do histórico (`loadHistory`): questões
  puladas, questões com correções, e acertos lentos (tempo acima de 1,5×
  a média dos acertos da mesma habilidade naquela sessão). Sem repetir a
  mesma habilidade + seed; no máximo os 50 mais recentes (sessão mais
  nova primeiro, e dentro dela a última questão primeiro). Tempo esgotado
  no fim da partida não conta, nem com correções. Questões de todos os
  modos entram, aritmética inclusive.
  *Testes:* `src/storage/review.test.ts` ("review items …").
- **AC-2**: Cada item guarda o modo, a seed e os parâmetros da questão
  original; regenerar dá exatamente a mesma questão (prompt e resposta).
  Um item cujo regenerado não bate com o guardado (gerador mudou, dado
  corrompido) é descartado.
  *Testes:* `src/storage/review.prop.test.ts` (todo modo, muitas seeds),
  `src/storage/review.test.ts` ("review items drop …").
- **AC-3**: O gerador `review` escolhe um item pela seed da questão e
  delega `generate` e `check` ao gerador do modo original. A questão é a
  original (habilidade, seed e parâmetros), então as estatísticas por tipo
  continuam certas. O modo de uma questão é o prefixo da habilidade
  (`division.floor` → `division`), invariante testada no registro.
  *Testes:* `src/gen/review.test.ts`, `src/gen/review.prop.test.ts`
  (resposta canônica aceita; a questão é a do item; mesma seed → mesma
  questão), `src/modes.test.ts`.
- **AC-4**: Na configuração, o modo "Revisar" mostra quantos itens existem;
  sem itens, "Começar" fica desabilitado com a mensagem "Nada para revisar
  ainda".
  *Testes:* `src/ui/App.test.tsx` ("review mode …").
- **AC-5**: Enter pula; a sessão de revisão é salva com `mode: "review"`, e
  as questões dela também podem voltar numa revisão futura.
  *Testes:* `src/ui/App.test.tsx` ("review mode …"),
  `src/storage/review.test.ts` ("review items … review sessions").

## Decisões

- A lista de itens é montada quando a partida começa, a partir do
  histórico; ela não fica na configuração salva (ver
  [[ADR-T06-1 Review replays the original problems]]).

## Files owned

- `src/gen/review*.ts`, `src/modes.ts`, `src/modes.test.ts`,
  `src/storage/**`, `src/ui/**`, `vite.config.ts` (só limiares, pela
  política do batch)

## Subtasks (one commit each)

- [ ] spec — `docs(T06): specify review acceptance criteria`
- [ ] tests — `test(T06): add failing tests for review mode`
- [ ] models — `feat(T06): add review types and registry entry`
- [ ] behaviour — `feat(T06): implement review mode`
- [ ] quality — `chore(T06): pass lint, format and coverage ratchet`
- [ ] docs — `docs(T06): record review log`

## Log
