---
id: ADR-T46-1
title: Referência em dados tipados, com saídas gravadas pelo oráculo e selo do juiz
status: accepted
kind: decision
date: 2026-11-25
task: T46
builds_on: [ADR-0002, ADR-T18-1, ADR-T25-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T46-1 Referência em dados tipados, com saídas gravadas pelo oráculo e selo do juiz

## Context

A T46 cria uma referência de C++ para programação competitiva que roda
offline (ADR-0002) e que a T47 (Python) reaproveita. Cada verbete mostra
um exemplo e a saída dele, e essa saída precisa ser a real, não uma
digitada à mão. O alvo é o g++ do ICPC World Finals 2026 (g++ 13.2,
`-std=gnu++20 -O2`), mas a máquina local tem o g++ 16.2. Alguns recursos
úteis só existem em C++23 e precisam de um aviso claro.

## Decision

1. **Verbetes como dados tipados.** `src/ref/model.ts` define `Lang`,
   `Section` e `Entry`, comuns às linguagens. O conteúdo de C++ fica em
   `src/ref/cpp/`, um arquivo por seção (`io.ts`, `types.ts`, …), e
   `src/ref/cpp/index.ts` junta tudo em `CPP_SECTIONS` e `CPP_ENTRIES`.
   `src/ref/langs.ts` registra as linguagens (hoje só `cpp`).
2. **Campos além do spec.** `Entry` ganha `input?` (a entrada padrão do
   exemplo, para "ler até EOF" e `getline`). A complexidade é um texto ou
   uma tabela `[operação, custo][]`; os contêineres usam a tabela.
3. **Saídas gravadas, nunca digitadas.** Os arquivos de seção não têm
   `output`. O oráculo (`scripts/ref-oracle.mjs`, `npm run ref:oracle --
   cpp`) grava as saídas em `src/ref/cpp/outputs.ts` (mapa `id → saída`)
   com `--write`, e `index.ts` junta cada verbete à sua saída. Sem
   `--write`, o oráculo só confere.
4. **Como o exemplo é embrulhado.** As linhas do exemplo que começam com
   `#` (`#include`, `#pragma`, `#define`) sobem para o topo do arquivo;
   depois vêm `#include <bits/stdc++.h>`, `using namespace std;` e
   `int main() {` com as demais linhas. O oráculo compila com
   `g++ -std=gnu++20 -O2 -Wall`, roda com `input` na entrada padrão e
   exige saída igual a `output`, código de saída 0 e nenhum aviso.
5. **Selo do juiz.** `judge: true` marca um verbete que não existe na WF.
   O oráculo exige que ele **falhe** com `-std=gnu++20` e passe com
   `-std=gnu++23` (a saída gravada vem desse segundo build). Um recurso
   que o g++ 16.2 aceita em `gnu++20`, mas o 13.2 não, é marcado à mão
   com a fonte citada no *Log* da task.
6. **Busca pura.** `src/ref/search.ts` normaliza (sem acento, sem caixa)
   e exige que todo termo da consulta apareça no título, nas tags ou na
   assinatura. A ordem é: título começa com a consulta, título contém,
   tag, assinatura, termos espalhados; o empate segue a ordem das seções.
7. **Link por hash.** Um verbete abre por `#<lang>/<id>` na URL.
   `src/ref/link.ts` dá `refLink("cpp/lower_bound")` (lança para um
   verbete inexistente) e `parseRefHash`. O `App` abre o item da
   referência quando a página carrega com esse hash ou quando ele muda.
8. **Árvore.** A pasta `referencia` ("Referência") entra no fim da
   árvore, com o item `ref-cpp` ("C++"), visível no celular e sem atalho.
9. **Impressão.** `@media print` esconde a janela e os controles e
   imprime os verbetes em duas colunas com o texto em `var(--surface)`
   (escuro) sobre o papel, sem cor nova.

## Alternatives considered

- **Markdown com um parser no app** — perde o tipo dos campos e exige
  dependência ou parser próprio; os testes de conteúdo ficam frágeis.
- **Saída dentro do verbete, regravada pelo oráculo no próprio arquivo**
  — o oráculo teria de editar código escrito à mão; um arquivo gerado
  separado é mais simples e deixa claro o que é gravado.
- **Rodar o g++ 13.2 num contêiner** — fora do alcance do batch; o
  `-std=gnu++20` pega quase todos os casos, e o resto é marcado à mão.

## Consequences

- A T47 só acrescenta `python` a `Lang`, uma pasta `src/ref/python/` e um
  ramo no oráculo; o leitor e a busca não mudam.
- Mudar um exemplo exige rodar `npm run ref:oracle -- cpp --write`; o
  teste de conteúdo falha se faltar a saída de algum verbete.
- O oráculo fica fora do `check` por depender do g++.

## Rollback plan

Remover `src/ref/`, `src/ui/RefScreen.tsx`, o item `ref-cpp` da árvore,
o ramo de hash no `App` e `scripts/ref-oracle.mjs`, num `revert(T46)`
com um ADR `kind: rollback`.
