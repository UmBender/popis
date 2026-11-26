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
  {
    id: "partition_point",
    title: "partition_point",
    signature: "partition_point(v.begin(), v.end(), pred)  // primeiro onde pred é falso",
    complexity: "O(log n)",
    example: c`vector<int> v = {2, 4, 6, 9, 11};
auto it = partition_point(v.begin(), v.end(), [](int x) { return x % 2 == 0; });
cout << (it - v.begin()) << ' ' << *it << '\n';`,
    pitfalls: [
      "O intervalo precisa ter todos os true antes de todos os false, senão o resultado não faz sentido.",
      "Com iteradores não aleatórios (como set) custa O(n) avanços mesmo fazendo O(log n) chamadas ao predicado.",
    ],
    tags: ["partition_point", "busca binária", "predicado", "monótono", "c++11"],
    since: "C++11",
    link: `${REF}algorithm/partition_point`,
  },
  {
    id: "equal_range",
    title: "equal_range",
    signature: "auto [l, r] = equal_range(v.begin(), v.end(), x);",
    complexity: "O(log n)",
    example: c`vector<int> v = {1, 3, 3, 3, 5};
auto [l, r] = equal_range(v.begin(), v.end(), 3);
cout << (l - v.begin()) << ' ' << (r - v.begin()) << ' ' << (r - l) << '\n';`,
    pitfalls: [
      "Devolve o par {lower_bound, upper_bound}, e r - l é o número de ocorrências de x num vetor ordenado.",
      "Em set e multiset, use o membro s.equal_range(x) para manter O(log n).",
    ],
    tags: ["equal_range", "busca binária", "faixa", "contar ocorrências"],
    link: `${REF}algorithm/equal_range`,
  },
  {
    id: "includes",
    title: "includes",
    signature: "includes(a.begin(), a.end(), b.begin(), b.end())",
    complexity: "O(|a| + |b|)",
    example: c`vector<int> a = {1, 2, 3, 4, 5}, b = {2, 4}, c = {2, 6};
cout << includes(a.begin(), a.end(), b.begin(), b.end()) << ' ';
cout << includes(a.begin(), a.end(), c.begin(), c.end()) << '\n';`,
    pitfalls: [
      "Os dois intervalos precisam estar ordenados pelo mesmo comparador.",
      "Considera multiplicidade, então {2, 2} só está contido se a também tiver pelo menos dois 2.",
    ],
    tags: ["includes", "subconjunto", "subsequência ordenada", "ordenado"],
    link: `${REF}algorithm/includes`,
  },
  {
    id: "rotate",
    title: "rotate",
    signature: "rotate(first, middle, last);  // middle vira o novo primeiro",
    complexity: "O(n) in-place",
    example: c`vector<int> v = {1, 2, 3, 4, 5};
rotate(v.begin(), v.begin() + 2, v.end());
for (int x : v) cout << x;
cout << '\n';`,
    pitfalls: [
      "Desloca à esquerda por k com rotate(v.begin(), v.begin() + k, v.end()) e à direita com v.end() - k.",
      "Também move um elemento de posição sem vetor auxiliar rodando apenas o subintervalo entre origem e destino.",
    ],
    tags: ["rotate", "rotação cíclica", "shift", "deslocar vetor"],
    link: `${REF}algorithm/rotate`,
  },
  {
    id: "merge",
    title: "merge",
    signature: "merge(a.begin(), a.end(), b.begin(), b.end(), out.begin());",
    complexity: "O(|a| + |b|)",
    example: c`vector<int> a = {1, 4, 7}, b = {2, 4, 6}, out(6);
merge(a.begin(), a.end(), b.begin(), b.end(), out.begin());
for (int x : out) cout << x << ' ';
cout << '\n';`,
    pitfalls: [
      "O destino não pode sobrepor os vetores de entrada e precisa já ter espaço (ou use back_inserter).",
      "É estável: em empates, elementos do primeiro intervalo saem antes dos do segundo.",
    ],
    tags: ["merge", "intercalar", "merge sort tree", "ordenado"],
    link: `${REF}algorithm/merge`,
  },
  {
    id: "inplace_merge",
    title: "inplace_merge",
    signature: "inplace_merge(first, middle, last);",
    complexity: "O(n) com buffer extra, ou O(n log n) sem memória",
    example: c`vector<int> v = {1, 5, 8, 2, 3, 7};
inplace_merge(v.begin(), v.begin() + 3, v.end());
for (int x : v) cout << x << ' ';
cout << '\n';`,
    pitfalls: [
      "Exige que [first, middle) e [middle, last) já estejam ambos ordenados.",
      "Encurta bastante implementações de dividir e conquistar como CDQ e contagem de inversões.",
    ],
    tags: ["inplace_merge", "intercalar", "cdq", "dividir e conquistar"],
    link: `${REF}algorithm/inplace_merge`,
  },
  {
    id: "set_operations",
    title: "set_union, set_intersection e set_difference",
    signature: "set_intersection(a.begin(), a.end(), b.begin(), b.end(), back_inserter(out));",
    complexity: "O(|a| + |b|)",
    example: c`vector<int> a = {1, 2, 3, 4}, b = {3, 4, 5}, u, inter, diff;
set_union(a.begin(), a.end(), b.begin(), b.end(), back_inserter(u));
set_intersection(a.begin(), a.end(), b.begin(), b.end(), back_inserter(inter));
set_difference(a.begin(), a.end(), b.begin(), b.end(), back_inserter(diff));
cout << u.size() << ' ' << inter.size() << ' ' << diff.size() << '\n';`,
    pitfalls: [
      "Os intervalos de entrada precisam estar ordenados, e o destino não pode coincidir com nenhum deles.",
      "Também existe set_symmetric_difference para os elementos que aparecem em apenas um dos intervalos.",
    ],
    tags: ["set_union", "set_intersection", "set_difference", "união", "interseção", "diferença"],
    link: `${REF}algorithm/set_intersection`,
  },
  {
    id: "adjacent_difference",
    title: "adjacent_difference",
    signature: "adjacent_difference(v.begin(), v.end(), d.begin());",
    complexity: "O(n)",
    example: c`vector<int> v = {3, 5, 9, 10}, d(4);
adjacent_difference(v.begin(), v.end(), d.begin());
for (int x : d) cout << x << ' ';
cout << '\n';`,
    pitfalls: [
      "d[0] recebe v[0] sem alteração, e os demais recebem v[i] - v[i - 1], sendo a inversa exata de partial_sum.",
      "Funciona in-place com d.begin() == v.begin().",
    ],
    tags: ["adjacent_difference", "diferenças", "vetor de diferenças", "numeric"],
    link: `${REF}algorithm/adjacent_difference`,
  },
  {
    id: "inclusive_exclusive_scan",
    title: "inclusive_scan e exclusive_scan",
    signature: "inclusive_scan(v.begin(), v.end(), out.begin());  exclusive_scan(..., init);",
    complexity: "O(n)",
    example: c`vector<int> v = {2, 3, 5}, inc(3), exc(3);
inclusive_scan(v.begin(), v.end(), inc.begin());
exclusive_scan(v.begin(), v.end(), exc.begin(), 0);
cout << inc[0] << ' ' << inc[1] << ' ' << inc[2] << " | " << exc[0] << ' ' << exc[1] << ' ' << exc[2] << '\n';`,
    pitfalls: [
      "Em exclusive_scan o elemento i soma tudo antes de i (com exc[0] = init), e o tipo da soma segue o de init (use 0LL para evitar overflow).",
      "Em inclusive_scan com operação binária, o valor inicial é o quinto argumento, depois do operador.",
    ],
    tags: ["inclusive_scan", "exclusive_scan", "soma de prefixos", "numeric", "c++17"],
    since: "C++17",
    link: `${REF}algorithm/exclusive_scan`,
  },
  {
    id: "is_sorted",
    title: "is_sorted e is_sorted_until",
    signature: "is_sorted(v.begin(), v.end());  is_sorted_until(v.begin(), v.end());",
    complexity: "O(n)",
    example: c`vector<int> v = {1, 3, 3, 2, 5};
auto it = is_sorted_until(v.begin(), v.end());
cout << is_sorted(v.begin(), v.end()) << ' ' << (it - v.begin()) << '\n';`,
    pitfalls: [
      "Empates contam como ordenados; para estritamente crescente passe less_equal<>() ou compare com adjacent_find.",
      "is_sorted_until devolve o primeiro iterador que quebra a ordem crescente (ou end() se tudo estiver ordenado).",
    ],
    tags: ["is_sorted", "is_sorted_until", "ordenado", "verificar ordem", "c++11"],
    since: "C++11",
    link: `${REF}algorithm/is_sorted`,
  },
  {
    id: "minmax_element",
    title: "minmax_element",
    signature: "auto [mn, mx] = minmax_element(v.begin(), v.end());",
    complexity: "O(n), no máximo 3n/2 comparações",
    example: c`vector<int> v = {4, 1, 9, 1, 9};
auto [mn, mx] = minmax_element(v.begin(), v.end());
cout << *mn << '@' << (mn - v.begin()) << ' ' << *mx << '@' << (mx - v.begin()) << '\n';`,
    pitfalls: [
      "Em empates, devolve o primeiro mínimo e o último máximo, diferente de max_element que devolve o primeiro máximo.",
      "Se o intervalo estiver vazio, ambos os iteradores valem end().",
    ],
    tags: ["minmax_element", "mínimo e máximo", "extremos", "c++11"],
    since: "C++11",
    link: `${REF}algorithm/minmax_element`,
  },
  {
    id: "prev_permutation",
    title: "prev_permutation",
    signature: "do { ... } while (prev_permutation(v.begin(), v.end()));",
    complexity: "O(n) por chamada, n! no total",
    example: c`string s = "cab";
sort(s.rbegin(), s.rend());
do cout << s << ' ';
while (prev_permutation(s.begin(), s.end()));
cout << '\n';`,
    pitfalls: [
      "Para percorrer todas as permutações, comece com o vetor em ordem decrescente (sort com rbegin/rend).",
      "Quando já está na menor permutação lexicográfica, devolve false e reverte o vetor para a maior.",
    ],
    tags: ["prev_permutation", "permutação", "anterior", "decrescente"],
    link: `${REF}algorithm/prev_permutation`,
  },
  {
    id: "stable_partition",
    title: "stable_partition",
    signature: "auto mid = stable_partition(v.begin(), v.end(), pred);",
    complexity: "O(n) com memória extra, ou O(n log n) sem memória",
    example: c`vector<int> v = {3, 2, 5, 4, 1, 6};
auto mid = stable_partition(v.begin(), v.end(), [](int x) { return x % 2 == 0; });
for (int x : v) cout << x;
cout << ' ' << (mid - v.begin()) << '\n';`,
    pitfalls: [
      "Coloca quem satisfaz pred na frente mantendo a ordem relativa dentro dos dois grupos, e devolve o início do segundo grupo.",
      "Se a ordem relativa não importar, partition é mais rápida e sempre O(n) sem alocar.",
    ],
    tags: ["stable_partition", "partition", "separar", "filtrar", "estável"],
    link: `${REF}algorithm/stable_partition`,
  },
  {
    id: "all_any_none_of",
    title: "all_of, any_of e none_of",
    signature: "all_of(v.begin(), v.end(), pred);  any_of(...);  none_of(...);",
    complexity: "O(n) com curto-circuito",
    example: c`vector<int> v = {2, 4, 6};
auto even = [](int x) { return x % 2 == 0; };
cout << all_of(v.begin(), v.end(), even) << ' ';
cout << any_of(v.begin(), v.end(), [](int x) { return x > 5; }) << ' ';
cout << none_of(v.begin(), v.end(), [](int x) { return x < 0; }) << '\n';`,
    pitfalls: [
      "Em intervalo vazio, all_of e none_of devolvem true, enquanto any_of devolve false.",
      "Param assim que o resultado fica decidido, sem avaliar o restante do vetor.",
    ],
    tags: ["all_of", "any_of", "none_of", "todos", "algum", "nenhum", "c++11"],
    since: "C++11",
    link: `${REF}algorithm/all_any_none_of`,
  },
  {
    id: "transform",
    title: "transform",
    signature: "transform(a.begin(), a.end(), out.begin(), f);  // ou versão binária",
    complexity: "O(n)",
    example: c`vector<int> a = {1, 2, 3}, b = {10, 20, 30}, c(3);
transform(a.begin(), a.end(), b.begin(), c.begin(), plus<>());
for (int x : c) cout << x << ' ';
cout << '\n';`,
    pitfalls: [
      "O vetor de saída já precisa ter tamanho suficiente (ou use back_inserter), mas pode coincidir com o de entrada para alterar in-place.",
      "Não garante ordem da esquerda para a direita, então não use funções com efeito colateral dependente da ordem.",
    ],
    tags: ["transform", "map", "aplicar função", "elemento a elemento"],
    link: `${REF}algorithm/transform`,
  },
  {
    id: "ranges_projection",
    title: "ranges:: com projeção",
    signature: "ranges::sort(v, {}, &P::x);  ranges::lower_bound(v, key, {}, &P::x);",
    complexity: "mesma do algoritmo base (O(n log n) para sort, O(log n) para lower_bound)",
    example: c`struct P { int x, y; };
vector<P> v = {{3, 1}, {1, 9}, {2, 5}};
ranges::sort(v, {}, &P::x);
auto it = ranges::lower_bound(v, 2, {}, &P::x);
cout << v[0].x << v[1].x << v[2].x << ' ' << it->y << '\n';`,
    pitfalls: [
      "O {} no comparador mantém ranges::less, e o ponteiro para membro &P::x (ou uma lambda) escolhe a chave sem escrever comparador manual.",
      "Funciona em praticamente todo algoritmo de std::ranges (sort, min_element, lower_bound, unique).",
    ],
    tags: ["ranges", "projeção", "projection", "sort", "lower_bound", "c++20"],
    since: "C++20",
    link: `${REF}algorithm/ranges/sort`,
  },
];
