---
id: T50
title: Referência - C++ avançado, GNU e pb_ds
status: in-progress
depends_on: [T46]
branch: task/T50-cpp-reference-advanced
adrs: []
tags: [task]
---

# T50 Referência - C++ avançado, GNU e pb_ds

## Goal

A Referência de C++ (T46) ganha o que o dono sentiu falta: as estruturas
do GNU (`pb_ds` completo, `rope`, as extensões do `bitset`), busca de
padrão em string em tempo linear e as partes menos conhecidas da STL e do
C++17/20 que encurtam código de prova. São pelo menos 45 verbetes novos,
no mesmo modelo da T46 e conferidos pelo mesmo oráculo, mais duas seções
novas.

## Base em pesquisa (2026-11-25)

- **pb_ds:** além do `ordered_set`, há o `tree` como mapa ordenado com
  `order_of_key`/`find_by_order`, `split`/`join` de árvores, a `trie` com
  `prefix_range`, o `priority_queue` com `join` e `modify` (pairing heap) e
  `cc_hash_table` × `gp_hash_table` (o `gp` costuma ser mais rápido).
  Fontes: [adamant, Codeforces 11080](https://codeforces.com/blog/entry/11080),
  [Luogu: estruturas pouco conhecidas](https://www.luogu.com.cn/article/fy2h5lpz).
- **rope (`__gnu_cxx`):** inserir, apagar e mover blocos em O(log n), e cópia
  persistente em O(1). Costuma ser cerca de 2× mais lenta que uma treap
  implícita escrita à mão e lida mal com mudar um elemento só. Fonte:
  [Perlik, Codeforces 10355](https://codeforces.com/blog/entry/10355).
- **Busca de padrão:** o `string::find` e o `std::search` comuns são O(n·m)
  no pior caso. Os `std::boyer_moore_searcher` e
  `boyer_moore_horspool_searcher` (C++17) são lineares **em média**, mas
  não no pior caso. Para O(n+m) garantido, o caminho é a função prefixo
  (KMP) ou a função Z, que cabem em 6 linhas. Fontes:
  [C++ Stories: searchers](https://www.cppstories.com/2018/08/searchers/),
  [cppreference](https://en.cppreference.com/w/cpp/utility/functional/boyer_moore_searcher).
- **C++17/20 em prova:** `midpoint` (busca binária sem overflow),
  `exchange`, `rotate`, `set_intersection`, o `<bit>` do C++20
  (`popcount`, `countl_zero`, `bit_ceil`), CTAD (`vector v{vector{1, 2}}`)
  e `erase_if`/`contains`. Fontes:
  [Codeforces 154861](https://codeforces.com/blog/entry/154861),
  [Codeforces 96040](https://codeforces.com/blog/entry/96040),
  [Codeforces 57729](https://codeforces.com/blog/entry/57729).

## Conteúdo (verbetes mínimos)

1. **pb_ds (seção nova):**
   - `tree` como mapa ordenado;
   - multiconjunto ordenado (par com índice, e por que `less_equal` quebra o
     `erase`);
   - `split` e `join`;
   - `trie` com `prefix_range`;
   - `priority_queue` com `join` e `modify` (`point_iterator`);
   - `cc_hash_table`;
   - `gp_hash_table` com hash próprio (splitmix64) contra anti-hash.
2. **Extensões GNU (seção nova):**
   - `rope` (`insert`, `erase`, `substr`, cópia persistente);
   - `bitset::_Find_first` e `_Find_next`;
   - `__builtin_parity`, `__builtin_ffs`, as versões `ll`;
   - `__builtin_expect`;
   - imprimir `__int128`;
   - `#pragma GCC target("avx2,popcnt")`, com o aviso de quando o juiz
     recusa.
3. **Busca de padrão (na seção Strings):**
   - `std::search` com `boyer_moore_searcher` e com
     `boyer_moore_horspool_searcher`, com o aviso do pior caso;
   - função prefixo (KMP) em O(n+m);
   - função Z;
   - `string_view`;
   - `from_chars` e `to_chars`.
4. **Algoritmos menos conhecidos:**
   - `partition_point` (busca binária por predicado);
   - `equal_range`, `includes`, `rotate`, `merge`, `inplace_merge`;
   - `set_union`, `set_intersection` e `set_difference`;
   - `adjacent_difference`;
   - `inclusive_scan` e `exclusive_scan`;
   - `is_sorted`, `minmax_element`, `prev_permutation`, `stable_partition`;
   - `all_of`, `any_of` e `none_of`;
   - `transform`;
   - `ranges::` com projeção (`ranges::sort(v, {}, &P::x)`).
5. **Contêineres e utilidades:**
   - `extract` e `merge` de `set` e `map` (node handles);
   - `contains` e `erase_if` (C++20);
   - `try_emplace`;
   - `unordered_map::reserve` e `max_load_factor`;
   - apagar uma cópia só no `multiset`;
   - `list::splice`;
   - `complex<double>` como ponto 2D (`abs`, `arg`, `polar`, produto
     vetorial com `conj`);
   - `exchange`, `tie` e a comparação lexicográfica de `tuple`;
   - `ssize`;
   - CTAD.
6. **Bits do C++20:** `popcount`, `countl_zero`, `countr_zero`,
   `bit_ceil`, `bit_floor`, `has_single_bit`, `rotl`/`rotr`.
7. **Matemática:** `midpoint`, `clamp`, `__gcd` contra `gcd`, e o
   overflow de `lcm`.
8. **Depuração:** macro `dbg` com `#x` e `cerr` (que não conta na saída do
   juiz), `-fsanitize`, e `__PRETTY_FUNCTION__` para nomear o tipo.

## Spec

- **AC-1**: **Conteúdo:**
  - pelo menos 45 verbetes novos nas seções acima (total >= 136 verbetes
    em C++, partindo dos 91 da T46);
  - as seções novas `"pb_ds"` (`id: "pb_ds"`) e `"Extensões GNU"`
    (`id: "gnu"`) ficam imediatamente antes de `"Extras"` (`id: "extras"`),
    e os verbetes de `pb_ds` que hoje estão em `"Extras"` (`ordered_set`,
    `gp_hash_table`) passam para `"pb_ds"` com o mesmo `id` (os links
    `#cpp/<id>` continuam valendo);
  - KMP e Z são as únicas exceções à regra "algoritmos prontos ficam fora"
    da T46, porque respondem "como achar um padrão em O(n+m)" e cabem em 6
    linhas;
  - todos os verbetes mantêm a convenção da T46 de link para
    `en.cppreference.com/w/cpp/` (o leitor exibe o rótulo `cppreference`).
  - Testes: `src/ref/cpp/content.test.ts` (existentes: toda seção tem
    verbetes, exemplos com até 6 linhas, armadilhas em uma frase, links
    para cppreference; mais `"pb_ds entries keep their ids after moving"`,
    `"pb_ds and gnu sections precede extras"`, `"at least 136 cpp entries"`,
    `"the minimum entries of T50 exist"` e `"boyer_moore_searcher warns
    about worst-case quadratic complexity"`), `src/ref/model.test.ts`
    (`"entriesOf and sectionsOf return the language content"` atualizado
    com as 11 seções de C++).
- **AC-2**: **Oráculo:** `npm run ref:oracle -- cpp` passa em todos os
  verbetes, os novos inclusive, sem avisos e com saídas gravadas via
  `--write` em `src/ref/cpp/outputs.ts`. O que exige C++23 (ou um g++
  mais novo que o 13 da WF) tem `judge: true`, `since: "C++23"` e falha
  com `-std=gnu++20`. A complexidade dita pelo verbete do
  `boyer_moore_searcher` diz `"linear em média, O(n·m) no pior caso"`.
  - Testes: `npm run ref:oracle -- cpp` (resultado no *Log*) e
    `src/ref/cpp/content.test.ts` (`"boyer_moore_searcher warns about
    worst-case quadratic complexity"`, `"judge entries need C++23"`).
- **AC-3**: **Busca:** `"kmp"`, `"padrão"`, `"prefix function"`,
  `"ordered"`, `"rope"`, `"find first"` e `"popcount"` encontram os
  verbetes esperados como primeiro resultado (`kmp`, `kmp`, `kmp`,
  `ordered_set` no topo da nova seção `pb_ds`, `rope`,
  `bitset_find_first` e o novo `std_popcount` do C++20; este substitui
  o antigo empate de `"popcount"` → `__builtin_popcount` da T46, enquanto
  `"__builtin_popcount"` continua achando `popcount` primeiro, e
  `"ordered map"` / `"ordered multiset"` encontram `ordered_map` e
  `ordered_multiset`).
  - Testes: `src/ref/search.test.ts` (novos casos na tabela e atualização
    de `"popcount"` para `std_popcount` por mudança de spec da T50).

## Out of scope

- Outros algoritmos de string (hashing, autômato de sufixos, Aho-Corasick).
  São caderno do time (notebook, T48).
- Python (T47).

## Files owned

- `src/ref/cpp/` (conteúdo, testes e saídas gravadas),
  `src/ref/search.test.ts`, `src/ref/model.test.ts`
- `src/ref/model.ts` (só se uma seção nova precisar ser registrada ali —
  não é necessário)

## Subtasks (one commit each)

- [ ] spec
- [ ] tests
- [ ] models (pulado: o modelo da T46/T47 já cobre as novas seções e verbetes)
- [ ] behaviour: verbetes e `ref:oracle -- cpp --write`
- [ ] quality: `npm run check`, `ref:oracle -- cpp`, coverage, fuzz, e2e e verificação visual
- [ ] docs

## Log
