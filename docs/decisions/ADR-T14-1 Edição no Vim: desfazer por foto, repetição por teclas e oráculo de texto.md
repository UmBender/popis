---
id: ADR-T14-1
title: Edição no Vim: desfazer por foto, repetição por teclas e oráculo de texto
status: accepted
kind: decision
date: 2026-11-20
task: T14
builds_on: [ADR-T13-1]
amends: []
supersedes: []
reverts: []
superseded_by:
tags: [adr]
---

# ADR-T14-1 Edição no Vim: desfazer por foto, repetição por teclas e oráculo de texto

## Context

A T14 acrescenta ao motor da T13 o modo de inserção, os operadores, os
objetos de texto, `u`, `<C-r>` e `.`. O comportamento de referência segue
sendo o `nvim --clean`. Falta decidir como representar o desfazer, a
repetição e o que o oráculo compara.

## Decision

- O estado ganha `mode` (`normal` ou `insert`), o registrador sem nome
  (linhas e se é de linha inteira), as pilhas de desfazer e refazer e as
  teclas da última mudança.
- **Desfazer por foto:** cada mudança guarda as linhas e o cursor de antes.
  Uma sessão de inserção (`ciwfoo<Esc>`) é um passo só, como no Vim. O
  cursor depois de `u` e `<C-r>` segue a regra do Vim: a primeira linha que
  mudou, e a coluna salva se o cursor de antes estava nessa linha.
- **Repetir por teclas:** `.` reaplica as teclas da última mudança, texto
  inserido incluído, pelo mesmo motor. Contagem nova no `.` troca a
  contagem original.
- **Operadores:** o alcance vem do movimento (exclusivo, inclusivo ou de
  linha) com as exceções do Vim: `cw` age como `ce`, `dw` na última palavra
  da linha não junta linhas, e um movimento exclusivo que termina na coluna
  0 recua para o fim da linha anterior.
- **Objetos de texto** são portes de `current_word`, `current_block` e
  `current_quote`. Para os blocos, a busca ignora aspas, como no Vim.
- **Oráculo de texto:** um caso de edição é `[nome, texto, cursor, teclas,
  esperado]`, e o esperado é `{ text, cursor, reg, regtype }` (o texto do
  buffer, o cursor e o conteúdo e o tipo do registrador sem nome). O
  oráculo desliga `autoindent`: a nota pede que o texto inserido entre
  como foi digitado, e o Neovim o liga por padrão. A saída do `nvim` vai
  para um arquivo, porque as mensagens de modo poluem a saída padrão.
- **Persistência:** os resultados de edição entram em `popis.vim` com
  `kind: "edit"` e sem `level`. Os da T13, sem `kind`, carregam como
  `kind: "motion"`. As opções da edição (treino escolhido, duração e tipos
  ligados) ficam em `popis.vim-edit-settings`, para não mexer no formato de
  `popis.vim-settings`.
- **Rodada de edição:** a eficiência é as teclas da referência ÷ as teclas
  usadas, sem teto: passar de 100% é "melhor que a referência". A
  referência é escrita por tipo de edição, sem busca da edição ótima.

## Alternatives considered

- **Desfazer por diferenças** — mais fiel à estrutura do Vim, mas o buffer
  tem até 15 linhas; a foto é mais simples e igualmente correta.
- **Gravar `.` como comando estruturado** — não cobre o texto inserido com
  `<BS>` sem reimplementar a inserção.

## Consequences

- Texto com tabulações e caracteres largos continua sem suporte.
- Mudar `autoindent` para ligado exigiria novos casos e um novo ADR.

## Rollback plan

Remover `src/vim/edit*.ts`, `src/vim/textobjects.ts`, `src/vim/drills/edit.ts`,
`src/vim/cases/edit-*.ts` e a escolha "Edição" da tela; a T13 continua
funcionando sozinha.
