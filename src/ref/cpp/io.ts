import type { EntryDraft } from "../model";

const c = String.raw;
const REF = "https://en.cppreference.com/w/cpp/";

/** Section 1: the contest template and input/output. */
export const IO: readonly EntryDraft[] = [
  {
    id: "bits_stdcpp",
    title: "#include <bits/stdc++.h>",
    signature: "#include <bits/stdc++.h>\nusing namespace std;",
    example: c`#include <bits/stdc++.h>
vector<int> v = {1, 2, 3};
cout << accumulate(v.begin(), v.end(), 0) << '\n';`,
    pitfalls: [
      "Só existe no GCC, então no Clang do macOS ou no MSVC o include falha.",
      "Compila mais devagar porque inclui a biblioteca toda, mas isso não conta no tempo do juiz.",
    ],
    tags: ["template", "include", "cabeçalho", "stdc++"],
    link: `${REF}header`,
  },
  {
    id: "sync_with_stdio",
    title: "ios::sync_with_stdio(false)",
    signature: "ios::sync_with_stdio(false);",
    example: c`ios::sync_with_stdio(false);
cin.tie(nullptr);
int a, b;
cin >> a >> b;
cout << a + b << '\n';`,
    input: "2 3\n",
    pitfalls: [
      "Depois dela, não misture cin/cout com scanf/printf no mesmo programa.",
      "Chame antes da primeira leitura ou escrita.",
    ],
    tags: ["io rápido", "fast io", "sync", "template"],
    link: `${REF}io/ios_base/sync_with_stdio`,
  },
  {
    id: "cin_tie",
    title: "cin.tie(nullptr)",
    signature: "cin.tie(nullptr);",
    example: c`cin.tie(nullptr);
int n;
cin >> n;
cout << n * 2 << '\n';`,
    input: "21\n",
    pitfalls: [
      "Sem o tie, o cout é esvaziado antes de cada leitura, o que deixa a entrada grande lenta.",
      "Num problema interativo, dê flush (endl ou cout.flush()) antes de ler a resposta.",
    ],
    tags: ["io rápido", "flush", "interativo", "tie"],
    link: `${REF}io/basic_ios/tie`,
  },
  {
    id: "endl",
    title: c`'\n' contra endl`,
    signature: c`cout << x << '\n';  // endl = '\n' + flush`,
    example: c`for (int i = 1; i <= 3; i++) cout << i << '\n';
cout << "fim" << endl;`,
    pitfalls: [
      "O endl dá flush a cada linha e pode estourar o tempo com 10^6 linhas.",
      "Em problema interativo, o flush do endl é justamente o que você quer.",
    ],
    tags: ["newline", "flush", "quebra de linha"],
    link: `${REF}io/manip/endl`,
  },
  {
    id: "read_until_eof",
    title: "Ler até EOF",
    signature: "while (cin >> x) { ... }",
    example: c`long long x, s = 0;
while (cin >> x) s += x;
cout << s << '\n';`,
    input: "1 2 3\n4\n",
    pitfalls: [
      "Testando no terminal, o EOF é Ctrl+D no Linux e Ctrl+Z no Windows.",
      "Se a leitura falhar no meio (um tipo errado), o laço também para.",
    ],
    tags: ["eof", "fim da entrada", "while cin", "quantidade desconhecida"],
    link: `${REF}io/basic_istream/operator_gtgt`,
  },
  {
    id: "getline_after_extract",
    title: "getline depois de >>",
    signature: "getline(cin >> ws, s);",
    example: c`int n;
string s;
cin >> n;
getline(cin >> ws, s);
cout << n << ": " << s << '\n';`,
    input: "3\nola mundo\n",
    pitfalls: [
      "Sem o ws, o getline lê só o resto da linha do número, que é vazio.",
      "O ws também pula linhas em branco, então não use quando a linha vazia importa.",
    ],
    tags: ["getline", "linha inteira", "ws", "ignore"],
    link: `${REF}string/basic_string/getline`,
  },
  {
    id: "setprecision",
    title: "setprecision e fixed",
    signature: "cout << fixed << setprecision(k) << x;",
    example: c`double x = 3.14159265;
cout << setprecision(3) << x << '\n';
cout << fixed << setprecision(3) << x << '\n';
cout << 2.0 << '\n';`,
    pitfalls: [
      "Sem fixed, setprecision conta algarismos significativos, não casas decimais.",
      "O fixed e o setprecision valem para todas as saídas seguintes.",
    ],
    tags: ["casas decimais", "precisão", "double", "float"],
    link: `${REF}io/manip/setprecision`,
  },
  {
    id: "printf_lld",
    title: "printf e scanf com %lld",
    signature: c`printf("%lld\n", x);  scanf("%lld", &x);`,
    example: c`long long x = 1LL << 40;
printf("%lld\n", x);
printf("%.2f\n", 2.0 / 3);
printf("%5d|\n", 42);`,
    pitfalls: [
      "Usar %d com long long é comportamento indefinido e imprime lixo.",
      "Para double o scanf usa %lf, e para long double o formato é %Lf.",
    ],
    tags: ["printf", "scanf", "formato", "lld", "c"],
    link: `${REF}io/c/fprintf`,
  },
  {
    id: "print",
    title: "std::print",
    signature: c`print("{} {}\n", a, b);`,
    example: c`#include <print>
int a = 2, b = 3;
print("{} + {} = {}\n", a, b, a + b);`,
    pitfalls: [
      "Não existe na WF (C++20), então use cout ou printf.",
      "O formato usa {} como no Python, e {:.3f} fixa três casas.",
    ],
    tags: ["imprimir", "format", "c++23", "saída"],
    since: "C++23",
    judge: true,
    link: `${REF}io/print`,
  },
];
