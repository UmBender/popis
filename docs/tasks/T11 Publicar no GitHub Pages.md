---
id: T11
title: Publicar no GitHub Pages
status: ready
depends_on: [T08]
branch: task/T11-pages
adrs: []
tags: [task]
---

# T11 Publicar no GitHub Pages

## Goal

O app fica publicado em `https://umbender.github.io/popis/` e é
republicado a cada push na `main` que passar no `npm run check`. Ele
funciona bem no celular, e cada aparelho guarda o próprio histórico no
`localStorage`, sem sincronizar.

## Spec (rascunho; o passo de spec nomeia os testes)

Decisões do dono (2026-11-18): repositório público `UmBender/popis`;
histórico local por aparelho (nada muda no armazenamento); todos os modos
disponíveis no celular, com o layout ajustado; deploy por GitHub Actions
no push da `main`.

- **AC-1**: **Subcaminho:** o build roda servido em `/popis/`. O `base` do
  Vite vem de uma variável de ambiente (padrão `/`) e é `/popis/` no
  deploy. O favicon e o script carregam com o base, e nenhum caminho
  absoluto fixo sobra no HTML gerado.
- **AC-2**: **Deploy:** `.github/workflows/pages.yml` roda no push da `main`
  e por `workflow_dispatch`. Ele faz `npm ci` e `npm run check`, depois
  `vite build` com o base `/popis/`, e publica `dist/` com
  `actions/upload-pages-artifact` e `actions/deploy-pages`. As versões
  das actions ficam fixas. Se o check falhar, nada é publicado.
- **AC-3**: **Celular:** o Playwright ganha um projeto com viewport de
  celular (Pixel 7). Em cada modo, as telas de configuração, de jogo e de
  resultado não têm rolagem horizontal (`scrollWidth <= clientWidth`).
  Os modos numéricos abrem o teclado numérico (`inputmode="numeric"`), e
  os de texto, um teclado sem autocorreção nem maiúscula automática
  (`autocapitalize="off"`, `autocorrect="off"`, `spellcheck=false`).
- **AC-4**: **Toque:** os alvos de toque (modos, tipos, durações, botões)
  têm pelo menos 44 px de altura no viewport de celular, e o campo de
  resposta fica visível com o teclado aberto: a pergunta e o campo ficam
  no topo, sem precisar rolar.
- **AC-5**: **Base no e2e:** o projeto de celular roda contra o build com
  base `/popis/` (`vite preview` com o mesmo base), o que prova o AC-1 no
  navegador.

## Out of scope

- Sincronizar o histórico entre aparelhos e criar contas.
- PWA ou uso offline (pode virar outra task).
- Domínio próprio.
- Esconder a Digitação no toque (fica na T10).

## Files owned

- `vite.config.ts` (só o `base`), `index.html`, `package.json` (só
  scripts), `playwright.config.ts`
- `.github/workflows/pages.yml`
- `src/ui/**` (ajustes de layout e atributos do campo)
- `tests/e2e/**`
- `README.md` (link do app publicado)

## Log
