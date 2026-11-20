---
id: ADR-T13-1
title: Vim tem motor próprio verificado contra o Neovim
status: accepted
kind: decision
date: 2026-11-20
task: T13
builds_on: [ADR-0002, ADR-T10-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T13-1 Vim tem motor próprio verificado contra o Neovim

## Context

O popis ganha uma tela para treinar o Vim (T13–T16). O jogador digita
teclas reais e o app precisa saber o que cada uma faz, sem depender de um
Vim rodando no navegador. O dono escolheu um motor próprio, sem dependência
nova, e o Neovim 0.12 com `--clean` como referência de comportamento.

## Decision

- O motor fica em `src/vim/`, em TypeScript puro (sem DOM, sem aleatoriedade
  e sem relógio próprios). O estado é imutável: linhas, cursor, coluna
  desejada (`curswant`), última busca de caractere (`f/t`) e última busca
  de padrão.
- Os movimentos são portes diretos das rotinas do Vim (`fwd_word`,
  `bck_word`, `end_word`, `bckend_word`, `searchc`, `findpar`,
  `findmatchlimit`), para herdar os casos de borda. As colunas são índices
  de string (o corpus é ASCII e sem tabulações).
- Padrões de busca são **literais**. `*` e `#` usam a palavra inteira
  (`\<palavra\>`). As soluções ótimas só usam padrões sem caracteres
  especiais de regex (`\ / ? . * [ ] ~ ^ $`), para valerem também no Vim
  de verdade.
- O Neovim vence qualquer descrição da nota: `startofline` é desligado por
  padrão no Neovim, então `gg`, `G` e `{n}G` mantêm a coluna desejada.
- Os casos de teste (`src/vim/cases/*.ts`) são dados: texto, cursor, teclas
  e cursor esperado. O Vitest roda o motor sobre eles, e
  `npm run vim:oracle` roda cada caso em `nvim --clean --headless` e falha
  se o Neovim discordar. O oráculo fica fora do `check`, porque exige o
  `nvim`.
- O mínimo de teclas é uma busca de custo uniforme sobre o estado, com as
  teclas do nível como arestas (cada tecla vale 1). Contagens vão de 1 a 9.
  A busca é limitada por um número máximo de teclas, o que a mantém rápida.

## Alternatives considered

- **Rodar o Neovim em WebAssembly** — dependência grande e difícil de
  testar de forma determinística.
- **Bibliotecas de emulação de Vim para editores** — nova dependência, e
  o comportamento dos casos de borda não é o do Neovim.

## Consequences

- As tasks T14–T16 crescem sobre o mesmo estado e o mesmo oráculo.
- Uma discordância com o Neovim é bug do motor, não do caso.
- Texto com tabulações ou caracteres largos não é suportado ainda.

## Rollback plan

Remover `src/vim/`, `src/storage/vim.ts`, `src/ui/VimScreen.tsx` e o botão
"Vim"; o resto do app não depende deles.
