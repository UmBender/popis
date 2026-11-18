---
id: ADR-T10-1
title: Code typing has its own engine, screen and store
status: proposed
kind: decision
date: 2026-11-18
task: T10
builds_on: [ADR-0002]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T10-1 Code typing has its own engine, screen and store

## Context

A Digitação de código ([[T10 Digitação de código]]) é um typing test no
estilo Monkeytype: o jogador digita um trecho inteiro, caractere por
caractere, vê os erros na hora e no fim recebe WPM e precisão. O motor de
partida (`src/session/`) foi feito para outra coisa: muitas questões
curtas contra o relógio, aceitas quando a resposta inteira está certa e
puladas com Enter. O dono escolheu uma tela separada.

## Decision

- O motor fica em `src/typing/engine.ts`, em TypeScript puro e
  imutável, com o tempo vindo do relógio injetado, como manda o
  AGENTS.md. O corpus e o sorteio por seed ficam em
  `src/typing/corpus.ts`.
- Os trechos são escritos à mão e guardados como dados, com
  `String.raw`, para que `\n` dentro do código continue literal. Um teste
  valida as regras do corpus: ASCII, até 60 colunas, indentação de 4 em
  4 e sem linha em branco.
- A tela é `src/ui/TypingScreen.tsx`, aberta por um botão na
  configuração. Ela não passa pelo registro de modos, pelo histórico nem
  pela revisão.
- As teclas chegam por um `<textarea>` invisível com foco. O texto vem do
  evento de input (depois da composição), e não do `keydown`, porque o
  teclado ABNT2 usa teclas mortas para `'`, `"`, `~` e `^`. Enter,
  Backspace, Tab e Esc são tratados no `keydown`.
- Os resultados ficam numa chave própria, `popis.typing` (até 200), e as
  linguagens marcadas em `popis.typing-settings`.
- Em telas de toque, o botão fica escondido por CSS
  (`(hover: none) and (pointer: coarse)`).

## Alternatives considered

- **Um modo do registro, com cada trecho como uma questão** — reaproveita
  o timer e o histórico, mas o motor aceita a resposta inteira de uma vez
  e não marca cada caractere. Também misturaria WPM com pontos.
- **Trechos gerados por templates** — dão variedade infinita, mas o
  código sai artificial. Ficam para outra task.
- **Ler as teclas pelo `keydown`** — é mais simples, mas quebra as teclas
  mortas, que são comuns no teclado do dono.

## Consequences

- A Digitação não aparece em "Revisar" nem nas estatísticas por
  habilidade.
- Escrever um trecho novo exige seguir as regras do corpus, que o teste
  confere.
- O corpus aumenta o bundle em alguns KB.

## Rollback plan

Remover `src/typing/`, `src/storage/typing.ts`,
`src/ui/TypingScreen.tsx` e o botão da configuração, registrar um ADR
`kind: rollback` e apagar as chaves `popis.typing*` não faz falta: são
ignoradas.
