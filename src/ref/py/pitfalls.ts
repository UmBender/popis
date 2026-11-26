import type { EntryDraft } from "../model";

const p = String.raw;
const REF = "https://docs.python.org/3.9/";

/** Section 9: Python pitfalls in contests and post-3.9 syntax traps. */
export const PITFALLS: readonly EntryDraft[] = [
  {
    id: "shallow_matrix_mul",
    title: "Lista de listas com [[0]*m]*n",
    signature: "[[0] * m for _ in range(n)]  # nunca [[0] * m] * n",
    complexity: "O(n · m)",
    example: p`bad = [[0] * 3] * 2
bad[0][0] = 9
good = [[0] * 3 for _ in range(2)]
good[0][0] = 9
print(bad, good)`,
    pitfalls: [
      "[[0] * m] * n repete a referência da mesma linha n vezes, então mudar bad[0][0] muda todas as linhas.",
      "O mesmo vale para [[]] * n em lista de adjacência; escreva [[] for _ in range(n)].",
    ],
    tags: ["matriz", "referência", "alias", "grafo", "armadilha", "bug"],
    link: `${REF}faq/programming.html#how-do-i-create-a-multidimensional-list`,
  },
  {
    id: "mutable_default_arg",
    title: "Argumento padrão mutável",
    signature: "def f(acc=None): acc = [] if acc is None else acc",
    example: p`def bad(x, acc=[]):
    acc.append(x); return acc
def good(x, acc=None):
    acc = [] if acc is None else acc; acc.append(x); return acc
print(bad(1), bad(2), good(1), good(2))`,
    pitfalls: [
      "O valor padrão é avaliado uma única vez na definição da função e compartilhado entre todas as chamadas.",
      "Em múltiplos casos de teste, um acc=[] vaza dados de um caso para o próximo.",
    ],
    tags: ["def", "padrão", "mutável", "vazar estado", "armadilha"],
    link: `${REF}tutorial/controlflow.html#default-argument-values`,
  },
  {
    id: "shallow_vs_deep_copy",
    title: "Cópia rasa contra profunda",
    signature: "a.copy() / a[:]  # rasa;  copy.deepcopy(a)  # profunda",
    complexity: "O(n) rasa; O(total de nós) profunda",
    example: p`import copy
a = [[1, 2], [3, 4]]
shallow, deep = a.copy(), copy.deepcopy(a)
shallow[0][0] = 9
print(a[0][0], deep[0][0])`,
    pitfalls: [
      "a.copy(), list(a) e a[:] só copiam a lista externa, mantendo as mesmas sublistas internas por referência.",
      "copy.deepcopy é bem lento; para matriz 2D prefira [row[:] for row in a].",
    ],
    tags: ["copiar", "copy", "deepcopy", "referência", "clonar"],
    link: `${REF}library/copy.html`,
  },
  {
    id: "is_vs_eq",
    title: "is contra ==",
    signature: "a == b  # valor;  a is None  # identidade de objeto",
    example: p`a, b = [1, 2], [1, 2]
c = a
print(a == b, a is b, a is c, None is None)`,
    pitfalls: [
      "is compara identidade na memória e muda entre CPython e PyPy para int e str, então nunca use is com números ou texto.",
      "Use is apenas com None (x is None, x is not None), e == para comparar valores.",
    ],
    tags: ["igualdade", "identidade", "none", "is", "armadilha"],
    link: `${REF}reference/expressions.html#is-not`,
  },
  {
    id: "float_comparison",
    title: "Comparação de float",
    signature: "math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-9)",
    example: p`import math
print(0.1 + 0.2 == 0.3)
print(math.isclose(0.1 + 0.2, 0.3))
print(abs((0.1 + 0.2) - 0.3) < 1e-9)`,
    pitfalls: [
      "Nunca compare floats com == por causa do arredondamento binário (0.1 + 0.2 != 0.3).",
      "Em geometria, prefira produto vetorial e distâncias ao quadrado em inteiros para evitar qualquer eps.",
    ],
    tags: ["float", "eps", "isclose", "precisão", "geometria", "armadilha"],
    link: `${REF}library/math.html#math.isclose`,
  },
  {
    id: "match_case",
    title: "match / case",
    signature: "match cmd: case ('add', x): ...  # Python 3.10+",
    example: p`cmd = ("add", 5)
match cmd:
    case ("add", x):
        print(x + 1)
    case _:
        print(0)`,
    pitfalls: [
      "Pattern matching só entrou no Python 3.10 e dá SyntaxError no juiz da WF (PyPy3 7.3.15 / 3.9).",
      "Na WF, use if / elif / else ou um dict de funções.",
    ],
    tags: ["match", "case", "switch", "pattern matching", "python 3.10"],
    since: "Python 3.10",
    judge: true,
    link: `${REF}reference/compound_stmts.html`,
  },
  {
    id: "zip_strict",
    title: "zip(..., strict=True)",
    signature: "zip(a, b, strict=True)  # Python 3.10+",
    example: p`print(list(zip([1, 2], [10, 20], strict=True)))`,
    pitfalls: [
      "O argumento strict=True só entrou no Python 3.10 e lança TypeError no Python 3.9 da WF.",
      "Na 3.9, verifique assert len(a) == len(b) antes de chamar zip(a, b).",
    ],
    tags: ["zip", "strict", "python 3.10", "armadilha"],
    since: "Python 3.10",
    judge: true,
    link: `${REF}library/functions.html#zip`,
  },
  {
    id: "late_binding_closure",
    title: "Captura tardia em lambda",
    signature: "funcs = [lambda i=i: i for i in range(n)]",
    example: p`bad = [lambda: i for i in range(3)]
good = [lambda i=i: i for i in range(3)]
print([f() for f in bad], [f() for f in good])`,
    pitfalls: [
      "Closures capturam a variável i por referência, então todas as lambdas veem o último valor do laço.",
      "Fixe o valor atual num argumento padrão como lambda i=i: ...",
    ],
    tags: ["lambda", "closure", "escopo", "laço", "armadilha"],
    link: `${REF}faq/programming.html#why-do-lambdas-defined-in-a-loop-with-different-values-all-return-the-same-result`,
  },
  {
    id: "modify_while_iterating",
    title: "Alterar coleção durante o for",
    signature: "a = [x for x in a if keep(x)]  # ou for k in list(d):",
    example: p`a = [1, 2, 3, 4]
b = [x for x in a if x % 2 == 1]
d = {1: "a", 2: "b"}
for k in list(d):
    if k % 2 == 0: del d[k]
print(b, d)`,
    pitfalls: [
      "Remover itens de uma list durante for x in a pula elementos vizinhos sem dar erro.",
      "Inserir ou apagar chaves de um dict ou set durante a iteração lança RuntimeError; itere sobre list(d).",
    ],
    tags: ["iterar", "remover", "for", "runtimeerror", "armadilha"],
    link: `${REF}tutorial/controlflow.html#for-statements`,
  },
];
