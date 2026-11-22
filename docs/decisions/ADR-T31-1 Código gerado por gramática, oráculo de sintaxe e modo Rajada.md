---
id: ADR-T31-1
title: Código gerado por gramática, oráculo de sintaxe e modo Rajada
status: accepted
kind: decision
date: 2026-11-22
task: T31
builds_on:
  - "[[ADR-T10-1 Code typing has its own engine, screen and store]]"
  - "[[ADR-T19-1 Teclas e componentes comuns de treino]]"
  - "[[ADR-T29-1 Ritmo-alvo e cursor fantasma na digitação]]"
  - "[[ADR-T34-1 Mineração da biblioteca de trechos e perfil de estilo]]"
amends:
  - "[[ADR-T10-1 Code typing has its own engine, screen and store]]"
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T31-1 Código gerado por gramática, oráculo de sintaxe e modo Rajada

## Context

Na tela Código ([[T10 Digitação de código]]), o sorteio entre 26 trechos
fixos faz o praticante decorar o texto específico em vez de automatizar os
padrões motores de digitação de código. Por outro lado, o corpus fixo
(`src/typing/corpus.ts`) precisa permanecer no repositório porque os treinos
de Vim (T13–T16) dependem dele.

Com o perfil de estilo extraído do repositório do dono em
`src/typing/library/profile.json` ([[ADR-T34-1 Mineração da biblioteca de
trechos e perfil de estilo]]), podemos gerar trechos novos a cada seed que
espelhem os identificadores, constantes e pesos reais do dono, validar a
sintaxe com os compiladores reais fora do `check`, e oferecer um modo
**Rajada** para repetir um único idioma de uma linha 5 vezes seguidas.

## Decision

1. **Gramática pura em `src/typing/codegen/` substitui `pickSnippet` na tela
   Código:**
   - `src/typing/corpus.ts` permanece intacto para os treinos de Vim.
   - `src/typing/codegen/profile.ts` lê `src/typing/library/profile.json` e
     monta bancos ponderados de identificadores (variáveis curtas, variáveis
     de palavra, nomes de tipo capitalizados e apelidos numéricos C++ como
     `ll` e `i32`), constantes (`1e9 + 7`, `998244353`, `LLONG_MAX`, `MAXN`,
     `1e18 + 1000`, `2e5 + 100`) e pesos por regra a partir de `idioms`.
   - `src/typing/codegen/cpp.ts` cobre 10 regras (`for-loop`, `cin-read`,
     `vector-sized`, `prefix-sum`, `sort-lambda`, `lower-bound`,
     `pair-struct`, `binary-search`, `constants`, `structured-binding`),
     incluindo construções do estilo do dono (`#define int ll`, `vi`, `pii`,
     `MAXN`, `ll`, `i32`).
   - `src/typing/codegen/python.ts` cobre 7 regras (`py-for-range`,
     `py-input-split`, `py-list-comp`, `py-defaultdict`, `py-sorted-key`,
     `py-bisect`, `py-heapq`).
   - Toda saída gerada cumpre por construção as regras da T10 (ASCII
     imprimível, sem tab, sem linha em branco, sem espaço no fim da linha,
     linhas de até 60 caracteres, indentação em múltiplos de 4, primeira
     linha sem indentação, de 3 a 12 linhas e delimitadores balanceados).
   - Resultados novos no histórico `popis.typing` gravam
     `snippetId: "gen:<linguagem>:<seed>"`; resultados antigos do corpus
     continuam carregando e aparecendo no histórico sem migração destrutiva.
2. **Oráculo de sintaxe em `scripts/typing-oracle.mjs` (`npm run
   typing:oracle`), fora do `check`:**
   - Carrega `src/typing/codegen/index.ts` via `runnerImport` do `vite`, sem
     dependência npm extra.
   - Testa 500 seeds de C++ embrulhadas em `#include <bits/stdc++.h>`,
     `using namespace std;`, apelidos do template do dono (`ll`, `i32`,
     `i64`, `vi`, `pii`) e `int32_t main() { … }` com
     `g++ -std=c++20 -fsyntax-only`.
   - Testa 500 seeds de Python embrulhadas em `def _snippet():` com
     `python3 -m py_compile`.
3. **Modo Rajada em `src/typing/codegen/burst.ts` e na tela Código:**
   - Uma opção `Rajada (5×)` na tela Código troca o trecho gerado por um
     idioma de uma linha (até 60 caracteres, determinístico pela seed e
     ponderado pelo perfil) repetido 5 vezes, uma por linha.
   - O `snippetId` gravado é `"burst:<linguagem>:<regra>:<seed>"`.
   - Os eventos gerados por `codeEvents` (`src/stats/keytrace.ts`) recebem
     `kc: "typing.idiom.<regra>"`, preservando `kc: "line"` para trechos
     gerados normais.
   - O resultado exibe o tempo de cada uma das 5 repetições e a razão entre
     a última e a primeira (`5ª/1ª`).
4. **Ritmo-alvo separado e teclas uniformes:**
   - `src/storage/typing-pace.ts` mantém `codePaceKey` (`code:<langs>`) para
     código gerado e adiciona `burstPaceKey` (`burst:<langs>`) para a
     Rajada, com históricos e alvos independentes.
   - As teclas da tela Código continuam seguindo a tabela única da
     [[ADR-T19-1 Teclas e componentes comuns de treino]]: `Ctrl+Enter`
     (ou `Cmd+Enter`) gera outro trecho/rajada, `Ctrl+Shift+Enter` recomeça
     com nova seed e `Esc` sai da rodada reiniciando o trecho atual.

## Alternatives considered

- **Apagar `src/typing/corpus.ts`** — quebraria os treinos de Vim
  (T13–T16) e a resolução de bigramas de eventos históricos antigos do
  corpus.
- **Manter `Esc` gerando outro trecho na tela Código** — contradiria a
  [[ADR-T19-1 Teclas e componentes comuns de treino]] e quebraria
  `src/ui/coherence.test.tsx` e `tests/e2e/coherence.spec.ts`.
- **Misturar o alvo de ritmo-alvo da Rajada com o do código gerado** —
  repetir a mesma linha 5 vezes produz WPM bem maior do que digitar um
  bloco novo; compartilhar o mesmo alvo distorceria ambos.
- **Rodar `g++` dentro do `npm run check`** — o `check` precisa rodar em
  ambientes sem compilador C++ ou Python; o oráculo segue o mesmo modelo de
  `scripts/vim-oracle.mjs`.

## Consequences

- Cada rodada em Código gera código inédito no estilo do dono, mantendo a
  reprodutibilidade completa a partir de `seed` e `linguagem`.
- Testes antigos da T10 e de `TrainingLog.test.tsx` que fixavam um trecho
  do corpus passam a fixar a mesma seed no gerador, sem afrouxar asserções.
- Qualquer regra nova adicionada à gramática precisa continuar passando nas
  propriedades de formato e nos 500 seeds do `npm run typing:oracle`.

## Rollback plan

Reverter os commits da `T31`, voltar `TypingScreen.tsx` para `pickSnippet`
de `src/typing/corpus.ts` e registrar um ADR `kind: rollback` apontando
para `ADR-T31-1`. Registros `gen:*` e `burst:*` já gravados em
`popis.typing` e chaves `burst:*` em `popis.typing-pace` continuam sendo
aceitos sem quebrar o carregamento.
