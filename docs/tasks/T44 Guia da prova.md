---
id: T44
title: Guia da prova
status: in-progress
depends_on: [T39]
branch: task/T44-contest-guide
adrs: [ADR-T44-1]
tags: [task]
---

# T44 Guia da prova

## Goal

Um item **Guia** na pasta Maratona: uma página de consulta, imprimível
para o caderno do time, com as listas de checagem que times experientes
usam, cada item ligado à lição ou ao treino do app que o exercita.

## Conteúdo

- **Primeiros 15 minutos:** digitar o template e o `.bashrc` (função de
  compilar, `ulimit -s`), compilar um "hello", testar a impressão e o
  envio de um problema; dois leitores começam por pontas opostas da
  prova, e um terceiro procura o problema mais fácil pelo placar.
- **Antes de submeter:** exemplo do enunciado, casos de borda (`n = 1`,
  máximo, todos iguais), `long long`, formato de saída, arquivo certo,
  depuração no papel enquanto outro usa o computador.
- **WA:** reler o enunciado, overflow, multitest sem zerar, borda,
  precisão, stress test contra força bruta.
- **TLE:** complexidade contra o limite (ligar a Estimativa), I/O rápido,
  `endl`, cópias, laço infinito, constante.
- **RTE:** índice, pilha da recursão, divisão por zero, sanitizers e
  `_GLIBCXX_DEBUG`.
- **MLE:** tamanho dos vetores, `map` contra vetor, recursão.
- **Time:** um computador para três pessoas; quem não está digitando lê,
  pensa ou depura no papel; não deixar dois no mesmo problema sem
  combinar.

## Spec

- **AC-1**: **Conteúdo estruturado** `src/guide/content.ts`: as 7 seções
  (Primeiros 15 minutos, Antes de submeter, WA, TLE, RTE, MLE e Time) e
  seus itens com ids únicos e texto sem crases literais; cada item pode
  ter `link` para um `ItemId` da árvore ou para uma lição do Aprender
  (`ADR-T44-1`). A menção ao `.bashrc` aponta para a lição `u8-bashrc`
  do Shell (T39).
  - Testes: `src/guide/content.test.ts` ("every link points to an existing item or lesson", "sections cover all seven contest checklists with unique ids and no raw backticks").
- **AC-2**: **Estado e tela** `src/storage/guide.ts` e
  `src/ui/GuideScreen.tsx`: as seções com caixas marcáveis que
  persistem em `popis.guide` e zeram com o botão "Nova prova", links
  clicáveis que abrem o treino ou a lição correspondente no app, botão
  "Imprimir" e uma folha de impressão (`@media print`) em preto e branco
  (caixas como quadrados vazios, sem barra/árvore/botões/links) que cabe
  em uma única página A4.
  - Testes: `src/storage/guide.test.ts` ("guide storage loads, saves, toggles and resets popis.guide"), `src/ui/GuideScreen.test.tsx` ("guide screen renders every section and persists checked items in popis.guide", "Nova prova clears all checked items and updates popis.guide", "clicking item and lesson links opens the target screen or lesson", "Imprimir calls window.print"), `tests/e2e/guide.spec.ts` (desktop e mobile: abrir pela árvore, marcar, recarregar, zerar com Nova prova, navegar por links, `@media print` sem shell/botões e `page.pdf` com exatamente 1 página A4).
- **AC-3**: **Árvore:** item **Guia** (`guide`) entra por último na
  pasta **Maratona** (depois de `STL`), visível no celular (`touch: true`),
  mantendo os atalhos 1–9 inalterados e respeitando a coerência da
  interface (`h1` igual ao rótulo, ordem dos blocos `data-panel`).
  - Testes: `src/ui/shell/sections.test.ts` ("Maratona folder follows Regex with Ler o erro, STL and Guia and keeps shortcuts 1-9", além das listas da árvore e telas), `src/ui/coherence.test.tsx`, `src/ui/shell/Shell.test.tsx`.

## Out of scope

- O caderno de algoritmos do time (ver T34 para os trechos).

## Files owned

- `src/guide/` (novo: `content.ts`, `content.test.ts`)
- `src/storage/guide.ts`, `src/storage/guide.test.ts`
- `src/ui/GuideScreen.tsx`, `src/ui/GuideScreen.test.tsx`, `src/ui/App.tsx`, `src/ui/shell/sections.ts`, `src/ui/shell/sections.test.ts`, `src/ui/app.css`
- `vite.config.ts`, `playwright.config.ts`, `tests/e2e/guide.spec.ts`

## Subtasks (one commit each)

- [x] spec
- [ ] tests
- [ ] models
- [ ] behaviour
- [ ] quality
- [ ] docs

## Log

- 2026-11-26 — Spec e `ADR-T44-1` escritos. *Files owned* ampliado minimamente para testes e configurações de gate correspondentes (`src/storage/guide.test.ts`, `src/ui/GuideScreen.test.tsx`, `src/ui/shell/sections.test.ts`, `vite.config.ts`, `playwright.config.ts`). Itens de Caça ao WA (T41) e Placar (T43) permanecem sem `link` até a integração dessas tasks.
