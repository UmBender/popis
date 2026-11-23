---
id: T37
title: Gates estáveis
status: done
depends_on: []
branch: fix/stable-gates
adrs: [ADR-T37-1]
tags: [task, bug]
---

# T37 Gates estáveis

## Goal

`npm run check` e `npm run coverage` dão o mesmo resultado em toda
execução do mesmo código, inclusive com o notebook na bateria ou quente.
Hoje eles falham por dois motivos que não têm nada a ver com o código:
a sorte dos testes de propriedade e o tempo de execução.

## O bug

- **Sorte:** o fast-check sorteia uma seed nova a cada execução. Ramos
  raros só eram alcançados por alguns sorteios, e a coverage de
  `src/vim/**` (limite de 100%) falhava por azar. A T35 cobriu os ramos de
  `motions.ts`, mas outros ramos raros podem ter o mesmo problema.
- **Tempo:** no batch de 2026-11-22, com a suíte inteira (166
  arquivos), notebook i5-8250U na bateria ou a 80–90 °C, estes testes
  estouraram o tempo, embora passem isolados:
  - `src/storage/size.test.ts` "a year of daily practice stays under
    3 MB": 122–149 s contra o limite próprio de 120 s; isolado, cerca
    de 60 s;
  - testes de tela perto do padrão de 5 s do Vitest: WeakTypingScreen
    "result shows before and after per n-gram" (5,4–7,1 s) e
    VimScreenEdit "the kinds can be switched off one by one, but not all"
    (5,2–8,1 s).

  O runner do batch verifica cada task com check + coverage, então essas
  falhas bloqueiam tasks que estão certas.

## Spec

- **AC-1**: fora do `test:fuzz`, os testes de propriedade usam uma seed
  fixa. `FC_SEED=<n>` escolhe outra, e o `test:fuzz` (com
  `FC_NUM_RUNS`) sorteia uma seed nova a cada execução, como antes.
  - Testes: `tests/regressions/T37-stable-gates.test.ts` ("property tests run with a fixed seed outside fuzzing").
- **AC-2**: os limites de tempo têm folga para uma máquina lenta e
  carregada: 20 s por teste por padrão, e 300 s para o teste de um ano
  de armazenamento. Nenhuma asserção muda.
  - Testes: `tests/regressions/T37-stable-gates.test.ts` ("tests get a 20 s default timeout and the year-of-storage test 300 s").

## Out of scope

- O teste de desempenho de 16 ms da T21 (`src/vim/optimal.test.ts`). Ele
  já mede a mais rápida de 5 execuções, e o tempo é a própria asserção.
  Falhou só sob coverage, com o agy rodando ou a CPU a 91 °C, e fica como
  está.

## Files owned

- `tests/setup.ts`, `vite.config.ts`, `src/storage/size.test.ts`
- `tests/regressions/T37-stable-gates.test.ts`
- `AGENTS.md` (uma linha sobre `FC_SEED` no `test:fuzz`)

## Log

- 2026-11-22: o teste de regressão foi commitado vermelho (seed
  `undefined`, sem `testTimeout`) e passa com a correção.
- 2026-11-23: seed conferida nos três modos: `check` usa `20261122/200`;
  `FC_NUM_RUNS=300` sorteia (`undefined/300`); `FC_SEED=7` usa `7/300`.
- 2026-11-23: com o notebook **na bateria**, `npm run check` passou
  (167 arquivos, 4257 testes), e `npm run coverage` passou duas vezes
  seguidas com tabelas idênticas (99,82% de comandos e 98,74% de ramos),
  sem nenhum timeout. Antes, nas mesmas condições, falhava em 2 ou 3
  testes de tempo.

