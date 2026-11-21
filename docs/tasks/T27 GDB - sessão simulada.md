---
id: T27
title: GDB - sessão simulada
status: todo
depends_on: [T26]
branch: task/T27-gdb-session
adrs: []
tags: [task]
---

# T27 GDB - sessão simulada

## Goal

Um item **Sessão** na pasta GDB, onde a pessoa depura de verdade. Aparece
um programa com bug e uma entrada que o faz falhar, junto com uma
pergunta ("qual o valor de `ans` quando `i == 7`?", "em que linha o
índice sai do array?"). A pessoa conduz a sessão com `break`, `run`,
`next`, `watch` e os outros comandos até achar a resposta. Por trás, há um
**interpretador** de um subconjunto de C++ e um **motor de sessão** que
responde como o gdb. O oráculo confere a sequência de paradas contra o
gdb real. As lições da T25 passam a ter exercícios executáveis, além das
transcrições gravadas.

## Spec (rascunho; o passo de spec nomeia os testes)

- **AC-1**: **Interpretador** em `src/gdb/interp/`, em TypeScript puro e
  determinístico:
  - o subconjunto de C++ é: tipos inteiros, `char`, `bool`, arrays,
    structs, ponteiros, funções e recursão, `if`, `for`, `while`,
    `cin >>` de inteiros e strings a partir da entrada dada, e
    `cout <<`;
  - a memória usa o modelo da T26;
  - acesso fora do array dentro de um objeto não falha, como em C;
    ponteiro nulo e fora da pilha dão SIGSEGV; divisão por zero dá
    SIGFPE;
  - há um limite de passos para laço infinito.
- **AC-2**: **Tabela de linhas:** as paradas de `next` e `step` seguem a
  tabela de linhas do `g++ -O0`, incluindo o cabeçalho do `for` a cada
  volta, a chave de fechamento de uma função e a linha do `return`. O
  oráculo é a referência (AC-4).
- **AC-3**: **Motor de sessão** (`src/gdb/session.ts`): executa as
  ações da T25 sobre o interpretador e imprime como o gdb:
  - `Breakpoint 1, solve (n=5) at sol.cpp:12`;
  - `Run till exit from #0 …` e `Value returned is $1 = …`;
  - `Hardware watchpoint 2: x`, com `Old value` e `New value`;
  - `Program received signal SIGSEGV`;
  - `[Inferior 1 (process N) exited normally]`, com o número do
    processo mascarado;
  - condições, `ignore`, `tbreak`, `until`, `advance`, `up`, `down` e
    `frame`;
  - a numeração `$N` e o `display` automático.
- **AC-4**: **Oráculo de sessão:** para cada programa e cada roteiro de
  comandos dos casos, `npm run gdb:oracle` compara a transcrição do
  motor com a do gdb real, linha a linha e com endereços e PIDs
  mascarados. Cada comando de sessão tem pelo menos 5 roteiros, com
  bordas: recursão, saída do programa, watchpoint saindo de escopo e
  sinal.
- **AC-5**: **Treino Sessão:**
  - pelo menos 20 programas com bug típico de programação competitiva:
    off-by-one, overflow de `int`, variável não reiniciada entre casos,
    índice fora do array, recursão sem caso base e divisão inteira;
  - cada item tem a entrada, a pergunta, a resposta e um roteiro de
    referência;
  - o resultado conta o acerto, o tempo e o número de comandos contra o
    roteiro de referência;
  - eventos com drill `gdb.session` e KC `gdb.session.<bug>`.
- **AC-6**: **Aprender:**
  - os exercícios das unidades 2–9 (T25) ganham um modo "executar", em
    que o comando roda no simulador e a pessoa vê a parada, além do modo
    de digitar o comando certo;
  - uma unidade nova, 15 "Caçar o bug", tem uma lição por estratégia:
    bissecção com breakpoints, `watch` na variável que muda errado e
    `bt` no crash.
- **AC-7**: **Árvore:** "Sessão" entra depois de "Saída", visível no
  celular. Há um E2E de uma sessão completa.

## Out of scope

- C++ além do subconjunto: templates, STL, classes com métodos,
  exceções (exceto `catch throw` da T25, que continua gravado), ponto
  flutuante e entrada/saída formatada.
- Assembly, threads e TUI.

## Files owned

- `src/gdb/interp/` (novo), `src/gdb/session.ts`, `src/gdb/bugs.ts`,
  `src/gdb/cases/`
- `src/gdb/curriculum.ts`, `src/stats/event.ts`, `src/storage/gdb.ts`
- `src/ui/gdb/SessionDrill.tsx`, `src/ui/GdbScreen.tsx`,
  `src/ui/shell/sections.ts`
- `scripts/gdb-oracle.mjs`, `tests/e2e/gdb.spec.ts`

## Notas para o batch

- **Tamanho:** muito grande, comparável a T13–T14 juntas. Antes de
  entrar num batch, considere dividir em duas: interpretador com tabela
  de linhas e oráculo (AC-1, AC-2, AC-4); depois o motor de sessão, o
  treino e o Aprender.
- **Bloquear se:** uma construção do subconjunto não tiver tabela de
  linhas estável entre o g++ e o simulador. Nesse caso, tire a
  construção do subconjunto e registre num ADR.

## Log
