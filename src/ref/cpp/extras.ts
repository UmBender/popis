import type { EntryDraft } from "../model";

const c = String.raw;
const REF = "https://en.cppreference.com/w/cpp/";

/** Section 11: debugging aids, pragmas and the newer standard library. */
export const EXTRAS: readonly EntryDraft[] = [
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
  {
    id: "dbg_macro",
    title: "Macro dbg com #x e cerr",
    signature: c`#define dbg(x) cerr << #x << " = " << (x) << '\n'`,
    example: c`#define dbg(x) cerr << #x << " = " << (x) << '\n'
int ans = 42;
dbg(ans);
cout << ans << '\n';`,
    pitfalls: [
      "O cerr não conta na saída padrão julgada pelo juiz, mas imprimir demais nele ainda gasta tempo e pode dar TLE.",
      "Envolva com #ifdef LOCAL para zerar o custo na submissão compilando localmente com -DLOCAL.",
    ],
    tags: ["dbg", "debug", "cerr", "macro", "depuração", "local"],
    link: `${REF}io/cerr`,
  },
  {
    id: "fsanitize",
    title: "-fsanitize=address,undefined",
    signature: "g++ -std=gnu++20 -O2 -g -fsanitize=address,undefined sol.cpp",
    example: c`vector<int> v = {10, 20, 30};
int ok = 0;
for (int i = 0; i < (int)v.size(); i++) ok += v[i];
cout << ok << '\n';`,
    pitfalls: [
      "Pega acesso fora dos limites, use-after-free, overflow com sinal e shift inválido, mas deixa o binário mais lento e usa mais memória.",
      "Acrescente -fno-sanitize-recover=all para abortar logo no primeiro erro de comportamento indefinido.",
    ],
    tags: ["fsanitize", "asan", "ubsan", "sanitizer", "debug", "depuração", "ub"],
    link: `${REF}language/ub`,
  },
  {
    id: "pretty_function",
    title: "__PRETTY_FUNCTION__",
    signature: "cout << __PRETTY_FUNCTION__ << '\\n';",
    example: c`auto tipo = []<class T>(T) { cout << __PRETTY_FUNCTION__ << '\n'; };
tipo(42);
tipo(3.14);`,
    pitfalls: [
      "Mostra a assinatura completa da função com os tipos deduzidos de templates e lambdas genéricas no GCC e Clang.",
      "Útil para descobrir o tipo real de um auto ou de um iterador durante a depuração.",
    ],
    tags: ["__pretty_function__", "tipo", "dedução", "auto", "debug", "depuração"],
    since: "C++20",
    link: `${REF}language/function`,
  },
  {
    id: "views_zip",
    title: "views::zip",
    signature: "for (auto [x, y] : views::zip(a, b))",
    example: c`vector<int> a = {1, 2}, b = {10, 20};
for (auto [x, y] : views::zip(a, b)) cout << x + y << ' ';
cout << '\n';`,
    pitfalls: [
      "Não existe na WF (C++20), então percorra os dois vetores por índice.",
      "Para no tamanho do menor intervalo quando os vetores têm tamanhos diferentes.",
    ],
    tags: ["zip", "views", "ranges", "c++23", "iterar dois vetores"],
    since: "C++23",
    judge: true,
    link: `${REF}ranges/zip_view`,
  },
];
