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
  {
    id: "std_popcount",
    title: "popcount (C++20)",
    signature: "popcount(x)  // <bit>, só tipos sem sinal",
    complexity: "O(1)",
    example: c`uint32_t a = 0b1011;
uint64_t b = (1ULL << 40) - 1;
cout << popcount(a) << ' ' << popcount(b) << '\n';`,
    pitfalls: [
      "Só aceita inteiros sem sinal (unsigned, uint64_t), então popcount(5) com int não compila.",
      "Adapta automaticamente para 32 ou 64 bits pelo tipo do argumento, evitando o erro de esquecer o sufixo ll.",
    ],
    tags: ["popcount", "std::popcount", "contar bits", "c++20", "bit"],
    since: "C++20",
    link: `${REF}numeric/popcount`,
  },
  {
    id: "countl_zero",
    title: "countl_zero e countl_one",
    signature: "countl_zero(x);  countl_one(x);  // zeros/uns à esquerda",
    complexity: "O(1)",
    example: c`cout << countl_zero(0u) << ' ' << countl_zero(1u) << ' ';
cout << countl_zero(1ULL << 40) << ' ' << countl_one(~0u) << '\n';`,
    pitfalls: [
      "Ao contrário de __builtin_clz, countl_zero(0u) é bem definido e devolve a largura em bits do tipo.",
      "Exige argumento sem sinal, então converta um int com unsigned(x) ou uint64_t(x).",
    ],
    tags: ["countl_zero", "countl_one", "clz", "zeros à esquerda", "c++20", "bit"],
    since: "C++20",
    link: `${REF}numeric/countl_zero`,
  },
  {
    id: "countr_zero",
    title: "countr_zero e countr_one",
    signature: "countr_zero(x);  countr_one(x);  // zeros/uns à direita",
    complexity: "O(1)",
    example: c`cout << countr_zero(0u) << ' ' << countr_zero(12u) << ' ';
cout << countr_zero(1ULL << 40) << ' ' << countr_one(0b111u) << '\n';`,
    pitfalls: [
      "Ao contrário de __builtin_ctz, countr_zero(0u) é bem definido e devolve a largura do tipo.",
      "Exige tipo sem sinal, então passe 12u ou uint64_t(x).",
    ],
    tags: ["countr_zero", "countr_one", "ctz", "zeros à direita", "c++20", "bit"],
    since: "C++20",
    link: `${REF}numeric/countr_zero`,
  },
  {
    id: "bit_ceil_floor",
    title: "bit_ceil e bit_floor",
    signature: "bit_ceil(x);  bit_floor(x);  // potência de 2 >= x ou <= x",
    complexity: "O(1)",
    example: c`cout << bit_ceil(5u) << ' ' << bit_ceil(8u) << ' ' << bit_ceil(0u) << '\n';
cout << bit_floor(5u) << ' ' << bit_floor(8u) << ' ' << bit_floor(0u) << '\n';`,
    pitfalls: [
      "bit_ceil(x) é comportamento indefinido se a potência de 2 seguinte não couber no tipo (por exemplo, > 2^31 em unsigned).",
      "bit_floor(0u) devolve 0, enquanto bit_ceil(0u) devolve 1.",
    ],
    tags: ["bit_ceil", "bit_floor", "potência de 2", "segtree", "c++20", "bit"],
    since: "C++20",
    link: `${REF}numeric/bit_ceil`,
  },
  {
    id: "has_single_bit",
    title: "has_single_bit",
    signature: "has_single_bit(x)  // true se x é potência de 2",
    complexity: "O(1)",
    example: c`for (unsigned x : {0u, 1u, 6u, 8u, 16u}) cout << has_single_bit(x);
cout << '\n';`,
    pitfalls: [
      "Devolve false para 0u, evitando o bug clássico de testar (x & (x - 1)) == 0 sem checar x > 0.",
      "Só aceita tipos inteiros sem sinal.",
    ],
    tags: ["has_single_bit", "potência de 2", "um bit", "c++20", "bit"],
    since: "C++20",
    link: `${REF}numeric/has_single_bit`,
  },
  {
    id: "rotl_rotr",
    title: "rotl e rotr",
    signature: "rotl(x, k);  rotr(x, k);  // rotação circular de bits",
    complexity: "O(1)",
    example: c`uint8_t x = 0b10110001;
cout << bitset<8>(rotl(x, 2)) << ' ' << bitset<8>(rotr(x, 2)) << '\n';`,
    pitfalls: [
      "A largura da rotação é a largura do tipo de x, então use uint32_t ou uint64_t para controlar quantos bits giram.",
      "Aceita deslocamento k negativo ou maior que a largura do tipo sem comportamento indefinido.",
    ],
    tags: ["rotl", "rotr", "rotação de bits", "circular", "c++20", "bit"],
    since: "C++20",
    link: `${REF}numeric/rotl`,
  },
];
