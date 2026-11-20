---
id: ADR-T14-2
title: Desfazer devolve o cursor ao lugar salvo
status: accepted
kind: decision
date: 2026-11-20
task: T14
builds_on: [ADR-T14-1]
amends: [ADR-T14-1]
supersedes: []
reverts: []
superseded_by:
tags: [adr]
---

# ADR-T14-2 Desfazer devolve o cursor ao lugar salvo

## Context

O ADR-T14-1 dizia que `u` e `<C-r>` põem o cursor na primeira linha que
mudou, com a coluna salva se o cursor de antes estava nela. Os 1849 casos
do oráculo mostram que, para todo comando do motor, o cursor salvo está
dentro ou ao lado das linhas que o comando muda.

## Decision

- `u` e `<C-r>` põem o cursor na posição salva antes da mudança (o começo do
  trecho mudado; nos inserts, o ponto onde o texto entra). Se essa linha não
  existe mais (refazer apagou a última linha), vão para a coluna 0 da última.
- Dois outros detalhes que o Neovim 0.12 mostrou, sem ADR próprio: `Y` copia a
  linha inteira, e um objeto de texto que vira linhas inteiras deixa o
  cursor no primeiro não-branco; um objeto de palavra que falha ainda move
  o cursor.

## Consequences

- Só em casos degenerados (linhas vizinhas iguais) a regra completa do Vim
  daria outra linha; os casos do oráculo não mostram diferença.
