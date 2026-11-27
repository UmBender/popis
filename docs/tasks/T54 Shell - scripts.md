---
id: T54
title: Shell - scripts
status: ready
depends_on: [T39]
branch: task/T54-shell-scripts
adrs: []
tags: [task]
---

# T54 Shell - scripts

## Goal

A pasta **Shell** (T39) ensina comandos de uma linha, mas não explica o
que é um **script bash**. Esta task acrescenta ao Aprender duas unidades
que ensinam bash script do zero, de forma simples:

- o que é um arquivo `.sh` e como ele roda;
- variáveis, aspas e argumentos;
- testes, `if`, laços, `case` e funções;
- e, no fim, dois scripts de prova completos: um `run.sh` que roda todos
  os testes da pasta e um `stress.sh` que recebe argumentos.

Cada lição mostra um **script anotado**, com cada linha explicada ao
lado, além dos 3 exercícios de sempre. O Comandos ganha o tipo
`scripts`, com linhas curtas de script (`if [[ -f in1 ]]; then …; fi`,
`for f in in*; do …; done`).

O pedido do dono (2026-11-26): "senti falta de uma explicação simples de
bash script em si". A prioridade é a **explicação**: frases curtas, um
conceito por lição, sempre com um exemplo que roda de verdade.

## Base

- Referência: GNU bash 5.3 (o instalado), seguindo o
  [manual do bash](https://www.gnu.org/software/bash/manual/bash.html).
  Nada além de bash e coreutils, como na T39.
- O padrão das lições é o da T39 (ADR-T39-1): explicação curta, exemplo
  conferido pelo oráculo, 3 exercícios com retirada da ajuda e um botão
  "Treinar".

## Escolhas de padrão (o dono pode mudar)

- **Shebang:** `#!/usr/bin/env bash`. Aceita também `#!/bin/bash`.
- **Testes:** ensinar `[[ … ]]` e `(( … ))`, que são do bash e mais
  seguros. `[ … ]` e `test` são citados uma vez, para reconhecer em
  scripts dos outros.
- **Modo estrito:** `set -euo pipefail` é apresentado na lição 10.8
  como recomendado nos scripts de prova, com o motivo de cada letra.
- **Tamanho da explicação:** até 4 frases (a T39 usa 3), porque aqui o
  conceito é novo. O resto da explicação fica nas notas linha a linha.

## Spec

- **AC-1**: **Parser estendido** (`src/shell/parse.ts`). O subconjunto
  passa a cobrir:
  - atribuição `n=5`, `local x=1`, `${var}`, `${1:-padrão}`;
  - `$1`…`$9`, `$#`, `$@`, `"$@"`, `$?`;
  - aritmética `$(( … ))` e `(( … ))`;
  - `[[ … ]]` com `-f`, `-d`, `-z`, `-n`, `==`, `!=`, `-eq`, `-ne`,
    `-lt`, `-le`, `-gt`, `-ge`, `&&` e `||`;
  - `if … then … elif … else … fi`, `until`, `case … in … ;; esac`,
    `for (( i = 1; i <= n; i++ ))`;
  - definição de função `nome() { …; }` com `return`;
  - `exit`, `set`, `read -r`, `echo`, `printf`, `chmod`, `bash`, `shift`;
  - comentários `#` e várias linhas (o parser recebe o script inteiro).

  Continua de fora (com erro legível, nunca exceção): arrays, here-docs,
  `trap`, `getopts`, `select` e `eval`.
  - Testes: `src/shell/parse.test.ts` (casos novos por construção),
    `src/shell/parse.prop.test.ts` (`parse(format(t))` é igual a `t`
    também para as construções novas).
- **AC-2**: **Verificador** (`src/shell/check.ts`). Formas aceitas e
  quase-acertos de script:
  - aceitas: `then` na mesma linha (`; then`) ou na seguinte; `[[ $n -lt 5 ]]`
    contra `(( n < 5 ))`; `"$1"` contra `"${1}"`; `for f in in*` contra
    `for f in ./in*` quando o objetivo não fixa a forma; `$(cmd)` contra
    crases;
  - rejeitados: `n = 5` (espaço na atribuição); `[[$n -lt 5]]` (sem
    espaço dentro dos colchetes); `$1` sem aspas onde o objetivo cita
    nome com espaço; `-lt` trocado por `<` dentro de `[[ ]]` (compara
    texto, não número); `fi` ou `done` faltando; `exit` sem código onde
    o objetivo pede falha.
  - Testes: `src/shell/check.test.ts` ("checker accepts equivalent script forms", "checker rejects script near misses"), com a tabela em `src/shell/cases/near-misses.ts`.
- **AC-3**: **Script anotado** no exemplo da lição. `ShellLessonExample`
  ganha um campo opcional `script` com o nome do arquivo e as linhas,
  cada uma com o código e uma nota curta. A lição mostra o arquivo com
  as notas ao lado (abaixo, no celular) e, depois, os passos de terminal
  que o rodam (`chmod +x run.sh`, `./run.sh`), como hoje.
  - Testes: `src/shell/curriculum.test.ts` ("every script line has a note", "every lesson example has an oracle transcript"), `src/ui/ShellScreenLearn.test.tsx` ("a script lesson shows each line with its note").
- **AC-4**: **Currículo** (`src/shell/curriculum.ts`), duas unidades
  novas depois das 9 da T39:

  | Unidade | Lição | O que explica | Libera |
  |---|---|---|---|
  | 10 Scripts | 10.1 Primeiro script | o arquivo `.sh`, shebang, comentário, `chmod +x`, `./run.sh` contra `bash run.sh` | |
  | | 10.2 Variáveis e aspas | `n=5` sem espaço, `"$n"`, aspas simples contra duplas, `$(cmd)` | |
  | | 10.3 Contas | `$(( ))`, `(( ))`, `i=$((i + 1))`, divisão inteira | |
  | | 10.4 Argumentos | `$1`, `$#`, `"$@"`, `${1:-a}`, `shift` | |
  | | 10.5 Código de saída | `$?`, `exit 0`/`exit 1`, `&&` e `\|\|` como "se deu certo" | |
  | 11 Controle | 11.1 Testes e `if` | `[[ -f in1 ]]`, comparar número e texto, `if/elif/else` | |
  | | 11.2 Laços | `for f in in*`, `for (( i = 1; i <= n; i++ ))`, `while read -r linha` | |
  | | 11.3 `case` | escolher pelo argumento (`case "$1" in run) …;; stress) …;; esac`) | |
  | | 11.4 Funções | `nome() { … }`, `local`, `return`, `"$@"` dentro da função | |
  | | 11.5 Modo estrito | `set -euo pipefail`: parar no erro, variável não definida e erro no meio do pipe | |
  | | 11.6 Scripts de prova | `run.sh` (compila e compara cada `inN` com `outN`, imprime OK/WA) e `stress.sh <sol> <brute> [n]` | `scripts` |

  Cada lição tem explicação de até 4 frases, um script anotado (AC-3)
  conferido pelo oráculo e 3 exercícios de uma linha. Os exercícios de
  `if`, laço e função usam a forma de uma linha
  (`if [[ -f in1 ]]; then echo ok; fi`).
  - Testes: `src/shell/curriculum.test.ts` ("every drill kind is unlocked by exactly one lesson", "every exercise answer passes the checker", que já existem e passam a cobrir as unidades novas).
- **AC-5**: **Tipo `scripts` no Comandos** (`src/shell/drill.ts`, KC
  `shell.scripts`). O gerador sorteia objetivos como "se `out1` não
  existir, saia com código 1", "para cada `in*`, rode `./a` com ele e
  mostre o nome do arquivo antes" (só o que o AC-1 cobre), "defina a função `t` que roda
  `./a < "$1"`". A rodada continua de uma linha.
  - Testes: `src/shell/drill.prop.test.ts` (para muitas seeds: a resposta canônica é aceita; os arquivos citados aparecem; a mesma seed gera o mesmo item).
- **AC-6**: **Oráculo** (`scripts/shell-oracle.mjs`, `npm run shell:oracle`).
  Para cada script anotado, ele grava o arquivo numa pasta temporária,
  roda `bash -n` (sintaxe) e depois o executa com os arquivos de exemplo,
  conferindo a saída e o código de saída da transcrição. O `run.sh` é
  testado com um teste que passa e outro que dá WA; o `stress.sh`, com um
  par que difere no teste 7. As equivalências e quase-acertos novos do
  AC-2 também passam pelo oráculo.
  - Testes: `npm run shell:oracle`, com o resultado no *Log*.
- **AC-7**: **Progresso e árvore.** O progresso das lições novas fica no
  mesmo `popis.shell-learn` (v2), e um progresso salvo antes da T54
  continua carregando, com as unidades 10 e 11 por fazer. A árvore não
  muda.
  - Testes: `src/storage/shell-learn.test.ts` ("progress saved before the scripts units still loads"), `tests/e2e/shell-drill.spec.ts` (uma lição de script no desktop e no celular).

## Out of scope

- Executar bash no navegador (o oráculo confere o efeito, como na T39).
- Arrays, here-docs, `trap`, `getopts`, `awk` e `sed`.
- Editor de script com várias linhas no Comandos: os exercícios e o
  treino continuam de uma linha.

## Files owned

- `src/shell/parse.ts`, `check.ts`, `drill.ts`, `curriculum.ts`,
  `cases/transcripts.ts`, `cases/near-misses.ts` e os testes ao lado
- `src/storage/shell-learn.ts`, `src/storage/shell-learn.test.ts`
- `src/ui/ShellScreen.tsx`, `src/ui/shell-drill/`,
  `src/ui/ShellScreenLearn.test.tsx`, `src/ui/app.css`
- `scripts/shell-oracle.mjs`, `vite.config.ts` (limiares de `src/shell/**`)
- `tests/e2e/shell-drill.spec.ts`

## Subtasks (one commit each)

- [ ] spec: ADR-T54-1 (amends ADR-T39-1: subconjunto maior, script anotado e oráculo de script) e testes nomeados
- [ ] tests
- [ ] models
- [ ] behaviour
- [ ] quality: `npm run check`, `shell:oracle`, coverage, e2e e screenshots
- [ ] docs: *Log* e status `review`

## Notas para o batch

- **Tamanho:** grande, por causa do parser. Se apertar, entregue a
  unidade 10 inteira e as lições 11.1, 11.2 e 11.6, e registre o resto no
  *Log*. A explicação vem antes do treino: o tipo `scripts` do Comandos
  (AC-5) é o primeiro a sair se faltar tempo.
- **Oráculo:** só em `mktemp -d`, nunca no `$HOME`.
- **Texto:** sem crases literais na UI (regressão
  `tests/regressions/T39-no-raw-backticks.test.ts`).

## Log
