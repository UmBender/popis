import type { EntryDraft } from "../model";

const c = String.raw;
const REF = "https://en.cppreference.com/w/cpp/";

/** Section 7: number theory and real-number helpers. */
export const MATH: readonly EntryDraft[] = [
  {
    id: "gcd",
    title: "gcd",
    signature: "gcd(a, b)",
    complexity: "O(log min(a, b))",
    example: c`cout << gcd(12, 18) << ' ' << gcd(0, 7) << ' ';
cout << gcd(-4LL, 6LL) << '\n';`,
    pitfalls: [
      "O __gcd antigo pode devolver negativo com argumentos negativos, e o gcd não.",
      "gcd(0, 0) é 0.",
    ],
    tags: ["mdc", "máximo divisor comum", "euclides"],
    since: "C++17",
    link: `${REF}numeric/gcd`,
  },
  {
    id: "lcm",
    title: "lcm",
    signature: "lcm(a, b)",
    complexity: "O(log min(a, b))",
    example: c`cout << lcm(4, 6) << ' ';
long long a = 1e9, b = 1e9 + 7;
cout << a / gcd(a, b) * b << '\n';`,
    pitfalls: [
      "Divida antes de multiplicar (a / gcd * b) e use long long, senão estoura cedo.",
      "O mmc de muitos números cresce rápido e passa de 10^18 sem avisar.",
    ],
    tags: ["mmc", "mínimo múltiplo comum"],
    since: "C++17",
    link: `${REF}numeric/lcm`,
  },
  {
    id: "powmod",
    title: "Potência modular",
    signature: "long long pw(long long b, long long e, long long m)",
    complexity: "O(log e)",
    example: c`auto pw = [](long long b, long long e, long long m) {
  long long r = 1; b %= m;
  for (; e; e >>= 1, b = b * b % m) if (e & 1) r = r * b % m;
  return r; };
cout << pw(2, 10, 1000) << ' ' << pw(3, 1000000006, 1000000007) << '\n';`,
    pitfalls: [
      "b * b estoura se m passa de cerca de 3 · 10^9, então use __int128 nesse caso.",
      "Reduza a base com b %= m antes do laço.",
    ],
    tags: ["exponenciação rápida", "binpow", "modpow", "mod"],
    link: `${REF}language/operator_arithmetic`,
  },
  {
    id: "modinv",
    title: "Inverso modular (Fermat)",
    signature: "inv(a) = pw(a, p - 2, p)  // p primo",
    complexity: "O(log p)",
    example: c`const long long P = 1e9 + 7;
auto pw = [&](long long b, long long e) { long long r = 1;
  for (b %= P; e; e >>= 1, b = b * b % P) if (e & 1) r = r * b % P;
  return r; };
long long inv2 = pw(2, P - 2);
cout << inv2 << ' ' << 2 * inv2 % P << '\n';`,
    pitfalls: [
      "Só vale com módulo primo e a não múltiplo de p.",
      "Para módulo que não é primo use o Euclides estendido.",
    ],
    tags: ["divisão modular", "fermat", "mod", "inverso"],
    link: `${REF}language/operator_arithmetic`,
  },
  {
    id: "mod_negative",
    title: "% com negativos",
    signature: "((a % m) + m) % m",
    complexity: "O(1)",
    example: c`cout << -7 % 3 << ' ' << 7 % -3 << '\n';
int a = -7, m = 3;
cout << ((a % m) + m) % m << '\n';`,
    pitfalls: [
      "Em C++ o resto tem o sinal do dividendo, então -7 % 3 dá -1.",
      "Depois de uma subtração no mod, some m antes de tirar o resto.",
    ],
    tags: ["resto", "módulo negativo", "mod"],
    link: `${REF}language/operator_arithmetic`,
  },
  {
    id: "isqrt",
    title: "sqrtl e raiz inteira",
    signature: "long long r = sqrtl(x);  // depois ajuste r para cima e para baixo",
    complexity: "O(1)",
    example: c`long long x = 999999999999999999LL;
long long r = sqrtl(x);
while (r * r > x) r--;
while ((r + 1) * (r + 1) <= x) r++;
cout << r << ' ' << (long long)sqrt((double)x) << '\n';`,
    pitfalls: [
      "O sqrt com double erra por 1 perto de 10^18, então sempre ajuste com os dois laços.",
      "(r + 1) * (r + 1) pode estourar quando x chega perto de LLONG_MAX.",
    ],
    tags: ["raiz quadrada", "sqrt", "quadrado perfeito", "isqrt"],
    link: `${REF}numeric/math/sqrt`,
  },
  {
    id: "ceil_div",
    title: "Teto de divisão inteira",
    signature: "(a + b - 1) / b  // a >= 0, b > 0",
    complexity: "O(1)",
    example: c`long long a = 7, b = 2;
cout << (a + b - 1) / b << ' ' << a / b << '\n';
cout << -7 / 2 << ' ' << (long long)ceil(7 / 2) << '\n';`,
    pitfalls: [
      "ceil(a / b) com inteiros já divide antes e dá o piso, então use (a + b - 1) / b.",
      "A divisão inteira trunca para zero, então -7 / 2 dá -3 e não -4.",
    ],
    tags: ["arredondar para cima", "teto", "ceil", "divisão"],
    link: `${REF}language/operator_arithmetic`,
  },
  {
    id: "pi",
    title: "numbers::pi e acos(-1)",
    signature: "numbers::pi;  acos(-1.0);",
    complexity: "O(1)",
    example: c`cout << fixed << setprecision(10) << numbers::pi << '\n';
cout << acos(-1.0) << '\n';`,
    pitfalls: ["O M_PI não é padrão e pode não existir em todo compilador."],
    tags: ["pi", "geometria", "constante"],
    since: "C++20",
    link: `${REF}numeric/constants`,
  },
  {
    id: "atan2_hypot",
    title: "atan2 e hypot",
    signature: "atan2(y, x);  hypot(x, y);",
    complexity: "O(1)",
    example: c`cout << fixed << setprecision(4);
cout << atan2(1.0, 1.0) << ' ' << hypot(3.0, 4.0) << '\n';`,
    pitfalls: [
      "O atan2 recebe o y primeiro e devolve o ângulo em (-pi, pi].",
      "Para comparar distâncias, compare os quadrados em inteiros e evite a raiz.",
    ],
    tags: ["ângulo", "geometria", "distância"],
    link: `${REF}numeric/math/atan2`,
  },
];
