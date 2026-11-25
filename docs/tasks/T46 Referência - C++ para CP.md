---
id: T46
title: Referência - C++ para CP
status: ready
depends_on: []
branch: task/T46-cpp-reference
adrs: []
tags: [task]
---

# T46 Referência - C++ para CP

## Goal

Uma pasta **Referência** na árvore, com o item **C++**: uma documentação
curta, offline e pesquisável, só com o que se usa em programação
competitiva e na maratona. Cada verbete tem a assinatura, a complexidade,
um exemplo de até 6 linhas com a saída e as armadilhas. Os exemplos são
compilados e rodados pelo oráculo, então a saída mostrada é a real. Esta
task também cria o leitor de referência que a T47 (Python) usa.

## Base

- **Alvo:** `g++ -std=gnu++20 -O2`, que é o do ICPC World Finals 2026
  (g++ 13.2). Um verbete que exige C++23 ou um g++ mais novo leva o selo
  **"não existe na WF"**, e o oráculo confere isso compilando com
  `-std=gnu++20`.
- **Não substitui o cppreference.** Cada verbete tem o link para a
  página correspondente, para quem estiver online.

## Conteúdo (seções e verbetes mínimos)

1. **Template e I/O:** `bits/stdc++.h`, `ios::sync_with_stdio(false)`,
   `cin.tie(nullptr)`, `'\n'` contra `endl`, ler até EOF, `getline`
   depois de `>>`, `setprecision`/`fixed`, `printf` com `%lld`.
2. **Tipos e limites:** `int`, `long long`, `__int128` (sem `cin`),
   `unsigned`, `double` contra `long double`, `LLONG_MAX`, `1LL << k`,
   `numeric_limits`.
3. **Contêineres:** `vector` (`reserve`, `assign`, 2D), `array`,
   `deque`, `stack`, `queue`, `priority_queue` (máximo; mínimo com
   `greater<>`), `set`/`multiset`, `map`, `unordered_map` (e o hack
   anti-hash), `bitset`, `pair`/`tuple` e structured bindings. Cada um
   com uma tabela de complexidades.
4. **Algoritmos:** `sort` com comparador e lambda, `stable_sort`,
   `lower_bound`/`upper_bound` (no vetor e o membro do `set`),
   `binary_search`, `unique` + `erase`, `next_permutation`, `reverse`,
   `accumulate` (com `0LL`), `partial_sum`, `iota`, `min_element`,
   `max_element`, `nth_element`, `count`, `fill`, `memset` (só `0` e
   `-1`).
5. **Strings:** `substr` (início e tamanho), `find` e `npos`, `stoi`,
   `stoll`, `to_string`, `string(n, c)`, `+=` contra `+`, `stringstream`.
6. **Bits:** `__builtin_popcount`/`popcountll`, `__builtin_clz`,
   `__builtin_ctz`, `__lg`, `bit_width`, laço sobre submáscaras.
7. **Matemática:** `gcd`, `lcm`, potência modular, inverso por Fermat,
   `% ` com negativos, `sqrtl` e ajuste de raiz inteira, `ceil` de
   divisão inteira.
8. **Aleatório e tempo:** `mt19937` com `chrono` como seed,
   `uniform_int_distribution`, `shuffle`, cortar a busca pelo relógio.
9. **Extras:** `pb_ds` (`ordered_set`, `gp_hash_table`), `#pragma GCC
   optimize` (com aviso), `assert`, `-D_GLIBCXX_DEBUG`, `<regex>` (com o
   aviso de lentidão).

## Spec

- **AC-1**: **Modelo** `src/ref/model.ts`, comum a C++ e Python:
  - `Entry = { id, lang, section, title, signature, complexity?,
    example, output, pitfalls[], tags[], since?, judge?, link? }`;
  - `since` é a versão mínima da linguagem; `judge` marca "não existe na
    WF".
  - Testes: `src/ref/model.test.ts` (ids únicos, toda seção existe, todo exemplo tem saída).
- **AC-2**: **Busca pura** `src/ref/search.ts`: busca por título, tags e
  assinatura, sem acento e sem diferença de caixa, com o título acima da
  assinatura no ranking. "lower", "lb" e "busca binaria" encontram
  `lower_bound`.
  - Testes: `src/ref/search.test.ts` (tabela de consultas e o primeiro resultado esperado), `src/ref/search.prop.test.ts` (o resultado é subconjunto; consulta vazia devolve tudo na ordem das seções).
- **AC-3**: **Conteúdo C++** `src/ref/cpp/`, com pelo menos 80 verbetes
  cobrindo as 9 seções acima, cada armadilha em uma frase.
  - Testes: `src/ref/cpp/content.test.ts` ("every section has entries", "every example has at most 6 lines").
- **AC-4**: **Oráculo** `npm run ref:oracle -- cpp`
  (`scripts/ref-oracle.mjs`), fora do `check`. Ele embrulha cada exemplo
  num `main` com o template, compila com `-std=gnu++20 -O2 -Wall`, roda,
  e confere que a saída é igual a `output` e que não há aviso. Um
  verbete com `judge` precisa **falhar** com `-std=gnu++20` e passar com
  `-std=gnu++23`. `--write` regrava as saídas.
  - Testes: `npm run ref:oracle -- cpp`, com o resultado no *Log*.
- **AC-5**: **Leitor** `src/ui/RefScreen.tsx`, comum às linguagens:
  - busca no topo (`/` foca, Esc limpa), seções à esquerda (no celular,
    em cima) e verbetes com a assinatura em fonte mono, a complexidade,
    o exemplo, a saída, as armadilhas e os selos;
  - "copiar" no exemplo, `#lang/id` na URL para abrir um verbete;
  - folha de impressão compacta em duas colunas (para o caderno).
  - Testes: `src/ui/RefScreen.test.tsx` ("typing filters entries", "/ focuses search", "hash opens the entry", "judge badge is shown"), `tests/e2e/ref.spec.ts` (desktop e mobile).
- **AC-6**: **Ligações:** a explicação de um erro na T42 (STL) e na T40
  pode ter `ref: "cpp/lower_bound"`, e o leitor abre nesse verbete. Esta
  task só cria a função `refLink(id)` e o teste dela; os drills passam a
  usar quando existirem.
  - Testes: `src/ref/link.test.ts`.
- **AC-7**: **Árvore:** a pasta "Referência" entra no fim da árvore, com
  "C++" visível no celular, e os atalhos 1–9 não mudam.
  - Testes: `src/ui/shell/sections.test.ts`.

## Out of scope

- Algoritmos prontos (Dijkstra, segtree). Isso é caderno de time e fica
  com os trechos da T34.
- Tutoriais longos. O verbete é de consulta.

## Files owned

- `src/ref/` (novo): `model.ts`, `search.ts`, `link.ts`, `cpp/` e os testes
- `src/ui/RefScreen.tsx`, `src/ui/App.tsx`, `src/ui/shell/sections.ts`, `src/ui/app.css`
- `scripts/ref-oracle.mjs`, `package.json`, `vite.config.ts`
- `tests/e2e/ref.spec.ts`

## Subtasks (one commit each)

- [ ] spec: ADR-T46-1 (verbetes como dados tipados, exemplos conferidos por oráculo, selo do juiz) e testes nomeados
- [ ] tests
- [ ] models
- [ ] behaviour
- [ ] quality: `npm run check`, `ref:oracle -- cpp`, coverage, e2e
- [ ] docs

## Notas para o batch

- **Tamanho:** o conteúdo é a maior parte. Se apertar, entregue as seções
  1–4 completas e registre as 5–9 no *Log*.
- **Selo do juiz:** o g++ local é o 16.2. Um recurso que existe no 16.2
  com `gnu++20` mas não no 13.2 não é pego pelo oráculo. Nesse caso,
  marque `judge` à mão e cite a fonte no *Log*.

## Log
