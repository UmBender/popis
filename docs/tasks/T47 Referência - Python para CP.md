---
id: T47
title: Referência - Python para CP
status: todo
depends_on: [T46]
branch: task/T47-python-reference
adrs: []
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
  nas 9 seções e o mesmo modelo da T46.
  - Testes: `src/ref/py/content.test.ts` ("every section has entries", "every example has at most 6 lines").
- **AC-2**: **Oráculo** `npm run ref:oracle -- py`. Ele roda cada exemplo
  com `pypy3` e com `python3`, confere que a saída é igual a `output`
  nos dois e que os verbetes com `judge` usam um recurso acima do 3.9.
  Isso é conferido pela versão mínima gravada no verbete e por um
  verificador de sintaxe com `ast.parse(…, feature_version=(3, 9))`.
  - Testes: `npm run ref:oracle -- py`, com o resultado no *Log*.
- **AC-3**: **Comparação C++ × Python:** um verbete pode ter `pair:
  "cpp/priority_queue"`, e o leitor mostra o link "em C++" (e o inverso
  na T46). Pelo menos 25 pares: heap, deque, bisect, sort com chave,
  `%` com negativos, inteiros grandes etc.
  - Testes: `src/ref/pairs.test.ts` ("every pair points both ways").
- **AC-4**: **Árvore:** "Python" entra na pasta Referência, depois de
  "C++", visível no celular.
  - Testes: `src/ui/shell/sections.test.ts`, `tests/e2e/ref.spec.ts` (busca e verbete Python).

## Out of scope

- numpy, que não existe no juiz da WF.
- Python 2.

## Files owned

- `src/ref/py/` (novo), `src/ref/pairs.test.ts` (novo), `src/ref/cpp/` (só o campo `pair`)
- `src/ui/App.tsx`, `src/ui/shell/sections.ts`
- `scripts/ref-oracle.mjs`, `tests/e2e/ref.spec.ts`

## Subtasks (one commit each)

- [ ] spec
- [ ] tests
- [ ] models (provavelmente pulado: o modelo vem da T46)
- [ ] behaviour
- [ ] quality: `npm run check`, `ref:oracle -- py`, coverage, e2e
- [ ] docs

## Notas para o batch

- A máquina tem `python3` 3.14 e PyPy 8.0, que implementa o 3.11. Nenhum
  dos dois é o 3.9 do juiz, por isso o selo vem do `ast.parse` com
  `feature_version=(3, 9)` e da versão mínima gravada, não de rodar
  numa versão 3.9.

## Log
