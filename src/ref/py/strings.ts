import type { EntryDraft } from "../model";

const p = String.raw;
const REF = "https://docs.python.org/3.9/";

/** Section 8: strings, slicing, formatting and character utilities. */
export const STRINGS: readonly EntryDraft[] = [
  {
    id: "slicing",
    title: "Fatias (s[l:r:passo])",
    signature: "s[l:r];  s[::-1]  # cópia invertida",
    complexity: "O(tamanho da fatia)",
    example: p`s = "maratona"
print(s[2:5], s[5:], s[-3:], s[::-1])`,
    pitfalls: [
      "O índice final r é exclusivo, e índices fora do limite são ajustados sem lançar IndexError.",
      "Toda fatia cria uma cópia O(k), então fatiar em recursão ou laço vira O(n²); passe índices (l, r).",
    ],
    tags: ["slice", "substring", "fatiar", "inverter", "palíndromo"],
    pair: "cpp/substr",
    link: `${REF}library/stdtypes.html#common-sequence-operations`,
  },
  {
    id: "str_split",
    title: "split sem argumento",
    signature: "s.split()  # quebra em qualquer espaço e descarta vazios",
    complexity: "O(n)",
    example: p`s = "  10   20\t30\n"
print(s.split())
print("a,,b".split(","))`,
    pitfalls: [
      "s.split() sem argumento agrupa espaços repetidos e ignora bordas; s.split(' ') cria strings vazias entre espaços duplos.",
      "Para quebrar linhas ignorando '\\r\\n' use s.splitlines().",
    ],
    tags: ["split", "separar", "tokens", "espaços", "linha"],
    pair: "cpp/stringstream",
    link: `${REF}library/stdtypes.html#str.split`,
  },
  {
    id: "str_join",
    title: "str.join",
    signature: "sep.join(iterável_de_str)",
    complexity: "O(soma dos tamanhos)",
    example: p`words = ["icpc", "wf", "2026"]
print("-".join(words))
print(" ".join(map(str, [1, 2, 3])))`,
    pitfalls: [
      "Todos os itens precisam ser str; com inteiros lança TypeError, então use map(str, xs).",
      "É o jeito linear O(n) de montar strings grandes em vez de concatenar com +=.",
    ],
    tags: ["join", "juntar", "concatenar", "saída", "string"],
    link: `${REF}library/stdtypes.html#str.join`,
  },
  {
    id: "ord_chr",
    title: "ord e chr",
    signature: "ord('a') == 97;  chr(97) == 'a'",
    complexity: "O(1)",
    example: p`s = "cab"
idx = [ord(ch) - ord("a") for ch in s]
print(idx, "".join(chr(ord("A") + i) for i in idx))`,
    pitfalls: [
      "Python não tem tipo char separado nem aritmética direta de caractere como 'c' - 'a' do C++.",
      "Em laço quente sobre ASCII, percorrer bytes (b'abc') já entrega inteiros sem chamar ord().",
    ],
    tags: ["ascii", "caractere", "char", "alfabeto", "ord", "chr"],
    pair: "cpp/char_classes",
    link: `${REF}library/functions.html#ord`,
  },
  {
    id: "str_count",
    title: "str.count",
    signature: "s.count(sub, início, fim)",
    complexity: "O(n) em C (sem sobreposição)",
    example: p`print("aaaa".count("aa"))
print("abacaba".count("a", 1, 6))`,
    pitfalls: [
      "Conta ocorrências sem sobreposição, então 'aaaa'.count('aa') devolve 2 e não 3.",
      "Roda em C e é bem mais rápido que um laço Python caractere a caractere.",
    ],
    tags: ["contar", "ocorrências", "frequência", "substring", "count"],
    pair: "cpp/count",
    link: `${REF}library/stdtypes.html#str.count`,
  },
  {
    id: "str_find_index",
    title: "find contra index",
    signature: "s.find(sub, início)  # -1 se faltar;  s.index(sub)  # ValueError",
    complexity: "O(n · m) no pior caso (rápido na prática em C)",
    example: p`s = "abcabc"
print(s.find("ca"), s.find("c", 3), s.find("x"), s.rfind("ab"))`,
    pitfalls: [
      "find devolve -1 quando não acha e index lança ValueError; nunca use if s.find(t): porque índice 0 é falso.",
      "Para só testar existência escreva sub in s; para muitas buscas no pior caso use KMP ou Z.",
    ],
    tags: ["buscar", "procurar", "find", "index", "rfind", "substring"],
    pair: "cpp/find",
    link: `${REF}library/stdtypes.html#str.find`,
  },
  {
    id: "str_zfill",
    title: "zfill, rjust e ljust",
    signature: "s.zfill(largura);  s.rjust(largura, pad)",
    complexity: "O(max(len(s), largura))",
    example: p`print("42".zfill(5), "-42".zfill(5))
print("7".rjust(4, "0"), "hi".ljust(5, "."))`,
    pitfalls: [
      "zfill mantém o sinal '+' ou '-' antes dos zeros, enquanto rjust(5, '0') colocaria zeros antes do '-'.",
      "Se a string já for maior que a largura, ela volta inalterada sem truncar.",
    ],
    tags: ["preencher", "zeros", "padding", "alinhar", "zfill"],
    link: `${REF}library/stdtypes.html#str.zfill`,
  },
  {
    id: "fstring_format",
    title: "f-strings com formato",
    signature: p`f"{x:.6f}"  f"{n:08b}"  f"{x=}"`,
    complexity: "O(tamanho do resultado)",
    example: p`x = 3.14159265
n = 13
print(f"{x:.3f}", f"{n:06b}", f"{n=}")`,
    pitfalls: [
      "Use :.6f ou :.10f para fixar casas decimais e evitar notação científica como 1e-05.",
      "f'{x=}' (Python 3.8+) imprime nome e valor para depurar rápido em testes locais.",
    ],
    tags: ["f-string", "formato", "casas decimais", "precisão", "binário", "debug"],
    since: "Python 3.8",
    pair: "cpp/setprecision",
    link: `${REF}library/string.html#format-specification-mini-language`,
  },
  {
    id: "str_prefix_suffix",
    title: "startswith, endswith e removeprefix",
    signature: "s.startswith(t);  s.removeprefix(p);  s.removesuffix(q)",
    complexity: "O(|t|)",
    example: p`s = "solucao.py"
print(s.startswith(("sol", "test")), s.endswith(".py"))
print(s.removeprefix("sol"), s.removesuffix(".py"))`,
    pitfalls: [
      "removeprefix e removesuffix entraram no Python 3.9 e substituem lstrip/rstrip (que apagam conjuntos de caracteres, não prefixos).",
      "startswith e endswith aceitam uma tupla de opções para testar vários prefixos de uma vez.",
    ],
    tags: ["prefixo", "sufixo", "startswith", "endswith", "removeprefix", "python 3.9"],
    since: "Python 3.9",
    pair: "cpp/starts_with",
    link: `${REF}library/stdtypes.html#str.removeprefix`,
  },
];
