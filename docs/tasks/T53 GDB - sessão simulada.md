---
id: T53
title: GDB - sessão simulada
status: todo
depends_on: [T27]
branch: task/T53-gdb-session
adrs: []
tags: [task]
---

# T53 GDB - sessão simulada

## Goal

Um item **Sessão** na pasta GDB, onde a pessoa depura de verdade. Aparece
um programa com bug e uma entrada que o faz falhar, junto com uma
pergunta ("qual o valor de `ans` quando `i == 7`?", "em que linha o
índice sai do array?"). A pessoa conduz a sessão com `break`, `run`,
`next`, `watch` e os outros comandos até achar a resposta. Por trás está
o interpretador da [[T27 GDB - interpretador e tabela de linhas]], e um
**motor de sessão** responde como o gdb. As lições da T25 passam a ter
exercícios executáveis, além das transcrições gravadas.

Esta é a segunda metade da T27 original, dividida em 2026-11-26.

## Spec (rascunho; o passo de spec nomeia os testes)

- **AC-1**: **Motor de sessão** (`src/gdb/session.ts`): executa as
  ações da T25 sobre o interpretador da T27 e imprime como o gdb:
  - `Breakpoint 1, solve (n=5) at sol.cpp:12`;
  - `Run till exit from #0 …` e `Value returned is $1 = …`;
  - `Hardware watchpoint 2: x`, com `Old value` e `New value`;
  - `Program received signal SIGSEGV`;
  - `[Inferior 1 (process N) exited normally]`, com o número do
    processo mascarado;
  - condições, `ignore`, `tbreak`, `until`, `advance`, `up`, `down` e
    `frame`;
  - a numeração `$N` e o `display` automático.
- **AC-2**: **Oráculo de sessão:** para cada programa e cada roteiro de
  comandos dos casos, `npm run gdb:oracle` compara a transcrição do
  motor com a do gdb real, linha a linha e com endereços e PIDs
  mascarados. Cada comando de sessão tem pelo menos 5 roteiros, com
  bordas: recursão, saída do programa, watchpoint saindo de escopo e
  sinal.
- **AC-3**: **Treino Sessão:**
  - pelo menos 20 programas com bug típico de programação competitiva:
    off-by-one, overflow de `int`, variável não reiniciada entre casos,
    índice fora do array, recursão sem caso base e divisão inteira;
  - cada item tem a entrada, a pergunta, a resposta e um roteiro de
    referência;
  - o resultado conta o acerto, o tempo e o número de comandos contra o
    roteiro de referência;
  - eventos com drill `gdb.session` e KC `gdb.session.<bug>`.
- **AC-4**: **Aprender:**
  - os exercícios das unidades 2–9 (T25) ganham um modo "executar", em
    que o comando roda no simulador e a pessoa vê a parada, além do modo
    de digitar o comando certo;
  - uma unidade nova, 15 "Caçar o bug", tem uma lição por estratégia:
    bissecção com breakpoints, `watch` na variável que muda errado e
    `bt` no crash.
- **AC-5**: **Árvore:** "Sessão" entra depois de "Saída", visível no
  celular. Há um E2E de uma sessão completa.

## Out of scope

- O interpretador e a tabela de linhas (T27).
- Assembly, threads e TUI.

## Files owned

- `src/gdb/session.ts`, `src/gdb/bugs.ts`, `src/gdb/cases/`
- `src/gdb/curriculum.ts`, `src/stats/event.ts`, `src/storage/gdb.ts`
- `src/ui/gdb/SessionDrill.tsx`, `src/ui/GdbScreen.tsx`,
  `src/ui/shell/sections.ts`
- `scripts/gdb-oracle.mjs`, `tests/e2e/gdb.spec.ts`

## Subtasks (one commit each)

- [ ] spec
- [ ] tests
- [ ] models
- [ ] behaviour
- [ ] quality: `npm run check`, coverage, `npm run gdb:oracle` e e2e
- [ ] docs

## Log
