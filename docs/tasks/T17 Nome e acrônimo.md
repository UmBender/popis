---
id: T17
title: Nome e acrônimo
status: in-progress
depends_on: []
branch: task/T17-acronym
adrs: []
tags: [task]
---

# T17 Nome e acrônimo

## Goal

O nome "popis" foi escolhido ao acaso. Agora ele vira um acrônimo:
**POPIS — Practice Of Problem-solving In Sprints**. Ele descreve o app
(rodadas curtas contra o relógio para pensar mais rápido em problemas de
programação competitiva) e aparece no título da aba, no cabeçalho do app
e na documentação.

## Spec (rascunho; o passo de spec nomeia os testes)

Decisão do dono (2026-11-20): o acrônimo é "Practice Of Problem-solving
In Sprints", em inglês. O resto do app continua em português.

- **AC-1**: **Cabeçalho do app:** o `<h1>` da configuração mostra
  "POPIS" em maiúsculas, com o acrônimo por extenso logo abaixo em
  `--muted` e fonte menor. As iniciais P, O, P, I e S ficam em `--text`
  e negrito, sem outra cor, como em [[Shell]]. O nome acessível do
  cabeçalho continua sendo "POPIS".
  *Teste:* `src/ui/App.test.tsx` ("config shows the POPIS acronym …").
- **AC-2**: **Aba e metadados:** o `<title>` passa a ser "POPIS —
  Practice Of Problem-solving In Sprints", e o `index.html` ganha uma
  `<meta name="description">` em português que explica o app em uma
  frase. *Teste:* `tests/e2e/identity.spec.ts`, que confere o título e
  a descrição no app servido.
- **AC-3** (sem teste automático; revisão manual dos arquivos):
  **Documentação:** o `README.md` e a `docs/Home.md` abrem com
  o nome, o acrônimo por extenso e uma linha sobre o foco em programação
  competitiva. O `AGENTS.md` ganha o acrônimo na primeira linha, sem
  mudar nenhuma regra.
- **AC-4**: **Sem quebrar nada:** as chaves do `localStorage`
  (`popis.*`), o nome do pacote, o caminho `/popis/` do GitHub Pages e o
  favicon não mudam. *Teste:* os testes existentes (`persistence`,
  `tests/favicon.test.ts`, `tests/e2e/favicon.spec.ts`) continuam verdes.

## Out of scope

- Logo novo e favicon novo.
- O cabeçalho dentro do layout novo (a [[T18 Reformulação gráfica]]
  reaproveita o componente desta task).

## Files owned

- `index.html`, `README.md`, `AGENTS.md` (só a primeira linha),
  `docs/Home.md`
- `src/ui/ConfigScreen.tsx` (só o cabeçalho), `src/ui/Brand.tsx` (novo,
  se o cabeçalho virar componente), `src/ui/app.css`,
  `src/ui/App.test.tsx`
- `tests/e2e/identity.spec.ts`

## Notas para o batch

- Task pequena e independente: pode rodar antes ou depois de T13–T16. Se
  rodar depois, a base é `main`, e o conflito com a T13 em
  `ConfigScreen.tsx` fica em linhas diferentes.

## Subtasks

- [ ] Testes: `App.test.tsx` e `identity.spec.ts`
- [ ] `Brand.tsx` e CSS
- [ ] `index.html`, README, Home, AGENTS
- [ ] Gates

## Log
