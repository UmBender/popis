import type { EntryDraft } from "../model";

const c = String.raw;
const REF = "https://en.cppreference.com/w/cpp/";

/** Section 2: integer and real types and their limits. */
export const TYPES: readonly EntryDraft[] = [
  {
    id: "int",
    title: "int",
    signature: "int x;  // 32 bits: -2^31 .. 2^31 - 1",
    example: c`int a = 50000, b = 50000;
long long ok = 1LL * a * b;
cout << INT_MAX << ' ' << ok << '\n';`,
    pitfalls: [
      "a * b com dois int estoura antes de virar long long, então multiplique por 1LL primeiro.",
      "O limite é cerca de 2,1 · 10^9.",
    ],
    tags: ["inteiro", "overflow", "32 bits"],
    link: `${REF}language/types`,
  },
  {
    id: "long_long",
    title: "long long",
    signature: "long long x;  // 64 bits: até cerca de 9,2 · 10^18",
    example: c`long long x = 1'000'000'000'000LL;
cout << x * 9 << '\n';
cout << sizeof(long long) << '\n';`,
    pitfalls: [
      "Literais grandes precisam do sufixo LL quando a conta é feita só com literais.",
      "Somar 10^5 valores de até 10^9 já passa do limite do int.",
    ],
    tags: ["64 bits", "ll", "inteiro grande"],
    link: `${REF}language/types`,
  },
  {
    id: "int128",
    title: "__int128",
    signature: "__int128 x;  // 128 bits, sem cin/cout",
    example: c`__int128 x = (__int128)1e18 * 1000;
string s;
while (x > 0) s += char('0' + x % 10), x /= 10;
reverse(s.begin(), s.end());
cout << s << '\n';`,
    pitfalls: [
      "O cin e o cout não aceitam __int128, então leia e imprima como string.",
      "É extensão do GCC e não existe no MSVC.",
    ],
    tags: ["128 bits", "inteiro grande", "int128", "overflow"],
    link: `${REF}language/types`,
  },
  {
    id: "unsigned",
    title: "unsigned e size_t",
    signature: "unsigned x;  size_t n = v.size();",
    example: c`vector<int> v;
cout << v.size() - 1 << '\n';
cout << (int)v.size() - 1 << '\n';
unsigned u = 0;
cout << u - 1 << '\n';`,
    pitfalls: [
      "v.size() - 1 com o vetor vazio vira um número enorme, então converta para int antes.",
      "Comparar int com size_t gera aviso e erro sutil quando o int é negativo.",
    ],
    tags: ["sem sinal", "size_t", "underflow"],
    link: `${REF}language/types`,
  },
  {
    id: "long_double",
    title: "double contra long double",
    signature: "long double x;  // 80 bits no x86",
    example: c`double d = 1e16 + 1;
long double l = 1e16L + 1;
cout << fixed << setprecision(0) << d << ' ' << l << '\n';
cout << sizeof(double) << ' ' << sizeof(long double) << '\n';`,
    pitfalls: [
      "O double guarda cerca de 15 dígitos, e o long double cerca de 18.",
      "Compare reais com uma tolerância, como fabs(a - b) < 1e-9, nunca com ==.",
    ],
    tags: ["ponto flutuante", "precisão", "real", "float"],
    link: `${REF}language/types`,
  },
  {
    id: "llong_max",
    title: "LLONG_MAX e INT_MAX",
    signature: "INT_MAX, INT_MIN, LLONG_MAX, LLONG_MIN",
    example: c`cout << INT_MAX << '\n' << LLONG_MAX << '\n';
const long long INF = 4e18;
cout << (INF < LLONG_MAX) << '\n';`,
    pitfalls: [
      "INF + INF estoura, então use um INF que aguente uma soma, como 1e18.",
      "Para começar um máximo use LLONG_MIN ou -INF, nunca 0.",
    ],
    tags: ["infinito", "inf", "limite", "máximo", "climits"],
    link: `${REF}types/climits`,
  },
  {
    id: "shift_1ll",
    title: "1LL << k",
    signature: "1LL << k  // 2^k para k até 62",
    example: c`int k = 40;
long long a = 1LL << k;
cout << a << '\n';
cout << (1 << 30) << '\n';`,
    pitfalls: [
      "1 << 40 é int e estoura, então escreva 1LL << 40.",
      "Deslocar por 64 ou mais é comportamento indefinido.",
    ],
    tags: ["potência de 2", "shift", "deslocamento", "bit"],
    link: `${REF}language/operator_arithmetic`,
  },
  {
    id: "numeric_limits",
    title: "numeric_limits",
    signature: "numeric_limits<T>::max(), min(), lowest(), epsilon()",
    example: c`cout << numeric_limits<int>::max() << '\n';
cout << numeric_limits<long long>::min() << '\n';
cout << numeric_limits<double>::lowest() << '\n';`,
    pitfalls: [
      "Para double, min() é o menor positivo, e o mais negativo é lowest().",
      "Funciona dentro de templates, onde INT_MAX não serve para qualquer tipo.",
    ],
    tags: ["limites", "max", "min", "epsilon"],
    link: `${REF}types/numeric_limits`,
  },
];
