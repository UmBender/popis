---
id: T03
title: Ícone da aba
status: in-progress
depends_on: [T02]
branch: task/T03-favicon
adrs: ["[[ADR-T03-1 The favicon uses theme tokens]]"]
tags: [task]
---

# T03 Ícone da aba

## Goal

A aba do navegador mostra um ícone com o texto `n!` (de O(n!)), em letra
clara sobre fundo escuro, nas cores do tema ([[Theme]]).

## Spec

- **AC-1**: `public/favicon.svg` desenha `n!` com o fundo em `--surface`
  e o texto em `--text`, e não usa nenhuma outra cor. A primeira versão
  desenhava `O(n!)`, ilegível em 16 px segundo o usuário; das alternativas
  comparadas em 16, 32 e 64 px (`n!`, `O(`/`n!)` em duas linhas, `n!`
  dentro de um círculo, `O!`), `n!` foi a única legível em 16 px.
  *Teste:* `tests/favicon.test.ts` ("favicon draws n! in theme tokens").
- **AC-2**: `index.html` aponta para o ícone como SVG.
  *Testes:* `tests/favicon.test.ts` ("index.html links the favicon"),
  `tests/e2e/favicon.spec.ts` (o app servido entrega `/favicon.svg`).

## Out of scope

- Ícones PNG e manifest de PWA.

## Files owned

- `public/favicon.svg`, `index.html`, `tests/favicon.test.ts`,
  `tests/e2e/favicon.spec.ts`, `docs/architecture/Theme.md`

## Subtasks (one commit each)

- [x] spec — `docs(T03): specify the favicon`
- [x] tests — `test(T03): add failing tests for the favicon`
- [x] behaviour — `feat(T03): add the O(n!) favicon`
- [x] docs — `docs(T03): record favicon log`

## Log

- **Passos pulados:** *models* (não há tipos nem código novo) e *quality*
  separado (os gates rodam no commit de comportamento; sem refatoração).
- **Legibilidade:** com 5 caracteres, o texto em 16 px fica no limite. O
  texto é esticado na vertical (`scale(1 1.75)`) para ocupar a altura;
  conferido por screenshot em 16, 32 e 96 px.
- **Fonte:** o SVG pede JetBrainsMono Nerd Font e cai para DejaVu Sans Mono
  ou `monospace`, porque um favicon não carrega fontes da página.
- **Gates no último commit:** `npm run check` verde, `npm run coverage`
  verde e `npm run test:e2e` verde (3 casos).
