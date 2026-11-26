---
id: ADR-T38-1
title: Dados de contests buscados no build a cada 6 h
status: proposed
kind: decision
date: 2026-11-26
task: T38
builds_on: [ADR-0001, ADR-0002, ADR-T11-1, ADR-T18-1]
amends: [ADR-T11-1]
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T38-1 Dados de contests buscados no build a cada 6 h

## Context

A tela Contests ([[T38 Agenda de contests]]) mostra os próximos contests de
Codeforces, AtCoder, CodeChef e LeetCode no fuso local do jogador. O app é
100% estático ([[ADR-0002 Static web app in Vite, TypeScript and React]]) e
publicado no GitHub Pages ([[ADR-T11-1 Deploy to GitHub Pages from Actions under a sub-path]]).
Das quatro fontes escolhidas pelo dono, apenas o Codeforces libera CORS no
navegador; AtCoder (HTML sem API), CodeChef (JSON não oficial) e LeetCode
(GraphQL não oficial) bloqueiam requisições diretas do cliente. Usar um
agregador como `clist.by` exigiria chave de API e segredos de build.

Além disso, qualquer uma das quatro fontes pode sair do ar, dar timeout ou
mudar de formato temporariamente durante um build agendado; isso não pode
quebrar o deploy nem apagar os contests já conhecidos daquela fonte.

## Decision

- **Busca no build, sem segredos:** `scripts/contests-fetch.mjs`
  (`npm run contests:fetch`) consulta diretamente as quatro fontes em
  paralelo (timeout de 20 s por fonte), importa os parsers puros de
  `src/contests/` via `runnerImport` do Vite (sem duplicar lógica e sem
  dependência nova — o HTML do AtCoder é lido com código puro de strings e
  expressões regulares) e grava `public/contests.json`
  (`{ generatedAt, contests, errors }`).
- **Arquivo gerado fora do git:** `public/contests.json` entra no
  `.gitignore` e no `.prettierignore`. O repositório nunca versiona dados
  efêmeros; o app em `npm run dev` explica como gerar o arquivo quando ele
  não existe (inclusive quando o servidor dev devolve `index.html` no lugar
  de JSON).
- **Reaproveitamento por fonte:** se uma fonte falhar (rede, HTTP ou erro de
  parse), o script busca o `contests.json` publicado no GitHub Pages
  (`https://umbender.github.io/popis/contests.json`), mantém os contests
  ainda não encerrados daquela fonte e registra o erro em `errors`. O script
  só sai com código de erro se falhar ao gravar `public/contests.json`.
- **Emenda ao workflow de Pages (ADR-T11-1):** `.github/workflows/pages.yml`
  mantém o deploy por push em `main` e `workflow_dispatch`, acrescenta
  `schedule` com `cron: "0 */6 * * *"` e executa `npm run contests:fetch`
  após `npm run check` e antes de `npm run build:pages`.
- **Fuso local e pureza:** os módulos em `src/contests/` não usam `fetch`,
  DOM, `Date.now` nem `new Date(`. A formatação em fuso local na UI usa
  `Intl.DateTimeFormat` diretamente sobre milissegundos Unix, e a contagem
  regressiva avança pelo `Clock` injetado a cada minuto.
- **Árvore e cores:** a pasta **Agenda** (com o item **Contests**, visível
  no celular) fecha a árvore sem alterar os atalhos 1–9. Os rótulos dos
  quatro sites usam apenas tokens já existentes do tema Kanagawa Dragon
  ([[ADR-0001 Kanagawa Dragon theme]]): `--accent`, `--correct`, `--warning`
  e `--selection-text`.

## Alternatives considered

- **Proxy serverless (Cloudflare Worker / Vercel Function)** — adiciona
  infraestrutura, domínio e manutenção fora do GitHub Pages.
- **API do `clist.by`** — exige conta e chave de API secreta; descartada
  pelo dono em 2026-11-23.
- **Biblioteca HTML (`cheerio` / `jsdom`) no script de fetch** — acrescenta
  dependência externa para extrair uma tabela simples de quatro colunas.
- **Comitar `public/contests.json` na `main` por um bot** — polui o
  histórico da `main` com quatro commits por dia.

## Consequences

- O app continua 100% estático e sem chaves ou segredos de API.
- Os dados ficam no máximo ~6 h atrás das fontes; quando passam de 24 h ou
  alguma fonte falha, a tela avisa o usuário explicitamente.
- Se AtCoder, CodeChef ou LeetCode mudarem o formato não oficial, só aquela
  fonte falha e entra em `errors`, preservando as demais até o parser ser
  ajustado.
- O teste de workflow de ADR-T11-1 (`tests/pages.test.ts`) passa a esperar o
  passo `npm run contests:fetch` entre `npm run check` e `npm run build:pages`.

## Rollback plan

Reverter os commits da T38, restaurar `.github/workflows/pages.yml` e
`tests/pages.test.ts` ao estado de ADR-T11-1, remover `src/contests/`,
`scripts/contests-fetch.mjs` e `src/ui/ContestsScreen.tsx`, e registrar um
ADR `kind: rollback` apontando para ADR-T38-1.
