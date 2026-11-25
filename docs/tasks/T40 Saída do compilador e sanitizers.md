---
id: T40
title: Saída do compilador e sanitizers
status: done
depends_on: [T25]
branch: task/T40-compiler-output
adrs: [ADR-T40-1]
tags: [task]
---

# T40 Saída do compilador e sanitizers

## Goal

Um item **Ler o erro** numa pasta nova **Maratona**. Aparece um programa
C++ curto e a saída real de um erro: um erro de compilação do g++, um
aviso de `-Wall -Wextra -Wshadow`, um relatório do AddressSanitizer ou do
UBSan, uma asserção do `_GLIBCXX_DEBUG` ou um veredito do juiz (TLE, MLE,
RTE com sinal). A pessoa responde em dois cliques: **a linha** do código
e **a causa**, numa lista curta (índice fora do vetor, overflow com sinal,
divisão por zero, uso depois de liberar, pilha estourada por recursão,
variável não inicializada, sombra de variável, tipo errado no `printf`,
iterador inválido etc.). A ideia é ler em segundos a saída que, na prova,
costuma assustar.

## Escolhas de padrão (o dono pode mudar)

- As saídas são gravadas do g++ 16.2 real pelo oráculo, com os endereços
  e os PIDs mascarados. O app não compila nada.
- A rodada dura 90 s, porque cada item exige leitura.
- Funciona no celular: o código e a saída rolam, e as respostas são
  botões.

## Spec

- **AC-1**: **Casos** em `src/compile/cases/`, com pelo menos 30 casos (5 por grupo).
  Cada caso tem:
  - `{ id, group, code, flags, input?, limits?, output, line, cause, explanation }`;
  - `output` é a saída gravada (em `src/compile/cases/outputs.ts` via oráculo), e
    `explanation` diz em até 2 frases como ler a saída e como corrigir;
  - os casos cobrem os grupos `compilacao`, `aviso`, `asan`, `ubsan`,
    `glibcxx`, `veredito`, com pelo menos 4 casos por grupo (5 por grupo),
    e a lista de causas em português vive em `src/compile/causes.ts` (5
    causas por grupo).
  - Testes: `src/compile/cases.test.ts` (`every case line exists in its code`,
    `every cause belongs to the cause list`, `every group has at least 4 cases`,
    `there are at least 30 cases with unique ids and non-empty outputs and short explanations`),
    `src/compile/format.test.ts` (`masks temp paths, addresses, PIDs, BuildIds and libc frames`,
    `trims long ASan, compiler, UBSan, GLIBCXX_DEBUG and verdict outputs deterministically`,
    `outputCitesLine matches exact sol.cpp line numbers`).
- **AC-2**: **Sorteio** `src/compile/drill.ts` e **rodada** `src/compile/round.ts`:
  escolhe o caso pela seed e pelos grupos marcados, sem repetir na mesma rodada
  enquanto houver caso novo, e embaralha as opções de causa (a certa e 3
  distratores do mesmo grupo). O motor de rodada gerencia o relógio de 90 s
  (opções 60/90/120 s), marcação de acerto/erro/pulo, estatísticas por grupo
  e emissão de eventos T22 (`drill: "compile.read"`, `kc: "compile.<grupo>"`).
  - Testes: `src/compile/drill.prop.test.ts` (`canonical answer is accepted and near-misses are rejected`,
    `correct cause is always among the 4 distinct choices from the same group`,
    `no case repeats before exhausting the filtered pool`,
    `same seed produces the same round`),
    `src/compile/round.test.ts` (`tracks 90 s timer, wrong review state, skips, per-group stats and emits compile.read events`),
    `src/stats/event.test.ts` (`DRILLS accepts compile.read and stores compile events`).
- **AC-3**: **Oráculo** `npm run compile:oracle`
  (`scripts/compile-oracle.mjs`), fora do `check`. Para cada caso, ele
  compila com as `flags` do caso em diretório temporário, roda com `input`
  quando houver (usando `timeout 2` ou `ulimit -v` nos casos de `veredito`),
  aplica `formatCompilerOutput`, confere que a saída real (mascarada e
  recortada) é igual à gravada e que cita `sol.cpp:<line>` nos 5 grupos
  diagnósticos (`compilacao`, `aviso`, `asan`, `ubsan`, `glibcxx`) e nos
  casos de `veredito` que emitem linha (ex.: `assert`), conforme ADR-T40-1.
  `--write` regrava `src/compile/cases/outputs.ts`.
  - Testes: `npm run compile:oracle`, com o resultado no *Log*.
- **AC-4**: **Tela** `src/ui/CompileScreen.tsx` e **persistência** `src/storage/compile.ts`:
  - o código aparece com números de linha, e a linha da resposta é
    clicada (ou escolhida pelas setas e Enter);
  - as causas são botões com atalho 1–4;
  - um erro destaca a linha certa e mostra a explicação até avançar;
  - o resultado mostra os acertos por grupo;
  - usa os componentes comuns da T19 (`PanelTitle`, `RoundBar`, `Result`,
    `RoundHistory`, `Reference`, `matchTrainingKey`), e cada item vira um
    evento da T22 com drill `compile.read` e KC `compile.<grupo>`.
  - Testes: `src/ui/CompileScreen.test.tsx` (`correct line and cause count a hit via clicks and via keyboard arrows + Enter + 1-4`,
    `a wrong answer highlights the right line and shows the explanation`,
    `group filter and duration persist in popis.compile`,
    `90 s round finishes on fake clock with per-group table and compile.read events`,
    `supports skip, restart, Esc exit and opens from the app tree`),
    `src/storage/compile.test.ts` (`loads, saves and validates popis.compile settings and round results`).
- **AC-5**: **Árvore:** a pasta "Maratona" entra depois de "Shell" (ou
  depois de "GDB", se a T39 não estiver na `main`) com o item "Ler o
  erro". Os atalhos 1–9 não mudam.
  - Testes: `src/ui/shell/sections.test.ts` (`Maratona folder follows GDB with Ler o erro and keeps shortcuts 1-9`),
    `tests/e2e/compile.spec.ts` (`T40: play a Ler o erro round on desktop and mobile`).

## Out of scope

- Compilar código da pessoa.
- Clang e MSVC.

## Files owned

- `src/compile/` (novo), `src/storage/compile.ts`, `src/storage/compile.test.ts`, `src/stats/event.ts`, `src/stats/event.test.ts`
- `src/ui/CompileScreen.tsx`, `src/ui/CompileScreen.test.tsx`, `src/ui/App.tsx`, `src/ui/shell/sections.ts`, `src/ui/shell/sections.test.ts`, `src/ui/app.css`
- `scripts/compile-oracle.mjs`, `package.json`, `vite.config.ts`, `playwright.config.ts`
- `tests/e2e/compile.spec.ts`
- `docs/decisions/ADR-T40-1 Saídas gravadas de compilador e sanitizers com oráculo e pasta Maratona.md`

## Subtasks (one commit each)

- [x] spec: ADR-T40-1 (saídas gravadas e conferidas pelo oráculo, pasta Maratona) e testes nomeados
- [x] tests
- [x] models
- [x] behaviour
- [x] quality: `npm run check`, `compile:oracle`, coverage, e2e
- [x] docs: *Log* e status `review`

## Log

- 2026-11-25 — Implementação concluída na branch `task/T40-compiler-output` com 30 casos reais (5 por grupo: `compilacao`, `aviso`, `asan`, `ubsan`, `glibcxx`, `veredito`), 30 causas em português (`src/compile/causes.ts`), mascaramento/recorte puro (`src/compile/format.ts`), sorteio sem repetição por ciclo (`src/compile/drill.ts`), motor de rodada de 90 s (`src/compile/round.ts`), persistência em `popis.compile` (`src/storage/compile.ts`), eventos `compile.read` (`src/stats/event.ts`), tela `CompileScreen.tsx` e pasta `Maratona` com `Ler o erro` após `GDB` em `src/ui/shell/sections.ts`.
- 2026-11-25 — UNATTENDED CHOICE: nos casos `glibcxx`, incluímos `-D_GLIBCXX_DEBUG_BACKTRACE` com `-lstdc++exp` para que a própria `libstdc++` emita o frame `sol.cpp:<linha>` e o oráculo confira a citação de linha (ADR-T40-1).
- 2026-11-25 — UNATTENDED CHOICE: nos casos `veredito` em que o juiz não emite linha de código (`TLE`, `MLE`, `SIGSEGV`, `SIGFPE`), o oráculo valida o sinal/código de saída e a saída gravada sem fabricar número de linha; quando o `stderr` real cita a linha (`assert` em `SIGABRT`), o oráculo também confere `sol.cpp:<linha>` (ADR-T40-1).
- 2026-11-25 — UNATTENDED CHOICE: ao errar um item, a tela entra em estado de revisão destacando a linha certa em verde, a linha errada em vermelho e exibindo a explicação com botão `Próximo` (`Enter`) antes de avançar.
- 2026-11-25 — Ampliação de *Files owned*: adicionado `playwright.config.ts` (registro de `compile.spec.ts` no projeto `mobile`) e arquivos de teste correspondentes (`src/storage/compile.test.ts`, `src/stats/event.test.ts`, `src/ui/CompileScreen.test.tsx`, `src/ui/shell/sections.test.ts`).
- 2026-11-25 — Correção de teste (`f928941`): em `tests/e2e/compile.spec.ts`, o seletor `getByRole("button", { name: "Linha 1" })` colidiu em strict mode com `Linha 10` em casos de 10+ linhas; corrigido em commit próprio para `{ name: "Linha 1", exact: true }`.
- 2026-11-25 — Verificação visual (`.batch/visual/t40-compiler-output.spec.ts`, 6 capturas em `desktop` e `phone`): inspecionadas todas as imagens; corrigidos opacidade de botões desabilitados na revisão de erro, alinhamento vertical das linhas no celular, `white-space: pre` na saída do compilador para preservar setas `^~~~` e remoção de crases literais nas explicações; capturas refeitas e conferidas.
- 2026-11-25 — Gates: `npm run compile:oracle` (`compile oracle: 30/30 cases ok` contra `g++ 16.2.1`); `npm run check` verde (173 arquivos, 4283 testes, `tsc`, `eslint`, `prettier`, `vite build`); `npm run coverage` verde (`All files`: 99,82% stmts / 98,65% branches / 100% funcs / 99,91% lines; `src/compile`: 99,55% / 93,66% / 100% / 100%; `src/ui/CompileScreen.tsx`: 100% / 98,55% / 100% / 100%; `src/storage/compile.ts`: 100%); `npm run test:e2e` verde para `compile.spec.ts` (desktop e mobile) e `coherence.spec.ts` (38/39 na suíte inteira por flake pré-existente em `typing.spec.ts:81`, que passou 4/4 isolado).
- 2026-11-25 — Checagens manuais para o dono: ler cinco explicações; testar no celular (escolha de linha por toque e rolagem da saída).
