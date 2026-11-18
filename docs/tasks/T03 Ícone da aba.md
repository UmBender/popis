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

A aba do navegador mostra um ícone com o texto `O(n!)`, em letra clara
sobre fundo escuro, nas cores do tema ([[Theme]]).

## Spec

- **AC-1**: `public/favicon.svg` desenha `O(n!)` com o fundo em `--surface`
  e o texto em `--text`, e não usa nenhuma outra cor.
  *Teste:* `tests/favicon.test.ts` ("favicon draws O(n!) in theme tokens").
- **AC-2**: `index.html` aponta para o ícone como SVG.
  *Testes:* `tests/favicon.test.ts` ("index.html links the favicon"),
  `tests/e2e/favicon.spec.ts` (o app servido entrega `/favicon.svg`).

## Out of scope

- Ícones PNG e manifest de PWA.

## Files owned

- `public/favicon.svg`, `index.html`, `tests/favicon.test.ts`,
  `tests/e2e/favicon.spec.ts`, `docs/architecture/Theme.md`

## Subtasks (one commit each)

- [ ] spec — `docs(T03): specify the favicon`
- [ ] tests — `test(T03): add failing tests for the favicon`
- [ ] behaviour — `feat(T03): add the O(n!) favicon`
- [ ] docs — `docs(T03): record favicon log`

## Log

- **Passos pulados:** *models* (não há tipos nem código novo) e *quality*
  separado (os gates rodam no commit de comportamento; sem refatoração).
