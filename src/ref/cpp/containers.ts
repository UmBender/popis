import type { EntryDraft } from "../model";

const c = String.raw;
const REF = "https://en.cppreference.com/w/cpp/";

/** Section 3: the standard containers, each with a table of costs. */
export const CONTAINERS: readonly EntryDraft[] = [
  {
    id: "vector",
    title: "vector",
    signature: "vector<T> v(n, valor);  v.push_back(x);  v.reserve(n);  v.assign(n, x);",
    complexity: [
      ["push_back / pop_back", "O(1) amortizado"],
      ["v[i]", "O(1)"],
      ["insert / erase no meio", "O(n)"],
      ["reserve(n) / assign(n, x)", "O(n)"],
    ],
    example: c`vector<int> v;
v.reserve(3);
for (int i = 0; i < 3; i++) v.push_back(i * i);
v.assign(2, 7);
cout << v.size() << ' ' << v[0] << ' ' << v[1] << '\n';`,
    pitfalls: [
      "v[i] fora do tamanho não dá erro, então use v.at(i) ou -D_GLIBCXX_DEBUG para pegar.",
      "O reserve muda só a capacidade, e o tamanho continua 0.",
    ],
    tags: ["vetor", "array dinâmico", "push_back", "reserve", "assign"],
    link: `${REF}container/vector`,
  },
  {
    id: "vector_2d",
    title: "vector 2D",
    signature: "vector<vector<int>> g(n, vector<int>(m, 0));",
    complexity: "O(n · m) para criar",
    example: c`int n = 2, m = 3;
vector<vector<int>> g(n, vector<int>(m, 0));
g[1][2] = 5;
cout << g.size() << ' ' << g[0].size() << ' ' << g[1][2] << '\n';`,
    pitfalls: [
      "Criar a matriz dentro do laço de casos de teste custa O(n · m) a cada caso.",
      "Para grafos use vector<vector<int>> adj(n) e push_back em cada lista.",
    ],
    tags: ["matriz", "grid", "2d", "lista de adjacência", "grafo"],
    link: `${REF}container/vector`,
  },
  {
    id: "array",
    title: "array",
    signature: "array<int, N> a{};",
    complexity: [
      ["a[i]", "O(1)"],
      ["fill(x)", "O(N)"],
      ["==, < (lexicográfico)", "O(N)"],
    ],
    example: c`array<int, 3> a{};
a[1] = 4;
array<int, 3> b = {0, 4, 0};
cout << a.size() << ' ' << (a == b) << '\n';`,
    pitfalls: [
      "Sem o {} os valores de um array local começam com lixo.",
      "O tamanho precisa ser constante de compilação.",
    ],
    tags: ["array fixo", "estático", "chave de map"],
    since: "C++11",
    link: `${REF}container/array`,
  },
  {
    id: "deque",
    title: "deque",
    signature: "deque<T> d;  d.push_front(x);  d.push_back(x);",
    complexity: [
      ["push / pop nas duas pontas", "O(1)"],
      ["d[i]", "O(1)"],
      ["insert no meio", "O(n)"],
    ],
    example: c`deque<int> d = {2, 3};
d.push_front(1);
d.push_back(4);
d.pop_front();
cout << d.front() << ' ' << d.back() << ' ' << d[1] << '\n';`,
    pitfalls: [
      "Gasta bem mais memória que o vector, e milhares de deques pequenos estouram o limite.",
      "É a base da BFS 0-1, com peso 0 na frente e peso 1 no fim.",
    ],
    tags: ["fila dupla", "bfs 0-1", "duas pontas"],
    link: `${REF}container/deque`,
  },
  {
    id: "stack",
    title: "stack",
    signature: "stack<T> s;  s.push(x);  s.top();  s.pop();",
    complexity: [
      ["push / pop / top", "O(1)"],
      ["size / empty", "O(1)"],
    ],
    example: c`stack<int> s;
for (int x : {1, 2, 3}) s.push(x);
cout << s.top() << '\n';
s.pop();
cout << s.top() << ' ' << s.size() << '\n';`,
    pitfalls: [
      "O pop() não devolve o valor, então leia o top() antes.",
      "Chamar top() numa pilha vazia é comportamento indefinido.",
    ],
    tags: ["pilha", "lifo"],
    link: `${REF}container/stack`,
  },
  {
    id: "queue",
    title: "queue",
    signature: "queue<T> q;  q.push(x);  q.front();  q.pop();",
    complexity: [
      ["push / pop / front / back", "O(1)"],
      ["size / empty", "O(1)"],
    ],
    example: c`queue<int> q;
q.push(1);
q.push(2);
cout << q.front() << ' ' << q.back() << '\n';
q.pop();
cout << q.front() << '\n';`,
    pitfalls: [
      "O pop() não devolve o valor, então leia o front() antes.",
      "Não existe clear(), então esvazie com q = {}.",
    ],
    tags: ["fila", "fifo", "bfs"],
    link: `${REF}container/queue`,
  },
  {
    id: "priority_queue",
    title: "priority_queue",
    signature: "priority_queue<T> pq;  // o maior fica no topo",
    complexity: [
      ["push / pop", "O(log n)"],
      ["top", "O(1)"],
      ["construir de um vetor", "O(n)"],
    ],
    example: c`priority_queue<int> pq;
for (int x : {3, 1, 4, 1, 5}) pq.push(x);
cout << pq.top() << '\n';
pq.pop();
cout << pq.top() << ' ' << pq.size() << '\n';`,
    pitfalls: [
      "É de máximo por padrão, ao contrário do heap da maioria dos livros.",
      "Não dá para mudar a prioridade de um item, então no Dijkstra empurre de novo e ignore os velhos.",
    ],
    tags: ["heap", "fila de prioridade", "máximo", "dijkstra"],
    link: `${REF}container/priority_queue`,
  },
  {
    id: "priority_queue_min",
    title: "priority_queue de mínimo",
    signature: "priority_queue<T, vector<T>, greater<T>> pq;",
    complexity: "O(log n) por push e pop",
    example: c`priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;
pq.push({5, 1});
pq.push({2, 7});
auto [d, u] = pq.top();
cout << d << ' ' << u << '\n';`,
    pitfalls: [
      "O greater<> sem o tipo também funciona e evita repetir o pair.",
      "Guardar -x num heap de máximo também funciona, mas -INT_MIN estoura.",
    ],
    tags: ["heap de mínimo", "min heap", "greater", "dijkstra"],
    link: `${REF}container/priority_queue`,
  },
  {
    id: "set",
    title: "set e multiset",
    signature: "set<T> s;  s.insert(x);  s.count(x);  s.erase(x);",
    complexity: [
      ["insert / erase / find / count", "O(log n)"],
      ["*begin() / *rbegin() (mínimo, máximo)", "O(1)"],
      ["percorrer em ordem", "O(n)"],
    ],
    example: c`set<int> s = {5, 1, 3};
s.insert(3);
multiset<int> m = {2, 2, 7};
m.erase(m.find(2));
cout << s.size() << ' ' << *s.begin() << ' ' << m.count(2) << '\n';`,
    pitfalls: [
      "m.erase(x) num multiset apaga todas as cópias, então use m.erase(m.find(x)) para apagar uma.",
      "No multiset, count(x) custa O(log n + k) e fica lento com muitas cópias.",
    ],
    tags: ["conjunto", "ordenado", "multiset", "árvore"],
    link: `${REF}container/set`,
  },
  {
    id: "map",
    title: "map",
    signature: "map<K, V> m;  m[k];  m.count(k);  m.find(k);",
    complexity: [
      ["m[k] / insert / erase / find", "O(log n)"],
      ["percorrer em ordem de chave", "O(n)"],
    ],
    example: c`map<string, int> m;
m["b"] += 2;
m["a"]++;
for (auto& [k, v] : m) cout << k << '=' << v << ' ';
cout << m.count("z") << ' ' << m.size() << '\n';`,
    pitfalls: [
      "m[k] cria a chave com valor 0 quando ela não existe, então consulte com count ou find.",
      "As chaves ficam em ordem crescente, e rbegin() aponta a maior.",
    ],
    tags: ["dicionário", "chave valor", "árvore", "ordenado"],
    link: `${REF}container/map`,
  },
  {
    id: "unordered_map",
    title: "unordered_map",
    signature: "unordered_map<K, V, Hash> m;  m.reserve(n);",
    complexity: [
      ["m[k] / find / erase", "O(1) médio, O(n) no pior caso"],
      ["reserve(n)", "O(n)"],
    ],
    example: c`struct H { size_t operator()(uint64_t x) const {
  x += 0x9e3779b97f4a7c15; x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9;
  x = (x ^ (x >> 27)) * 0x94d049bb133111eb; return x ^ (x >> 31); } };
unordered_map<long long, int, H> m;
m[5] = 1;
cout << m.count(5) << ' ' << m.count(6) << '\n';`,
    pitfalls: [
      "Testes anti-hash do Codeforces derrubam o hash padrão para O(n) por operação, então use um hash como o splitmix64.",
      "Some um valor do relógio ao x dentro do hash para que o teste não preveja as colisões.",
      "Com chaves pequenas e densas, um vector é mais rápido.",
    ],
    tags: ["hash", "anti-hash", "tabela hash", "splitmix64", "dicionário"],
    link: `${REF}container/unordered_map`,
  },
  {
    id: "bitset",
    title: "bitset",
    signature: "bitset<N> b;  b.set(i);  b.count();  b << k;",
    complexity: [
      ["b[i] / set / reset", "O(1)"],
      ["count, &, |, ^, <<", "O(N / 64)"],
    ],
    example: c`bitset<8> b("00010110");
b.set(0);
cout << b << ' ' << b.count() << '\n';
cout << (b << 2) << ' ' << b.to_ulong() << '\n';`,
    pitfalls: [
      "O N tem de ser constante de compilação, então declare com o máximo do problema.",
      "Divide por 64 o tempo de DPs de soma de subconjunto e de alcançabilidade.",
    ],
    tags: ["bits", "máscara", "subset sum", "dp"],
    link: `${REF}utility/bitset`,
  },
  {
    id: "pair_tuple",
    title: "pair e tuple",
    signature: "pair<A, B> p = {a, b};  tuple<A, B, C> t;  get<i>(t);",
    complexity: "comparação campo a campo",
    example: c`pair<int, string> p = {2, "b"};
vector<pair<int, int>> v = {{2, 1}, {1, 5}, {1, 3}};
sort(v.begin(), v.end());
tuple<int, char, double> t = {1, 'x', 2.5};
cout << p.first << v[0].second << get<1>(t) << '\n';`,
    pitfalls: [
      "Ordenar pares ordena pelo first e desempata pelo second.",
      "Prefira {a, b} ao make_pair, que deduz o tipo e pode criar um pair<int, int> sem querer.",
    ],
    tags: ["par", "tupla", "get", "ordenar pares"],
    link: `${REF}utility/pair`,
  },
  {
    id: "structured_bindings",
    title: "Structured bindings",
    signature: "auto [a, b] = par;  for (auto& [k, v] : m)",
    example: c`map<int, int> m = {{1, 10}, {2, 20}};
for (auto& [k, v] : m) v += k;
auto [mn, mx] = minmax({3, 9, 4});
cout << m[2] << ' ' << mn << ' ' << mx << '\n';`,
    pitfalls: [
      "Sem o & a variável é uma cópia, e alterar v não muda o map.",
      "Os nomes não podem ser capturados por uma lambda antes do C++20.",
    ],
    tags: ["auto", "desempacotar", "binding", "c++17"],
    since: "C++17",
    link: `${REF}language/structured_binding`,
  },
];
