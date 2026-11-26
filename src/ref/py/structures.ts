import type { EntryDraft } from "../model";

const p = String.raw;
const REF = "https://docs.python.org/3.9/";

/** Section 4: core data structures and their complexities. */
export const STRUCTURES: readonly EntryDraft[] = [
  {
    id: "list",
    title: "list",
    signature: "a = [];  a.append(x);  a.pop();  a[i]",
    complexity: [
      ["append / pop() no fim", "O(1) amortizado"],
      ["a[i] / len(a)", "O(1)"],
      ["pop(0) / insert(0, x)", "O(n)"],
      ["x in a", "O(n)"],
      ["a[l:r]", "O(r - l)"],
    ],
    example: p`a = [1, 2, 3]
a.append(4)
last = a.pop()
print(last, a[0], a[-1], len(a))`,
    pitfalls: [
      "pop(0) e insert(0, x) deslocam a lista inteira e custam O(n), então use deque para filas.",
      "x in a faz busca linear O(n); para consultas repetidas use set ou dict.",
    ],
    tags: ["lista", "vetor", "array dinâmico", "append", "pop(0)"],
    pair: "cpp/vector",
    link: `${REF}library/stdtypes.html#lists`,
  },
  {
    id: "deque",
    title: "deque (collections)",
    signature: "from collections import deque;  d.append(x);  d.appendleft(x);  d.popleft()",
    complexity: [
      ["append / appendleft / pop / popleft", "O(1)"],
      ["d[0] / d[-1]", "O(1)"],
      ["d[i] no meio", "O(n)"],
    ],
    example: p`from collections import deque
d = deque([2, 3])
d.appendleft(1)
d.append(4)
print(d.popleft(), d.pop(), list(d))`,
    pitfalls: [
      "Indexar o meio com d[i] é O(n) no deque do Python, ao contrário do std::deque do C++.",
      "É a estrutura certa para BFS, BFS 0-1 e janela deslizante monotônica.",
    ],
    tags: ["fila dupla", "collections", "bfs 0-1", "popleft", "duas pontas"],
    pair: "cpp/deque",
    link: `${REF}library/collections.html#collections.deque`,
  },
  {
    id: "stack_list",
    title: "Pilha com list",
    signature: "st = [];  st.append(x);  st[-1];  st.pop()",
    complexity: "O(1) amortizado por operação",
    example: p`st = []
for x in (1, 2, 3):
    st.append(x)
top = st.pop()
print(top, st[-1], len(st))`,
    pitfalls: [
      "Chamar pop() ou ler st[-1] numa lista vazia lança IndexError.",
      "Não use queue.LifoQueue em contest porque tem travas de thread e é muito mais lenta.",
    ],
    tags: ["pilha", "stack", "lifo", "append", "pop"],
    pair: "cpp/stack",
    link: `${REF}tutorial/datastructures.html#using-lists-as-stacks`,
  },
  {
    id: "queue_deque",
    title: "Fila com deque",
    signature: "q = deque([raiz]);  q.append(v);  u = q.popleft()",
    complexity: "O(1) por enqueue e dequeue",
    example: p`from collections import deque
q = deque([10, 20])
q.append(30)
first = q.popleft()
print(first, q[0], len(q))`,
    pitfalls: [
      "Nunca use queue.Queue em BFS porque tem sincronização de threads e estoura o tempo.",
      "Nunca simule fila com list.pop(0), que vira O(n²).",
    ],
    tags: ["fila", "queue", "fifo", "bfs", "popleft"],
    pair: "cpp/queue",
    link: `${REF}tutorial/datastructures.html#using-lists-as-queues`,
  },
  {
    id: "counter",
    title: "collections.Counter",
    signature: "from collections import Counter;  c = Counter(iterável)",
    complexity: [
      ["construir de n itens", "O(n)"],
      ["c[k] / c[k] += 1", "O(1) médio"],
      ["most_common(k)", "O(n log k)"],
    ],
    example: p`from collections import Counter
c = Counter("abacaba")
print(c["a"], c["z"], c.most_common(2))`,
    pitfalls: [
      "Ler uma chave ausente devolve 0 sem inserir a chave no Counter.",
      "Por baixo é um dict, então sofre do mesmo problema anti-hash com chaves inteiras no Codeforces.",
    ],
    tags: ["frequência", "contar", "histograma", "collections", "multiset"],
    link: `${REF}library/collections.html#collections.Counter`,
  },
  {
    id: "defaultdict",
    title: "collections.defaultdict",
    signature: "from collections import defaultdict;  d = defaultdict(list)",
    complexity: [
      ["d[k] / d[k] = v", "O(1) médio"],
      ["k in d", "O(1) médio"],
    ],
    example: p`from collections import defaultdict
g = defaultdict(list)
for u, v in [(1, 2), (1, 3), (2, 4)]:
    g[u].append(v)
print(g[1], 9 in g, g[9])`,
    pitfalls: [
      "Apenas ler d[k] cria a chave com o valor padrão, então teste pertinência com k in d.",
      "Para grafos com vértices de 0 a n - 1, [[] for _ in range(n)] é bem mais rápido que defaultdict.",
    ],
    tags: ["dicionário", "padrão", "collections", "adjacência", "grafo"],
    link: `${REF}library/collections.html#collections.defaultdict`,
  },
  {
    id: "heapq_min",
    title: "heapq (mínimo)",
    signature: "import heapq;  heapq.heappush(h, x);  heapq.heappop(h);  heapq.heapify(h)",
    complexity: [
      ["heappush / heappop", "O(log n)"],
      ["h[0] (mínimo)", "O(1)"],
      ["heapify(h)", "O(n)"],
    ],
    example: p`import heapq
h = [5, 1, 4]
heapq.heapify(h)
heapq.heappush(h, 2)
print(h[0], heapq.heappop(h), heapq.heappop(h))`,
    pitfalls: [
      "heapq é sempre heap de mínimo, ao contrário da priority_queue do C++.",
      "No Dijkstra, cheque if d > dist[u]: continue ao tirar do heap para ignorar entradas velhas.",
    ],
    tags: ["heap", "heap de mínimo", "fila de prioridade", "dijkstra", "heapify"],
    pair: "cpp/priority_queue_min",
    link: `${REF}library/heapq.html`,
  },
  {
    id: "heapq_max_tuples",
    title: "heapq (máximo e tuplas)",
    signature: "heapq.heappush(h, -x);  -heapq.heappop(h)",
    complexity: "O(log n) por push e pop",
    example: p`import heapq
h = []
for w, name in [(3, "b"), (7, "a"), (7, "c")]:
    heapq.heappush(h, (-w, name))
w, name = heapq.heappop(h)
print(-w, name)`,
    pitfalls: [
      "Para heap de máximo negue o valor numérico; em Python inteiros não estouram com -x.",
      "Com tuplas (prio, obj), em empate o Python compara obj, o que falha se obj não for comparável.",
    ],
    tags: ["heap de máximo", "max heap", "priority_queue", "tupla", "negativo"],
    pair: "cpp/priority_queue",
    link: `${REF}library/heapq.html#priority-queue-implementation-notes`,
  },
  {
    id: "bisect_left",
    title: "bisect_left",
    signature: "from bisect import bisect_left;  bisect_left(a, x)  # primeiro >= x",
    complexity: "O(log n)",
    example: p`from bisect import bisect_left
a = [1, 3, 3, 5, 8]
print(bisect_left(a, 3), bisect_left(a, 6), bisect_left(a, 9))`,
    pitfalls: [
      "A lista precisa estar ordenada; se todos forem < x devolve len(a).",
      "bisect.insort mantém a lista ordenada mas custa O(n) pela inserção na lista.",
    ],
    tags: ["busca binária", "lower_bound", "bisect", "primeiro maior ou igual"],
    pair: "cpp/lower_bound",
    link: `${REF}library/bisect.html#bisect.bisect_left`,
  },
  {
    id: "bisect_right",
    title: "bisect_right",
    signature: "from bisect import bisect_right;  bisect_right(a, x)  # primeiro > x",
    complexity: "O(log n)",
    example: p`from bisect import bisect_left, bisect_right
a = [1, 3, 3, 5, 8]
hi = bisect_right(a, 3)
print(hi, hi - bisect_left(a, 3))`,
    pitfalls: [
      "bisect.bisect é apelido de bisect_right, não de bisect_left.",
      "bisect_right(a, x) - bisect_left(a, x) conta ocorrências de x em O(log n).",
    ],
    tags: ["busca binária", "upper_bound", "bisect", "contar ocorrências"],
    pair: "cpp/upper_bound",
    link: `${REF}library/bisect.html#bisect.bisect_right`,
  },
  {
    id: "bisect_key",
    title: "bisect com key=",
    signature: "bisect_left(a, alvo, key=func)",
    complexity: "O(log n) chamadas a key",
    example: p`from bisect import bisect_left
pairs = [(1, "a"), (4, "b"), (9, "c")]
i = bisect_left(pairs, 4, key=lambda t: t[0])
print(i, pairs[i])`,
    pitfalls: [
      "O parâmetro key= só entrou no Python 3.10 e não existe na WF (3.9).",
      "Na 3.9, guarde um vetor paralelo só com as chaves ou busque com tupla (alvo,).",
    ],
    tags: ["busca binária", "bisect", "key", "python 3.10"],
    since: "Python 3.10",
    judge: true,
    link: `${REF}library/bisect.html`,
  },
  {
    id: "set",
    title: "set",
    signature: "s = {1, 2};  s.add(x);  s.discard(x);  x in s",
    complexity: [
      ["add / discard / x in s", "O(1) médio, O(n) anti-hash"],
      ["s | t, s & t, s - t", "O(|s| + |t|)"],
    ],
    example: p`s = {5, 1, 3}
s.add(3)
s.discard(9)
print(len(s), 3 in s, sorted(s))`,
    pitfalls: [
      "set em Python é tabela hash sem ordem, diferente do std::set ordenado em árvore do C++.",
      "s.remove(x) lança KeyError se x não existe; prefira s.discard(x).",
      "{} vazio cria dict, não set; para conjunto vazio escreva set().",
    ],
    tags: ["conjunto", "hash", "pertinência", "discard", "sem ordem"],
    pair: "cpp/set",
    link: `${REF}library/stdtypes.html#set-types-set-frozenset`,
  },
  {
    id: "dict_antihash",
    title: "dict e hack anti-hash",
    signature: "R = random.getrandbits(64);  d[x ^ R] = v",
    complexity: [
      ["d[k] / k in d / del d[k]", "O(1) médio, O(n) com colisões"],
      ["iteração", "ordem de inserção (3.7+)"],
    ],
    example: p`import random
R = random.getrandbits(64)
d = {}
for x in (10, 20, 10):
    d[x ^ R] = d.get(x ^ R, 0) + 1
print(d[10 ^ R], (30 ^ R) in d)`,
    pitfalls: [
      "Em Python hash(int) é o próprio inteiro, então testes anti-hash no Codeforces derrubam dict e set de inteiros para O(n²).",
      "Aplicar XOR com uma máscara aleatória R = random.getrandbits(64) nas chaves inteiras neutraliza colisões.",
      "Em Python 3.9 já existe d1 | d2 para unir dicionários em um novo dict.",
    ],
    tags: ["dicionário", "hash", "anti-hash", "tabela hash", "xor", "get"],
    pair: "cpp/unordered_map",
    link: `${REF}library/stdtypes.html#mapping-types-dict`,
  },
];
