---
id: T36
title: Clique perdido na prévia do ótimo
status: done
depends_on: []
branch: fix/preview-desc-layout-shift
adrs: []
tags: [task, bug]
---

# T36 Clique perdido na prévia do ótimo

## Goal

Clicar num bloco da prévia do ótimo (T21) sempre abre a lição, mesmo
com a página rolada.

## O bug

- **Onde apareceu:** na integração do batch de 2026-11-22, o e2e
  "T21: optimal preview guides, recalculates off-path, pauses on lesson
  and separates assisted history" falhou em toda execução depois do
  merge da T25. Antes ele já falhava em cerca de 1 de cada 3 execuções.
- **Reprodução:** Movimento, nível 4, prévia "Automática", `Esc` para
  começar a rodada e clique no primeiro bloco (por exemplo `ft`).
- **Causa:**
  1. no `mousedown`, o bloco ganha foco, e `onFocus` mostra a linha de
     descrição (`.vim-preview-desc`) logo abaixo dos blocos, acima do
     código;
  2. com a página rolada, o *scroll anchoring* do navegador ajusta o
     scroll para manter o código parado (`scrollY` 159 → 183), e o
     bloco sobe 24 px;
  3. o `mouseup` cai na descrição, e o `click` vai para o elemento pai,
     não para o botão.

  A pasta GDB deixou a árvore mais alta, então a página passou a estar
  sempre rolada nesse teste.
- **Correção:** a linha de descrição existe desde o início e fica vazia
  enquanto nenhum bloco está ativo, com a altura de uma linha. Mostrar a
  descrição não muda mais o layout.

## Spec

- **AC-1**: a linha de descrição é reservada antes de qualquer bloco
  ficar ativo, e é o mesmo elemento antes do foco, durante e depois.
  - Testes: `tests/regressions/T36-preview-desc-layout-shift.test.ts` ("regression T36 preview-desc-layout-shift" › "the description line is reserved before a block is active and stays the same node"), `src/ui/VimScreenPreview.test.tsx` (a descrição fica vazia depois do blur), `tests/e2e/vim.spec.ts` (o e2e da T21).

## Files owned

- `src/ui/vim/Preview.tsx`, `src/ui/app.css`
- `src/ui/VimScreenPreview.test.tsx`,
  `tests/regressions/T36-preview-desc-layout-shift.test.ts`

## Log

- 2026-11-22: o teste
  `tests/regressions/T36-preview-desc-layout-shift.test.ts` foi commitado
  vermelho ("Unable to find an element by:
  [data-testid=\"vim-preview-desc\"]") e passa com a correção.
- 2026-11-22: **teste corrigido em commit próprio:**
  `src/ui/VimScreenPreview.test.tsx` exigia que a descrição sumisse depois
  do blur (`queryByTestId(...)` nulo). Isso é justamente o deslocamento de
  layout que perde o clique. Agora o teste exige a linha reservada e
  vazia; a intenção, nenhuma descrição visível sem bloco ativo, continua
  coberta.
- 2026-11-22: o e2e da T21 passou 3 de 3 vezes no Chromium. Antes falhou
  4 de 4 no merge da T25 e 1 de 3 no trilho de digitação sozinho.
- 2026-11-22: a altura reservada é `min-height: 1lh`. Uma descrição que
  quebre em duas linhas, numa tela estreita, ainda empurraria o layout,
  mas o Vim não aparece no celular.

