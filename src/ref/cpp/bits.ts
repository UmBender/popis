import type { EntryDraft } from "../model";

const c = String.raw;
const REF = "https://en.cppreference.com/w/cpp/";

/** Section 6: bit tricks and the GCC builtins. */
export const BITS: readonly EntryDraft[] = [
  {
    id: "popcount",
    title: "__builtin_popcount",
    signature: "__builtin_popcount(x);  __builtin_popcountll(x);",
    complexity: "O(1)",
    example: c`unsigned x = 0b1011;
long long y = (1LL << 40) - 1;
cout << __builtin_popcount(x) << ' ' << __builtin_popcountll(y) << '\n';`,
    pitfalls: [
      "Com long long use a versão ll, senão os 32 bits de cima somem.",
      "Em C++20 também existe std::popcount, só para tipos sem sinal.",
    ],
    tags: ["contar bits", "bits ligados", "máscara"],
    pair: "py/int_bit_count",
    link: `${REF}numeric/popcount`,
  },
  {
    id: "clz",
    title: "__builtin_clz",
    signature: "__builtin_clz(x);  __builtin_clzll(x);  // zeros à esquerda",
    complexity: "O(1)",
    example: c`cout << __builtin_clz(1) << ' ' << __builtin_clz(8) << ' ';
cout << 63 - __builtin_clzll(1LL << 40) << '\n';`,
    pitfalls: [
      "Com x = 0 o resultado é indefinido.",
      "31 - __builtin_clz(x) é o índice do bit mais alto, igual ao __lg(x).",
    ],
    tags: ["zeros à esquerda", "bit mais alto", "log2", "leading zeros"],
    link: `${REF}numeric/countl_zero`,
  },
  {
    id: "ctz",
    title: "__builtin_ctz",
    signature: "__builtin_ctz(x);  __builtin_ctzll(x);  // zeros à direita",
    complexity: "O(1)",
    example: c`cout << __builtin_ctz(8) << ' ' << __builtin_ctz(12) << ' ';
int x = 12;
cout << (x & -x) << '\n';`,
    pitfalls: [
      "Com x = 0 o resultado é indefinido.",
      "x & -x isola o bit mais baixo, como na árvore de Fenwick.",
    ],
    tags: ["zeros à direita", "bit mais baixo", "trailing zeros", "lowbit"],
    link: `${REF}numeric/countr_zero`,
  },
  {
    id: "lg",
    title: "__lg",
    signature: "__lg(x)  // piso de log2(x)",
    complexity: "O(1)",
    example: c`cout << __lg(1) << ' ' << __lg(8) << ' ' << __lg(1000) << '\n';
cout << __lg(1LL << 50) << '\n';`,
    pitfalls: [
      "__lg(0) é indefinido, então nunca chame com zero.",
      "É o que se usa para o tamanho dos níveis da sparse table.",
    ],
    tags: ["log2", "logaritmo", "sparse table", "bit mais alto"],
    link: `${REF}numeric/bit_width`,
  },
  {
    id: "bit_width",
    title: "bit_width",
    signature: "bit_width(x)  // bits para escrever x",
    complexity: "O(1)",
    example: c`cout << bit_width(1u) << ' ' << bit_width(8u) << ' ' << bit_width(0u) << '\n';
cout << bit_ceil(5u) << ' ' << has_single_bit(64u) << '\n';`,
    pitfalls: [
      "Só aceita tipos sem sinal, então bit_width(5) com int não compila.",
      "bit_width(x) - 1 é o __lg(x) para x > 0.",
    ],
    tags: ["bits", "log2", "potência de 2", "bit_ceil"],
    since: "C++20",
    pair: "py/bit_length",
    link: `${REF}numeric/bit_width`,
  },
  {
    id: "submasks",
    title: "Laço sobre submáscaras",
    signature: "for (int s = m; s; s = (s - 1) & m)",
    complexity: "O(2^popcount(m)), e O(3^n) sobre todas as máscaras",
    example: c`int m = 0b101;
for (int s = m; s; s = (s - 1) & m) cout << s << ' ';
cout << '\n';`,
    pitfalls: [
      "O laço não visita a submáscara vazia, então trate s = 0 à parte.",
      "Percorrer as submáscaras de todas as máscaras custa 3^n, não 4^n.",
    ],
    tags: ["submáscara", "subconjuntos", "dp de bitmask", "máscara"],
    link: `${REF}language/operator_arithmetic`,
  },
  {
    id: "bit_ops",
    title: "Ligar, desligar e testar bits",
    signature: "m | (1 << i);  m & ~(1 << i);  (m >> i) & 1;  m ^ (1 << i);",
    complexity: "O(1)",
    example: c`int m = 0;
m |= 1 << 3;
m ^= 1 << 0;
cout << m << ' ' << ((m >> 3) & 1) << ' ' << (m & ~(1 << 3)) << '\n';`,
    pitfalls: [
      "O == tem precedência maior que o &, então escreva (m & 1) == 0 com parênteses.",
      "Para i >= 31 use 1LL << i.",
    ],
    tags: ["bitmask", "máscara", "ligar bit", "testar bit"],
    link: `${REF}language/operator_arithmetic`,
  },
];
