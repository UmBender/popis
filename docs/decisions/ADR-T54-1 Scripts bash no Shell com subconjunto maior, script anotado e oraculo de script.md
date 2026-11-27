---
id: ADR-T54-1
title: Scripts bash no Shell com subconjunto maior, script anotado e oráculo de script
status: accepted
kind: decision
date: 2026-11-26
task: T54
builds_on: [ADR-T39-1, ADR-T25-1, ADR-T20-1]
amends: [ADR-T39-1]
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T54-1 Scripts bash no Shell com subconjunto maior, script anotado e oráculo de script

## Context

A pasta Shell (T39, ADR-T39-1) ensina comandos de uma linha. O dono pediu
"uma explicação simples de bash script em si" (2026-11-26). Para ensinar
scripts, o parser precisa aceitar construções que o ADR-T39-1 declarou fora
do subconjunto (`if`, `case`, `until`, `[[ … ]]`, `(( … ))`), ler o script
inteiro em várias linhas, com comentários, e distinguir `"$1"` de `$1`, que
o AST da T39 tratava como iguais. A lição precisa mostrar um arquivo `.sh`
com cada linha explicada, e o oráculo precisa conferir esse arquivo no bash
de verdade, não só os passos de terminal.

## Decision

1. **Subconjunto maior** em `src/shell/parse.ts`, ainda escrito à mão e sem
   dependências:
   - nós novos: `if/elif/else/fi`, `until`, `case … in … ;; esac`,
     `for (( a; b; c ))`, teste `[[ … ]]` (com `!`, `&&`, `||`, parênteses,
     operadores unários `-f -d -e -s -x -z -n` e binários `== != = < >
     -eq -ne -lt -le -gt -ge`), comando aritmético `(( … ))`, grupo
     `{ …; }` e redirecionamento de um comando composto (`done < in1`);
   - partes de palavra novas: `$(( … ))` (expressão aritmética com AST
     próprio), `"…"` com expansão dentro (parte `dq`; aspas só com texto
     continuam texto, como na T39), `${1:-padrão}` e as variáveis
     especiais `$#`, `$@` e `$?`;
   - crases viram substituição de comando, iguais a `$(…)`;
   - `#` no começo de uma palavra abre comentário até o fim da linha, e
     linhas novas, linhas em branco e comentários são aceitos onde o bash
     aceita;
   - continuam de fora, com erro legível: arrays, here-docs, `trap`,
     `getopts`, `select` e `eval`. `[[` grudado no operando
     (`[[$n -lt 5]]`) e `if` sem `fi` também dão erro legível.
   - A forma impressa por `formatShell` é de uma linha só, com
     `parseShell(formatShell(t))` igual a `t`.
2. **Verificador** (`src/shell/check.ts`):
   - `[[ x -lt y ]]` com operandos numéricos ou variáveis vira a mesma
     forma de `(( x < y ))`;
   - aspas duplas em volta de uma expansão são ignoradas por padrão (como
     na T39); a opção `strictQuotes` as torna obrigatórias, para objetivos
     que citam nomes com espaço;
   - `for f in ./in*` é igual a `for f in in*` por padrão; a opção
     `exactPaths` desliga isso quando o objetivo mostra o nome do arquivo;
   - mensagens novas para `n = 5`, `<` no lugar de `-lt` dentro de
     `[[ ]]`, `$1` sem aspas em modo estrito e `exit` sem código quando o
     objetivo pede falha. Quando a forma do comando é outra (um `case` no
     lugar de um `cd`), a mensagem nomeia as duas.
3. **Script anotado**: `ShellLessonExample` ganha `scripts`, uma lista de
   arquivos `{ file, lines: [{ code, note }] }`. A lista existe porque a
   lição 11.6 mostra dois arquivos (`run.sh` e `stress.sh`). A lição mostra
   cada arquivo com a nota ao lado de cada linha (abaixo, em tela estreita)
   e depois o terminal animado de sempre.
4. **Oráculo de script** (`scripts/shell-oracle.mjs`): para cada script
   anotado, grava o arquivo na pasta temporária da lição, roda `bash -n` e
   depois os passos do exemplo, gravando a transcrição como na T39. Uma
   fixture nova, `scripts`, traz `a.cpp`, os binários `a`, `sol`, `brute` e
   `gen`, `in1`/`in2` e `out1` (certo) e `out2` (errado), de modo que o
   `run.sh` mostra um OK e um WA e o `stress.sh` acha a diferença no teste
   7. As tabelas novas de equivalências e quase-acertos de script
   (`src/shell/cases/near-misses.ts`) passam pelo mesmo critério da T39:
   mesmo efeito para as equivalentes, efeito diferente para os
   quase-acertos.
5. **Currículo e treino**: unidades 10 (Scripts) e 11 (Controle), com
   explicação de até 4 frases (as unidades 1–9 continuam com até 3) e
   exercícios de uma linha. A lição 11.6 libera o tipo `scripts` do
   Comandos (KC `shell.scripts`). O progresso continua em
   `popis.shell-learn` v2, sem migração.

## Alternatives considered

- **Parser npm de bash** — mesma razão do ADR-T39-1: dependência nova e
  bundle maior para um subconjunto pequeno.
- **Guardar aspas como flag em cada parte** — mais simples de ler, mas a
  ida e volta fica ambígua quando texto e variável se misturam dentro das
  mesmas aspas; a parte `dq` agrupa o trecho entre aspas inteiro.
- **Um script por lição (`script`)** — obrigaria a dividir a lição 11.6 em
  duas e quebraria a tabela de lições do spec.
- **Editor de várias linhas no Comandos** — fora do escopo da T54: os
  exercícios e o treino seguem de uma linha.

## Consequences

- As equivalências e quase-acertos de script ficam ancorados no GNU bash
  5.3 pelo `npm run shell:oracle`, como os comandos da T39.
- Os casos de erro dos testes da T39 para `if`, `case`, `until`, `[[`,
  `((`, `for ((` e crases deixam de ser erro e são trocados por casos que
  continuam fora do subconjunto. O teste de currículo passa a esperar 11
  unidades.
- Um `*` entre aspas e um `*` sem aspas viram o mesmo texto no AST; o
  verificador não distingue `for f in 'in*'` de `for f in in*`.
- O AST cresceu: código que percorre `ShellNode` precisa tratar os nós
  novos (o `switch` exaustivo do TypeScript aponta os lugares).

## Rollback plan

Reverter os commits da branch `task/T54-shell-scripts`. O progresso salvo
das unidades 10 e 11 é descartado pelo `parseShellCompleted` (ids
desconhecidos), e as configurações com o tipo `scripts` caem para os tipos
conhecidos em `parseShellSettings`. Escrever um ADR `kind: rollback` que
reverte este.
