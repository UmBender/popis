---
id: T35
title: Cobertura instável do Vim
status: review
depends_on: []
branch: fix/vim-coverage-flake
adrs: []
tags: [task, bug]
---

# T35 Cobertura instável do Vim

## Goal

`npm run coverage` deixa de depender da sorte. Hoje, quatro trechos de
`src/vim/motions.ts` só são alcançados por casos aleatórios dos testes de
propriedade, e o fast-check usa uma seed nova a cada execução. Quando
nenhum caso aleatório passa por eles, `src/vim/**` fica abaixo do limite
de 100% e o gate falha.

## O bug

- **Onde apareceu:** no batch de 2026-11-21. A T34 terminou com todos os
  gates verdes na sessão, mas a verificação do runner falhou:
  `Coverage for statements (99.96%) does not meet "src/vim/**" threshold
  (100%)`, com `motions.ts` linha 192 descoberta. A T34 não toca em
  `src/vim/`.
- **Causa:** só com os testes determinísticos (sem `*.prop.test.ts`),
  `motions.ts` deixa descobertas as linhas 146, 164, 192 e 484:
  - `b` e `ge` voltando por espaços até o início do buffer;
  - `e` numa última linha vazia;
  - `searchMatches` com padrão vazio.

  Os testes de propriedade as alcançam na maioria das execuções, mas não
  em todas.

## Spec

- **AC-1**: os quatro trechos são alcançados por testes determinísticos,
  e `motions.ts` fica com 100% de cobertura sem os testes de propriedade.
  - Testes: `src/vim/cases/words.ts` ("b: skips leading whitespace to the start of the buffer", "ge: skips leading whitespace to the start of the buffer", "e: stays on an empty last line"), conferidos com `npm run vim:oracle`; `src/vim/motions.test.ts` ("search with an empty pattern finds no match").

## Out of scope

- Fixar a seed do fast-check em todo o projeto. Isso deixaria a cobertura
  estável, mas muda a exploração aleatória dos testes de propriedade, e
  a decisão fica para o dono.

## Files owned

- `src/vim/cases/words.ts`, `src/vim/motions.test.ts`

## Log

- 2026-11-22: os casos novos vieram de casos de borda que antes só os
  testes de propriedade alcançavam. Não é um bug do produto: o motor
  já fazia o certo, e só faltava o teste fixo. Por isso não há commit
  vermelho antes da correção: a correção é o próprio teste.
- 2026-11-22: `npm run vim:oracle -- --filter "leading whitespace"`:
  `2/2 cases agree`; `--filter "empty last line"`: `2/2 cases agree`.
- 2026-11-22: sem os testes de propriedade, `motions.ts` tem 100% de
  linhas, comandos, funções e ramos.
