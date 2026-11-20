---
id: ADR-T18-1
title: Janela de editor com menu recolhível
status: proposed
kind: decision
date: 2026-11-20
task: T18
builds_on: [ADR-0001, ADR-T22-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T18-1 Janela de editor com menu recolhível

## Context

A tela inicial era um formulário único: os modos em botões de rádio e as
outras telas (Digitação, Texto, Vim) em botões no pé da página, com o
treino do Vim escolhido num seletor embaixo de tudo. O app tem agora
catorze itens, e quem usa é gente de Vim e de programação competitiva. A
direção de design está em [[Shell]], com um protótipo em
`docs/architecture/shell/`.

## Decision

- **Janela de editor** (`src/ui/shell/`): barra de caminho
  (`popis/<seção>/<item>`), árvore de seções, painel e linha de status no
  estilo do Neovim (modo em bloco de cor e os atalhos válidos). A árvore
  some durante uma partida ou digitação.
- **Uma tabela** (`src/ui/shell/sections.ts`) define pastas, itens, a
  ordem e o atalho numérico (os nove primeiros itens). Todo modo de
  `MODES` e toda tela aparecem nela uma vez; Dados (ADR-T22-1) é um item
  da pasta Treino. O seletor "Treino" do Vim e os botões do rodapé somem.
- **Itens como rádios** (`input type="radio"` com `aria-label`), para
  manter os nomes acessíveis de antes.
- **Menu recolhível:** `☰` na barra de caminho e a tecla `m`. No desktop
  recolhe a árvore; abaixo de 48rem ela é uma gaveta (`role="dialog"`,
  `aria-modal`) que prende o foco e o devolve ao `☰` ao fechar. A largura
  vem de `matchMedia`, injetável nos testes.
- **Teclado:** um só ouvinte na janela trata `j/k`, setas, `h/l`, `1–9`,
  Enter, `m`, `?` e Esc fora de campos de texto e só quando a árvore está
  visível. O resultado trata Enter, Esc e `r`.
- **Ordem fixa do painel:** título e descrição, opções, área do treino,
  histórico e painéis de referência (`<details>`, fechados por padrão).
  Cada bloco tem `data-panel`, e um teste confere a ordem.
- **Vereditos e placar:** funções puras em `src/ui/verdicts.ts` derivam a
  fila `AC`/`WA`/`SK` e as células do placar (`+`, `+n`, `?`, `−n`) do log
  de tentativas. Uma correção (a resposta encurtada) conta como `WA`.
- **Preferências da janela** (item escolhido, árvore recolhida, pastas
  fechadas, painéis abertos) numa chave própria, `popis.shell.v1`.
- **Cores:** só os tokens do ADR-0001; a gaveta escurece o fundo com
  `--bg` e opacidade. Tokens de texto e espaço novos ficam em
  `src/ui/app.css`.

## Alternatives considered

- **Árvore com `role="tree"`** — exigiria trocar todos os seletores
  `radio` dos testes; o grupo de rádio já dá a navegação e o nome.
- **Gaveta como uma rota própria** — o estado da árvore ficaria
  duplicado; uma gaveta é a mesma árvore em outro lugar.
- **WA só para respostas enviadas** — o app aceita a resposta sozinho e
  não há envio; a correção é a única tentativa errada observável.

## Consequences

- Toda tela nova entra pela tabela de seções; o teste de cobertura da
  tabela falha se ela ficar de fora.
- Os testes que clicavam "Digitação", "Texto", "Vim" e o seletor
  "Treino" passam a escolher o item da árvore.
- No celular, os itens ficam na gaveta: os e2e abrem o `☰` antes.

## Rollback plan

Reverter os commits da T18 devolve o formulário único; a chave
`popis.shell.v1` fica órfã e é ignorada.
