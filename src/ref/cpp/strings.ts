import type { EntryDraft } from "../model";

const c = String.raw;
const REF = "https://en.cppreference.com/w/cpp/";

/** Section 5: std::string and characters. */
export const STRINGS: readonly EntryDraft[] = [
  {
    id: "substr",
    title: "substr",
    signature: "s.substr(início, tamanho)",
    complexity: "O(tamanho)",
    example: c`string s = "maratona";
cout << s.substr(2, 3) << ' ' << s.substr(5) << '\n';`,
    pitfalls: [
      "O segundo argumento é o tamanho, não a posição final.",
      "Cada substr copia, então dentro de um laço pode virar O(n²).",
    ],
    tags: ["substring", "pedaço", "fatiar"],
    link: `${REF}string/basic_string/substr`,
  },
  {
    id: "find",
    title: "find e npos",
    signature: "s.find(t, início)  // string::npos se não achar",
    complexity: "O(n · m) no pior caso",
    example: c`string s = "abcabc";
cout << s.find("ca") << ' ' << s.find('c', 3) << '\n';
if (s.find("x") == string::npos) cout << "não achou\n";`,
    pitfalls: [
      "Compare com string::npos, nunca com -1 guardado num int.",
      "Não é KMP, então para muitas buscas em textos grandes use um algoritmo linear.",
    ],
    tags: ["buscar", "procurar", "npos", "substring"],
    link: `${REF}string/basic_string/find`,
  },
  {
    id: "stoi_stoll",
    title: "stoi e stoll",
    signature: "stoi(s);  stoll(s);  stoi(s, nullptr, base);",
    complexity: "O(tamanho)",
    example: c`cout << stoi("42") + 1 << ' ';
cout << stoll("9000000000") << ' ';
cout << stoi("101", nullptr, 2) << '\n';`,
    pitfalls: [
      "O stoi lança exceção se o número não cabe em int, então use stoll para valores grandes.",
      "Espaços no início são ignorados, mas texto sem número lança invalid_argument.",
    ],
    tags: ["converter", "string para número", "parse", "base 2"],
    since: "C++11",
    link: `${REF}string/basic_string/stol`,
  },
  {
    id: "to_string",
    title: "to_string",
    signature: "to_string(x)",
    complexity: "O(dígitos)",
    example: c`string s = to_string(1234);
cout << s.size() << ' ' << s[0] << ' ' << to_string(2.5) << '\n';`,
    pitfalls: ["Com double ele usa seis casas fixas, então formate reais com setprecision."],
    tags: ["número para string", "converter", "dígitos"],
    since: "C++11",
    link: `${REF}string/basic_string/to_string`,
  },
  {
    id: "string_fill",
    title: "string(n, c)",
    signature: "string s(n, c);",
    complexity: "O(n)",
    example: c`string s(5, '.');
s[2] = '#';
cout << s << '\n' << string(3, 'a') + "b" << '\n';`,
    pitfalls: [
      "O segundo argumento é um char entre aspas simples, como '.', não uma string.",
      "É a forma rápida de montar uma linha de grid para imprimir.",
    ],
    tags: ["repetir", "preencher", "grid", "linha"],
    link: `${REF}string/basic_string/basic_string`,
  },
  {
    id: "string_append",
    title: "+= contra +",
    signature: "s += t;  // O(|t|)    s = s + t;  // O(|s| + |t|)",
    complexity: "+= custa O(|t|) amortizado, e s = s + t copia tudo",
    example: c`string s;
for (int i = 0; i < 5; i++) s += char('a' + i);
s += "!";
cout << s << ' ' << s.size() << '\n';`,
    pitfalls: [
      "s = s + c num laço copia a string toda a cada passo e vira O(n²).",
      "O push_back(c) e o += c fazem a mesma coisa.",
    ],
    tags: ["concatenar", "juntar", "append", "push_back"],
    link: `${REF}string/basic_string/operator%2B%3D`,
  },
  {
    id: "stringstream",
    title: "stringstream",
    signature: "stringstream ss(linha);  while (ss >> x)",
    complexity: "O(tamanho)",
    example: c`string line;
getline(cin, line);
stringstream ss(line);
int x, s = 0;
while (ss >> x) s += x;
cout << s << '\n';`,
    input: "3 4 5\n",
    pitfalls: [
      "É lento, então use só para quebrar linhas de tamanho desconhecido, não a entrada toda.",
      "Para reaproveitar o mesmo objeto chame ss.clear() e ss.str(nova).",
    ],
    tags: ["ler linha", "separar", "split", "istringstream"],
    link: `${REF}io/basic_stringstream`,
  },
  {
    id: "char_classes",
    title: "isdigit, tolower e afins",
    signature: "isdigit(c);  isalpha(c);  tolower(c);  toupper(c);",
    complexity: "O(1)",
    example: c`string s = "Ab3";
int d = 0;
for (char& ch : s) ch = tolower(ch), d += isdigit(ch) != 0;
cout << s << ' ' << d << '\n';`,
    pitfalls: [
      "O isdigit devolve um int diferente de zero, não necessariamente 1.",
      "Com char negativo (acentos em UTF-8) o comportamento é indefinido, então converta para unsigned char.",
    ],
    tags: ["caractere", "char", "maiúscula", "minúscula", "dígito"],
    link: `${REF}string/byte/isdigit`,
  },
  {
    id: "starts_with",
    title: "starts_with e ends_with",
    signature: "s.starts_with(t);  s.ends_with(t);",
    complexity: "O(|t|)",
    example: c`string s = "solucao.cpp";
cout << s.starts_with("sol") << s.ends_with(".py") << '\n';`,
    pitfalls: ["Existe na WF (C++20), mas não em juízes presos ao C++17."],
    tags: ["prefixo", "sufixo", "c++20"],
    since: "C++20",
    link: `${REF}string/basic_string/starts_with`,
  },
  {
    id: "string_contains",
    title: "string::contains",
    signature: "s.contains(t)",
    complexity: "O(n · m) no pior caso",
    example: c`string s = "maratona";
cout << s.contains("ton") << s.contains('z') << '\n';`,
    pitfalls: ["Não existe na WF (C++20), então use s.find(t) != string::npos."],
    tags: ["contém", "buscar", "c++23"],
    since: "C++23",
    judge: true,
    link: `${REF}string/basic_string/contains`,
  },
];
