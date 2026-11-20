---
id: ADR-T16-1
title: Registradores, macros e modo Aprender
status: accepted
kind: decision
date: 2026-11-20
task: T16
builds_on: [ADR-T13-1, ADR-T14-1, ADR-T15-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T16-1 Registradores, macros e modo Aprender

## Context

A T16 acrescenta ao motor registradores, macros e `<C-a>`/`<C-x>`, e à tela
um modo "Aprender", porque o dono ainda não usa esses comandos. O
comportamento de referência é o `nvim --clean` (Neovim vence a nota).

## Decision

- **Estado:** `VimState.register` continua sendo o registrador sem nome
  (`""`). O estado ganha `registers` (os registradores `0`–`9`, `-` e
  `a`–`z`, cada um um `Register`), `recording` (a letra e as teclas
  gravadas, ou null) e `lastMacro` (para `@@`).
- **Escrita por pós-processamento:** os operadores continuam trocando só
  `register`. Quem digitou o comando (`pressNormal`/`pressVisual`) vê que
  `register` mudou e distribui a cópia como o Vim: cópia vai para `"0`;
  apagar com quebra de linha, linha inteira ou um dos movimentos `% ( ) \`
  / ? n N { }` desloca `"1`–`"9`; apagar dentro de uma linha vai para
  `"-`; `"x` escreve em `x` (maiúscula acrescenta) e `"_` não escreve em
  nenhum. O que `u`, `.` e macros repetem passa pelo mesmo caminho.
- **Prefixo `"x`:** fica em `pending`, antes da contagem, e entra nas
  teclas do `lastChange`, de modo que `.` repete com o mesmo registrador
  (e `"1p` seguido de `.` usa `"2`, como o Vim).
- **Macros:** gravar guarda as teclas digitadas (não as que `.` ou `@`
  executam) como texto no registrador (`<Esc>` é `\x1b`, `<CR>` é `\r`,
  `<BS>` é `\x80kb`). `@x` lê o texto de volta e digita cada tecla. Um
  comando que falha (movimento sem destino, `x` numa linha vazia, `p` sem
  nada, `u` sem o que desfazer) marca `failed` no estado, e a macro
  (também com contagem) para ali.
- **`<C-r>x` na inserção** cola o registrador; as teclas do texto colado
  entram no que `.` repete, e não o `<C-r>x`.
- **`<C-a>`/`<C-x>`:** decimal, hexadecimal e binário (`nrformats` padrão
  do Neovim), com `-`, contagem e `.`.
- **Oráculo:** um caso de registrador é um `EditCase` cuja expectativa
  tem `regs`, o conteúdo e o tipo de cada registrador não vazio entre
  `0`–`9`, `-` e `a`–`z`. Os casos ficam em `REGISTER_CASES`, à parte,
  para não mexer nos testes das T14 e T15.
- **Aprender:** uma lição por tipo de edição de CP (`src/vim/lessons.ts`):
  explicação, exemplo animado (a referência, uma tecla a cada 600 ms, com
  pausar e recomeçar) e um exercício guiado com a referência visível. Os
  tipos liberados ficam em `popis.vim-learn`. No treino livre, um tipo
  de registrador só entra na rodada depois de liberado.

## Alternatives considered

- **Cada operador escolhe o registrador** — espalha a regra do `"1`–`"9`
  por vinte pontos do motor; o pós-processamento a deixa em um.
- **Falha de comando como exceção** — o motor é imutável e puro; um
  campo no estado se testa mais fácil.

## Consequences

- O que `u` e `.` fazem com os registradores segue o Vim porque passa
  pelo mesmo caminho das teclas.
- Quem tem configurações salvas só vê os tipos novos depois de liberá-los
  no Aprender e marcá-los.
- `<C-a>` no visual, `g<C-a>` e `p` no visual ficam fora.

## Rollback plan

Reverter os commits da T16: o estado perde `registers`, `recording` e
`lastMacro`, e `popis.vim-learn` fica sem uso no armazenamento.
