---
id: T49
title: Rolagem independente dos painéis
status: in-progress
depends_on: []
branch: fix/independent-scroll
adrs: []
tags: [task, bug]
---

# T49 Rolagem independente dos painéis

## Goal

A árvore (o menu dos tópicos), o painel do treino e o índice de seções da
Referência rolam cada um por conta própria. Rolar o conteúdo não leva a
árvore junto, e a árvore longa rola sozinha.

## O bug (relatado pelo dono em 2026-11-25)

Depois das pastas Shell, Regex, Maratona e Referência, a árvore ficou mais
alta que a tela (1248 px numa janela de 720 px). Como a rolagem era a da
página inteira (`.shell` com `min-height: 100dvh`), rolar o conteúdo levava
a árvore junto e a escondia. Na Referência, o índice de seções ficava preso
(`sticky`), mas a árvore não, e por isso as duas colunas pareciam
inconsistentes.

**Esperado:** no desktop, a página não rola. A árvore rola só quando não
cabe, o painel principal rola sozinho, e o índice da Referência fica
visível e rola só quando não cabe. A impressão da Referência (`@media
print`) continua com o fluxo normal da página. No celular, a árvore
continua sendo uma gaveta.

## Spec

- **AC-1**: no desktop (1280×720), rolar o painel de "C++" e de "STL" não
  muda a posição da árvore nem do índice, e a página em si não rola.
  - Testes: `tests/e2e/regression-T49-independent-scroll.spec.ts` ("tree and reference index stay put while the panel scrolls").
- **AC-2**: a árvore rola sozinha quando é mais alta que a janela, sem rolar
  o painel.
  - Testes: `tests/e2e/regression-T49-independent-scroll.spec.ts` ("tree scrolls on its own when taller than the window").
- **AC-3**: a impressão da Referência e o celular continuam iguais.
  - Testes: `tests/e2e/ref.spec.ts`, `tests/e2e/mobile.spec.ts` (existentes, sem mudança).

## Files owned

- `src/ui/app.css`
- `tests/e2e/regression-T49-independent-scroll.spec.ts` (novo)

## Subtasks (one commit each)

- [x] spec
- [ ] tests (regressão vermelha)
- [ ] fix
- [ ] docs: *Log* e status `review`

Passos de modelos e qualidade separados não se aplicam: é uma correção só
de CSS, e o `npm run check` roda no commit da correção.

## Log
