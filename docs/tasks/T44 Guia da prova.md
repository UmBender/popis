---
id: T44
title: Guia da prova
status: todo
depends_on: [T39]
branch: task/T44-contest-guide
adrs: []
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

- **AC-1**: **Conteúdo estruturado** `src/guide/content.ts`: seções e
  itens, e cada item pode ter `link` para um `ItemId` da árvore ou para
  uma lição do Aprender.
  - Testes: `src/guide/content.test.ts` ("every link points to an existing item or lesson").
- **AC-2**: **Tela** `src/ui/GuideScreen.tsx`: as seções com caixas
  marcáveis que zeram com um botão "Nova prova" (estado em
  `popis.guide`), links para os treinos, e uma folha de impressão
  (`@media print`) em preto e branco que cabe em uma página A4.
  - Testes: `src/ui/GuideScreen.test.tsx`, `tests/e2e/guide.spec.ts` (inclui `page.pdf` com 1 página).

## Out of scope

- O caderno de algoritmos do time (ver T34 para os trechos).

## Files owned

- `src/guide/` (novo), `src/storage/guide.ts`
- `src/ui/GuideScreen.tsx`, `src/ui/App.tsx`, `src/ui/shell/sections.ts`, `src/ui/app.css`
- `tests/e2e/guide.spec.ts`

## Subtasks (one commit each)

- [ ] spec
- [ ] tests
- [ ] models
- [ ] behaviour
- [ ] quality
- [ ] docs

## Log
