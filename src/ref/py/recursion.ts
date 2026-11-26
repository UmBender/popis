import type { EntryDraft } from "../model";

const p = String.raw;
const REF = "https://docs.python.org/3.9/";

/** Section 3: recursion limits, thread stack size and iterative alternatives. */
export const RECURSION: readonly EntryDraft[] = [
  {
    id: "setrecursionlimit",
    title: "sys.setrecursionlimit",
    signature: "sys.setrecursionlimit(200_000)",
    complexity: "O(profundidade) de pilha",
    example: p`import sys
sys.setrecursionlimit(10_000)
def fact_mod(n):
    return 1 if n == 0 else n * fact_mod(n - 1) % 1000000007
print(sys.getrecursionlimit(), fact_mod(10))`,
    pitfalls: [
      "O limite padrão é 1000, que estoura com RecursionError em qualquer DFS em árvore de 10^5 nós.",
      "Subir o limite além da pilha do sistema operacional causa segfault em vez de exceção.",
    ],
    tags: ["recursão", "limite", "dfs", "pilha", "recursionerror"],
    link: `${REF}library/sys.html#sys.setrecursionlimit`,
  },
  {
    id: "threading_stack_size",
    title: "threading.stack_size com thread",
    signature:
      "threading.stack_size(1 << 27);  t = threading.Thread(target=solve); t.start(); t.join()",
    complexity: "aumenta a pilha do SO para a thread",
    example: p`import sys, threading
sys.setrecursionlimit(100_000)
threading.stack_size(1 << 24)
out = []
t = threading.Thread(target=lambda: out.append(sum(range(5))))
t.start(); t.join(); print(out[0])`,
    pitfalls: [
      "Precisa combinar sys.setrecursionlimit com threading.stack_size para evitar segfault no Linux ou Windows.",
      "Mesmo com pilha grande, recursão funda em PyPy é lenta e gasta muita memória por frame.",
    ],
    tags: ["recursão", "thread", "stack_size", "segfault", "pilha"],
    link: `${REF}library/threading.html#threading.stack_size`,
  },
  {
    id: "iterative_dfs_stack",
    title: "DFS iterativa com pilha explícita",
    signature: "stack = [raiz];  while stack: u = stack.pop()",
    complexity: "O(V + E)",
    example: p`adj, vis, st, order = [[1, 2], [3], [], []], [False] * 4, [0], []
while st:
    u = st.pop()
    if not vis[u]:
        vis[u] = True; order.append(u); st.extend(adj[u])
print(len(order), sorted(order))`,
    pitfalls: [
      "No PyPy, DFS recursiva em 2·10^5 nós costuma levar TLE ou MLE, então prefira pilha explícita.",
      "A ordem dos vizinhos sai invertida porque a pilha é LIFO; se a ordem importar, empilhe reversed(adj[u]).",
    ],
    tags: ["dfs", "iterativo", "pilha", "grafo", "recursão", "pypy"],
    pair: "cpp/lambda_rec",
    link: `${REF}tutorial/datastructures.html#using-lists-as-stacks`,
  },
  {
    id: "iterative_postorder",
    title: "Pós-ordem iterativa em árvore",
    signature: "order = [];  for u in reversed(order): ...",
    complexity: "O(n)",
    example: p`adj, par, sub, order, st = [[1, 2], [3], [], []], [-1] * 4, [1] * 4, [], [0]
while st:
    u = st.pop(); order.append(u)
    for v in adj[u]: par[v] = u; st.append(v)
for u in reversed(order[1:]): sub[par[u]] += sub[u]
print(sub)`,
    pitfalls: [
      "Percorrer order ao contrário processa filhos antes do pai sem precisar de recursão nem pilha de estados.",
      "Em árvore não direcionada, ignore v == par[u] ao empilhar para não voltar ao pai.",
    ],
    tags: ["árvore", "dp em árvore", "subárvore", "pós-ordem", "iterativo"],
    link: `${REF}library/functions.html#reversed`,
  },
  {
    id: "recursion_pypy_cost",
    title: "Custo de recursão no PyPy",
    signature: "troque recursão de cauda ou DP top-down por laço iterativo",
    complexity: "O(n) iterativo evita frames e aquece o JIT",
    example: p`n = 10
a, b = 0, 1
for _ in range(n):
    a, b = b, a + b
print(a)`,
    pitfalls: [
      "O JIT do PyPy otimiza laços muito melhor do que funções recursivas, que quebram os traços compilados.",
      "Em DP de 10^5 estados, bottom-up com lista plana costuma ser 5x mais rápido que @lru_cache recursivo.",
    ],
    tags: ["pypy", "recursão", "jit", "dp", "iterativo", "tle"],
    link: `${REF}library/sys.html#sys.getrecursionlimit`,
  },
];
