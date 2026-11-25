---
id: T42
title: C++ e STL - o que imprime
status: ready
depends_on: []
branch: task/T42-stl-output
adrs: []
tags: [task]
---

# T42 C++ e STL - o que imprime

## Goal

Um item **STL** na pasta Maratona. Aparece um trecho de C++ de até 8
linhas usando a STL, e a pessoa digita o que ele imprime. Os trechos são
gerados por código (valores e operação sorteados) e cobrem o
comportamento que confunde na prova: o que `lower_bound` e `upper_bound`
devolvem, `priority_queue` ser de máximo, `set` remover duplicatas,
`multiset::erase(valor)` apagar todas as cópias, `map[k]` criar a chave,
divisão e `%` com negativos, `size()` sem sinal, `__builtin_popcount`,
`__lg`, `bitset`, `next_permutation`, `unique` sem `erase`, `iota`,
`accumulate` com `int`, `stoi`, `to_string` e `string::find` devolvendo
`npos`.

## Spec

- **AC-1**: **Simulador puro** `src/stl/sim.ts` das operações cobertas,
  em TypeScript, com a semântica do libstdc++ (inteiros de 32 e 64 bits
  com wraparound, `size_t` de 64 bits).
  - Testes: `src/stl/sim.test.ts` (tabela de casos, um por operação, incluindo negativos e vazio).
- **AC-2**: **Gerador** `src/stl/drill.ts`. Ele sorteia o modelo, os
  valores e a operação pela seed, monta o código (formatado como a
  pessoa escreveria) e a saída esperada pelo simulador. São 4 níveis: 1
  vetor e `sort`/`reverse`; 2 busca binária e conjuntos; 3 heap, mapa e
  pares; 4 bits, aritmética com sinal e armadilhas de tipo. O KC é
  `stl.<modelo>`.
  - Testes: `src/stl/drill.prop.test.ts` (a resposta canônica é aceita; cada nível só usa os modelos dele; a mesma seed gera o mesmo trecho).
- **AC-3**: **Verificador:** compara token a token, ignorando espaço
  extra e a quebra de linha final. `-0` não existe para inteiros, e
  `1` e `true` só são iguais se o trecho usa `boolalpha`.
  - Testes: `src/stl/check.test.ts` (aceitos: espaços extras e quebra final; rejeitados: ordem trocada, valor de `npos` como `-1`, um elemento a mais).
- **AC-4**: **Oráculo** `npm run stl:oracle`, fora do `check`: compila
  com g++ e roda, para cada modelo e uma amostra de seeds, e confere que
  a saída real é igual à do simulador.
  - Testes: `npm run stl:oracle`, com o resultado no *Log*.
- **AC-5**: **Tela** `src/ui/StlScreen.tsx`. Rodada de 120 s, Enter
  envia, e um erro mostra a saída certa com uma linha de explicação
  ("`upper_bound` devolve o primeiro **maior** que x"). Usa os
  componentes da T19 e grava eventos com drill `stl.out`. Entra na pasta
  Maratona (criada aqui se a T40 ainda não existir).
  - Testes: `src/ui/StlScreen.test.tsx`, `src/ui/shell/sections.test.ts`, `tests/e2e/stl.spec.ts`.

## Out of scope

- Templates, classes e ponteiros.
- Comportamento indefinido (fica na T40 e na T41).

## Files owned

- `src/stl/` (novo), `src/storage/stl.ts`, `src/stats/event.ts`
- `src/ui/StlScreen.tsx`, `src/ui/App.tsx`, `src/ui/shell/sections.ts`
- `scripts/stl-oracle.mjs`, `package.json`, `vite.config.ts`, `tests/e2e/stl.spec.ts`

## Subtasks (one commit each)

- [ ] spec
- [ ] tests
- [ ] models
- [ ] behaviour
- [ ] quality: `npm run check`, `stl:oracle`, coverage, e2e
- [ ] docs

## Log
