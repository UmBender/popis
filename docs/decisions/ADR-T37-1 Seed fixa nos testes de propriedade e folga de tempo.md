---
id: ADR-T37-1
title: Seed fixa nos testes de propriedade e folga de tempo
status: accepted
kind: decision
date: 2026-11-22
task: T37
builds_on: []
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T37-1 Seed fixa nos testes de propriedade e folga de tempo

## Context

O AGENTS.md pede determinismo ("um teste que passa às vezes é um bug"),
mas o fast-check sorteava uma seed nova a cada execução do `check`. A
coverage de pastas com limite de 100% dependia de ramos raros que só
alguns sorteios alcançam (T35). Além disso, com a suíte crescendo para 166
arquivos, testes pesados e de tela passaram a estourar os limites de
tempo (120 s e o padrão de 5 s) num notebook na bateria ou quente. O
runner do batch verifica cada task com check + coverage, e essas falhas
bloqueiam tasks corretas.

## Decision

- `tests/setup.ts` fixa a seed do fast-check (`20261122`) quando
  `FC_NUM_RUNS` não está definido, ou seja, no `check` e na `coverage`.
  `FC_SEED=<n>` sempre escolhe a seed. O `test:fuzz` define
  `FC_NUM_RUNS` e continua sorteando uma seed por execução; a falha
  imprime a seed, que se reproduz com `FC_SEED`.
- `vite.config.ts` define `testTimeout: 20_000`, e o teste de um ano de
  armazenamento passa a ter 300 s. Os limites de tempo não fazem parte do
  que os testes verificam; as asserções não mudam.

## Alternatives considered

- **Só casos fixos para cada ramo raro (como a T35)**: corrige um ramo por
  vez, depois que ele já falhou, e não protege ramos novos.
- **Menos workers na coverage**: medido com 4 workers, o teste de um ano
  levou 140 s. A lentidão vem da máquina, não da disputa entre workers.
- **Tirar o teste de um ano do `check`**: tiraria do gate uma garantia
  de orçamento de armazenamento (T22).

## Consequences

- `check` e `coverage` ficam reproduzíveis: o mesmo código dá a mesma
  cobertura.
- O `check` explora sempre os mesmos 200 casos por propriedade. A
  exploração aleatória fica no `test:fuzz`, que precisa rodar com alguma
  frequência (o passo de qualidade das tasks já costuma rodá-lo).
- Um teste travado demora até 20 s para falhar, em vez de 5 s.

## Rollback plan

Reverter o commit `fix(T37)` e escrever um ADR `kind: rollback` que
aponte para este.
