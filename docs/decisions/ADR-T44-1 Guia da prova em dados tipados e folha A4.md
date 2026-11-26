---
id: ADR-T44-1
title: Guia da prova em dados tipados e folha A4
status: accepted
kind: decision
date: 2026-11-26
task: T44
builds_on: [ADR-0001, ADR-T18-1, ADR-T19-1, ADR-T39-1, ADR-T40-1, ADR-T46-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T44-1 Guia da prova em dados tipados e folha A4

## Context

O item **Guia** na pasta Maratona precisa cumprir dois papéis ao mesmo
tempo: servir como lista de checagem interativa na tela (com links
diretos para os treinos e lições do app e marcação persistida por
prova) e gerar uma folha impressa em preto e branco que caiba em uma
única página A4 para o caderno do time.

Além disso, o app restringe todas as cores aos tokens de
`src/ui/theme.css` (ADR-0001) e ainda não possui na `main` os itens
Caça ao WA (T41) e Placar (T43).

## Decision

1. **Dados tipados e links verificados (`src/guide/content.ts`):** as
   sete seções do guia (Primeiros 15 minutos, Antes de submeter, WA,
   TLE, RTE, MLE e Time) ficam em um módulo TypeScript puro. Cada item
   carrega `id`, `text` (sem crases literais) e um `link` opcional de
   dois tipos: `{ kind: "item", item: ItemId, label }` para qualquer
   tela da árvore, ou `{ kind: "lesson", item: GuideLearnItem, lesson, label }`
   para abrir diretamente uma lição do Aprender (Shell, GDB, Vim ou
   Regex). Testes unitários garantem que todo `link` aponta para um item
   ou lição existente.
2. **Referência ao `.bashrc` e itens ainda ausentes:** o item de
   `.bashrc` aponta para a lição `u8-bashrc` do Shell (T39), escrita
   pelo próprio popis. Os itens relacionados a placar e caça ao WA ficam
   sem link até a integração de T43 e T41.
3. **Estado em `popis.guide` (`src/storage/guide.ts`):** persiste
   apenas `{ checked: string[] }` filtrado pelos ids conhecidos em ordem
   canônica. O botão **Nova prova** limpa o conjunto salvo.
4. **Folha de impressão A4 (`@media print` em `src/ui/app.css`):**
   oculta barra superior, árvore, linha de status, descrição, botões e
   links; usa layout compacto em duas colunas a `10pt` com
   `@page { size: A4; margin: 10mm; }`, texto em `var(--surface)` sobre
   papel branco (`background: none`, `color-scheme: light`, sem novos
   literais de cor) e renderiza todas as caixas de seleção como
   quadrados vazios desenhados por borda, independentemente do estado
   marcado na tela, para que a folha impressa sirva limpa no caderno do
   time.

## Alternatives considered

- **Markdown estático renderizado em tempo de execução** — exigiria
  parser novo ou dependência externa e dificultaria a verificação
  estática dos links para `ItemId` e lições.
- **Imprimir caixas com o estado marcado da tela** — atrapalha o uso
  principal de imprimir a folha em branco para levar ao caderno e
  marcar a caneta na prova.
- **Uma coluna só na impressão** — as 7 seções (~35 itens) passariam de
  uma página A4 em corpo legível (≥ 9 pt).

## Consequences

- Os links entre o guia e os treinos/lições nunca quebram em silêncio:
  remover ou renomear um item ou lição faz `src/guide/content.test.ts`
  falhar.
- A folha impressa cabe em exatamente uma página A4 (verificada via
  `page.pdf` no e2e) respeitando os tokens de cor existentes.
- Quando T41 e T43 forem integradas, basta acrescentar os campos `link`
  nos itens correspondentes de `src/guide/content.ts`.

## Rollback plan

Reverter os commits da branch `task/T44-contest-guide` (removendo
`src/guide/`, `src/storage/guide.ts`, `src/ui/GuideScreen.tsx`,
`tests/e2e/guide.spec.ts` e as entradas em `sections.ts`, `App.tsx`,
`app.css`, `vite.config.ts` e `playwright.config.ts`) e registrar um
ADR de rollback marcando este como `reverted`.
