---
id: ADR-T06-1
title: Review replays the original problems
status: accepted
kind: decision
date: 2026-11-18
task: T06
builds_on: [ADR-0002]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T06-1 Review replays the original problems

## Context

O modo "Revisar" (T06) refaz questões do histórico. Uma questão guardada
tem `skill`, `seed` e `params`, mas não o modo: o modo fica no registro da
sessão. Numa sessão de revisão o modo é `review`, e as questões dela
precisam voltar numa revisão futura. Além disso, o motor da sessão só
conhece um gerador por partida, e `Generator.check` recebe só a questão.

## Decision

- Um item de revisão é `{ mode, seed, params }`. A lista de itens é montada
  por `reviewItems(loadHistory(...))` (`src/storage/review.ts`) quando a
  partida começa, e vai nos parâmetros do gerador `review`
  (`{ items }`). Nas configurações salvas, `review` é sempre
  `{ items: [] }`: `parseSettings` ignora o que estiver guardado.
- O gerador `review` (`src/gen/review.ts`, criado por `createReview`)
  escolhe um item com o RNG da seed da questão e devolve **a questão
  original**, gerada pelo gerador do modo do item: habilidade, seed e
  parâmetros são os originais.
- O modo de uma questão é o prefixo da habilidade antes do primeiro ponto
  (`division.floor` → `division`). `check` delega por esse prefixo, e
  `reviewItems` o usa para todas as sessões, inclusive as de revisão. Um
  teste do registro garante que todo modo gera habilidades com o próprio
  id como prefixo.
- `reviewItems` só aceita um item se os parâmetros passam no
  `parseSettings` do modo e se regenerar dá a mesma habilidade, prompt e
  resposta da questão guardada.

## Alternatives considered

- **A questão de revisão guarda o item em `params`** — o modo fica
  explícito, mas a questão deixa de ser a original, `seed` + `params` não
  a regeneram mais pelo gerador do modo, e o histórico teria dois formatos
  de questão.
- **Guardar os itens nas configurações** — a lista ficaria velha (o
  histórico muda a cada partida) e incharia `popis.settings.v1`.
- **Um campo `mode` na questão** — muda o tipo `Problem` de todos os
  geradores e o formato do histórico já salvo.

## Consequences

- Um modo novo precisa gerar habilidades `<id do modo>.<algo>`; o teste do
  registro falha se não gerar.
- O registro de uma sessão de revisão guarda os itens em `params` (até 50
  itens pequenos por sessão).
- Mudar um gerador de forma que a mesma seed dê outra questão faz os itens
  antigos sumirem da revisão em vez de mostrarem outra questão.

## Rollback plan

Remover `review` de `src/modes.ts` e de `DEFAULT_SETTINGS`, apagar
`src/gen/review*.ts`, `src/storage/review*.ts` e o caso em `App.tsx` e
`ConfigScreen.tsx`. Sessões `review` já salvas ficam no histórico; nada
mais as lê.
