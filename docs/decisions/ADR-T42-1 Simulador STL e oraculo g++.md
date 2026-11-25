---
id: ADR-T42-1
title: Simulador STL em TypeScript e oráculo g++
status: accepted
kind: decision
date: 2026-11-24
task: T42
builds_on: [ADR-T19-1, ADR-T22-1, ADR-T26-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T42-1 Simulador STL em TypeScript e oráculo g++

## Context

O treino **STL** (T42) gera trechos curtos de C++ (até 8 linhas) usando
operações da biblioteca padrão e da aritmética de inteiros do libstdc++ e
pede que o jogador digite o que o programa imprime. Tudo fora de `src/ui/`
precisa rodar como TypeScript puro, determinístico e sem compilador no
navegador; ao mesmo tempo, toda saída esperada precisa concordar com o
`g++` real usado em prova (`-std=gnu++20 -O2` em x86-64).

Além disso, a pasta **Maratona** ainda não existe na `main` (T40 e T42
rodam em branches separados) e as armadilhas de tipo precisam evitar
comportamento indefinido (que pertence à T40 e à T41).

## Decision

1. **Simulador puro (`src/stl/sim.ts`) com aritmética definida.**
   Implementamos em TypeScript puro (usando `BigInt.asUintN` / `asIntN`
   para 32 e 64 bits e `size_t` de 64 bits) a semântica das 19 operações
   cobertas nos 4 níveis:
   - Nível 1 (`vetor e sort/reverse`): `vector_sort`, `vector_reverse`,
     `iota_seq`, `unique_no_erase`, `next_perm`.
   - Nível 2 (`busca binária e conjuntos`): `lower_bound`, `upper_bound`,
     `set_dedup`, `multiset_erase`.
   - Nível 3 (`heap, mapa e pares`): `pq_max`, `map_brackets`,
     `pair_order`, `string_conv`, `string_find`.
   - Nível 4 (`bits, aritmética com sinal e armadilhas de tipo`):
     `neg_div_mod`, `size_t_trap`, `popcount_lg`, `bitset_ops`,
     `accumulate_int`.
   Todo trecho é livre de comportamento indefinido: wraparound é
   exercitado apenas com inteiros sem sinal (`unsigned`, `size_t`);
   `unique` sem `erase` imprime apenas `v.size()` e `it - v.begin()`
   (não lê a cauda inespecificada); `accumulate` com `int` usa frações
   binárias exatas (`.5`) em `vector<double>` ou acumulador `0u`.

2. **Verificador token a token (`src/stl/check.ts`).**
   Compara tokens separados por espaço em branco (ignorando espaços extras
   e quebra de linha final). Não converte strings para número: `-0` é
   rejeitado para inteiros e `-1` é rejeitado para `string::npos`
   (`18446744073709551615`). A equivalência entre `1`/`true` e `0`/`false`
   só é aceita quando o trecho usa `boolalpha`.

3. **Oráculo com `g++` real (`scripts/stl-oracle.mjs`, `npm run stl:oracle`).**
   Fora de `npm run check`, o oráculo gera pelo menos 50 seeds por modelo,
   agrupa os trechos de cada modelo em um arquivo `.cpp` temporário em
   `mkdtemp(join(tmpdir(), "popis-stl-"))` com `#include <bits/stdc++.h>` e
   `using namespace std;`, compila com `g++ -std=gnu++20 -O2`, executa
   (restaurando as flags de `cout` entre casos) e compara a saída real com
   o simulador.

4. **Pasta Maratona e drill `stl.out`.**
   `src/ui/shell/sections.ts` adiciona a pasta `maratona` (`Maratona`)
   após `gdb` contendo o item `stl` (`STL`), com formato que permite
   encaixar `Ler o erro` (T40) na linha acima com uma única linha. Os
   eventos são gravados com `drill: "stl.out"` e `kc: "stl.<modelo>"`,
   reutilizando os componentes da T19 (`PanelTitle`, `RoundBar`, `Result`,
   `RoundHistory`, `Reference`).

## Alternatives considered

- **Compilar C++ no navegador via WebAssembly** — pesado demais, lento e
  quebra o requisito de testes puros fora de `src/ui/`.
- **Compilar um arquivo por seed no oráculo (950 invocações de `g++`)** —
  lento sem ganho de fidelidade; compilar um arquivo por modelo com
  escopos isolados e restauração das flags de `cout` verifica exatamente o
  mesmo código compilado com `-std=gnu++20 -O2` em poucos segundos.
- **Usar overflow de `int` com sinal em `accumulate`** — seria UB em C++
  e poderia divergir sob `-O2`; usamos truncamento de `double` (`.5`) para
  `int` e wraparound sem sinal (`0u`) para manter comportamento 100%
  definido.

## Consequences

- Todos os 19 modelos são verificáveis deterministicamente no Vitest e
  contra `g++` real no oráculo.
- Qualquer mudança em um modelo pode ser validada em segundos com
  `npm run stl:oracle`.
- `string::npos` e `v.size() - 1` dependem da ABI x86-64 (`size_t` de 64
  bits), documentada no painel de referência da tela.

## Rollback plan

Remover `src/stl/`, `src/storage/stl.ts`, `src/ui/StlScreen.tsx`,
`scripts/stl-oracle.mjs`, o item `stl` da pasta `maratona` em
`src/ui/shell/sections.ts` e `"stl.out"` de `src/stats/event.ts`, e
registrar um ADR `kind: rollback` revertendo `ADR-T42-1`.
