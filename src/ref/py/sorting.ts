import type { EntryDraft } from "../model";

const p = String.raw;
const REF = "https://docs.python.org/3.9/";

/** Section 5: sorting with Timsort, key functions and multiple criteria. */
export const SORTING: readonly EntryDraft[] = [
  {
    id: "sort_sorted",
    title: "list.sort e sorted",
    signature: "a.sort();  b = sorted(iterável)",
    complexity: "O(n log n) no pior caso (Timsort)",
    example: p`a = [3, 1, 2]
b = sorted(a)
a.sort()
print(a, b)`,
    pitfalls: [
      "a.sort() ordena no lugar e devolve None, então escrever a = a.sort() apaga a lista.",
      "sorted() aceita qualquer iterável e sempre devolve uma nova list.",
    ],
    tags: ["ordenar", "ordenação", "sort", "sorted", "timsort"],
    pair: "cpp/sort",
    link: `${REF}howto/sorting.html`,
  },
  {
    id: "sort_key",
    title: "sort com key",
    signature: "a.sort(key=lambda x: ...)",
    complexity: "O(n log n), avaliando key uma vez por item",
    example: p`words = ["sol", "maratona", "cp", "algoritmo"]
words.sort(key=len)
print(words)`,
    pitfalls: [
      "A função key é chamada só n vezes (padrão decorate-sort-undecorate), bem mais rápida que comparador.",
      "No PyPy, empacotar a chave num inteiro ou ordenar índices pode evitar alocar tuplas.",
    ],
    tags: ["ordenar", "key", "lambda", "critério", "sort"],
    pair: "cpp/sort_lambda",
    link: `${REF}howto/sorting.html#key-functions`,
  },
  {
    id: "sort_reverse",
    title: "reverse=True e reversed",
    signature: "a.sort(reverse=True);  a.reverse();  reversed(a)",
    complexity: "O(n log n) com sort; O(n) para inverter",
    example: p`a = [3, 1, 4, 2]
print(sorted(a, reverse=True))
a.reverse()
print(a, list(reversed("abc")))`,
    pitfalls: [
      "a.reverse() inverte no lugar e devolve None; reversed(a) devolve um iterador sem copiar.",
      "Em Python, sort(reverse=True) mantém a estabilidade da ordem original nos empates.",
    ],
    tags: ["inverter", "decrescente", "reverse", "reversed"],
    pair: "cpp/reverse",
    link: `${REF}library/functions.html#reversed`,
  },
  {
    id: "cmp_to_key",
    title: "functools.cmp_to_key",
    signature: "from functools import cmp_to_key;  a.sort(key=cmp_to_key(cmp))",
    complexity: "O(n log n) chamadas a cmp (constante alta)",
    example: p`from functools import cmp_to_key
nums = ["3", "30", "34", "9"]
nums.sort(key=cmp_to_key(lambda a, b: -1 if a + b > b + a else 1))
print("".join(nums))`,
    pitfalls: [
      "cmp(a, b) deve devolver negativo se a < b, zero se iguais e positivo se a > b, nunca bool.",
      "É bem mais lento que key=, então use só quando a ordem depende do par (ex.: a + b contra b + a ou ângulo).",
    ],
    tags: ["comparador", "cmp_to_key", "functools", "ordenar", "custom"],
    link: `${REF}library/functools.html#functools.cmp_to_key`,
  },
  {
    id: "timsort_stability",
    title: "Estabilidade do Timsort",
    signature: "a.sort(key=...)  # sempre estável",
    complexity: "O(n log n), até O(n) se quase ordenado",
    example: p`items = [(2, "a"), (1, "b"), (2, "c"), (1, "d")]
items.sort(key=lambda t: t[0])
print("".join(ch for _, ch in items))`,
    pitfalls: [
      "Tanto list.sort quanto sorted são garantidamente estáveis na especificação da linguagem.",
      "Você pode ordenar primeiro pelo critério secundário e depois pelo primário sem perder o desempate.",
    ],
    tags: ["estável", "stable_sort", "timsort", "empate", "ordenação"],
    pair: "cpp/stable_sort",
    link: `${REF}howto/sorting.html#sort-stability-and-complex-sorts`,
  },
  {
    id: "sort_multi_key",
    title: "Ordenar por vários critérios",
    signature: "a.sort(key=lambda x: (x[0], -x[1]))",
    complexity: "O(n log n)",
    example: p`a = [("ana", 5), ("bia", 8), ("caio", 5)]
a.sort(key=lambda t: t[0])
a.sort(key=lambda t: t[1], reverse=True)
print(a)`,
    pitfalls: [
      "Para desempate numérico inverso use -x[1] na tupla; para string decrescente, faça duas passadas estáveis.",
      "Duas passadas (critério secundário primeiro, primário depois) funcionam para qualquer tipo comparável.",
    ],
    tags: ["critérios", "desempate", "tupla", "ordenar", "multi-chave"],
    link: `${REF}howto/sorting.html#sort-stability-and-complex-sorts`,
  },
];
