---
id: ADR-T03-1
title: The favicon uses theme tokens
status: accepted
kind: decision
date: 2026-11-18
task: T03
builds_on: [ADR-0001]
amends: [ADR-0001]
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T03-1 The favicon uses theme tokens

## Context

O usuário pediu um ícone de aba `O(n!)`, com fundo preto e letra branca,
nas cores do tema. O navegador carrega o favicon como um arquivo separado,
então ele não lê as variáveis CSS de `src/ui/theme.css`. Com isso, o
ícone precisa ter as cores escritas nele, o que o
[[ADR-0001 Kanagawa Dragon theme]] não prevê: lá, `theme.css` é o único
arquivo com cores.

## Decision

- `public/favicon.svg` é a única exceção à regra de que só `theme.css`
  tem valores de cor.
- O ícone usa só valores de tokens de [[Theme]]: o fundo em `--surface`
  (`#0d0c0c`, o preto do tema) e o texto em `--text` (`#c5c9c5`).
- O teste `tests/favicon.test.ts` lê os tokens de `Theme.md` e falha se o
  ícone usar outra cor, ou se as duas cores dele não forem essas.

## Alternatives considered

- **Gerar o ícone em JavaScript a partir das variáveis CSS** — evita a
  exceção, mas exige código só para isso, e o ícone some até o script
  rodar.
- **PNG** — fica borrado em telas de alta densidade, e o teste não consegue
  ler as cores.

## Consequences

- Trocar o tema exige atualizar também o `favicon.svg`; o teste aponta a
  diferença.

## Rollback plan

Remover `public/favicon.svg`, a linha do `index.html` e o teste.
