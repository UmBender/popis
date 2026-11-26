---
id: T47
title: Referência - Python para CP
status: done
depends_on: [T46]
branch: task/T47-python-reference
adrs: [ADR-T47-1]
tags: [task]
---

# T47 Referência - Python para CP

## Goal

O item **Python** na pasta Referência, usando o leitor, a busca e o
modelo da T46. O conteúdo é o que importa para usar Python em prova:
quando ele vale a pena (inteiros grandes, strings, problemas de
implementação), como não levar TLE e o que muda entre o CPython e o
PyPy.

## Base

- **Alvo:** PyPy3 7.3.15, que implementa o **Python 3.9**. É o do ICPC
  World Finals 2026, e não há Python 2. Um verbete que exige 3.10 ou mais
  leva o selo **"não existe na WF"**. Exemplos que pegam muita gente:
  `match`, `itertools.pairwise`, o `key=` de `bisect`, `math.lcm` com
  mais de dois argumentos (é 3.9, então pode) e `int.bit_count`.
- Cada verbete tem o link para docs.python.org na versão 3.9.

## Conteúdo (seções e verbetes mínimos)

1. **Entrada e saída rápidas:** `sys.stdin.readline`,
   `sys.stdin.buffer.read().split()`, `map(int, …)`, `print` com
   `sep`/`end`, `sys.stdout.write` com `"\n".join`, `print(*lista)`.
2. **Desempenho:** PyPy contra CPython, laço em função local, evitar
   `+=` em string, listas pré-alocadas, `array` e listas planas no lugar
   de lista de listas.
3. **Recursão:** `sys.setrecursionlimit`, `threading.stack_size` com
   thread, e a alternativa iterativa com pilha explícita (com aviso de
   que o PyPy recursivo é lento).
4. **Estruturas:** `list` (complexidades, `pop(0)` é O(n)),
   `collections.deque`, `Counter`, `defaultdict`, `heapq` (mínimo;
   máximo com negativo; tuplas), `bisect`, `set`/`dict` (e o hack
   anti-hash).
5. **Ordenação:** `sort` com `key`, `reverse`, `functools.cmp_to_key`,
   estabilidade, ordenar por vários critérios.
6. **itertools e functools:** `accumulate`, `product`, `permutations`,
   `combinations`, `groupby`, `chain`, `lru_cache`/`cache`, `reduce`.
7. **Números:** inteiros sem limite, `//` e `%` com negativos (arredonda
   para baixo, ao contrário do C++), `pow(a, b, m)`, `pow(a, -1, m)`,
   `math.gcd`, `math.lcm`, `math.isqrt`, `math.comb`, `fractions.Fraction`,
   `decimal`, `float` e sua precisão, `int(s, base)`, `bin`, `hex`.
8. **Strings:** fatias, `split` sem argumento, `join`, `ord`/`chr`,
   `str.count`, `find` contra `index`, `zfill`, f-strings com formato
   (`f"{x:.6f}"`).
9. **Armadilhas:** lista de listas com `[[0]*m]*n`, argumento padrão
   mutável, cópia rasa contra profunda, `is` contra `==`, comparação de
   `float`.

## Spec

- **AC-1**: **Conteúdo Python** `src/ref/py/`, com pelo menos 70 verbetes
  nas 9 seções e o mesmo modelo da T46 (ADR-T47-1).
  - Testes: `src/ref/py/content.test.ts` ("py has at least 70 entries",
    "every section has entries", "the minimum entries of the note exist",
    "every example has at most 6 lines", "every pitfall is one sentence",
    "every entry has a title, a signature and tags", "every entry links to
    Python 3.9 docs", "every data structure has a complexity table",
    "judge entries need Python above 3.9", "search finds common Python
    queries"), `src/ref/model.test.ts` ("every example has a recorded
    output", "entriesOf and sectionsOf return the language content"),
    `src/ref/link.test.ts` ("refLink gives the hash of a known entry",
    "parseRefHash reads lang and id").
- **AC-2**: **Oráculo** `npm run ref:oracle -- py`. Ele roda cada exemplo
  com `pypy3` e com `python3`, confere que a saída é igual a `output`
  nos dois e que os verbetes com `judge` usam um recurso acima do 3.9.
  Isso é conferido pela versão mínima gravada no verbete (`isAfter39`),
  por um verificador de sintaxe com `ast.parse(…, feature_version=(3, 9))`
  e pela lista de APIs pós-3.9 em `src/ref/py/compat.ts` (`findPost39Apis`).
  - Testes: `src/ref/py/compat.test.ts` ("isAfter39 distinguishes Python
    3.9 from newer versions", "findPost39Apis catches post-3.9 stdlib
    features and accepts 3.9 code"), `src/ref/py/content.test.ts`
    ("non-judge examples do not use post-3.9 APIs"), e `npm run ref:oracle
    -- py`, com o resultado no *Log*.
- **AC-3**: **Comparação C++ × Python:** um verbete pode ter `pair:
  "cpp/priority_queue"`, e o leitor mostra o link "em C++" (e o inverso
  na T46, "em Python"). Pelo menos 25 pares: heap, deque, bisect, sort com
  chave, `%` com negativos, inteiros grandes etc.
  - Testes: `src/ref/pairs.test.ts` ("every pair points both ways",
    "at least 25 bidirectional pairs exist", "every pair links across
    languages and resolves"), `src/ui/RefScreen.test.tsx` ("pair link
    shows target language and navigates across references").
- **AC-4**: **Árvore:** "Python" entra na pasta Referência, depois de
  "C++", visível no celular, com alvo e link de documentação próprios no
  leitor.
  - Testes: `src/ui/shell/sections.test.ts` ("Referência folder closes
    the tree with C++ and Python on touch screens"),
    `src/ui/RefScreen.test.tsx` ("reader shows Python target, docs link
    and entries"), `tests/e2e/ref.spec.ts` ("T47: open the Python
    reference from the tree and search it", "T47: pair link jumps between
    Python and C++").

## Out of scope

- numpy, que não existe no juiz da WF.
- Python 2.

## Files owned

- `src/ref/py/` (novo): uma seção por arquivo, `compat.ts`, `index.ts`,
  `outputs.ts` (gerado), `content.test.ts`, `compat.test.ts`
- `src/ref/pairs.test.ts` (novo), `src/ref/cpp/` (só o campo `pair`)
- `src/ref/model.ts`, `src/ref/model.test.ts`, `src/ref/langs.ts`,
  `src/ref/link.test.ts`
- `src/ui/RefScreen.tsx`, `src/ui/RefScreen.test.tsx`, `src/ui/app.css`,
  `src/ui/App.tsx`, `src/ui/shell/sections.ts`,
  `src/ui/shell/sections.test.ts`
- `scripts/ref-oracle.mjs`, `tests/e2e/ref.spec.ts`

## Subtasks (one commit each)

- [x] spec: ADR-T47-1 e critérios com testes nomeados
- [x] tests
- [x] models
- [x] behaviour
- [x] quality: `npm run check`, `ref:oracle -- py`, coverage, e2e, visual
- [x] docs

## Notas para o batch

- A máquina tem `python3` 3.14 e PyPy 8.0, que implementa o 3.11. Nenhum
  dos dois é o 3.9 do juiz, por isso o selo vem do `ast.parse` com
  `feature_version=(3, 9)` e da versão mínima gravada, não de rodar
  numa versão 3.9.

## Log

- 2026-11-25 — Implementada no batch, na branch `task/T47-python-reference`,
  a partir da `main`.
- **Conteúdo:** 85 verbetes nas 9 seções completas (io 8, perf 9,
  recursion 5, structures 13, sorting 6, iter_func 11, numbers 15,
  strings 9, pitfalls 9). Não foi preciso cortar para o recorte 1–6.
- **Pares C++ × Python:** 48 pares bidirecionais verificados por
  `src/ref/pairs.test.ts`, incluindo `priority_queue`/`priority_queue_min`,
  `deque`, `lower_bound`/`upper_bound`, `sort`/`sort_lambda`/`stable_sort`,
  `mod_negative`, `int128`, `vector`/`vector_2d`, `unordered_map`,
  `gcd`/`lcm`/`powmod`/`modinv`/`isqrt`/`ceil_div`, `substr`/`find`/
  `stoi_stoll`, `popcount`/`bit_width`, `lambda_rec` e `views_enumerate`.
- **Oráculo (`scripts/ref-oracle.mjs`):**
  - `npm run ref:oracle -- py` (PyPy 8.0.0 / Python 3.11.16 | Python
    3.14.10): `ref:oracle py: 85/85 ok (5 judge entries, 0 output
    mismatches)`. Saídas gravadas em `src/ref/py/outputs.ts` com `--write`.
  - `npm run ref:oracle -- cpp` (g++ 16.2.1): `ref:oracle cpp: 91/91 ok
    (4 judge entries, 0 output mismatches)`.
  - Os 5 verbetes com `judge` (`match_case`, `pairwise`, `bisect_key`,
    `int_bit_count`, `zip_strict`) são Python 3.10+, falham no verificador
    3.9 (`ast.parse(..., feature_version=(3, 9))` para `match_case` e
    `findPost39Apis` em `src/ref/py/compat.ts` para os demais) e produzem
    saída idêntica em `pypy3` e `python3`. Recursos do 3.9 (`math.lcm`,
    `math.gcd` com vários argumentos, `functools.cache`, `str.removeprefix`)
    seguem liberados para a WF.
  - Achados do oráculo: arquivos temporários precisaram do prefixo
    `entry_` para que `decimal.py` não sombreasse o módulo `decimal` da
    stdlib em `sys.path[0]`; no verbete `is_vs_eq`, o exemplo usa listas
    em vez de inteiros porque o PyPy compara identidade de `int` por valor.
- **UNATTENDED CHOICE:** identificador `py` (`Lang = "cpp" | "py"`,
  `ref-py`, `#py/<id>`), metadados `LANG_TARGET` e `LANG_DOCS` em
  `src/ref/langs.ts`, `pair?: string` em `Entry` com `key={lang}` no
  `RefScreen` e verificador puro `src/ref/py/compat.ts` reutilizado pelo
  oráculo (registrado no `ADR-T47-1`).
- **Files owned ampliados** (política do plano): `src/ref/model.ts`,
  `src/ref/model.test.ts`, `src/ref/langs.ts`, `src/ref/link.test.ts`,
  `src/ui/RefScreen.tsx`, `src/ui/RefScreen.test.tsx`, `src/ui/app.css` e
  `src/ui/shell/sections.test.ts`.
- **Gates:** `npm run check` verde (208 arquivos, 4517 testes, typecheck,
  lint, prettier e build); `npm run coverage` verde (`src/ref/**` e
  `RefScreen.tsx` em 100/100/100/100); `npm run test:e2e` verde (58
  testes em desktop e mobile, incluindo os novos casos T47 e
  `regression-T49-independent-scroll`).
- **Verificação visual:** `.batch/visual/T47-python-reference.spec.ts`
  (desktop e phone: árvore/gaveta, topo Python, busca `bisect`, selo
  `não existe na WF`, navegação pelo link `em C++`, impressão em duas
  colunas). Corrigido: links de seção de duas linhas em `.ref-sections`
  ficavam centralizados; adicionada regra `.ref-sections button {
  text-align: left; }`.
- **Checagens manuais para o dono:** buscar 5 coisas em Python na
  referência; seguir um link de par C++ ↔ Python nos dois sentidos.
