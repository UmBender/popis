---
id: ADR-T11-1
title: Deploy to GitHub Pages from Actions under a sub-path
status: accepted
kind: decision
date: 2026-11-18
task: T11
builds_on: [ADR-0002]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T11-1 Deploy to GitHub Pages from Actions under a sub-path

## Context

O dono quer treinar no celular, sem depender do PC
([[T11 Publicar no GitHub Pages]]). O app é estático (ADR-0002) e guarda
tudo no `localStorage`, então qualquer hospedagem estática serve. O
repositório `UmBender/popis` é público, e o GitHub Pages publica um
repositório de projeto em `https://umbender.github.io/popis/`, ou seja,
num subcaminho, não na raiz do domínio.

## Decision

- O build de Pages é `npm run build:pages`, que roda
  `vite build --base=/popis/`. O build padrão continua com base `/`, então
  `npm run dev`, `npm run build` e os testes e2e de desktop não mudam.
- `.github/workflows/pages.yml` roda no push da `main` e por
  `workflow_dispatch`. Ele faz `npm ci`, `npm run check` e
  `npm run build:pages`, e publica `dist/` com
  `actions/upload-pages-artifact` e `actions/deploy-pages`. O check vem
  antes do deploy, então uma `main` vermelha não é publicada.
- Toda action do workflow é fixada pelo SHA do commit, com a tag num
  comentário, porque uma tag móvel poderia mudar o que roda com permissão
  de publicar.
- O Playwright ganha o projeto `mobile` (Pixel 7), que roda contra o build
  de Pages servido em `/popis/` (pasta `dist-pages/`, ignorada pelo git).
  O mesmo teste prova o subcaminho e o layout de celular.
- O histórico continua por aparelho, sem sincronizar.

## Alternatives considered

- **`base` relativo (`./`)** — funciona sem saber o nome do repositório,
  mas os caminhos ficam relativos à URL da página, o que quebra se um dia
  houver rotas.
- **Base por variável de ambiente no `vite.config.ts`** — faz o mesmo que
  a flag `--base`, mas acrescenta configuração.
- **Branch `gh-pages` publicada por script local** — depende de lembrar de
  publicar e não passa pelo check.
- **Rodar o e2e no CI** — exigiria instalar o Chromium a cada push. Por
  ora o e2e continua local, antes do review, como no AGENTS.md.

## Consequences

- Todo push na `main` publica o app. A regra "a `main` está sempre verde"
  vira também a regra do que está no ar.
- Renomear o repositório exige mudar o `--base` do `build:pages` e o
  projeto `mobile` do Playwright.
- O e2e passa a fazer dois builds (um com base `/` e outro com
  `/popis/`).

## Rollback plan

Apagar `.github/workflows/pages.yml` e desativar o Pages no repositório,
remover o script `build:pages` e o projeto `mobile` do Playwright, e
registrar um ADR `kind: rollback`.
