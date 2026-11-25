---
id: ADR-T40-1
title: Saídas gravadas de compilador e sanitizers com oráculo e pasta Maratona
status: accepted
kind: decision
date: 2026-11-25
task: T40
builds_on: [ADR-0002, ADR-T18-1, ADR-T19-1, ADR-T22-1, ADR-T25-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T40-1 Saídas gravadas de compilador e sanitizers com oráculo e pasta Maratona

## Context

O item **Ler o erro** apresenta programas C++ curtos com saídas reais de compilação (`g++`), avisos (`-Wall -Wextra -Wshadow`), sanitizers (`AddressSanitizer`, `UBSan`), asserções de depuração da biblioteca padrão (`_GLIBCXX_DEBUG`) e vereditos de juiz (`TLE`, `MLE`, `RTE`). Como o popis é uma aplicação web estática (ADR-0002), o navegador não invoca o `g++`. Ao mesmo tempo, saídas escritas à mão divergiriam do compilador real e relatórios brutos do ASan incluem caminhos temporários, endereços aleatórios (ASLR), PIDs, `BuildId`, frames de `libc` e mapas de memória de sombra que variam entre execuções e poluem a leitura em tela pequena.

Além disso, o grupo `_GLIBCXX_DEBUG` por si só imprime o cabeçalho interno da `libstdc++` sem mostrar qual linha do programa do usuário fez a chamada, e a pasta `Maratona` precisa ser introduzida na árvore pronta para receber também o item `STL` (T42) com alteração mínima.

## Decision

1. **Casos escritos à mão e saídas gravadas apenas pelo oráculo (`src/compile/cases/`, `scripts/compile-oracle.mjs`):** cada caso define `{ id, group, code, flags, input?, limits?, output, line, cause, explanation }`. Os 6 grupos (`compilacao`, `aviso`, `asan`, `ubsan`, `glibcxx`, `veredito`) têm pelo menos 5 casos cada (30 casos no total), e `src/compile/causes.ts` concentra a lista de causas em português (5 causas por grupo, garantindo 3 distratores distintos do mesmo grupo). O campo `output` nunca é digitado manualmente: `npm run compile:oracle -- --write` compila cada caso com o `g++ 16.2` real em diretório temporário (`mkdtemp(join(tmpdir(), "popis-"))`) com `LC_ALL=C`, executa quando aplicável e grava o arquivo `src/compile/cases/outputs.ts`. O comando `npm run compile:oracle` fica fora de `npm run check` por depender do toolchain nativo.
2. **Mascaramento e recorte em código puro e testado (`src/compile/format.ts`):** caminhos temporários viram `sol.cpp`, endereços hexadecimais (`0x...`) viram `ADDR`, PIDs (`==12345==`) viram `==N==`, `BuildId`, frames de `libc`/`libasan`, dump de registradores e sombra do ASan são removidos, e saídas longas são recortadas para as linhas que um competidor lê (primeiro erro/aviso, linha `SUMMARY:`, primeiros frames em `sol.cpp` com colapso de recursão repetida). O oráculo e os testes unitários compartilham a mesma função `formatCompilerOutput`.
3. **Verificação da citação de linha no oráculo e uso de `-D_GLIBCXX_DEBUG_BACKTRACE`:** para `glibcxx`, o oráculo compila com `-g -D_GLIBCXX_DEBUG -D_GLIBCXX_DEBUG_BACKTRACE` (linkando `-lstdc++exp` após `sol.cpp`), fazendo a `libstdc++` real emitir o frame `sol.cpp:<linha>`. Para os cinco grupos diagnósticos (`compilacao`, `aviso`, `asan`, `ubsan`, `glibcxx`), o oráculo exige tanto igualdade exata da saída mascarada quanto a presença literal de `sol.cpp:<line>`. Para `veredito`, o oráculo executa o binário sob `timeout 2` (TLE, saída 124), `ulimit -v` (MLE) ou execução direta capturando o sinal (`SIGSEGV`, `SIGFPE`, `SIGABRT`), formata a linha do juiz junto com eventual `stderr` real (ex.: `std::bad_alloc` ou `Assertion ... failed`) e confere o veredito/sinal e a saída gravada (sem inventar número de linha quando o juiz não o reporta).
4. **Sorteio sem repetição por ciclo (`src/compile/drill.ts`) e motor de rodada (`src/compile/round.ts`):** os casos filtrados pelos grupos ativos são embaralhados por ciclo completo a partir da seed, evitando repetição na mesma rodada enquanto houver caso novo; cada item embaralha a causa certa com 3 distratores do mesmo grupo. A rodada padrão dura 90 s (opções 60 s, 90 s, 120 s). Em erro, a tela mantém o caso visível destacando a linha certa e exibindo a explicação até o jogador avançar.
5. **Pasta `Maratona`, eventos T22 e persistência:** a pasta `Maratona` (`id: "maratona"`) entra em `src/ui/shell/sections.ts` após `GDB` (posição relativa definida para esta base `main`, sem alterar atalhos 1–9), contendo `Ler o erro` (`id: "compile-read"`, `touch: true`) estruturada para que `STL` (T42) entre na linha seguinte. O drill `compile.read` entra em `DRILLS` (`src/stats/event.ts`) com KC `compile.<grupo>`. Configurações (duração e filtro de grupos) ficam em `popis.compile` e o histórico de rodadas em `popis.compile-results` (`src/storage/compile.ts`).

## Alternatives considered

- **Compilar C++ no navegador com WebAssembly** — fora do escopo (ADR-0002), aumentaria em dezenas de megabytes o pacote estático e não reproduziria o `g++ 16.2` nem os sanitizers do ambiente de prova.
- **Usar apenas `-D_GLIBCXX_DEBUG` sem `-D_GLIBCXX_DEBUG_BACKTRACE`** — a saída da `libstdc++` citaria apenas o arquivo de cabeçalho `/usr/include/c++/16/debug/...`, impedindo o competidor de ver a linha em `sol.cpp` e quebrando a verificação de linha do oráculo.
- **Avançar imediatamente ao errar um caso** — impediria destacar a linha certa no código onde o erro ocorreu e ler a explicação no contexto do trecho.

## Consequences

- Todas as saídas exibidas no app são autênticas do `g++ 16.2` e verificáveis a qualquer momento com `npm run compile:oracle`.
- Uma atualização futura da versão do `g++` no ambiente pode alterar ligeiramente o texto de diagnósticos, exigindo rodar `npm run compile:oracle -- --write`.
- O item funciona igualmente no desktop (setas + Enter e teclas 1–4) e no celular (toque na linha e nos botões de causa, com rolagem isolada do código e da saída).

## Rollback plan

Reverter os commits da branch `task/T40-compiler-output`, remover `compile.read` de `DRILLS`, remover a pasta `Maratona` de `SECTIONS`, remover `src/compile/`, `src/storage/compile.ts`, `src/ui/CompileScreen.tsx`, `scripts/compile-oracle.mjs`, `tests/e2e/compile.spec.ts` e registrar um ADR `kind: rollback` apontando para `ADR-T40-1`.
