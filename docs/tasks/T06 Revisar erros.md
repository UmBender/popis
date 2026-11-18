---
id: T06
title: Revisar erros
status: done
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

- [x] spec — `docs(T06): specify review acceptance criteria`
- [x] tests — `test(T06): add failing tests for review mode`
- [x] models — `feat(T06): add review types and registry entry`
- [x] behaviour — `feat(T06): implement review mode`
- [x] quality — `chore(T06): pass lint, format and coverage ratchet`
- [x] docs — `docs(T06): record review log`

## Log

- 2026-11-18 — Implementado em batch (sem ninguém no teclado), na branch
  `task/T06-review` a partir de `main`.
  - `src/gen/review.ts`: `createReview(resolve)` monta o gerador; ele
    sorteia um item com o RNG da seed da questão e devolve a questão
    original do modo do item. `check` delega pelo prefixo da habilidade
    (`modeOfSkill`). `src/modes.ts` registra o modo `review` (último no
    menu) e resolve só os outros modos (uma questão de revisão nunca vira
    item de revisão).
  - `src/storage/review.ts`: `reviewItems(history)` monta a lista; o
    `App` a lê de novo cada vez que a configuração aparece (contagem) e ao
    começar (parâmetros do gerador). As configurações salvas guardam
    `review: { items: [] }`.
  - Decisão registrada em [[ADR-T06-1 Review replays the original problems]].
- UNATTENDED CHOICE: a média do "acerto lento" é a dos **acertos** da
  habilidade na sessão (puladas não entram na média). Recomendado porque
  uma pulada demorada inflaria a média e esconderia acertos lentos.
- UNATTENDED CHOICE: o tempo esgotado no fim da partida não entra nem com
  correções; uma questão errada e depois acertada (com correções) entra.
- UNATTENDED CHOICE: um item cujo regenerado não bate com a questão
  guardada (habilidade, prompt ou resposta), ou cujos parâmetros não
  passam no `parseSettings`/`validate` do modo, é descartado em silêncio
  em vez de bloquear (nenhum caso real apareceu; o teste de propriedade
  `src/storage/review.prop.test.ts` confirma que todo modo regenera
  exatamente).
- UNATTENDED CHOICE: a revisão sorteia itens com reposição (o gerador só
  vê a seed), então com poucos itens a mesma questão pode voltar seguida.
- UNATTENDED CHOICE: o modo usa teclado de texto (`numeric: false`) e
  caixa larga, porque mistura contas e expressões.
- UNATTENDED CHOICE: "Jogar de novo" numa revisão sem itens restantes
  (o histórico cheio descartou a sessão de origem) volta para a
  configuração, que mostra "Nada para revisar ainda.".
- Files owned ampliados: `src/modes.test.ts` (teste ao lado de
  `src/modes.ts`, invariante do prefixo da habilidade) e `vite.config.ts`
  (limiar de branches de `src/ui/**` subiu de 93 para 94; política do
  batch).
- Sem teste e2e novo: `tests/e2e/` está fora dos *Files owned*; o fluxo
  (jogar, pular, revisar) está coberto em `src/ui/App.test.tsx` com o
  armazenamento em memória. Verificação manual para o dono: jogar uma
  partida, pular algo e revisar no navegador.
- Gates no último commit de código: `npm run check` verde (344 testes),
  `npm run coverage` sem `ERROR`, `npm run test:fuzz` verde (8 arquivos de
  propriedade), `npm run test:e2e` verde (3 testes).
