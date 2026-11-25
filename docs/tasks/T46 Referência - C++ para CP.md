---
id: T46
title: Referência - C++ para CP
status: done
depends_on: []
branch: task/T46-cpp-reference
adrs: [ADR-T46-1]
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
  - `input?` (entrada padrão do exemplo) e a complexidade como texto ou
    tabela `[operação, custo][]` entram além do spec (ADR-T46-1).
  - Testes: `src/ref/model.test.ts` ("entry ids are unique within a
    language", "every entry section exists", "every example has a
    recorded output", "every recorded output belongs to an entry",
    "entriesOf and sectionsOf return the language content").
- **AC-2**: **Busca pura** `src/ref/search.ts`: busca por título, tags e
  assinatura, sem acento e sem diferença de caixa, com o título acima da
  assinatura no ranking. "lower", "lb" e "busca binaria" encontram
  `lower_bound`.
  - Testes: `src/ref/search.test.ts` ("search finds <consulta> first",
    tabela de consultas e o primeiro resultado esperado; "search ranks a
    title match above a signature match"; "search ignores accents and
    case"; "search requires every term"), `src/ref/search.prop.test.ts`
    ("search result is a subset in section order of ties", "empty query
    returns every entry in section order", "search is accent and case
    insensitive").
- **AC-3**: **Conteúdo C++** `src/ref/cpp/`, com pelo menos 80 verbetes
  cobrindo as 9 seções acima, cada armadilha em uma frase.
  - Testes: `src/ref/cpp/content.test.ts` ("cpp has at least 80
    entries", "every section has entries", "every example has at most 6
    lines", "every pitfall is one sentence", "every entry links to
    cppreference", "every container has a complexity table", "judge
    entries need C++23", "the minimum entries of the note exist").
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
  - Testes: `src/ui/RefScreen.test.tsx` ("typing filters entries", "/
    focuses search", "Escape clears the search", "hash opens the entry",
    "judge badge is shown", "copy puts the example on the clipboard",
    "a section link scrolls to the section", "print button prints the
    sheet", "app opens the reference from the hash"), `tests/e2e/ref.spec.ts`
    (desktop e mobile: buscar, abrir por hash, sem rolagem horizontal).
- **AC-6**: **Ligações:** a explicação de um erro na T42 (STL) e na T40
  pode ter `ref: "cpp/lower_bound"`, e o leitor abre nesse verbete. Esta
  task só cria a função `refLink(id)` e o teste dela; os drills passam a
  usar quando existirem.
  - Testes: `src/ref/link.test.ts` ("refLink gives the hash of a known
    entry", "refLink throws on an unknown entry", "parseRefHash reads
    lang and id", "parseRefHash rejects other hashes").
- **AC-7**: **Árvore:** a pasta "Referência" entra no fim da árvore, com
  "C++" visível no celular, e os atalhos 1–9 não mudam.
  - Testes: `src/ui/shell/sections.test.ts` ("Referência folder closes
    the tree with C++ on touch screens", e as listas da árvore e das
    telas ganham o item `ref-cpp`).

## Out of scope

- Algoritmos prontos (Dijkstra, segtree). Isso é caderno de time e fica
  com os trechos da T34.
- Tutoriais longos. O verbete é de consulta.

## Files owned

- `src/ref/` (novo): `model.ts`, `langs.ts`, `search.ts`, `link.ts`,
  `cpp/` (uma seção por arquivo, `index.ts`, `outputs.ts` gerado) e os testes
- `src/ui/RefScreen.tsx`, `src/ui/RefScreen.test.tsx`, `src/ui/App.tsx`,
  `src/ui/shell/sections.ts`, `src/ui/shell/sections.test.ts`, `src/ui/app.css`
- `scripts/ref-oracle.mjs`, `package.json`, `vite.config.ts`,
  `playwright.config.ts` (o projeto `mobile` roda `ref.spec.ts`)
- `tests/e2e/ref.spec.ts`

## Subtasks (one commit each)

- [x] spec: ADR-T46-1 (verbetes como dados tipados, exemplos conferidos por oráculo, selo do juiz) e testes nomeados
- [x] tests
- [x] models
- [x] behaviour
- [x] quality: `npm run check`, `ref:oracle -- cpp`, coverage, e2e
- [x] docs

## Notas para o batch

- **Tamanho:** o conteúdo é a maior parte. Se apertar, entregue as seções
  1–4 completas e registre as 5–9 no *Log*.
- **Selo do juiz:** o g++ local é o 16.2. Um recurso que existe no 16.2
  com `gnu++20` mas não no 13.2 não é pego pelo oráculo. Nesse caso,
  marque `judge` à mão e cite a fonte no *Log*.

## Log

- 2026-11-25 — Implementada no batch (sessão sem ninguém no teclado), na
  branch `task/T46-cpp-reference`, a partir da `main`.
- **Conteúdo:** 91 verbetes nas 9 seções completas (io 9, tipos 8,
  contêineres 14, algoritmos 20, strings 10, bits 7, matemática 9,
  aleatório 5, extras 9). Não foi preciso cortar para o recorte 1–4.
- **Oráculo** (`npm run ref:oracle -- cpp`, g++ 16.2.1):
  `ref:oracle cpp: 91/91 ok (4 judge entries, 0 output mismatches)`.
  As saídas de `src/ref/cpp/outputs.ts` foram gravadas com `--write`,
  nenhuma digitada. Os 4 verbetes com `judge` (`print`, `fold_left`,
  `string_contains`, `views_enumerate`) falham com `-std=gnu++20` e
  passam com `-std=gnu++23`. Nenhum verbete precisou de `judge` marcado à
  mão: todos os recursos que o spec chama de "WF ok" são C++20 ou
  anteriores e existem no g++ 13.2.
- **Achado do oráculo:** o `bits/stdc++.h` do g++ 16.2 não inclui mais o
  `<cassert>` (`assert` não declarado). O verbete `assert` inclui o
  cabeçalho à mão e ganhou essa armadilha.
- **UNATTENDED CHOICE:** campos além do AC-1: `input?` (entrada padrão do
  exemplo) e complexidade como texto ou tabela; o `judge` é `true` e o
  selo fixo "não existe na WF" (`JUDGE_BADGE`). Registrado no ADR-T46-1.
- **UNATTENDED CHOICE:** o título do painel é o rótulo da árvore ("C++"),
  porque `coherence.test.tsx` exige que o `h1` seja igual ao rótulo; a
  palavra "Referência" fica na descrição e no caminho
  `popis/referência/c++`. A busca e o corpo levam `data-panel="options"`
  e `data-panel="area"` (ordem de painéis da T18).
- **Teste corrigido em commit próprio:** `RefScreen.test.tsx` não tinha o
  `// @vitest-environment jsdom` dos outros testes de `src/ui` e falhava
  por `history is not defined`, não pelo comportamento
  (`test(T46): run the reader tests in jsdom`). Nenhuma asserção mudou.
- **Files owned ampliados** (política do plano): `playwright.config.ts`
  (o projeto `mobile` roda `ref.spec.ts`), `src/ui/RefScreen.test.tsx`,
  `src/ui/shell/sections.test.ts` e `src/ref/langs.ts`. Os testes já
  existentes de `sections.test.ts` ganharam a pasta Referência e o item
  `ref-cpp` nas listas esperadas (mudança de spec, não afrouxamento).
- **Gates:** `npm run check` verde (4320 testes); `npm run coverage`
  verde, com novo limiar `src/ref/**` em 100/100/100/100;
  `npm run test:fuzz` verde (245); `npm run test:e2e` verde (43, com os 6
  novos de `ref.spec.ts` em desktop e mobile).
- **Verificação visual:** `.batch/visual/T46-cpp-reference.spec.ts`
  (desktop e phone: árvore, topo, busca, hash, selo do juiz, impressão).
  Corrigidos: blocos de código sem contraste no verbete aberto e a folha
  de impressão com fundo escuro (`color-scheme: dark`); agora ela sai em
  duas colunas, texto escuro no papel.
- **Checagens manuais para o dono:** buscar cinco coisas que você usa em
  contest; abrir a prévia de impressão do navegador e conferir a folha
  de duas colunas (tamanho da fonte e quebras); na primeira abertura pela
  árvore no desktop, a página pode rolar até o item clicado e esconder o
  título do painel.
