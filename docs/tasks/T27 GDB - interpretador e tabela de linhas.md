---
id: T27
title: GDB - interpretador e tabela de linhas
status: ready
depends_on: [T26]
branch: task/T27-gdb-interpreter
adrs: []
tags: [task]
---

# T27 GDB - interpretador e tabela de linhas

## Goal

A base da sessão GDB simulada: um **interpretador** de um subconjunto de
C++ que roda um programa com uma entrada e para nas mesmas linhas que o
gdb para (`next`, `step`, `finish`), com um **oráculo** que confere isso
contra o gdb e o g++ reais. Não há tela nesta task. O motor de sessão, o
treino Sessão e o modo "executar" do Aprender ficam na
[[T53 GDB - sessão simulada]], que depende desta.

**Divisão (decisão do dono, 2026-11-26):** a T27 original era grande
demais para uma sessão. Ela foi dividida em duas: esta (AC-1, AC-2 e
AC-4 do rascunho original) e a T53 (AC-3, AC-5, AC-6 e AC-7).

## Spec (rascunho; o passo de spec nomeia os testes)

- **AC-1**: **Interpretador** em `src/gdb/interp/`, em TypeScript puro e
  determinístico:
  - o subconjunto de C++ é: tipos inteiros, `char`, `bool`, arrays,
    structs, ponteiros, funções e recursão, `if`, `for`, `while`,
    `cin >>` de inteiros e strings a partir da entrada dada, e
    `cout <<`;
  - a memória usa o modelo da T26;
  - acesso fora do array dentro de um objeto não falha, como em C;
    ponteiro nulo e fora da pilha dão SIGSEGV; divisão por zero dá
    SIGFPE;
  - há um limite de passos para laço infinito.
- **AC-2**: **Tabela de linhas:** as paradas de `next` e `step` seguem a
  tabela de linhas do `g++ -O0`, incluindo o cabeçalho do `for` a cada
  volta, a chave de fechamento de uma função e a linha do `return`. O
  oráculo é a referência (AC-4).
- **AC-3**: **API de execução** (`src/gdb/interp/run.ts`), que a T53 vai
  usar: carregar um programa e uma entrada; avançar por `step`, `next`
  e `finish` (com o valor devolvido); ler variáveis do quadro atual e a
  pilha de quadros; saber a linha atual, a saída já impressa e o fim
  (saída normal, código de saída ou sinal).
- **AC-4**: **Oráculo de linhas** (`npm run gdb:oracle`, numa suíte nova
  do script que já existe, fora do `check`):
  - compila cada programa de `src/gdb/interp/programs/` com `g++ -O0 -g`;
  - roda no gdb real roteiros de `step`, `next` e `finish` e compara,
    passo a passo, a linha, a função e os argumentos de cada parada com
    os do interpretador;
  - compara também a saída do programa e o sinal ou código de saída;
  - pelo menos 20 programas, cobrindo `for`, `while`, recursão,
    `return` no meio da função, struct, array, ponteiro, SIGSEGV e
    SIGFPE.
  - Testes: unitários em `src/gdb/interp/*.test.ts` (com as paradas
    gravadas do oráculo como dados), mais o resultado do oráculo no *Log*.

## Out of scope

- Tudo da T53: motor de sessão (breakpoints, watch, print), treino
  Sessão, modo "executar" do Aprender e a árvore.
- C++ além do subconjunto: templates, STL, classes com métodos,
  exceções (exceto `catch throw` da T25, que continua gravado), ponto
  flutuante e entrada/saída formatada.
- Assembly, threads e TUI.

## Files owned

- `src/gdb/interp/` (novo), com `src/gdb/interp/programs/`
- `scripts/gdb-oracle.mjs` (suíte nova; as cinco que já existem ficam
  como estão)

## Subtasks (one commit each)

- [ ] spec: ADR-T27-1 (subconjunto, modelo de execução e tabela de linhas) e testes nomeados
- [ ] tests
- [ ] models
- [ ] behaviour
- [ ] quality: `npm run check`, coverage e `npm run gdb:oracle`
- [ ] docs: *Log* e status `review`

## Notas para o batch

- **Tamanho:** já dividida (ver *Goal*). Ainda é a maior do batch de
  2026-11-26.
- **Bloquear se:** uma construção do subconjunto não tiver tabela de
  linhas estável entre o g++ e o simulador. Nesse caso, tire a
  construção do subconjunto e registre num ADR.

## Log
