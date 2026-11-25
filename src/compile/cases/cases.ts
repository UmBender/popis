import type { CauseId, CompileGroup } from "../causes";
import type { CompileLimits } from "./index";

export type CompileCaseDef = {
  readonly id: string;
  readonly group: CompileGroup;
  readonly code: string;
  readonly flags: readonly string[];
  readonly input?: string;
  readonly limits?: CompileLimits;
  readonly line: number;
  readonly cause: CauseId;
  readonly explanation: string;
};

const GCC_FLAGS = ["-std=gnu++20", "-Wall", "-Wextra", "-Wshadow"] as const;
const SAN_FLAGS = ["-std=gnu++20", "-g", "-fsanitize=address,undefined"] as const;
const GLIBCXX_FLAGS = [
  "-std=gnu++20",
  "-g",
  "-D_GLIBCXX_DEBUG",
  "-D_GLIBCXX_DEBUG_BACKTRACE",
  "-lstdc++exp",
] as const;

/** Thirty hand-written competitive-programming C++ error cases (5 per group). */
export const COMPILE_CASE_DEFS: readonly CompileCaseDef[] = [
  // --- compilacao (5) ---
  {
    id: "comp-nao-declarado",
    group: "compilacao",
    flags: GCC_FLAGS,
    line: 5,
    cause: "nao-declarado",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int n = 5;",
      '    cout << m << "\\n";',
      "    return n;",
      "}",
    ].join("\n"),
    explanation:
      "O compilador diz que m não foi declarado neste escopo na linha 5. Troque m por n ou declare a variável antes de usá-la.",
  },
  {
    id: "comp-ponto-e-virgula",
    group: "compilacao",
    flags: GCC_FLAGS,
    line: 5,
    cause: "ponto-e-virgula",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "struct Node {",
      "    int val;",
      "}",
      "int main() {",
      '    cout << 1 << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "Em C++, toda definição de struct ou class precisa terminar com ; após a chave de fechamento. Coloque ; no fim da linha 5.",
  },
  {
    id: "comp-chamada-incompativel",
    group: "compilacao",
    flags: GCC_FLAGS,
    line: 6,
    cause: "chamada-incompativel",
    code: [
      "#include <algorithm>",
      "#include <vector>",
      "using namespace std;",
      "int main() {",
      "    vector<int> v = {3, 1, 2};",
      "    sort(v);",
      "}",
    ].join("\n"),
    explanation:
      "no matching function for call to 'sort' indica que std::sort espera dois iteradores, não o vetor inteiro. Use sort(v.begin(), v.end()) ou ranges::sort(v).",
  },
  {
    id: "comp-escrita-em-const",
    group: "compilacao",
    flags: GCC_FLAGS,
    line: 4,
    cause: "escrita-em-const",
    code: [
      "#include <vector>",
      "using namespace std;",
      "void bump(const vector<int>& a) {",
      "    a[0] += 1;",
      "}",
      "int main() {",
      "    vector<int> v = {1, 2};",
      "    bump(v);",
      "}",
    ].join("\n"),
    explanation:
      "assignment of read-only location mostra escrita em um parâmetro const. Remova const da referência ou devolva uma cópia modificada.",
  },
  {
    id: "comp-redeclaracao",
    group: "compilacao",
    flags: GCC_FLAGS,
    line: 5,
    cause: "redeclaracao",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int ans = 10;",
      "    int ans = 20;",
      '    cout << ans << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "redeclaration of 'int ans' aponta que o mesmo nome já existe no bloco atual. Remova o tipo int na linha 5 para apenas atribuir o novo valor.",
  },

  // --- aviso (5) ---
  {
    id: "aviso-sombra",
    group: "aviso",
    flags: GCC_FLAGS,
    line: 6,
    cause: "sombra-variavel",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int total = 10;",
      "    for (int i = 0; i < 3; i++) {",
      "        int total = i;",
      '        cout << total << "\\n";',
      "    }",
      '    cout << total << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "-Wshadow avisa que int total dentro do laço esconde o total externo sem alterá-lo. Remova o tipo int na linha 6 ou use outro nome.",
  },
  {
    id: "aviso-nao-inicializada",
    group: "aviso",
    flags: ["-std=gnu++20", "-O1", "-Wall", "-Wextra", "-Wshadow"],
    line: 4,
    cause: "nao-inicializada",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int sum;",
      "    for (int i = 1; i <= 5; i++) {",
      "        sum += i;",
      "    }",
      '    cout << sum << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "'sum' is used uninitialized indica leitura de lixo de memória antes da primeira escrita. Inicialize int sum = 0 na linha 4.",
  },
  {
    id: "aviso-printf-tipo",
    group: "aviso",
    flags: GCC_FLAGS,
    line: 5,
    cause: "printf-tipo",
    code: [
      "#include <cstdio>",
      "using namespace std;",
      "int main() {",
      "    long long ans = 1000000000000LL;",
      '    printf("%d\\n", ans);',
      "}",
    ].join("\n"),
    explanation:
      "-Wformat avisa que %d espera int, mas recebeu long long. Troque para %lld ou use cout.",
  },
  {
    id: "aviso-comparacao-sinal",
    group: "aviso",
    flags: GCC_FLAGS,
    line: 6,
    cause: "comparacao-sinal",
    code: [
      "#include <iostream>",
      "#include <vector>",
      "using namespace std;",
      "int main() {",
      "    vector<int> v = {2, 4, 6};",
      "    for (int i = 0; i < v.size(); i++) {",
      '        cout << v[i] << "\\n";',
      "    }",
      "}",
    ].join("\n"),
    explanation:
      "-Wsign-compare sinaliza a comparação entre int com sinal e size_t sem sinal retornado por v.size(). Converta com int(v.size()) ou use ssize(v).",
  },
  {
    id: "aviso-sem-retorno",
    group: "aviso",
    flags: GCC_FLAGS,
    line: 6,
    cause: "sem-retorno",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int sign(int x) {",
      "    if (x > 0) return 1;",
      "    if (x < 0) return -1;",
      "}",
      "int main() {",
      '    cout << sign(3) << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "control reaches end of non-void function avisa que x == 0 chega ao fim da função sem return, gerando UB. Adicione return 0 antes da linha 6.",
  },

  // --- asan (5) ---
  {
    id: "asan-heap-oob",
    group: "asan",
    flags: SAN_FLAGS,
    line: 6,
    cause: "heap-fora-limites",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int* a = new int[4]{1, 2, 3, 4};",
      "    int s = 0;",
      "    for (int i = 0; i <= 4; i++) s += a[i];",
      '    cout << s << "\\n";',
      "    delete[] a;",
      "}",
    ].join("\n"),
    explanation:
      "heap-buffer-overflow com 0 bytes after 16-byte region mostra leitura logo após o fim do vetor alocado na linha 4. Troque i <= 4 por i < 4.",
  },
  {
    id: "asan-stack-oob",
    group: "asan",
    flags: SAN_FLAGS,
    line: 7,
    cause: "stack-fora-limites",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int a[4] = {1, 2, 3, 4};",
      "    int* p = a;",
      "    int s = 0;",
      "    for (int i = 0; i <= 4; i++) s += p[i];",
      '    cout << s << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "stack-buffer-overflow indica acesso além dos limites do array local a na pilha. Corrija a condição do laço na linha 7 para i < 4.",
  },
  {
    id: "asan-uaf",
    group: "asan",
    flags: SAN_FLAGS,
    line: 6,
    cause: "uso-apos-liberar",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int* p = new int(42);",
      "    delete p;",
      '    cout << *p << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "heap-use-after-free mostra leitura na linha 6 de memória já liberada pelo delete p na linha 5. Leia *p antes de liberar ou não use o ponteiro após delete.",
  },
  {
    id: "asan-stack-overflow",
    group: "asan",
    flags: SAN_FLAGS,
    line: 4,
    cause: "estouro-pilha",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int dfs(int u) {",
      "    return 1 + dfs(u + 1);",
      "}",
      "int main() {",
      '    cout << dfs(0) << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "stack-overflow com dezenas de frames repetidos em dfs revela recursão sem caso-base que esgota a pilha. Adicione uma condição de parada antes da chamada recursiva.",
  },
  {
    id: "asan-global-oob",
    group: "asan",
    flags: SAN_FLAGS,
    line: 6,
    cause: "global-fora-limites",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int g[4] = {10, 20, 30, 40};",
      "int main() {",
      "    int* p = g;",
      '    cout << p[4] << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "global-buffer-overflow aponta acesso fora do array global g, cujos índices válidos vão de 0 a 3. Use um índice menor que 4 ou aumente o tamanho de g.",
  },

  // --- ubsan (5) ---
  {
    id: "ubsan-overflow",
    group: "ubsan",
    flags: SAN_FLAGS,
    line: 5,
    cause: "overflow-sinal",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int a = 2000000000;",
      "    int b = a + a;",
      '    cout << b << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "signed integer overflow indica que a + a passou do limite de int (2^31 - 1). Use long long para armazenar e somar os valores.",
  },
  {
    id: "ubsan-div-zero",
    group: "ubsan",
    flags: SAN_FLAGS,
    input: "10 0\n",
    line: 6,
    cause: "divisao-zero",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int a, b;",
      "    cin >> a >> b;",
      '    cout << a / b << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "runtime error: division by zero na linha 6 mostra divisor igual a zero para a entrada 10 0. Valide b == 0 antes de dividir.",
  },
  {
    id: "ubsan-shift",
    group: "ubsan",
    flags: SAN_FLAGS,
    line: 5,
    cause: "shift-invalido",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int k = 32;",
      "    int mask = 1 << k;",
      '    cout << mask << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "shift exponent 32 is too large for 32-bit type 'int' indica deslocamento maior ou igual à largura do tipo. Use 1LL << k em long long ou garanta k < 31.",
  },
  {
    id: "ubsan-array-oob",
    group: "ubsan",
    flags: SAN_FLAGS,
    line: 6,
    cause: "indice-fora-array",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int a[4] = {1, 2, 3, 4};",
      "    int idx = 4;",
      '    cout << a[idx] << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "index 4 out of bounds for type 'int [4]' aponta acesso ao índice 4 em um array de 4 posições (0 a 3). Limite idx ao intervalo de 0 a 3.",
  },
  {
    id: "ubsan-nullptr",
    group: "ubsan",
    flags: SAN_FLAGS,
    line: 5,
    cause: "ponteiro-nulo",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int* p = nullptr;",
      '    cout << *p << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "load of null pointer of type 'int' mostra desreferência de um ponteiro nulo na linha 5. Verifique p != nullptr antes de acessar *p.",
  },

  // --- glibcxx (5) ---
  {
    id: "glibcxx-vector-oob",
    group: "glibcxx",
    flags: GLIBCXX_FLAGS,
    line: 6,
    cause: "indice-fora-vetor",
    code: [
      "#include <iostream>",
      "#include <vector>",
      "using namespace std;",
      "int main() {",
      "    vector<int> v = {1, 2, 3};",
      '    cout << v[3] << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "out-of-bounds index 3, but container only holds 3 elements acusa acesso fora do tamanho do vector. Use índices entre 0 e v.size() - 1.",
  },
  {
    id: "glibcxx-iter-invalido",
    group: "glibcxx",
    flags: GLIBCXX_FLAGS,
    line: 8,
    cause: "iterador-invalido",
    code: [
      "#include <iostream>",
      "#include <vector>",
      "using namespace std;",
      "int main() {",
      "    vector<int> v = {1, 2};",
      "    auto it = v.begin();",
      "    for (int i = 0; i < 10; i++) v.push_back(i);",
      '    cout << *it << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "dereference a singular iterator ocorre porque push_back realocou o vector e invalidou it. Obtenha o iterador depois de inserir ou guarde um índice inteiro.",
  },
  {
    id: "glibcxx-iter-end",
    group: "glibcxx",
    flags: GLIBCXX_FLAGS,
    line: 7,
    cause: "iterador-fim",
    code: [
      "#include <iostream>",
      "#include <vector>",
      "using namespace std;",
      "int main() {",
      "    vector<int> v = {5, 7};",
      "    auto it = v.end();",
      '    cout << *it << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "past-the-end iterator indica desreferência de v.end(), que aponta uma posição após o último elemento. Use v.back() ou prev(v.end()).",
  },
  {
    id: "glibcxx-comparator",
    group: "glibcxx",
    flags: GLIBCXX_FLAGS,
    line: 6,
    cause: "comparador-invalido",
    code: [
      "#include <algorithm>",
      "#include <vector>",
      "using namespace std;",
      "bool cmp(int a, int b) { return a <= b; }",
      "void ordenar(vector<int>& v) {",
      "    sort(v.begin(), v.end(), cmp);",
      "}",
      "int main() {",
      "    vector<int> v = {3, 1, 3, 2};",
      "    ordenar(v);",
      "}",
    ].join("\n"),
    explanation:
      "irreflexive requirements aponta que cmp passado ao sort na linha 6 retorna true para elementos iguais (a <= a). Troque <= por <.",
  },
  {
    id: "glibcxx-empty-back",
    group: "glibcxx",
    flags: GLIBCXX_FLAGS,
    line: 6,
    cause: "container-vazio",
    code: [
      "#include <iostream>",
      "#include <vector>",
      "using namespace std;",
      "int main() {",
      "    vector<int> v;",
      '    cout << v.back() << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "access an element in an empty container indica chamada de back() em um vector vazio. Teste !v.empty() antes de ler o último elemento.",
  },

  // --- veredito (5) ---
  {
    id: "veredito-tle",
    group: "veredito",
    flags: ["-std=gnu++20", "-O0"],
    limits: { timeS: 2 },
    line: 6,
    cause: "tle-laco-infinito",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int n = 5;",
      "    while (n > 0) {",
      "        if (n == 5) continue;",
      "        n--;",
      "    }",
      '    cout << n << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "O juiz encerrou por TLE (saída 124) porque o continue na linha 6 pula n-- e prende o laço para sempre. Decremente n antes do continue.",
  },
  {
    id: "veredito-mle",
    group: "veredito",
    flags: ["-std=gnu++20", "-O2"],
    limits: { memoryKb: 131072 },
    line: 5,
    cause: "mle-alocacao",
    code: [
      "#include <iostream>",
      "#include <vector>",
      "using namespace std;",
      "int main() {",
      "    vector<long long> dp(100000000, 1);",
      '    cout << dp[0] << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "std::bad_alloc sob limite de memória ocorre porque 10^8 inteiros de 8 bytes consomem ~800 MB. Reduza o estado da DP ou use int e compressão de memória.",
  },
  {
    id: "veredito-sigsegv",
    group: "veredito",
    flags: ["-std=gnu++20", "-O0"],
    line: 5,
    cause: "rte-sigsegv",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int* p = nullptr;",
      '    cout << *p << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "SIGSEGV indica acesso a endereço de memória inválido ao desreferenciar p == nullptr na linha 5. Garanta que o ponteiro aponte para um objeto válido.",
  },
  {
    id: "veredito-sigfpe",
    group: "veredito",
    flags: ["-std=gnu++20", "-O0"],
    input: "15 0\n",
    line: 6,
    cause: "rte-sigfpe",
    code: [
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int a, b;",
      "    cin >> a >> b;",
      '    cout << a % b << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "SIGFPE (exceção aritmética) em inteiros quase sempre é divisão ou resto por zero, aqui a % b com b = 0. Trate b == 0 antes de calcular o resto.",
  },
  {
    id: "veredito-sigabrt",
    group: "veredito",
    flags: ["-std=gnu++20", "-O0"],
    input: "0\n",
    line: 7,
    cause: "rte-sigabrt",
    code: [
      "#include <cassert>",
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int n;",
      "    cin >> n;",
      "    assert(n > 0);",
      '    cout << n << "\\n";',
      "}",
    ].join("\n"),
    explanation:
      "SIGABRT com Assertion 'n > 0' failed mostra que o assert da linha 7 abortou o programa para n = 0. Trate o caso n == 0 em vez de assumi-lo impossível.",
  },
];
