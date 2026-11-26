import type { EntryDraft } from "../model";

const c = String.raw;
const REF = "https://en.cppreference.com/w/cpp/";

/** Section 9: GCC extensions, debugging aids and the newer standard library. */
export const EXTRAS: readonly EntryDraft[] = [
  {
    id: "ordered_set",
    title: "ordered_set (pb_ds)",
    signature: "tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>",
    complexity: [
      ["insert / erase / find", "O(log n)"],
      ["find_by_order(k)", "O(log n)"],
      ["order_of_key(x)", "O(log n)"],
    ],
    example: c`#include <ext/pb_ds/assoc_container.hpp>
using namespace __gnu_pbds;
tree<int, null_type, less<int>, rb_tree_tag, tree_order_statistics_node_update> s;
for (int x : {5, 1, 9}) s.insert(x);
cout << *s.find_by_order(1) << ' ' << s.order_of_key(9) << '\n';`,
    pitfalls: [
      "Com less<T> ele não guarda repetidos, então para um multiconjunto use pares (valor, índice).",
      "Só existe no GCC, que é o compilador da maratona.",
    ],
    tags: ["ordered set", "pb_ds", "k-ésimo", "order statistics"],
    link: `${REF}container/set`,
  },
  {
    id: "gp_hash_table",
    title: "gp_hash_table (pb_ds)",
    signature: "gp_hash_table<K, V> m;",
    complexity: "O(1) médio, em geral mais rápido que o unordered_map",
    example: c`#include <ext/pb_ds/assoc_container.hpp>
using namespace __gnu_pbds;
gp_hash_table<int, int> m;
m[3] = 7;
cout << m[3] << ' ' << (m.find(4) == m.end()) << '\n';`,
    pitfalls: [
      "Também sofre com testes contra o hash padrão, então passe um hash próprio como no unordered_map.",
    ],
    tags: ["hash", "tabela hash", "pb_ds", "dicionário"],
    link: `${REF}container/unordered_map`,
  },
  {
    id: "pragma_optimize",
    title: "#pragma GCC optimize",
    signature: c`#pragma GCC optimize("O3,unroll-loops")`,
    example: c`#pragma GCC optimize("O3,unroll-loops")
long long s = 0;
for (int i = 1; i <= 1000; i++) s += i;
cout << s << '\n';`,
    pitfalls: [
      "Coloque antes de todos os includes, senão não vale para a biblioteca.",
      c`Um #pragma GCC target("avx2") dá erro de execução se a máquina do juiz não tiver a instrução.`,
    ],
    tags: ["otimizar", "o3", "avx2", "pragma", "velocidade"],
    link: `${REF}preprocessor/impl`,
  },
  {
    id: "assert",
    title: "assert",
    signature: "assert(condição);",
    example: c`#include <cassert>
int n = 5;
assert(n > 0 && "n precisa ser positivo");
cout << "passou\n";`,
    pitfalls: [
      "O bits/stdc++.h do g++ 16 já não traz o <cassert>, então inclua à mão para não depender da versão.",
      "No juiz um assert falho vira erro de execução (RTE), o que ajuda a separar WA de bug.",
      "Com -DNDEBUG os asserts somem, então não coloque efeito colateral dentro.",
    ],
    tags: ["verificar", "debug", "rte", "invariante"],
    link: `${REF}error/assert`,
  },
  {
    id: "glibcxx_debug",
    title: "-D_GLIBCXX_DEBUG",
    signature: "g++ -D_GLIBCXX_DEBUG sol.cpp  // ou #define antes dos includes",
    example: c`#define _GLIBCXX_DEBUG
vector<int> v(3);
cout << v.size() << '\n';`,
    pitfalls: [
      "Com ele, v[i] fora do tamanho para o programa com uma mensagem em vez de seguir com lixo.",
      "Deixa o programa muito mais lento, então use só para testar e nunca na submissão.",
    ],
    tags: ["debug", "depuração", "fora do limite", "sanitizer"],
    link: `${REF}container/vector/operator_at`,
  },
  {
    id: "regex",
    title: "<regex> (lento)",
    signature: "regex r(padrão);  regex_match(s, m, r);  regex_search(s, m, r);",
    complexity: "lento, e pode ser exponencial",
    example: c`regex r("[a-z]+([0-9]+)");
smatch m;
string s = "abc123";
if (regex_match(s, m, r)) cout << m[1] << '\n';`,
    pitfalls: [
      "O <regex> do GCC é lento e pode estourar a pilha com strings longas, então evite em entradas grandes.",
      c`Escape a barra no literal ("\\d") ou use uma raw string R"(\d+)".`,
    ],
    tags: ["expressão regular", "padrão", "regex_match"],
    since: "C++11",
    link: `${REF}regex`,
  },
  {
    id: "lambda_rec",
    title: "Lambda recursiva",
    signature: "auto dfs = [&](auto&& self, int u) -> void { ... self(self, v); };",
    example: c`vector<vector<int>> g = {{1, 2}, {}, {3}, {}};
int cnt = 0;
auto dfs = [&](auto&& self, int u) -> void { cnt++; for (int v : g[u]) self(self, v); };
dfs(dfs, 0);
cout << cnt << '\n';`,
    pitfalls: [
      "Uma function<void(int)> também funciona, mas é mais lenta.",
      "Recursão muito funda (10^6 níveis) pode estourar a pilha do juiz.",
    ],
    tags: ["dfs", "recursão", "lambda", "function"],
    since: "C++14",
    pair: "py/iterative_dfs_stack",
    link: `${REF}language/lambda`,
  },
  {
    id: "views_iota",
    title: "views::iota e views::filter",
    signature: "for (int i : views::iota(0, n))",
    example: c`for (int i : views::iota(0, 3)) cout << i;
cout << ' ';
for (int x : views::iota(1, 6) | views::filter([](int x) { return x % 2; })) cout << x;
cout << '\n';`,
    pitfalls: ["O fim é exclusivo, como num for com i < n."],
    tags: ["intervalo", "range", "for", "c++20"],
    since: "C++20",
    link: `${REF}ranges/iota_view`,
  },
  {
    id: "views_enumerate",
    title: "views::enumerate",
    signature: "for (auto [i, x] : views::enumerate(v))",
    example: c`vector<char> v = {'a', 'b'};
for (auto [i, ch] : views::enumerate(v)) cout << i << ch << ' ';
cout << '\n';`,
    pitfalls: ["Não existe na WF (C++20), então percorra com um índice."],
    tags: ["índice", "enumerate", "c++23"],
    since: "C++23",
    judge: true,
    pair: "py/zip_enumerate",
    link: `${REF}ranges/enumerate_view`,
  },
];
