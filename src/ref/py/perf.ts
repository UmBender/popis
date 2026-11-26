import type { EntryDraft } from "../model";

const p = String.raw;
const REF = "https://docs.python.org/3.9/";

/** Section 2: performance in PyPy3 vs CPython. */
export const PERF: readonly EntryDraft[] = [
  {
    id: "pypy_vs_cpython",
    title: "PyPy contra CPython",
    signature: "PyPy3 (JIT): laços ~5-15x mais rápidos; CPython: menos memória e C nativo",
    complexity: "laços simples em PyPy aguentam ~5·10^7 iterações/s",
    example: p`n = 1000
s = 0
for i in range(n):
    s += i * i
print(s)`,
    pitfalls: [
      "O PyPy acelera laços numéricos com tipos homogêneos, mas gasta mais memória e demora ~50 ms para aquecer.",
      "Evite misturar int e None na mesma lista no PyPy, porque perde a lista especializada de inteiros.",
      "Para muita recursão ou muitas strings/regex pesadas, o CPython às vezes ganha ou usa menos RAM.",
    ],
    tags: ["pypy", "cpython", "jit", "velocidade", "tle", "memória"],
    link: `${REF}glossary.html#term-CPython`,
  },
  {
    id: "local_scope_main",
    title: "Laço em função local (def main)",
    signature: "def main(): ...  # LOAD_FAST em vez de LOAD_GLOBAL",
    complexity: "reduz constante dos laços em ~20-40%",
    example: p`def main():
    total = 0
    for i in range(1, 101):
        total += i
    print(total)
main()`,
    pitfalls: [
      "Variáveis no escopo global viram buscas em dicionário a cada iteração, enquanto locais usam índice fixo.",
      "Coloque sempre a solução dentro de def main() e chame main() no fim.",
    ],
    tags: ["main", "escopo local", "global", "otimização", "load_fast"],
    link: `${REF}reference/executionmodel.html#resolution-of-names`,
  },
  {
    id: "avoid_str_plus",
    title: "Evitar += em string",
    signature: p`parts = []; parts.append(x); "".join(parts)`,
    complexity: "O(total) com join, até O(n²) com += em laço",
    example: p`parts = []
for i in range(5):
    parts.append(chr(ord("a") + i))
print("".join(parts))`,
    pitfalls: [
      "str é imutável, então s += c num laço pode copiar tudo a cada passo, principalmente no PyPy.",
      "Acumule pedaços numa lista e junte uma única vez com ''.join(parts).",
    ],
    tags: ["concatenar", "string", "join", "quadrático", "tle"],
    pair: "cpp/string_append",
    link: `${REF}library/stdtypes.html#str.join`,
  },
  {
    id: "preallocate_list",
    title: "Pré-alocar lista",
    signature: "a = [0] * n",
    complexity: "O(n) em C, sem realocações",
    example: p`n = 5
dp = [0] * n
dp[0] = 1
for i in range(1, n):
    dp[i] = dp[i - 1] * 2
print(dp)`,
    pitfalls: [
      "[0] * n só é seguro para valores imutáveis (int, float, str, None), nunca para listas ou dicts.",
      "Usar -1 como sentinela no lugar de None mantém a lista de inteiros compacta no PyPy.",
    ],
    tags: ["lista", "inicializar", "pré-alocar", "dp", "preencher"],
    pair: "cpp/fill",
    link: `${REF}library/stdtypes.html#common-sequence-operations`,
  },
  {
    id: "array_module",
    title: "array.array (compacto)",
    signature: "from array import array;  a = array('i', [0]) * n",
    complexity: "4 bytes por int ('i') ou 8 bytes ('q')",
    example: p`from array import array
a = array("i", [10, 20, 30])
a.append(40)
print(a.itemsize, list(a))`,
    pitfalls: [
      "Usa muito menos memória que list quando você precisa guardar milhões de inteiros de 32 ou 64 bits.",
      "Overflow de 32 bits em array('i') lança OverflowError, então use 'q' para 64 bits com sinal.",
    ],
    tags: ["array", "memória", "mle", "compacto", "int32"],
    link: `${REF}library/array.html#array.array`,
  },
  {
    id: "flat_list_2d",
    title: "Lista plana no lugar de 2D",
    signature: "g = [0] * (n * m);  g[i * m + j]",
    complexity: "O(n · m) com muito menos memória e melhor cache",
    example: p`n, m = 2, 3
g = [0] * (n * m)
g[1 * m + 2] = 7
print(g[5], len(g))`,
    pitfalls: [
      "Uma matriz n x m de listas cria n listas separadas e dobra o custo de acesso em DP 2D no PyPy.",
      "Em grids grandes (10^6 células), uma lista plana economiza dezenas de megabytes e evita MLE.",
    ],
    tags: ["matriz", "grid", "2d", "lista plana", "dp", "mle"],
    pair: "cpp/vector_2d",
    link: `${REF}library/stdtypes.html#lists`,
  },
  {
    id: "list_comprehension",
    title: "List comprehension e gerador",
    signature: "[f(x) for x in a if cond];  sum(x * x for x in a)",
    complexity: "O(n); gerador usa O(1) de memória extra",
    example: p`a = [1, 2, 3, 4, 5]
evens = [x * 10 for x in a if x % 2 == 0]
s = sum(x * x for x in a)
print(evens, s)`,
    pitfalls: [
      "List comprehension é mais rápida que um laço com .append() porque evita buscar o método a cada passo.",
      "Dentro de sum(), min(), max() e any(), prefira gerador sem colchetes para não alocar uma lista.",
    ],
    tags: ["comprehension", "gerador", "laço", "memória", "sum"],
    link: `${REF}tutorial/datastructures.html#list-comprehensions`,
  },
  {
    id: "bitpack_int",
    title: "Empacotar pares em um int",
    signature: "key = (a << 20) | b;  a, b = key >> 20, key & ((1 << 20) - 1)",
    complexity: "O(1) sem alocar tuplas",
    example: p`MASK = (1 << 20) - 1
a, b = 123, 456
packed = (a << 20) | b
print(packed >> 20, packed & MASK)`,
    pitfalls: [
      "Em Dijkstra ou BFS com 10^6 estados no PyPy, empacotar (dist, nó) num int evita alocar milhões de tuplas.",
      "Só funciona com b não negativo menor que 2^20; ajuste o deslocamento para o limite do problema.",
    ],
    tags: ["tupla", "empacotar", "bitpack", "dijkstra", "memória", "pypy"],
    link: `${REF}reference/expressions.html#shifting-operations`,
  },
  {
    id: "perf_counter_cutoff",
    title: "Cortar busca com time.perf_counter",
    signature: "t0 = time.perf_counter();  time.perf_counter() - t0 < limite",
    complexity: "O(1) por consulta",
    example: p`import time
t0 = time.perf_counter()
it = 0
while time.perf_counter() - t0 < 0.02:
    it += 1
print(it > 0)`,
    pitfalls: [
      "Consulte o relógio a cada 1000 iterações, nunca dentro do laço interno mais quente.",
      "Deixe margem para o tempo de leitura, escrita e aquecimento do PyPy.",
    ],
    tags: ["tempo", "relógio", "timer", "heurística", "perf_counter"],
    pair: "cpp/time_cutoff",
    link: `${REF}library/time.html#time.perf_counter`,
  },
];
