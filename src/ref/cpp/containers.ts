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
    pair: "py/list",
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
    pair: "py/flat_list_2d",
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
    pair: "py/deque",
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
    pair: "py/stack_list",
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
    pair: "py/queue_deque",
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
    pair: "py/heapq_max_tuples",
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
    pair: "py/heapq_min",
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
    pair: "py/set",
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
    pair: "py/dict_antihash",
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
  {
    id: "node_extract_merge",
    title: "extract e merge (node handles)",
    signature: "a.merge(b);  auto nh = m.extract(k);  nh.key() = k2;  m.insert(move(nh));",
    complexity: "O(log n) por nó, sem copiar nem realocar",
    example: c`set<int> a = {1, 3}, b = {2, 3, 4};
a.merge(b);
map<int, string> m = {{1, "um"}};
auto nh = m.extract(1); nh.key() = 10; m.insert(move(nh));
cout << a.size() << ' ' << b.size() << ' ' << m[10] << '\n';`,
    pitfalls: [
      "a.merge(b) transfere apenas chaves que ainda não existem em a, deixando as duplicadas em b.",
      "Em small-to-large, sempre garanta a.size() >= b.size() com swap(a, b) antes de a.merge(b) para manter O(n log² n) total.",
    ],
    tags: ["extract", "merge", "node handle", "small to large", "set", "map", "c++17"],
    since: "C++17",
    link: `${REF}container/set/merge`,
  },
  {
    id: "contains_erase_if",
    title: "contains e erase_if (C++20)",
    signature: "s.contains(x);  erase_if(c, pred);  erase(v, val);",
    complexity: "O(log n) ou O(1) em contains; O(n) em erase_if",
    example: c`set<int> s = {1, 2, 3};
vector<int> v = {1, 2, 3, 4, 5};
erase_if(v, [](int x) { return x % 2 == 0; });
cout << s.contains(2) << ' ' << v.size() << '\n';`,
    pitfalls: [
      "s.contains(x) existe em set, multiset, map e unordered_* no C++20 e evita o custo extra de multiset::count.",
      "erase_if substitui o idioma v.erase(remove_if(...), v.end()) e funciona direto em map e set sem invalidar iteradores.",
    ],
    tags: ["contains", "erase_if", "erase", "remove_if", "c++20"],
    since: "C++20",
    link: `${REF}container/vector/erase2`,
  },
  {
    id: "try_emplace",
    title: "try_emplace e insert_or_assign",
    signature: "auto [it, ok] = m.try_emplace(k, args...);",
    complexity: "O(log n) em map, O(1) médio em unordered_map",
    example: c`map<int, string> m;
auto [it1, ok1] = m.try_emplace(1, 3, 'a');
auto [it2, ok2] = m.try_emplace(1, 3, 'b');
cout << ok1 << ' ' << ok2 << ' ' << it1->second << ' ' << it2->second << '\n';`,
    pitfalls: [
      "Se a chave já existe, try_emplace não constrói nem move o valor, diferente de emplace que pode alocar antes de checar.",
      "Para sobrescrever quando a chave já existe sem exigir construtor padrão no valor, use insert_or_assign.",
    ],
    tags: ["try_emplace", "insert_or_assign", "map", "unordered_map", "c++17"],
    since: "C++17",
    link: `${REF}container/map/try_emplace`,
  },
  {
    id: "unordered_reserve",
    title: "unordered_map::reserve e max_load_factor",
    signature: "m.max_load_factor(0.25f);  m.reserve(n);",
    complexity: "O(n) no reserve, reduz colisões nas consultas seguintes",
    example: c`unordered_map<int, int> m;
m.max_load_factor(0.25f);
m.reserve(1 << 10);
m[7] = 42;
cout << m[7] << ' ' << (m.bucket_count() >= (1u << 10)) << '\n';`,
    pitfalls: [
      "Defina max_load_factor(0.25f) antes de reserve(n) para criar mais buckets e diminuir drasticamente as colisões.",
      "Mesmo com reserve, ainda é obrigatório usar hash próprio contra testes anti-hash.",
    ],
    tags: ["reserve", "max_load_factor", "unordered_map", "buckets", "rehash", "desempenho"],
    link: `${REF}container/unordered_map/reserve`,
  },
  {
    id: "multiset_erase_one",
    title: "Apagar uma cópia só no multiset",
    signature: "if (auto it = m.find(x); it != m.end()) m.erase(it);",
    complexity: "O(log n)",
    example: c`multiset<int> m = {2, 2, 5};
if (auto it = m.find(2); it != m.end()) m.erase(it);
if (auto it = m.find(9); it != m.end()) m.erase(it);
cout << m.count(2) << ' ' << m.size() << '\n';`,
    pitfalls: [
      "m.erase(m.find(x)) sem checar it != m.end() passa end() para erase e gera comportamento indefinido.",
      "m.erase(x) passando o valor apaga todas as ocorrências de x de uma vez.",
    ],
    tags: ["multiset", "erase", "uma cópia", "find", "remover um"],
    link: `${REF}container/multiset/erase`,
  },
  {
    id: "list_splice",
    title: "list::splice",
    signature: "a.splice(pos, b);  a.splice(pos, b, it);  a.splice(pos, b, first, last);",
    complexity:
      "O(1) para lista inteira ou um elemento; O(k) para subintervalo entre listas diferentes",
    example: c`list<int> a = {1, 4}, b = {2, 3};
a.splice(next(a.begin()), b);
for (int x : a) cout << x;
cout << ' ' << b.size() << '\n';`,
    pitfalls: [
      "Move os nós apenas religando ponteiros, sem copiar elementos nem invalidar iteradores para os nós movidos.",
      "Em C++11+, splice de um subintervalo entre listas diferentes custa O(distância) para manter size() em O(1).",
    ],
    tags: ["list", "splice", "lista ligada", "mover nós", "o(1)"],
    link: `${REF}container/list/splice`,
  },
  {
    id: "complex_point",
    title: "complex<double> como ponto 2D",
    signature: "using pt = complex<double>;  // abs, arg, polar, conj(a) * b",
    complexity: "O(1) por operação geométrica",
    example: c`using pt = complex<double>;
pt a(3, 4), b(1, 0);
pt r = b * polar(1.0, numbers::pi / 2);
double cross = imag(conj(a) * pt(4, 3));
cout << fixed << setprecision(1) << abs(a) << ' ' << imag(r) << ' ' << cross << '\n';`,
    pitfalls: [
      "real(conj(a) * b) é o produto escalar e imag(conj(a) * b) é o produto vetorial 2D.",
      "complex<long long> é comportamento indefinido no padrão ISO, então use apenas double ou long double.",
    ],
    tags: ["complex", "geometria", "ponto 2d", "polar", "conj", "produto vetorial", "rotação"],
    since: "C++20",
    link: `${REF}numeric/complex`,
  },
  {
    id: "exchange",
    title: "exchange",
    signature: "auto antigo = exchange(obj, novo);",
    complexity: "O(1)",
    example: c`int x = 10;
int old = exchange(x, 25);
int a = 1, b = 1;
for (int i = 0; i < 4; i++) a = exchange(b, a + b);
cout << old << ' ' << x << ' ' << a << ' ' << b << '\n';`,
    pitfalls: [
      "Atribui o novo valor e devolve o antigo numa única expressão, muito útil para atualizar estados de DP sem variável temporária.",
      "Em a = exchange(b, a + b), o novo valor de b é calculado antes de a ser atualizado.",
    ],
    tags: ["exchange", "trocar", "valor antigo", "utility", "c++14"],
    since: "C++14",
    link: `${REF}utility/exchange`,
  },
  {
    id: "tie_tuple_cmp",
    title: "tie e comparação lexicográfica de tuple",
    signature: "tie(a.x, a.y) < tie(b.x, b.y);  tie(u, ignore, v) = tup;",
    complexity: "O(número de campos), sem copiar",
    example: c`struct P { int x, y; };
P a{1, 5}, b{1, 3};
bool lt = tie(a.x, a.y) < tie(b.x, b.y);
int u, v;
tie(u, ignore, v) = make_tuple(7, 8, 9);
cout << lt << ' ' << u << ' ' << v << '\n';`,
    pitfalls: [
      "tie guarda referências lvalue, então não aceita temporários como a.x + 1 (nesse caso use make_tuple ou tuple{...}).",
      "Escrever operator< com tie(...) evita erros de ordem estrita em comparadores com vários critérios.",
    ],
    tags: ["tie", "tuple", "lexicográfica", "comparador", "ignore", "operator<"],
    since: "C++11",
    link: `${REF}utility/tuple/tie`,
  },
  {
    id: "ssize",
    title: "ssize",
    signature: "ssize(v)  // tamanho com sinal (ptrdiff_t)",
    complexity: "O(1)",
    example: c`vector<int> v;
cout << ssize(v) - 1 << ' ';
string s = "abc";
for (int i = 0; i < ssize(s) - 1; i++) cout << s[i];
cout << '\n';`,
    pitfalls: [
      "Evita o bug clássico de v.size() - 1 virar 2^64 - 1 quando o contêiner está vazio.",
      "Funciona também para arrays C de tamanho fixo.",
    ],
    tags: ["ssize", "tamanho com sinal", "size_t", "underflow", "c++20"],
    since: "C++20",
    link: `${REF}iterator/size`,
  },
  {
    id: "ctad",
    title: "CTAD (dedução de template de classe)",
    signature: "pair p{1, 2.5};  vector v{1, 2, 3};  priority_queue pq{less<>{}, v};",
    example: c`pair p{1, 2.5};
vector v{10, 20, 30};
priority_queue pq{less<>{}, v};
cout << p.first << ' ' << v.size() << ' ' << pq.top() << '\n';`,
    pitfalls: [
      "vector a{vector{1, 2}} chama o construtor de cópia e deduz vector<int>, não vector<vector<int>>.",
      "Funciona para pair, tuple, vector, array e priority_queue, mas não deduz parcialmente só um argumento de template.",
    ],
    tags: ["ctad", "dedução", "template", "pair", "vector", "c++17"],
    since: "C++17",
    link: `${REF}language/class_template_argument_deduction`,
  },
  {
    id: "span",
    title: "span",
    signature: "span<const int> a;  a.subspan(pos, len);",
    complexity: "O(1) para criar e para subspan",
    example: c`auto sum = [](span<const int> a) { return accumulate(a.begin(), a.end(), 0); };
vector<int> v = {1, 2, 3, 4, 5};
int arr[] = {10, 20};
cout << sum(span(v).subspan(1, 3)) << ' ' << sum(arr) << '\n';`,
    pitfalls: [
      "Não é dona da memória, então um push_back no vector original que realoque invalida a span.",
      "Aceita vector, array e vetor C na mesma função sem copiar nem criar template.",
    ],
    tags: ["span", "fatia", "subvetor", "sem cópia", "c++20"],
    since: "C++20",
    link: `${REF}container/span`,
  },
];
