import type { EntryDraft } from "../model";

const c = String.raw;
const REF = "https://en.cppreference.com/w/cpp/";

/** Section 10: GCC/libstdc++ extensions beyond the C++ standard. */
export const GNU: readonly EntryDraft[] = [
  {
    id: "rope",
    title: "rope (__gnu_cxx)",
    signature: "__gnu_cxx::rope<T> r;  r.insert(i, x);  r.erase(i, len);  r.substr(i, len);",
    complexity: [
      ["insert / erase / substr / r[i]", "O(log n)"],
      ["cópia persistente (auto old = r)", "O(1)"],
    ],
    example: c`#include <ext/rope>
__gnu_cxx::rope<char> r("abcdef");
auto old = r;
r.erase(1, 2);
r.insert(2, "XY");
cout << r.substr(1, 4) << ' ' << old << '\n';`,
    pitfalls: [
      "Costuma ser cerca de 2x mais lenta que uma treap implícita escrita à mão e lida mal com mudar um elemento só por índice.",
      "Para strings também existe __gnu_cxx::crope (atalho para rope<char>), e o segundo argumento de erase e substr é o tamanho.",
    ],
    tags: ["rope", "crope", "persistente", "treap", "bloco", "__gnu_cxx"],
    link: `${REF}string/basic_string`,
  },
  {
    id: "bitset_find_first",
    title: "bitset::_Find_first e _Find_next",
    signature: "for (size_t i = b._Find_first(); i < b.size(); i = b._Find_next(i))",
    complexity: "O(N / 64 + bits ligados)",
    example: c`bitset<16> b("01001010");
for (size_t i = b._Find_first(); i < b.size(); i = b._Find_next(i))
  cout << i << ' ';
cout << '\n';`,
    pitfalls: [
      "Quando não há mais bit ligado, ambos devolvem b.size(), então pare o laço em i < b.size().",
      "São extensões da libstdc++ (GCC), não fazem parte do padrão ISO C++.",
    ],
    tags: ["find first", "_find_first", "_find_next", "bitset", "bits ligados", "iterar bitset"],
    link: `${REF}utility/bitset`,
  },
  {
    id: "builtin_parity_ffs",
    title: "__builtin_parity e __builtin_ffs",
    signature:
      "__builtin_parity(x);  __builtin_parityll(x);  __builtin_ffs(x);  __builtin_ffsll(x);",
    complexity: "O(1)",
    example: c`cout << __builtin_parity(0b1011) << ' ' << __builtin_parityll(3LL << 40) << '\n';
cout << __builtin_ffs(0) << ' ' << __builtin_ffs(12) << ' ';
cout << __builtin_ffsll(1LL << 40) << '\n';`,
    pitfalls: [
      "__builtin_ffs é indexado em 1 e devolve 0 para x = 0, ao contrário de __builtin_ctz que é indefinido em zero.",
      "Com long long use sempre o sufixo ll, senão apenas os 32 bits baixos são inspecionados.",
    ],
    tags: ["paridade", "parity", "ffs", "primeiro bit", "builtin", "ll"],
    link: `${REF}numeric/countr_zero`,
  },
  {
    id: "builtin_expect",
    title: "__builtin_expect e [[likely]]",
    signature: "if (__builtin_expect(cond, 1)) { ... }  // ou [[likely]] / [[unlikely]]",
    complexity: "O(1), dica para o layout de desvios do compilador",
    example: c`int x = 5, s = 0;
for (int i = 0; i < 10; i++) {
  if (__builtin_expect(i != x, 1)) s += i;
}
if (s > 0) [[likely]] cout << s << '\n';`,
    pitfalls: [
      "No C++20 prefira [[likely]] e [[unlikely]], que são padrão e mais legíveis que __builtin_expect.",
      "Errar a previsão piora o desempenho, então só marque casos realmente raros em laços quentes.",
    ],
    tags: ["branch prediction", "likely", "unlikely", "otimização", "builtin"],
    since: "C++20",
    link: `${REF}language/attributes/likely`,
  },
  {
    id: "print_int128",
    title: "Imprimir __int128 (com negativos e 0)",
    signature: "string to_str(__int128 x)  // trata 0 e sinal",
    complexity: "O(dígitos), no máximo 39 dígitos",
    example: c`auto to_str = [](__int128 x) {
  if (x == 0) return string("0");
  string s; bool neg = x < 0; if (neg) x = -x;
  while (x > 0) s += char('0' + x % 10), x /= 10;
  if (neg) { s += '-'; } reverse(s.begin(), s.end()); return s; };
cout << to_str(-(__int128)1e18 * 1000) << ' ' << to_str(0) << '\n';`,
    pitfalls: [
      "Negar o menor valor de __int128 (-2^127) causa overflow, então converta para unsigned __int128 se puder atingir o limite.",
      "Trate x == 0 à parte para não imprimir uma string vazia.",
    ],
    tags: ["__int128", "imprimir", "int128", "negativo", "128 bits"],
    link: `${REF}language/types`,
  },
  {
    id: "pragma_target",
    title: "#pragma GCC target (AVX2 e popcnt)",
    signature: c`#pragma GCC target("avx2,popcnt")`,
    complexity: "habilita instruções SIMD e popcnt em hardware",
    example: c`#pragma GCC target("avx2,popcnt")
vector<int> a(1000, 3), b(1000, 4);
long long dot = 0;
for (int i = 0; i < 1000; i++) dot += a[i] * b[i];
cout << dot << '\n';`,
    pitfalls: [
      "Se o processador do juiz não suportar AVX2 o programa morre com SIGILL (Illegal Instruction), e alguns juízes bloqueiam pragmas de alvo.",
      "Coloque antes de todos os includes para que a STL e o bitset também usem popcnt em hardware.",
    ],
    tags: ["pragma", "avx2", "popcnt", "simd", "vetorização", "target"],
    link: `${REF}preprocessor/impl`,
  },
  {
    id: "builtin_overflow",
    title: "__builtin_mul_overflow e add_overflow",
    signature: "bool estoura = __builtin_mul_overflow(a, b, &res);",
    complexity: "O(1)",
    example: c`long long res = 0, ok = 0;
bool ov1 = __builtin_mul_overflow(10000000000LL, 10000000000LL, &res);
bool ov2 = __builtin_add_overflow(LLONG_MAX, 1LL, &res);
bool ov3 = __builtin_mul_overflow(123456LL, 789LL, &ok);
cout << ov1 << ' ' << ov2 << ' ' << ov3 << ' ' << ok << '\n';`,
    pitfalls: [
      "Devolve true quando o resultado exato não cabe no tipo de res, evitando comportamento indefinido de overflow com sinal.",
      "Útil em busca binária, potências e mmc quando não se quer recorrer a __int128.",
    ],
    tags: ["overflow", "checked", "multiplicação segura", "builtin", "estouro"],
    link: `${REF}language/operator_arithmetic`,
  },
];
