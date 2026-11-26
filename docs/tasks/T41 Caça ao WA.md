---
id: T41
title: Caça ao WA
status: ready
depends_on: [T40]
branch: task/T41-wa-hunt
adrs: []
tags: [task]
---

# T41 Caça ao WA

## Goal

Um item **Caça ao WA** na pasta Maratona. Aparece o enunciado curto de um
problema e uma solução C++ que compila, passa no exemplo e leva WA, TLE
ou RTE no juiz. A pessoa aponta a linha e a classe do bug, como numa
leitura do código impresso antes de submeter. Depois de responder, o app
mostra uma entrada pequena que quebra a solução, a saída errada e a
correção. Os bugs são os que mais custam penalidade na maratona.

## Classes de bug (KC `wa.<classe>`)

- `overflow`: `int` no lugar de `long long`, `a * b` antes do `% MOD`,
  `1 << 40`, `accumulate` com início `0` em vez de `0LL`;
- `limite`: off-by-one em laço, vetor com `n` em vez de `n + 1`,
  `MAXN` pequeno;
- `multitest`: estado global não zerado entre os casos, `break` na
  leitura que deixa entrada para trás;
- `borda`: `n == 1`, resposta vazia, todos iguais, número negativo
  em `%` e `/`;
- `precisao`: `==` com `double`, `sqrt` sem ajuste, `printf` com poucas
  casas;
- `desempenho`: `endl` em laço, `cin` sem `sync_with_stdio(false)`,
  `map` em vez de vetor, cópia de vetor por valor na recursão,
  `memset` dentro do laço de casos;
- `stl`: `lower_bound` contra `upper_bound`, `set::erase(valor)` num
  `multiset`, comparador que não é estrito, `s.size() - 1` com `s` vazio;
- `leitura`: `getline` depois de `cin >>`, formato de saída (espaço no
  fim, `Case #i:`).

## Spec

- **AC-1**: **Casos** em `src/wa/cases/`, com pelo menos 32 casos (4 por
  classe). Cada caso tem `{ id, statement, code, fixed, line, class,
  breaking_input, explanation }`, e `fixed` difere de `code` só nas
  linhas do bug.
  - Testes: `src/wa/cases.test.ts` ("fixed differs from code only around the bug line", "every class has at least 4 cases").
- **AC-2**: **Oráculo** `npm run wa:oracle`, fora do `check`. Ele compila
  `code` e `fixed` com as flags do juiz e confere que:
  - os dois dão a mesma saída no exemplo do enunciado;
  - na `breaking_input` eles diferem (ou `code` passa de 2 s ou
    termina com sinal, conforme a classe);
  - `fixed` bate com uma força bruta do caso em 200 entradas aleatórias
    pequenas.
  - Testes: `npm run wa:oracle`, com o resultado no *Log*.
- **AC-3**: **Sorteio** `src/wa/drill.ts`, igual ao da T40: casos sem
  repetição, 4 classes nas opções e filtro por classe.
  - Testes: `src/wa/drill.prop.test.ts`.
- **AC-4**: **Tela** `src/ui/WaScreen.tsx`, reaproveitando a escolha de
  linha e de causa da T40. Sem limite de tempo por rodada: são 5 casos
  por rodada, com cronômetro visível. Ao responder, mostra a entrada que
  quebra, a saída errada contra a certa e o diff da correção. Cada caso
  vira um evento com drill `wa.hunt`.
  - Testes: `src/ui/WaScreen.test.tsx`, `tests/e2e/wa.spec.ts`.

## Out of scope

- A pessoa escrever a correção. Isso pode virar uma task depois, usando o
  interpretador da T27.

## Files owned

- `src/wa/` (novo), `src/storage/wa.ts`, `src/stats/event.ts`
- `src/ui/WaScreen.tsx`, componentes de escolha da T40, `src/ui/App.tsx`, `src/ui/shell/sections.ts`
- `scripts/wa-oracle.mjs`, `package.json`, `vite.config.ts`, `tests/e2e/wa.spec.ts`

## Subtasks (one commit each)

- [ ] spec
- [ ] tests
- [ ] models
- [ ] behaviour
- [ ] quality: `npm run check`, `wa:oracle`, coverage, e2e
- [ ] docs

## Log
