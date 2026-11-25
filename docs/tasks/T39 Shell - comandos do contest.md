---
id: T39
title: Shell - comandos do contest
status: in-progress
depends_on: [T25]
branch: task/T39-shell-commands
adrs: [ADR-T39-1]
tags: [task]
---

# T39 Shell - comandos do contest

## Goal

Uma pasta **Shell** na árvore, com **Aprender** e **Comandos**, no molde
do GDB (T25). No Comandos, aparece um objetivo de prova em português
("compile `a.cpp` com avisos e sanitizers", "rode `a` com `in1` e compare
com `out1` ignorando espaço no fim da linha", "repita o gerador até as
saídas diferirem") e a pessoa digita a linha de bash que faz isso. O app
aceita formas equivalentes (ordem das flags, `diff -w` contra `diff -b`
quando o objetivo permite, `<` antes ou depois dos argumentos). O
Aprender é um currículo em ordem com explicação, exemplo e exercícios com
retirada da ajuda (ADR-T20-1). Assim, o que se faz no terminal durante a
maratona vira reflexo, para não ser preciso pensar nisso na hora.

## Base em pesquisa (2026-11-24)

- O ambiente do ICPC World Finals 2026 compila C++ com
  `g++ -x c++ -g -O2 -std=gnu++20 -static`, oferece vim, emacs, gedit,
  geany e kate, e não tem root nem internet. A Maratona SBC usa o
  Maratona-Linux (Ubuntu) e o BOCA. Nos dois casos, o terminal é bash.
- O fluxo comum de quem compete: compilar com avisos e sanitizers, rodar
  com `<` e `>`, comparar com `diff`, fazer stress test em laço (gerador,
  força bruta e `diff ... || break`), subir a pilha com `ulimit -s`, e
  limitar o tempo com `timeout` e `time`.
- Fontes:
  [WF 2026 environment](https://image.icpc.global/wf2026/environment.html),
  [stress testing (Codeforces 78985)](https://codeforces.com/blog/entry/78985),
  [linha de comando para CP (Codeforces 134678)](https://codeforces.com/blog/entry/134678),
  [ulimit -s (Codeforces 61066)](https://codeforces.com/blog/entry/61066).

## Escolhas de padrão (o dono pode mudar)

- **Referência:** GNU bash 5.3 e g++ 16.2 (os instalados). As respostas
  usam só o que existe numa máquina de prova: coreutils, diffutils,
  `g++`, `time`, `timeout`, `ulimit` e `seq`. Nada de Python nem de
  ferramentas que precisem ser instaladas.
- A rodada dura 60 s, e Enter envia, como no Comandos do GDB.
- Funciona no celular (caixa de texto).

## Spec

- **AC-1**: **Parser de um subconjunto do bash** em `src/shell/parse.ts`,
  em TypeScript puro. Ele cobre comandos simples, argumentos com aspas,
  `<`, `>`, `>>`, `2>`, `2>&1`, `&>`, `|`, `&&`, `||`, `;`, `for … in …;
  do …; done`, `while …; do …; done`, `$(…)` e `$var`. O resultado é uma
  árvore normalizada. Uma linha fora do subconjunto vira um erro legível
  ("o treino não entende `case`"), nunca uma exceção.
  - Testes: `src/shell/parse.test.ts`, mais `src/shell/parse.prop.test.ts` (`parse(format(t))` é igual a `t`).
- **AC-2**: **Verificador por efeito** (`src/shell/check.ts`). Cada
  comando conhecido (`g++`, `diff`, `cmp`, `timeout`, `time`, `ulimit`,
  `head`, `tail`, `wc`, `sort`, `uniq`, `grep`, `cat`, `seq`, `cp`,
  `mv`, `mkdir`, `ls`, `cd`) tem uma normalização de flags: flags
  agrupadas contra separadas, ordem das flags e forma longa contra curta.
  A resposta é certa quando a árvore normalizada é igual a uma das
  aceitas pelo item.
  - Formas aceitas: `-Wall -Wextra` em qualquer ordem, `-o a a.cpp`
    contra `a.cpp -o a`, `diff -Z` contra `diff --ignore-trailing-space`,
    `./a <in >out` contra `./a >out <in`, `&&` contra `;` quando o item
    não exige parar no erro.
  - Quase-acertos rejeitados: `>` no lugar de `<`, `diff` sem `-Z` quando
    a saída tem espaço no fim, `|| break` faltando no laço de stress,
    `ulimit -s` sem valor, `-O2` faltando quando o objetivo pede o mesmo
    que o juiz, `timeout 2 ./a` contra `timeout 2s ./b`.
  - Testes: `src/shell/check.test.ts` ("checker accepts equivalent command forms", "checker rejects near misses").
- **AC-3**: **Gerador** `src/shell/drill.ts`. A partir da seed, ele
  sorteia os nomes de arquivo (`a.cpp`, `sol.cpp`, `brute.cpp`,
  `gen.cpp`, `in1`, `out1` …) e os valores (segundos, tamanho da pilha,
  número de testes). Os tipos (KC `shell.<tipo>`) são:
  - `arquivos`: `ls`, `cd`, `cd -`, `mkdir -p`, `cp`, `mv`, `cat`, `rm`;
  - `compilar`: flags do juiz, avisos, `-D_GLIBCXX_DEBUG`,
    `-fsanitize=address,undefined`, `-o`;
  - `rodar`: `./a < in`, `> out`, `2> err`, `| tee`, `time`, `timeout`;
  - `comparar`: `diff`, `diff -Z`, `diff -w`, `cmp`, `diff <(…) <(…)`;
  - `stress`: laço `for`/`while` com gerador, força bruta e
    `diff … || break`, com a seed do gerador em `$i`;
  - `limites`: `ulimit -s`, `ulimit -v`, `ulimit -a`;
  - `texto`: `head`, `tail`, `wc -l`, `sort -n`, `uniq -c`, `grep -n`;
  - `setup`: `alias`, função de compilar no `~/.bashrc`, `source`.
  - Testes: `src/shell/drill.prop.test.ts`, que verifica para muitas seeds e cada tipo: a resposta canônica é aceita; os arquivos citados no objetivo aparecem na resposta; a mesma seed gera o mesmo item.
- **AC-4**: **Oráculo** `npm run shell:oracle` (`scripts/shell-oracle.mjs`),
  fora do `check` porque roda bash e g++. Para uma amostra fixa de seeds
  de cada tipo, ele cria uma pasta temporária com arquivos de exemplo
  (programas C++ pequenos, entradas e saídas, um par com espaço no fim
  da linha, um par que difere no teste 7), roda a resposta canônica e
  cada forma aceita, e confere que todas deixam o mesmo efeito: a mesma
  saída, os mesmos arquivos e o mesmo código de saída. Ele também confere
  que cada quase-acerto da tabela tem efeito diferente.
  - Testes: `npm run shell:oracle`, com o resultado no *Log*.
- **AC-5**: **Treino Comandos** (`src/ui/ShellScreen.tsx`,
  `src/ui/shell-drill/`): mostra o objetivo, os arquivos da pasta e as
  últimas linhas do terminal. Usa RoundBar, Result e RoundHistory
  (ADR-T19-1). Um erro mostra a forma canônica e uma linha explicando por
  quê. Cada item vira um evento da T22, com drill `shell.cmd` e o KC do
  tipo.
  - Testes: `src/ui/ShellScreenCommands.test.tsx` ("Enter submits and an equivalent form counts as correct", "a wrong command shows the canonical form and moves on", "the round ends at 60 s on the fake clock"), `src/stats/event.test.ts` (o drill `shell.cmd` é aceito).
- **AC-6**: **Aprender** (`src/shell/curriculum.ts`), usando
  `src/learn/` da T25:

  | Unidade | Lições | Libera |
  |---|---|---|
  | 1 Arquivos | `ls`, `cd`, `cd -`, `mkdir -p`, `cp`, `mv`, `cat` | `arquivos` |
  | 2 Compilar | flags do juiz; `-Wall -Wextra -Wshadow`; `-D_GLIBCXX_DEBUG`; sanitizers e por que são lentos | `compilar` |
  | 3 Rodar | `<`, `>`, `2>`, `\|`, `tee`; `time`; `timeout` | `rodar` |
  | 4 Comparar | `diff`, `-Z` e `-w`; `cmp`; substituição de processo | `comparar` |
  | 5 Stress test | gerador com seed; laço com `\|\| break`; olhar o teste que falhou | `stress` |
  | 6 Limites | `ulimit -s` para recursão funda; `ulimit -v` para memória | `limites` |
  | 7 Texto | `head`/`tail`, `wc -l`, `sort -n`, `uniq -c`, `grep -n` | `texto` |
  | 8 Setup da prova | `alias`, função `c() { g++ … "$1.cpp" -o "$1"; }`, `source ~/.bashrc` | `setup` |
  | 9 Atalhos | Ctrl-R, `!!`, `!$`, Ctrl-A/Ctrl-E, Tab, seta para cima | (só lição) |

  Cada lição tem uma explicação de até 3 frases, um exemplo com o
  terminal animado (transcrição conferida pelo oráculo) e 3 exercícios
  com retirada da ajuda. O botão "Treinar" abre o Comandos com os tipos
  da lição marcados.

  A unidade 8 usa como exemplo o `.bashrc` do notebook do time
  (`~/gempro-notebook/content/contest/.bashrc`, funções `c`, `cs`, `gen`,
  `rr` e `chk`): o que cada linha faz e por quê. Se a T48 decidir não
  publicar o notebook, a lição usa uma versão escrita para o popis com
  as mesmas ideias.
  - Testes: `src/shell/curriculum.test.ts` ("every drill kind is unlocked by exactly one lesson", "every exercise answer passes the checker", "every lesson example has an oracle transcript"), `src/ui/ShellScreenLearn.test.tsx`.
- **AC-7**: **Árvore e armazenamento:** a pasta "Shell" entra depois de
  "GDB", com "Aprender" e "Comandos" visíveis no celular, e os atalhos
  1–9 não mudam. O progresso fica em `popis.shell-learn` (formato v2 do
  Aprender) e as configurações em `popis.shell`.
  - Testes: `src/ui/shell/sections.test.ts`, `src/storage/shell.test.ts`, `src/storage/shell-learn.test.ts`, `tests/e2e/shell-drill.spec.ts` (uma lição e uma rodada, também no mobile; `tests/e2e/shell.spec.ts` já existe para a casca do app da T18).

## Out of scope

- Executar bash no navegador. O efeito é conferido pelo oráculo, e o app
  compara formas normalizadas.
- zsh, fish, `awk`, `sed` e scripts longos.
- Editor (Vim já tem pasta própria).

## Files owned

- `src/shell/` (novo: `parse.ts`, `check.ts`, `drill.ts`, `round.ts`,
  `curriculum.ts`, `cases/transcripts.ts`, `cases/near-misses.ts`) e os
  testes ao lado (`parse.test.ts`, `parse.prop.test.ts`, `check.test.ts`,
  `drill.prop.test.ts`, `round.test.ts`, `curriculum.test.ts`)
- `src/storage/shell.ts`, `src/storage/shell-learn.ts` e os testes
- `src/stats/event.ts`, `src/stats/event.test.ts`
- `src/ui/ShellScreen.tsx`, `src/ui/ShellScreenCommands.test.tsx`,
  `src/ui/ShellScreenLearn.test.tsx`, `src/ui/shell-drill/` (novo),
  `src/ui/App.tsx`, `src/ui/shell/sections.ts`,
  `src/ui/shell/sections.test.ts`, `src/ui/app.css`
- `scripts/shell-oracle.mjs` (novo), `package.json` (script `shell:oracle`),
  `vite.config.ts` (limiares de `src/shell/**`), `playwright.config.ts`
- `tests/e2e/shell-drill.spec.ts` (novo; `tests/e2e/shell.spec.ts` pertence à T18)

Atenção ao nome: `src/ui/shell/` já é a casca do app (árvore e painel).
Os componentes do treino ficam em `src/ui/shell-drill/`.

## Subtasks (one commit each)

- [ ] spec: ADR-T39-1 (subconjunto do bash, verificação por forma normalizada e oráculo por efeito) e testes nomeados
- [ ] tests
- [ ] models
- [ ] behaviour
- [ ] quality: `npm run check`, `shell:oracle`, coverage, e2e e screenshots
- [ ] docs: *Log* e status `review`

## Notas para o batch

- **Tamanho:** grande. Se apertar, entregue as unidades 1–5 e o treino
  com os tipos delas, e registre as unidades 6–9 no *Log*.
- **Oráculo:** roda só em pasta temporária (`mktemp -d`) e nunca toca o
  `$HOME`. A lição de setup escreve num `.bashrc` falso dentro dessa
  pasta.

## Log
