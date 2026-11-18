---
id: T11
title: Publicar no GitHub Pages
status: review
depends_on: [T08]
branch: task/T11-pages
adrs: [ADR-T11-1]
tags: [task]
---

# T11 Publicar no GitHub Pages

## Goal

O app fica publicado em `https://umbender.github.io/popis/` e é
republicado a cada push na `main` que passar no `npm run check`. Ele
funciona bem no celular, e cada aparelho guarda o próprio histórico no
`localStorage`, sem sincronizar.

## Spec

Decisões do dono (2026-11-18): repositório público `UmBender/popis`;
histórico local por aparelho (nada muda no armazenamento); todos os modos
disponíveis no celular, com o layout ajustado; deploy por GitHub Actions
no push da `main`. Decisões técnicas em
[[ADR-T11-1 Deploy to GitHub Pages from Actions under a sub-path]].

- **AC-1**: **Subcaminho:** `npm run build:pages` gera o build servido em
  `/popis/` (`vite build --base=/popis/`). O build normal continua com
  base `/`. No build de Pages, o favicon e o script carregam com o
  prefixo `/popis/`.
  *Testes:* `tests/pages.test.ts` ("build:pages script uses the /popis/ base"),
  `tests/e2e/mobile.spec.ts` ("the app served under /popis/ loads its
  script and favicon").
- **AC-2**: **Deploy:** `.github/workflows/pages.yml` roda no push da
  `main` e por `workflow_dispatch`. Ele faz `npm ci`, `npm run check` e
  `npm run build:pages`, nessa ordem, e publica `dist/` com
  `actions/upload-pages-artifact` e `actions/deploy-pages`. Toda action é
  fixada pelo SHA do commit. Como o check vem antes, nada é publicado se
  ele falhar.
  *Testes:* `tests/pages.test.ts` ("pages workflow …").
- **AC-3**: **Celular, sem rolagem e com o teclado certo:** o Playwright
  ganha o projeto `mobile` (Pixel 7), servido pelo build de Pages.
  - Em cada modo de `MODE_IDS`, as telas de configuração, de jogo e de
    resultado não têm rolagem horizontal da página
    (`scrollWidth <= clientWidth` no `<html>`). Rolar dentro de um
    elemento, como o código dos laços ou uma tabela larga, é permitido.
  - Os modos `numeric` abrem o teclado numérico (`inputmode="numeric"`).
  - Os outros modos abrem um teclado de texto sem maiúscula automática
    nem autocorreção (`autocapitalize="off"`, `autocorrect="off"`,
    `spellcheck="false"`).

  *Testes:* `tests/e2e/mobile.spec.ts` ("every mode fits a phone …"),
  `src/ui/App.test.tsx` ("answer box turns off autocapitalize and
  autocorrect").
- **AC-4**: **Toque:** no projeto `mobile`, os alvos de toque têm pelo
  menos 44 px de altura: os rótulos dos modos e dos tipos, os campos de
  faixa, a duração e os botões. A pergunta, o campo de resposta e as
  opções ficam na metade de cima da tela, que continua visível com o
  teclado aberto.
  *Teste:* `tests/e2e/mobile.spec.ts` ("every mode fits a phone …").
- **AC-5**: **Desktop intacto:** o projeto `chromium` continua rodando os
  testes e2e de antes contra o build com base `/` e não roda
  `mobile.spec.ts`.
  *Testes:* os testes de `tests/e2e/` que já existiam, sem mudança.

## Out of scope

- Sincronizar o histórico entre aparelhos e criar contas.
- PWA ou uso offline (pode virar outra task).
- Domínio próprio.
- Esconder a Digitação no toque (fica na T10).
- Criar o repositório no GitHub, fazer o push e ativar o Pages. São ações
  do dono, fora do código.

## Files owned

- `package.json` (só scripts), `playwright.config.ts`, `.gitignore` e
  `eslint.config.js` (só para ignorar `dist-pages/`, o build de Pages do
  e2e)
- `.github/workflows/pages.yml`
- `src/ui/**` (ajustes de layout e atributos do campo)
- `tests/pages.test.ts`, `tests/e2e/mobile.spec.ts`
- `README.md` (link do app publicado)
- `vite.config.ts` (só para subir o limiar de cobertura; ver *Log*)

## Subtasks (one commit each)

- [x] spec — `docs(T11): specify pages deploy acceptance criteria`
- [x] tests — `test(T11): add failing tests for pages deploy and phones`
- [x] models — pulado: não há tipos novos
- [x] behaviour — `feat(T11): deploy to pages and fit phones`
- [x] quality — `chore(T11): raise the ui branch coverage threshold to 95`
- [x] docs — `docs(T11): record pages deploy log`

## Log

- 2026-11-18 — O rascunho previa o `base` vindo de uma variável de ambiente
  no `vite.config.ts`. A flag `--base` do Vite faz o mesmo sem mudar a
  configuração, então `vite.config.ts` saiu de *Files owned* e
  `build:pages` entrou.
- 2026-11-18 — **Teste que já passava no commit vermelho:** "the app served
  under /popis/ loads its script and favicon" passou antes da mudança,
  porque o Vite aplica o `--base` sozinho no `index.html`, inclusive no
  `/favicon.svg?v=…` da pasta `public/`. Ele ficou como guarda do
  subcaminho. A parte do AC-1 que faltava, o script `build:pages`, falhou
  como esperado.
- 2026-11-18 — **Layout de celular:** em telas com `pointer: coarse`,
  rótulos, campos de faixa, a duração e os botões ganham `min-height`
  de 44 px. Abaixo de 40rem, o `#root` e o `.problem` têm menos espaço e
  a fonte da questão fica menor, porque a questão de álgebra com a caixa
  larga terminava em 510 px, abaixo da metade da tela (420 px). Conferi
  à mão capturas da configuração, da álgebra, da estimativa e do
  resultado no Pixel 7.
- 2026-11-18 — **Files owned ampliados:** `vite.config.ts`, só para subir
  o limiar de branches de `src/ui/**` de 94 para 95 (a cobertura foi para
  95,45%).
- 2026-11-18 — **Actions fixadas por SHA:** checkout v7.0.1, setup-node
  v7.1.0, configure-pages v6.0.0, upload-pages-artifact v5.0.0 e
  deploy-pages v5.0.1, as últimas versões em 2026-11-18. O CI usa Node 22,
  o mesmo daqui.
- 2026-11-18 — **Gates no último commit:** `npm run check` verde (476
  testes), `npm run coverage` sem `ERROR`, `npm run test:fuzz` verde e
  `npm run test:e2e` verde (6 testes: 4 de desktop e 2 de celular).
- 2026-11-18 — **Falta (dono):** criar o repositório `UmBender/popis`,
  fazer o push da `main` e ativar o Pages com *Source: GitHub Actions*.
  O primeiro deploy acontece no push.
