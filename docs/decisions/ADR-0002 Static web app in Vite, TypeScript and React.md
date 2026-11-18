---
id: ADR-0002
title: Static web app in Vite, TypeScript and React
status: accepted
kind: decision
date: 2026-11-17
task: T01
builds_on: []
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-0002 Static web app in Vite, TypeScript and React

## Context

O app é um treino rápido no navegador: questões geradas por código,
respostas digitadas, cronômetro e histórico local. Ele vai crescer em
modos, estatísticas e dificuldade adaptativa. O núcleo matemático
(geradores, parser, polinômios) precisa de muitos testes, incluindo
testes de propriedade.

## Decision

- **App estático, sem backend.** Persistência no `localStorage`.
- **Vite 8** para o build e o servidor de desenvolvimento.
- **TypeScript 6.0** com `strict`. O TypeScript 7 (o compilador nativo)
  ainda não é suportado pelo typescript-eslint (peer `<6.1.0`).
- **React 19** para a interface, só dentro de `src/ui/`.
- Testes: **Vitest 5** (unitários, componentes, regressões) com **jsdom**
  e **Testing Library**, **fast-check** para propriedades e **Playwright**
  para e2e.
- Qualidade: **ESLint** com typescript-eslint e react-hooks, sem avisos, e
  **Prettier**.
- Todos os gates rodam com `npm run check` (ver `AGENTS.md`).

## Alternatives considered

- **TypeScript puro sem framework** — menos dependências, mas as telas de
  configuração, resultado e estatísticas ficariam com código de DOM manual.
- **Svelte/Solid** — leves, mas o React tem o melhor suporte de testes
  (Testing Library) e é o mais conhecido.
- **App de terminal** — mais rápido de abrir, mas renderizar fórmulas e
  gráficos é bem pior.

## Consequences

- Tudo fora de `src/ui/` fica em TypeScript puro e é testado sem navegador.
- Subir para o TypeScript 7 exige um ADR novo quando o typescript-eslint
  suportá-lo.

## Rollback plan

Um ADR de rollback que troque o framework de UI; o núcleo puro não muda.
