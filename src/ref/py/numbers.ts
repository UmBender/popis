import type { EntryDraft } from "../model";

const p = String.raw;
const REF = "https://docs.python.org/3.9/";

/** Section 7: numbers, big integers, modular arithmetic and precision. */
export const NUMBERS: readonly EntryDraft[] = [
  {
    id: "bigint",
    title: "Inteiros sem limite (int)",
    signature: "int tem precisão arbitrária (sem overflow)",
    complexity: "O(dígitos) para soma; multiplicação usa Karatsuba",
    example: p`x = 10**30 + 7
y = (1 << 100) - 1
print(x * 3)
print(y.bit_length())`,
    pitfalls: [
      "Nunca dá overflow, mas operar números com milhares de dígitos deixa de ser O(1) e pode causar TLE.",
      "Em versões recentes (3.9.14+/3.11+), converter int com mais de 4300 dígitos para/de str exige sys.set_int_max_str_digits(0).",
    ],
    tags: ["bigint", "inteiro grande", "precisão arbitrária", "overflow", "int"],
    pair: "cpp/int128",
    link: `${REF}library/stdtypes.html#numeric-types-int-float-complex`,
  },
  {
    id: "floor_div_mod",
    title: "// e % com negativos",
    signature: "a // b  # piso (para -inf);  a % b  # sinal de b",
    complexity: "O(1)",
    example: p`print(-7 // 3, -7 % 3)
print(7 // -3, 7 % -3)
print(divmod(-7, 3))`,
    pitfalls: [
      "Ao contrário do C++ (que trunca para zero), // arredonda para baixo e -7 % 3 dá 2 (sempre em [0, m) para m > 0).",
      "Para truncar para zero como no C++, use int(a / b) só quando |a| < 2^53, ou ajuste com sinal em inteiros.",
    ],
    tags: ["divisão inteira", "resto", "módulo negativo", "piso", "divmod"],
    pair: "cpp/mod_negative",
    link: `${REF}reference/expressions.html#binary-arithmetic-operations`,
  },
  {
    id: "ceil_div",
    title: "Teto de divisão inteira",
    signature: "(a + b - 1) // b  # ou -(-a // b) para qualquer sinal",
    complexity: "O(1)",
    example: p`print((7 + 2 - 1) // 2, -(-7 // 2))
print(-(-(-7) // 2))`,
    pitfalls: [
      "Nunca use math.ceil(a / b) com inteiros grandes porque a / b converte para float e perde precisão acima de 2^53.",
      "-(-a // b) calcula o teto exato até para a negativo (com b > 0).",
    ],
    tags: ["teto", "ceil", "arredondar para cima", "divisão inteira"],
    pair: "cpp/ceil_div",
    link: `${REF}reference/expressions.html#binary-arithmetic-operations`,
  },
  {
    id: "pow_mod",
    title: "pow(a, b, m)",
    signature: "pow(a, b, m)  # exponenciação modular em C",
    complexity: "O(log b)",
    example: p`MOD = 10**9 + 7
print(pow(2, 10, 1000))
print(pow(3, MOD - 1, MOD))`,
    pitfalls: [
      "Nunca escreva (a ** b) % m, porque calcula a ** b inteiro antes do resto e estoura tempo e memória.",
      "pow com três argumentos só aceita inteiros.",
    ],
    tags: ["potência modular", "binpow", "exponenciação rápida", "mod"],
    pair: "cpp/powmod",
    link: `${REF}library/functions.html#pow`,
  },
  {
    id: "pow_modinv",
    title: "pow(a, -1, m) (inverso modular)",
    signature: "pow(a, -1, m)  # funciona para qualquer gcd(a, m) == 1",
    complexity: "O(log m)",
    example: p`MOD = 10**9 + 7
inv2 = pow(2, -1, MOD)
print(inv2, (2 * inv2) % MOD, pow(3, -1, 10))`,
    pitfalls: [
      "Entrou no Python 3.8 e funciona mesmo quando m não é primo, desde que gcd(a, m) == 1.",
      "Lança ValueError se a não tiver inverso módulo m.",
    ],
    tags: ["inverso modular", "divisão modular", "euclides", "mod", "pow"],
    since: "Python 3.8",
    pair: "cpp/modinv",
    link: `${REF}library/functions.html#pow`,
  },
  {
    id: "math_gcd",
    title: "math.gcd",
    signature: "math.gcd(a, b, ...)  # aceita 2 ou mais argumentos (3.9+)",
    complexity: "O(log min(a, b))",
    example: p`import math
print(math.gcd(12, 18), math.gcd(12, 18, 30))
print(math.gcd(-4, 6), math.gcd(0, 0))`,
    pitfalls: [
      "Sempre devolve um inteiro não negativo, e math.gcd(0, 0) é 0.",
      "Aceitar mais de dois argumentos ou math.gcd(*lista) entrou no Python 3.9 e vale na WF.",
    ],
    tags: ["mdc", "máximo divisor comum", "euclides", "math"],
    since: "Python 3.9",
    pair: "cpp/gcd",
    link: `${REF}library/math.html#math.gcd`,
  },
  {
    id: "math_lcm",
    title: "math.lcm",
    signature: "math.lcm(a, b, ...)  # Python 3.9, válido na WF",
    complexity: "O(log min(a, b))",
    example: p`import math
print(math.lcm(4, 6), math.lcm(4, 6, 15))
print(math.lcm(0, 5))`,
    pitfalls: [
      "math.lcm (inclusive com vários argumentos ou *lista) entrou no Python 3.9, então pode usar na WF.",
      "Não dá overflow, mas o mmc de muitos primos cresce exponencialmente e fica lento.",
    ],
    tags: ["mmc", "mínimo múltiplo comum", "math", "python 3.9"],
    since: "Python 3.9",
    pair: "cpp/lcm",
    link: `${REF}library/math.html#math.lcm`,
  },
  {
    id: "math_isqrt",
    title: "math.isqrt",
    signature: "math.isqrt(n)  # piso exato da raiz quadrada inteira",
    complexity: "O(log log n) passos de Newton",
    example: p`import math
x = 10**30 - 1
r = math.isqrt(x)
print(r * r <= x < (r + 1) * (r + 1), math.isqrt(17))`,
    pitfalls: [
      "É exato para inteiros de qualquer tamanho, enquanto int(math.sqrt(x)) erra já perto de 10^16.",
      "Lança ValueError para n negativo.",
    ],
    tags: ["raiz quadrada", "quadrado perfeito", "isqrt", "sqrt", "math"],
    since: "Python 3.8",
    pair: "cpp/isqrt",
    link: `${REF}library/math.html#math.isqrt`,
  },
  {
    id: "math_comb",
    title: "math.comb e math.perm",
    signature: "math.comb(n, k);  math.perm(n, k)",
    complexity: "O(min(k, n - k)) multiplicações",
    example: p`import math
print(math.comb(10, 3), math.comb(5, 7))
print(math.perm(5, 2), math.factorial(5))`,
    pitfalls: [
      "Devolve 0 quando k > n (não lança erro), mas lança ValueError se n ou k for negativo.",
      "Para muitas consultas módulo primo com n grande, pré-calcule fatoriais e inversos em vez de chamar comb.",
    ],
    tags: ["binomial", "combinatória", "comb", "perm", "fatorial", "math"],
    since: "Python 3.8",
    link: `${REF}library/math.html#math.comb`,
  },
  {
    id: "fraction",
    title: "fractions.Fraction",
    signature: "from fractions import Fraction;  Fraction(p, q)",
    complexity: "reduz por gcd a cada operação",
    example: p`from fractions import Fraction
a = Fraction(1, 3) + Fraction(1, 6)
b = Fraction("0.1") + Fraction("0.2")
print(a, a.numerator, a.denominator, b == Fraction(3, 10))`,
    pitfalls: [
      "Sempre mantém fração irredutível com denominador positivo, útil em geometria exata e probabilidades pequenas.",
      "É bem mais lento que int porque calcula gcd a cada operação e pode crescer os denominadores.",
    ],
    tags: ["fração", "racional", "exato", "geometria", "fractions"],
    link: `${REF}library/fractions.html#fractions.Fraction`,
  },
  {
    id: "decimal",
    title: "decimal.Decimal",
    signature: "from decimal import Decimal, getcontext;  getcontext().prec = 50",
    complexity: "aritmética decimal com precisão configurável",
    example: p`from decimal import Decimal, getcontext
getcontext().prec = 30
print(Decimal("0.1") + Decimal("0.2"))
print(Decimal(2).sqrt())`,
    pitfalls: [
      "Passe string como Decimal('0.1'), nunca Decimal(0.1), senão já herda o erro binário do float.",
      "Muito mais lento que float; use só quando precisar de >15 dígitos decimais exatos.",
    ],
    tags: ["decimal", "precisão", "alta precisão", "arredondamento"],
    link: `${REF}library/decimal.html`,
  },
  {
    id: "float_precision",
    title: "float e sua precisão",
    signature: "float  # IEEE 754 de 64 bits (53 bits de mantissa, ~15 dígitos)",
    complexity: "O(1)",
    example: p`import math
print(10**16 + 1 == 10**16, float(10**16 + 1) == float(10**16))
print(math.isclose(0.1 + 0.2, 0.3), float("inf") > 10**300)`,
    pitfalls: [
      "O operador / sempre devolve float, perdendo precisão acima de 2^53 (~9·10^15); para inteiros use //.",
      "Não existe long double em Python; para mais precisão use inteiros, Fraction ou Decimal.",
    ],
    tags: ["ponto flutuante", "real", "precisão", "inf", "double", "float"],
    pair: "cpp/long_double",
    link: `${REF}tutorial/floatingpoint.html`,
  },
  {
    id: "int_base_bin_hex",
    title: "int(s, base), bin e hex",
    signature: "int(s, base);  bin(x);  hex(x);  oct(x)",
    complexity: "O(dígitos)",
    example: p`print(int("1011", 2), int("ff", 16), int("z", 36))
print(bin(13), hex(255), format(13, "06b"))`,
    pitfalls: [
      "bin(13) devolve '0b1101' com prefixo; para sem prefixo ou com zeros à esquerda use format(x, 'b') ou f'{x:08b}'.",
      "int(s, 0) escolhe a base pelo prefixo (0b, 0o, 0x).",
    ],
    tags: ["base", "binário", "hexadecimal", "converter", "parse"],
    pair: "cpp/stoi_stoll",
    link: `${REF}library/functions.html#int`,
  },
  {
    id: "bit_length",
    title: "int.bit_length",
    signature: "x.bit_length()  # bits para representar |x| (0 para x == 0)",
    complexity: "O(1)",
    example: p`for x in (0, 1, 8, 13):
    print(x, x.bit_length())`,
    pitfalls: [
      "x.bit_length() - 1 é o piso de log2(x) para x > 0, sem risco de erro de float do math.log2.",
      "Para x == 0 devolve 0, e ignora o sinal em números negativos.",
    ],
    tags: ["bits", "log2", "bit_width", "potência de 2"],
    pair: "cpp/bit_width",
    link: `${REF}library/stdtypes.html#int.bit_length`,
  },
  {
    id: "int_bit_count",
    title: "int.bit_count",
    signature: "x.bit_count()  # popcount (Python 3.10+)",
    complexity: "O(palavras de x)",
    example: p`print((0b1011).bit_count(), ((1 << 40) - 1).bit_count())`,
    pitfalls: [
      "Só entrou no Python 3.10 e não existe na WF (3.9).",
      "Na 3.9, use bin(x).count('1') para contar bits ligados.",
    ],
    tags: ["popcount", "contar bits", "bits ligados", "python 3.10"],
    since: "Python 3.10",
    judge: true,
    pair: "cpp/popcount",
    link: `${REF}library/stdtypes.html#int.bit_length`,
  },
];
