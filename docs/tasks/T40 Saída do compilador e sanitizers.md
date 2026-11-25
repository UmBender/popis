---
id: T40
title: Saída do compilador e sanitizers
status: ready
depends_on: [T25]
branch: task/T40-compiler-output
adrs: []
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

- **AC-1**: **Casos** em `src/compile/cases/`, com pelo menos 30 casos.
  Cada caso tem:
  - `{ id, code, flags, input?, output, line, cause, explanation }`;
  - `output` é a saída gravada, e `explanation` diz em até 2 frases como
    ler a saída e como corrigir;
  - os casos cobrem os grupos `compilacao`, `aviso`, `asan`, `ubsan`,
    `glibcxx`, `veredito`, com pelo menos 4 casos por grupo.
  - Testes: `src/compile/cases.test.ts` ("every case line exists in its code", "every cause belongs to the cause list", "every group has at least 4 cases").
- **AC-2**: **Sorteio** `src/compile/drill.ts`: escolhe o caso pela seed e
  pelos grupos marcados, sem repetir na mesma rodada enquanto houver
  caso novo, e embaralha as opções de causa (a certa e 3 distratores do
  mesmo grupo).
  - Testes: `src/compile/drill.prop.test.ts` (a resposta canônica é aceita; a causa certa está entre as 4 opções; nenhum caso se repete antes de esgotar o grupo; a mesma seed dá a mesma rodada).
- **AC-3**: **Oráculo** `npm run compile:oracle`
  (`scripts/compile-oracle.mjs`), fora do `check`. Para cada caso, ele
  compila com as `flags` do caso, roda com `input` quando houver, e
  confere que a saída real (mascarada) é igual à gravada e que ela cita a
  `line` do caso. `--write` regrava as saídas.
  - Testes: `npm run compile:oracle`, com o resultado no *Log*.
- **AC-4**: **Tela** `src/ui/CompileScreen.tsx`:
  - o código aparece com números de linha, e a linha da resposta é
    clicada (ou escolhida pelas setas e Enter);
  - as causas são botões com atalho 1–4;
  - um erro destaca a linha certa e mostra a explicação;
  - o resultado mostra os acertos por grupo;
  - usa os componentes comuns da T19, e cada item vira um evento da T22
    com drill `compile.read` e KC `compile.<grupo>`.
  - Testes: `src/ui/CompileScreen.test.tsx` (relógio falso: linha e causa certas contam um acerto, um erro mostra a explicação, o filtro de grupos fica salvo em `popis.compile`).
- **AC-5**: **Árvore:** a pasta "Maratona" entra depois de "Shell" (ou
  depois de "GDB", se a T39 não estiver na `main`) com o item "Ler o
  erro". Os atalhos 1–9 não mudam.
  - Testes: `src/ui/shell/sections.test.ts`, `tests/e2e/compile.spec.ts` (desktop e mobile).

## Out of scope

- Compilar código da pessoa.
- Clang e MSVC.

## Files owned

- `src/compile/` (novo), `src/storage/compile.ts`, `src/stats/event.ts`
- `src/ui/CompileScreen.tsx`, `src/ui/App.tsx`, `src/ui/shell/sections.ts`, `src/ui/app.css`
- `scripts/compile-oracle.mjs`, `package.json`, `vite.config.ts`
- `tests/e2e/compile.spec.ts`

## Subtasks (one commit each)

- [ ] spec: ADR-T40-1 (saídas gravadas e conferidas pelo oráculo, pasta Maratona) e testes nomeados
- [ ] tests
- [ ] models
- [ ] behaviour
- [ ] quality: `npm run check`, `compile:oracle`, coverage, e2e
- [ ] docs: *Log* e status `review`

## Log
