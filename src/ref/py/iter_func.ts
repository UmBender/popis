import type { EntryDraft } from "../model";

const p = String.raw;
const REF = "https://docs.python.org/3.9/";

/** Section 6: itertools and functools helpers used in contests. */
export const ITER_FUNC: readonly EntryDraft[] = [
  {
    id: "accumulate",
    title: "itertools.accumulate",
    signature: "from itertools import accumulate;  list(accumulate(a, initial=0))",
    complexity: "O(n)",
    example: p`from itertools import accumulate
a = [3, 1, 4, 1, 5]
pref = list(accumulate(a, initial=0))
print(pref, pref[4] - pref[1])`,
    pitfalls: [
      "initial=0 (Python 3.8+) coloca o zero inicial para que pref[r] - pref[l] dê a soma em [l, r).",
      "Também aceita operador como max ou operator.mul no segundo argumento.",
    ],
    tags: ["soma de prefixos", "prefix sum", "acumulado", "itertools"],
    since: "Python 3.8",
    pair: "cpp/partial_sum",
    link: `${REF}library/itertools.html#itertools.accumulate`,
  },
  {
    id: "product",
    title: "itertools.product",
    signature: "product(a, b);  product(range(k), repeat=n)",
    complexity: "O(produto dos tamanhos)",
    example: p`from itertools import product
print(list(product([0, 1], repeat=3)))
print(list(product("ab", [1, 2])))`,
    pitfalls: [
      "Substitui n laços aninhados e gera todas as k^n tuplas em ordem lexicográfica.",
      "Consuma no for sem chamar list() quando o produto cartesiano for grande.",
    ],
    tags: ["produto cartesiano", "força bruta", "máscara", "itertools", "repeat"],
    link: `${REF}library/itertools.html#itertools.product`,
  },
  {
    id: "permutations",
    title: "itertools.permutations",
    signature: "permutations(iterável, r=None)",
    complexity: "O(n! / (n - r)!)",
    example: p`from itertools import permutations
print(["".join(t) for t in permutations("abc")])
print(len(list(permutations(range(4), 2))))`,
    pitfalls: [
      "Com elementos repetidos, permutations gera duplicatas por posição, ao contrário do next_permutation do C++.",
      "Para permutações únicas com repetidos, envolva em set() ou implemente next_permutation.",
    ],
    tags: ["permutação", "força bruta", "todas as ordens", "itertools"],
    pair: "cpp/next_permutation",
    link: `${REF}library/itertools.html#itertools.permutations`,
  },
  {
    id: "combinations",
    title: "itertools.combinations",
    signature: "combinations(iterável, r);  combinations_with_replacement(iterável, r)",
    complexity: "O(C(n, r))",
    example: p`from itertools import combinations, combinations_with_replacement
print(list(combinations([1, 2, 3, 4], 2)))
print(list(combinations_with_replacement("ab", 2)))`,
    pitfalls: [
      "Escolhe r elementos sem repetição na ordem de entrada, em tuplas imutáveis.",
      "Use combinations_with_replacement quando o mesmo elemento pode aparecer mais de uma vez.",
    ],
    tags: ["combinação", "subconjuntos", "escolher", "itertools"],
    link: `${REF}library/itertools.html#itertools.combinations`,
  },
  {
    id: "groupby",
    title: "itertools.groupby",
    signature: "for k, grp in groupby(iterável, key=None): ...",
    complexity: "O(n)",
    example: p`from itertools import groupby
s = "aaabbcaaa"
runs = [(k, sum(1 for _ in g)) for k, g in groupby(s)]
print(runs)`,
    pitfalls: [
      "Agrupa só elementos iguais consecutivos (run-length encoding), então ordene antes se quiser juntar todos os iguais.",
      "O iterador grp de cada grupo vence assim que o laço avança para o próximo grupo.",
    ],
    tags: ["agrupar", "rle", "blocos", "consecutivos", "itertools", "duplicatas"],
    pair: "cpp/unique_erase",
    link: `${REF}library/itertools.html#itertools.groupby`,
  },
  {
    id: "chain",
    title: "itertools.chain",
    signature: "chain(a, b);  chain.from_iterable(lista_de_listas)",
    complexity: "O(total de elementos), O(1) de memória",
    example: p`from itertools import chain
grid = [[1, 2], [3], [4, 5]]
print(list(chain.from_iterable(grid)))
print(list(chain([1, 2], (3, 4))))`,
    pitfalls: [
      "Achatar uma lista de listas com sum(grid, []) custa O(n²); use chain.from_iterable para O(n).",
      "chain.from_iterable aceita um gerador sem materializar as listas externas.",
    ],
    tags: ["achatar", "flatten", "concatenar", "itertools"],
    link: `${REF}library/itertools.html#itertools.chain`,
  },
  {
    id: "lru_cache",
    title: "functools.lru_cache e cache",
    signature: "@lru_cache(maxsize=None)  # ou @cache (Python 3.9)",
    complexity: "O(1) médio por estado memoizado",
    example: p`from functools import cache
@cache
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)
print(fib(30), fib.cache_info().currsize)`,
    pitfalls: [
      "functools.cache existe no Python 3.9 (equivale a lru_cache(maxsize=None)) e é válido na WF.",
      "Todos os argumentos precisam ser hashable (int, str, tuple), nunca list, e chame f.cache_clear() entre casos de teste.",
      "Em PyPy, DP iterativa com lista plana costuma ser muito mais rápida e gasta menos memória.",
    ],
    tags: ["memoização", "dp", "cache", "lru_cache", "functools"],
    since: "Python 3.9",
    link: `${REF}library/functools.html#functools.cache`,
  },
  {
    id: "reduce",
    title: "functools.reduce",
    signature: "from functools import reduce;  reduce(fn, iterável, inicial)",
    complexity: "O(n)",
    example: p`from functools import reduce
import operator
a = [2, 3, 4]
print(reduce(operator.mul, a, 1), reduce(operator.xor, [5, 3, 5]))`,
    pitfalls: [
      "Sem valor inicial, reduce em iterável vazio lança TypeError.",
      "Para soma use sum() e para produto use math.prod() (3.8+), que rodam em C e são mais rápidos.",
    ],
    tags: ["dobrar", "fold", "functools", "xor", "produto"],
    pair: "cpp/accumulate",
    link: `${REF}library/functools.html#functools.reduce`,
  },
  {
    id: "pairwise",
    title: "itertools.pairwise",
    signature: "from itertools import pairwise;  for a, b in pairwise(xs):",
    complexity: "O(n)",
    example: p`from itertools import pairwise
a = [10, 13, 19, 20]
print([y - x for x, y in pairwise(a)])`,
    pitfalls: [
      "Só entrou no Python 3.10 e não existe na WF (3.9).",
      "Na 3.9, escreva zip(a, a[1:]) ou for i in range(len(a) - 1).",
    ],
    tags: ["pares adjacentes", "diferenças", "itertools", "python 3.10"],
    since: "Python 3.10",
    judge: true,
    link: `${REF}library/itertools.html`,
  },
  {
    id: "zip_enumerate",
    title: "zip e enumerate",
    signature: "for i, x in enumerate(a):  for x, y in zip(a, b):",
    complexity: "O(n)",
    example: p`names = ["a", "b", "c"]
vals = [10, 20]
print(list(enumerate(names, start=1)))
print(list(zip(names, vals)))`,
    pitfalls: [
      "zip para no iterável mais curto em silêncio; para preencher com padrão use itertools.zip_longest.",
      "zip(*matriz) transpõe uma matriz em uma linha.",
    ],
    tags: ["índice", "transpor", "iterar", "enumerate", "zip"],
    pair: "cpp/views_enumerate",
    link: `${REF}library/functions.html#enumerate`,
  },
  {
    id: "any_all_min_max",
    title: "min, max, sum, any e all",
    signature: "min(a, key=..., default=...);  any(cond for x in a)",
    complexity: "O(n), com curto-circuito em any e all",
    example: p`a = [4, 9, 2, 9]
best = max(range(len(a)), key=a.__getitem__)
print(a[best], best, any(x > 8 for x in a), all(x > 0 for x in a))`,
    pitfalls: [
      "min() e max() em iterável vazio lançam ValueError a menos que você passe default=.",
      "any([]) é False e all([]) é True (vacuamente verdadeiro).",
    ],
    tags: ["mínimo", "máximo", "argmax", "argmin", "any", "all", "sum"],
    pair: "cpp/min_max_element",
    link: `${REF}library/functions.html#max`,
  },
];
