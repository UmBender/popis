---
id: T42
title: C++ e STL - o que imprime
status: done
depends_on: []
branch: task/T42-stl-output
adrs: [ADR-T42-1]
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
  - Testes: `src/ui/StlScreen.test.tsx`, `src/ui/shell/sections.test.ts`, `src/stats/event.test.ts`, `src/storage/stl.test.ts`, `src/stl/round.test.ts`, `tests/e2e/stl.spec.ts`.

## Out of scope

- Templates, classes e ponteiros.
- Comportamento indefinido (fica na T40 e na T41).

## Files owned

- `src/stl/` (novo: `sim.ts`, `check.ts`, `drill.ts`, `round.ts` e testes)
- `src/storage/stl.ts`, `src/storage/stl.test.ts`
- `src/stats/event.ts`, `src/stats/event.test.ts`
- `src/ui/StlScreen.tsx`, `src/ui/StlScreen.test.tsx`, `src/ui/App.tsx`, `src/ui/app.css`
- `src/ui/shell/sections.ts`, `src/ui/shell/sections.test.ts`
- `scripts/stl-oracle.mjs`, `package.json`, `vite.config.ts`, `playwright.config.ts`, `tests/e2e/stl.spec.ts`

## Subtasks (one commit each)

- [x] spec
- [x] tests
- [x] models
- [x] behaviour
- [x] quality: `npm run check`, `stl:oracle`, coverage, e2e
- [x] docs

## Log

- 2026-11-24 — Implementado o treino **STL** na pasta **Maratona** (`ADR-T42-1`), com simulador puro em `src/stl/sim.ts` (semântica do libstdc++, inteiros de 32/64 bits e `size_t` de 64 bits sem UB), verificador token a token em `src/stl/check.ts` (rejeitando `-0`, `-1` para `string::npos`, ordem trocada e `true`/`1` sem `boolalpha`), gerador em `src/stl/drill.ts` com 19 modelos em 4 níveis (todos com até 8 linhas e `kc: stl.<modelo>`), motor de rodada de 120 s em `src/stl/round.ts`, persistência em `src/storage/stl.ts` e tela `src/ui/StlScreen.tsx` usando os componentes da T19 e gravando eventos com `drill: "stl.out"`.
- 2026-11-24 — UNATTENDED CHOICE: para evitar comportamento indefinido (fora de escopo, T40/T41), `accumulate` com `int` testa truncamento de `vector<double>` com frações binárias exatas (`.5`), wraparound em 32 bits usa `vector<unsigned>` com `UINT_MAX` e `0u`, e `unique` sem `erase` imprime apenas `v.size()` e `it - v.begin()` sem ler a cauda inespecificada (`ADR-T42-1`).
- 2026-11-24 — Escopo de *Files owned* ampliado minimamente para testes existentes que listam a árvore/drills e para o e2e mobile: `src/ui/shell/sections.test.ts`, `src/stats/event.test.ts`, `src/storage/stl.test.ts`, `src/ui/StlScreen.test.tsx`, `playwright.config.ts`.
- 2026-11-24 — Checagem visual em desktop e Pixel 7 (`.batch/visual/t42-stl.spec.ts`, capturas em `.batch/visual/shots/{desktop,phone}-t42-01..03.png`): ajustados os rótulos do seletor de nível (`1 · Vetor e ordenação`, `2 · Busca e conjuntos`, `3 · Heap, mapa e pares`, `4 · Bits, sinal e tipos`) para caber sem corte na tela estreita do celular; revalidado com novas capturas.
- 2026-11-25 — Gates verdes:
  - `npm run check`: `tsc --noEmit`, `eslint . --max-warnings 0`, `prettier --check .`, `vitest run` (173 arquivos, 4305 testes) e `vite build` verdes.
  - `npm run coverage`: 99,82% statements, 98,62% branches, 100% functions, 99,91% lines; `src/stl/**` com 99,76% statements, 94,3% branches, 100% functions, 100% lines (limiar adicionado em `vite.config.ts`); `src/ui/StlScreen.tsx` e `src/storage/stl.ts` com 100% em todas as métricas.
  - `npm run stl:oracle`: `stl oracle (g++ -std=gnu++20 -O2): 950/950 passed (19 models x 50 seeds)` e com `--seeds 100`: `1900/1900 passed (19 models x 100 seeds)` (g++ 16.2.1).
  - `npm run test:e2e`: 39/39 passando (desktop + mobile), incluindo `tests/e2e/stl.spec.ts` e `tests/e2e/coherence.spec.ts`.
- 2026-11-25 — Verificação manual para o dono: jogar uma rodada em cada nível (1 a 4).
