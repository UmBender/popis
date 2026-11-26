import type { EntryDraft } from "../model";

const p = String.raw;
const REF = "https://docs.python.org/3.9/";

/** Section 1: fast input and output for Python contests. */
export const IO: readonly EntryDraft[] = [
  {
    id: "stdin_readline",
    title: "sys.stdin.readline",
    signature: "input = sys.stdin.readline",
    complexity: "O(tamanho da linha)",
    example: p`import sys
input = sys.stdin.readline
n = int(input())
s = input().strip()
print(n, s)`,
    input: "3\nmaratona\n",
    pitfalls: [
      "Mantém o '\\n' no fim da string, então chame .strip() ao ler texto (int() e split() já ignoram).",
      "Trocar input() por sys.stdin.readline no topo do arquivo acelera leituras com 10^5 linhas.",
    ],
    tags: ["io rápido", "fast io", "readline", "input", "linha"],
    pair: "cpp/sync_with_stdio",
    link: `${REF}library/sys.html#sys.stdin`,
  },
  {
    id: "stdin_buffer_split",
    title: "sys.stdin.buffer.read().split()",
    signature: "data = sys.stdin.buffer.read().split()",
    complexity: "O(bytes da entrada)",
    example: p`import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
nums = list(map(int, data[1:1 + n]))
print(sum(nums))`,
    input: "4\n10 20\n30 40\n",
    pitfalls: [
      "Lê tudo em bytes de uma vez, que é a forma mais rápida em PyPy e funciona direto com int().",
      "Se precisar de strings, decodifique com .decode() ou leia sys.stdin.read().split().",
      "Não serve em problemas interativos, porque espera o EOF antes de devolver.",
    ],
    tags: ["fast io", "buffer", "eof", "tokens", "ler tudo"],
    pair: "cpp/read_until_eof",
    link: `${REF}library/sys.html#sys.stdin`,
  },
  {
    id: "token_iter",
    title: "Leitor de tokens com iter",
    signature: "it = iter(sys.stdin.buffer.read().split());  int(next(it))",
    complexity: "O(1) por token",
    example: p`import sys
it = iter(sys.stdin.buffer.read().split())
n = int(next(it))
pairs = [(int(next(it)), int(next(it))) for _ in range(n)]
print(pairs)`,
    input: "2\n1 5\n3 7\n",
    pitfalls: [
      "Evita manter um índice manual na lista de tokens e ignora quebras de linha arbitrárias.",
      "Chamar next(it) depois do último token lança StopIteration.",
    ],
    tags: ["iter", "next", "scanner", "tokens", "template"],
    link: `${REF}library/functions.html#iter`,
  },
  {
    id: "map_int",
    title: "map(int, ...)",
    signature: "a, b = map(int, input().split());  xs = list(map(int, input().split()))",
    complexity: "O(k) para k números",
    example: p`import sys
a, b = map(int, sys.stdin.readline().split())
xs = list(map(int, sys.stdin.readline().split()))
print(a + b, xs)`,
    input: "3 7\n2 4 6\n",
    pitfalls: [
      "map devolve um iterador que só pode ser percorrido uma vez, então envolva em list() se for indexar.",
      "Em PyPy, list(map(int, ...)) costuma ser tão rápido quanto list comprehension.",
    ],
    tags: ["map", "int", "ler inteiros", "desempacotar", "split"],
    link: `${REF}library/functions.html#map`,
  },
  {
    id: "print_sep_end",
    title: "print com sep e end",
    signature: p`print(a, b, sep=", ", end="\n")`,
    complexity: "O(tamanho da saída)",
    example: p`print(1, 2, 3, sep="-", end=" | ")
print("ok")`,
    pitfalls: [
      "Por padrão sep é espaço e end é '\\n', e chamar print 10^5 vezes num laço é lento.",
      "sep e end só aceitam string ou None.",
    ],
    tags: ["imprimir", "saída", "sep", "end", "quebra de linha"],
    pair: "cpp/endl",
    link: `${REF}library/functions.html#print`,
  },
  {
    id: "stdout_write_join",
    title: p`sys.stdout.write e "\n".join`,
    signature: p`sys.stdout.write("\n".join(out) + "\n")`,
    complexity: "O(total de caracteres)",
    example: p`import sys
out = [str(i * i) for i in range(1, 5)]
sys.stdout.write("\n".join(out) + "\n")`,
    pitfalls: [
      "Juntar todas as respostas numa lista e escrever uma vez evita TLE em saídas com 10^5 linhas.",
      "write não põe '\\n' no fim e só aceita str, então converta inteiros antes com map(str, out).",
    ],
    tags: ["fast io", "stdout", "write", "join", "buffer de saída"],
    link: `${REF}library/sys.html#sys.stdout`,
  },
  {
    id: "print_unpack",
    title: "print(*lista)",
    signature: p`print(*xs)  # ou print(*xs, sep="\n")`,
    complexity: "O(n)",
    example: p`xs = [10, 20, 30]
print(*xs)
print(*xs, sep=", ")`,
    pitfalls: [
      "Se xs estiver vazia, print(*xs) imprime uma linha em branco.",
      "Para listas muito grandes, sys.stdout.write(' '.join(map(str, xs))) gasta menos tempo e memória.",
    ],
    tags: ["desempacotar", "estrela", "lista", "imprimir vetor"],
    link: `${REF}library/functions.html#print`,
  },
  {
    id: "interactive_flush",
    title: "flush em problema interativo",
    signature: "print(q, flush=True)  # ou sys.stdout.flush()",
    complexity: "O(1) por descarga",
    example: p`import sys
print("? 1 2", flush=True)
sys.stdout.write("! 42\n")
sys.stdout.flush()`,
    pitfalls: [
      "Sem flush=True a saída fica presa no buffer e o juiz dá Idleness Limit Exceeded.",
      "Em problema interativo, leia com sys.stdin.readline() e nunca com read().",
    ],
    tags: ["interativo", "flush", "buffer", "ile"],
    pair: "cpp/cin_tie",
    link: `${REF}library/functions.html#print`,
  },
];
