import type { EntryDraft } from "../model";

const c = String.raw;
const REF = "https://en.cppreference.com/w/cpp/";

/** Section 4: the algorithms of <algorithm> and <numeric> used in contests. */
export const ALGORITHMS: readonly EntryDraft[] = [
  {
    id: "sort",
    title: "sort",
    signature: "sort(v.begin(), v.end());  sort(v.begin(), v.end(), greater<>());",
    complexity: "O(n log n)",
    example: c`vector<int> v = {3, 1, 2};
sort(v.begin(), v.end());
cout << v[0] << v[1] << v[2] << ' ';
sort(v.begin(), v.end(), greater<>());
cout << v[0] << v[1] << v[2] << '\n';`,
    pitfalls: [
      "O comparador tem de ser estrito (<, nunca <=), senão o sort pode travar ou sair da memória.",
      "O sort não é estável, então itens iguais podem trocar de ordem.",
    ],
    tags: ["ordenar", "ordenação", "greater", "decrescente"],
    pair: "py/sort_sorted",
    link: `${REF}algorithm/sort`,
  },
  {
    id: "sort_lambda",
    title: "sort com lambda",
    signature: "sort(v.begin(), v.end(), [](const T& a, const T& b) { return ...; });",
    complexity: "O(n log n)",
    example: c`vector<pair<int, int>> v = {{1, 5}, {2, 3}, {3, 5}};
sort(v.begin(), v.end(), [](auto& a, auto& b) {
  return a.second != b.second ? a.second > b.second : a.first < b.first;
});
cout << v[0].first << v[1].first << v[2].first << '\n';`,
    pitfalls: [
      "Receba os parâmetros por referência (auto& ou const T&) para não copiar a cada comparação.",
      "Para vários critérios, tie(a.x, a.y) < tie(b.x, b.y) evita erros de desempate.",
    ],
    tags: ["comparador", "lambda", "ordenar", "critério"],
    pair: "py/sort_key",
    link: `${REF}algorithm/sort`,
  },
  {
    id: "stable_sort",
    title: "stable_sort",
    signature: "stable_sort(v.begin(), v.end(), cmp);",
    complexity: "O(n log n), com memória extra O(n)",
    example: c`vector<pair<int, char>> v = {{2, 'a'}, {1, 'b'}, {2, 'c'}, {1, 'd'}};
stable_sort(v.begin(), v.end(), [](auto& a, auto& b) { return a.first < b.first; });
for (auto& p : v) cout << p.second;
cout << '\n';`,
    pitfalls: [
      "Use quando a ordem original dos empates importa, como ao ordenar por um segundo critério depois.",
    ],
    tags: ["ordenação estável", "estável", "ordenar"],
    pair: "py/timsort_stability",
    link: `${REF}algorithm/stable_sort`,
  },
  {
    id: "lower_bound",
    title: "lower_bound",
    signature: "lower_bound(v.begin(), v.end(), x)  // primeiro >= x",
    complexity: "O(log n)",
    example: c`vector<int> v = {1, 3, 3, 5, 8};
auto it = lower_bound(v.begin(), v.end(), 3);
cout << it - v.begin() << '\n';
cout << lower_bound(v.begin(), v.end(), 6) - v.begin() << '\n';
cout << (lower_bound(v.begin(), v.end(), 9) == v.end()) << '\n';`,
    pitfalls: [
      "O vetor tem de estar ordenado pelo mesmo critério da busca.",
      "Quando nenhum elemento é >= x ele devolve end(), e desreferenciar end() é indefinido.",
    ],
    tags: ["busca binária", "lb", "primeiro maior ou igual", "binary search"],
    pair: "py/bisect_left",
    link: `${REF}algorithm/lower_bound`,
  },
  {
    id: "upper_bound",
    title: "upper_bound",
    signature: "upper_bound(v.begin(), v.end(), x)  // primeiro > x",
    complexity: "O(log n)",
    example: c`vector<int> v = {1, 3, 3, 5, 8};
cout << upper_bound(v.begin(), v.end(), 3) - v.begin() << '\n';
auto n3 = upper_bound(v.begin(), v.end(), 3) - lower_bound(v.begin(), v.end(), 3);
cout << n3 << '\n';`,
    pitfalls: [
      "O último elemento <= x é prev(upper_bound(...)), que só existe se o resultado não for begin().",
      "upper_bound menos lower_bound conta as cópias de x em O(log n).",
    ],
    tags: ["busca binária", "ub", "primeiro maior", "contar ocorrências"],
    pair: "py/bisect_right",
    link: `${REF}algorithm/upper_bound`,
  },
  {
    id: "set_lower_bound",
    title: "set::lower_bound (membro)",
    signature: "s.lower_bound(x);  s.upper_bound(x);",
    complexity: "O(log n)",
    example: c`set<int> s = {1, 4, 9};
auto it = s.lower_bound(5);
cout << *it << ' ' << *prev(it) << '\n';
cout << (s.upper_bound(9) == s.end()) << '\n';`,
    pitfalls: [
      "lower_bound(s.begin(), s.end(), x) num set compila mas custa O(n), então use s.lower_bound(x).",
      "O mesmo vale para map e multiset.",
    ],
    tags: ["busca binária", "set", "map", "membro"],
    link: `${REF}container/set/lower_bound`,
  },
  {
    id: "binary_search",
    title: "binary_search",
    signature: "binary_search(v.begin(), v.end(), x)  // bool",
    complexity: "O(log n)",
    example: c`vector<int> v = {2, 4, 6};
cout << binary_search(v.begin(), v.end(), 4);
cout << binary_search(v.begin(), v.end(), 5) << '\n';`,
    pitfalls: ["Só diz se existe, então para a posição use lower_bound."],
    tags: ["busca binária", "existe", "procurar"],
    link: `${REF}algorithm/binary_search`,
  },
  {
    id: "unique_erase",
    title: "unique + erase",
    signature: "v.erase(unique(v.begin(), v.end()), v.end());",
    complexity: "O(n), depois do sort em O(n log n)",
    example: c`vector<int> v = {3, 1, 3, 2, 1};
sort(v.begin(), v.end());
v.erase(unique(v.begin(), v.end()), v.end());
cout << v.size() << ": " << v[0] << v[1] << v[2] << '\n';`,
    pitfalls: [
      "O unique só remove repetidos vizinhos, então ordene antes.",
      "Sem o erase o tamanho não muda, e o fim do vetor fica com lixo.",
    ],
    tags: ["remover duplicatas", "compressão de coordenadas", "distintos"],
    pair: "py/groupby",
    link: `${REF}algorithm/unique`,
  },
  {
    id: "next_permutation",
    title: "next_permutation",
    signature: "do { ... } while (next_permutation(v.begin(), v.end()));",
    complexity: "O(n) por chamada, n! no total",
    example: c`string s = "aba";
sort(s.begin(), s.end());
do cout << s << ' ';
while (next_permutation(s.begin(), s.end()));
cout << '\n';`,
    pitfalls: [
      "Comece do vetor ordenado, senão as permutações anteriores são puladas.",
      "Com repetidos, cada permutação distinta aparece uma vez só.",
    ],
    tags: ["permutação", "força bruta", "todas as ordens"],
    pair: "py/permutations",
    link: `${REF}algorithm/next_permutation`,
  },
  {
    id: "reverse",
    title: "reverse",
    signature: "reverse(v.begin(), v.end());",
    complexity: "O(n)",
    example: c`string s = "abc";
reverse(s.begin(), s.end());
vector<int> v = {1, 2, 3, 4};
reverse(v.begin() + 1, v.end());
cout << s << ' ' << v[1] << v[2] << v[3] << '\n';`,
    pitfalls: ["Para uma cópia invertida sem mudar a original use string(s.rbegin(), s.rend())."],
    tags: ["inverter", "palíndromo", "rbegin"],
    pair: "py/sort_reverse",
    link: `${REF}algorithm/reverse`,
  },
  {
    id: "accumulate",
    title: "accumulate",
    signature: "accumulate(v.begin(), v.end(), 0LL)",
    complexity: "O(n)",
    example: c`vector<int> v = {1000000000, 1000000000, 1000000000};
cout << accumulate(v.begin(), v.end(), 0LL) << '\n';
vector<int> w = {2, 3, 4};
cout << accumulate(w.begin(), w.end(), 1, multiplies<>()) << '\n';`,
    pitfalls: [
      "O tipo da soma é o do valor inicial, então com 0 em vez de 0LL a soma estoura.",
      "Para double use 0.0, senão a soma é truncada a cada passo.",
    ],
    tags: ["soma", "somatório", "reduce", "0LL"],
    pair: "py/reduce",
    link: `${REF}algorithm/accumulate`,
  },
  {
    id: "partial_sum",
    title: "partial_sum (prefixos)",
    signature: "partial_sum(v.begin(), v.end(), p.begin());",
    complexity: "O(n)",
    example: c`vector<long long> v = {3, 1, 4, 1, 5}, p(5);
partial_sum(v.begin(), v.end(), p.begin());
int l = 1, r = 3;
cout << p[4] << ' ' << p[r] - (l ? p[l - 1] : 0) << '\n';`,
    pitfalls: [
      "O tipo acumulado é o do vetor de saída, então use long long nele.",
      "Um prefixo com p[0] = 0 e tamanho n + 1 evita o caso especial de l = 0.",
    ],
    tags: ["soma de prefixos", "prefix sum", "acumulado", "intervalo"],
    pair: "py/accumulate",
    link: `${REF}algorithm/partial_sum`,
  },
  {
    id: "iota",
    title: "iota",
    signature: "iota(v.begin(), v.end(), 0);",
    complexity: "O(n)",
    example: c`vector<int> id(5);
iota(id.begin(), id.end(), 0);
vector<int> a = {30, 10, 20, 50, 40};
sort(id.begin(), id.end(), [&](int i, int j) { return a[i] < a[j]; });
cout << id[0] << id[1] << id[2] << id[3] << id[4] << '\n';`,
    pitfalls: [
      "Ordenar índices por a[i] guarda a posição original de cada valor.",
      "É a forma curta de iniciar o pai de cada nó numa DSU.",
    ],
    tags: ["sequência", "0 1 2", "índices", "dsu"],
    link: `${REF}algorithm/iota`,
  },
  {
    id: "min_max_element",
    title: "min_element e max_element",
    signature: "*min_element(v.begin(), v.end());  max_element(...) - v.begin();",
    complexity: "O(n)",
    example: c`vector<int> v = {4, 9, 2, 9};
auto it = max_element(v.begin(), v.end());
cout << *it << ' ' << it - v.begin() << ' ';
cout << *min_element(v.begin(), v.end()) << '\n';`,
    pitfalls: [
      "Devolvem iteradores, então use * para o valor e - v.begin() para o índice.",
      "Com empate, o max_element devolve o primeiro máximo.",
    ],
    tags: ["mínimo", "máximo", "argmax", "argmin"],
    pair: "py/any_all_min_max",
    link: `${REF}algorithm/max_element`,
  },
  {
    id: "nth_element",
    title: "nth_element",
    signature: "nth_element(v.begin(), v.begin() + k, v.end());",
    complexity: "O(n) em média",
    example: c`vector<int> v = {7, 1, 5, 3, 9};
nth_element(v.begin(), v.begin() + 2, v.end());
cout << v[2] << '\n';`,
    pitfalls: ["Só a posição k fica certa, e o resto fica apenas dividido em menores e maiores."],
    tags: ["mediana", "k-ésimo", "seleção", "quickselect"],
    link: `${REF}algorithm/nth_element`,
  },
  {
    id: "count",
    title: "count e count_if",
    signature: "count(v.begin(), v.end(), x);  count_if(v.begin(), v.end(), pred);",
    complexity: "O(n)",
    example: c`vector<int> v = {1, 2, 2, 3, 2};
cout << count(v.begin(), v.end(), 2) << ' ';
cout << count_if(v.begin(), v.end(), [](int x) { return x % 2; }) << '\n';`,
    pitfalls: ["Custa O(n) a cada chamada, então dentro de um laço vira O(n²)."],
    tags: ["contar", "ocorrências", "frequência"],
    pair: "py/str_count",
    link: `${REF}algorithm/count`,
  },
  {
    id: "fill",
    title: "fill",
    signature: "fill(v.begin(), v.end(), x);",
    complexity: "O(n)",
    example: c`vector<long long> d(4);
fill(d.begin(), d.end(), LLONG_MAX);
int a[3][3];
for (auto& row : a) fill(begin(row), end(row), -5);
cout << (d[3] == LLONG_MAX) << ' ' << a[2][2] << '\n';`,
    pitfalls: ["Para preencher com qualquer valor use fill, porque o memset só serve para 0 e -1."],
    tags: ["preencher", "inicializar", "infinito"],
    pair: "py/preallocate_list",
    link: `${REF}algorithm/fill`,
  },
  {
    id: "memset",
    title: "memset (só 0 e -1)",
    signature: "memset(a, 0, sizeof a);  memset(a, -1, sizeof a);",
    complexity: "O(bytes)",
    example: c`int a[4], b[4];
memset(a, -1, sizeof a);
memset(b, 0x3f, sizeof b);
cout << a[0] << ' ' << b[0] << '\n';`,
    pitfalls: [
      "O memset escreve byte a byte, então memset(a, 1, sizeof a) dá 16843009 e não 1.",
      "O 0x3f dá cerca de 10^9 e é um infinito comum, porque 2 · 0x3f3f3f3f ainda cabe em int.",
    ],
    tags: ["zerar", "preencher", "bytes", "0x3f"],
    link: `${REF}string/byte/memset`,
  },
  {
    id: "ranges_sort",
    title: "ranges::sort",
    signature: "ranges::sort(v);  ranges::max(v);",
    complexity: "O(n log n)",
    example: c`vector<int> v = {3, 1, 2};
ranges::sort(v);
cout << v[0] << v[1] << v[2] << ' ' << ranges::max(v) << '\n';`,
    pitfalls: ["Existe na WF (C++20) e evita repetir v.begin(), v.end() a cada chamada."],
    tags: ["ranges", "ordenar", "c++20"],
    since: "C++20",
    link: `${REF}algorithm/ranges/sort`,
  },
  {
    id: "fold_left",
    title: "ranges::fold_left",
    signature: "ranges::fold_left(v, 0LL, plus<>())",
    complexity: "O(n)",
    example: c`vector<int> v = {1, 2, 3};
cout << ranges::fold_left(v, 0LL, plus<>()) << '\n';`,
    pitfalls: ["Não existe na WF (C++20), então use accumulate."],
    tags: ["soma", "reduce", "c++23", "ranges"],
    since: "C++23",
    judge: true,
    link: `${REF}algorithm/ranges/fold_left`,
  },
];
