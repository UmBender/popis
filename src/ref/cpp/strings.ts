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
    pair: "py/slicing",
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
    pair: "py/str_find_index",
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
    pair: "py/int_base_bin_hex",
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
    pair: "py/avoid_str_plus",
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
    pair: "py/str_split",
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
    pair: "py/ord_chr",
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
    pair: "py/str_prefix_suffix",
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
  {
    id: "boyer_moore_searcher",
    title: "std::search com boyer_moore_searcher",
    signature: "search(t.begin(), t.end(), boyer_moore_searcher(p.begin(), p.end()))",
    complexity: "linear em média, O(n·m) no pior caso",
    example: c`string t = "abracadabra", p = "cada";
auto it = search(t.begin(), t.end(), boyer_moore_searcher(p.begin(), p.end()));
auto it2 = search(t.begin(), t.end(), boyer_moore_horspool_searcher(p.begin(), p.end()));
cout << (it - t.begin()) << ' ' << (it2 - t.begin()) << '\n';`,
    pitfalls: [
      "Tanto boyer_moore_searcher quanto boyer_moore_horspool_searcher podem degradar para O(n·m) em entradas repetitivas, então use KMP ou função Z para garantir O(n + m).",
      "Reaproveite o mesmo objeto searcher ao buscar o mesmo padrão em vários textos para não refazer a tabela.",
    ],
    tags: [
      "boyer",
      "horspool",
      "boyer_moore_horspool_searcher",
      "busca de padrão",
      "search",
      "padrão",
    ],
    since: "C++17",
    link: `${REF}utility/functional/boyer_moore_searcher`,
  },
  {
    id: "kmp",
    title: "KMP — busca de padrão (função prefixo)",
    signature: "pi[i] = maior borda própria de s[0..i]  // O(n + m) garantido",
    complexity: "O(n + m) no pior caso",
    example: c`string p = "aba", t = "ababa", s = p + '#' + t;
vector<int> pi(s.size());
for (int i = 1, j = 0; i < (int)s.size(); i++) {
  while (j && s[i] != s[j]) j = pi[j - 1];
  pi[i] = j += (s[i] == s[j]); }
for (int i = 4; i < (int)s.size(); i++) { if (pi[i] == 3) cout << i - 6 << ' '; } cout << '\n';`,
    pitfalls: [
      "O separador '#' não pode aparecer no padrão nem no texto, senão um casamento pode atravessar a fronteira.",
      "Para um casamento terminado em i na string p + '#' + t, o início no texto t é i - 2 * |p|.",
    ],
    tags: [
      "kmp",
      "prefix function",
      "função prefixo",
      "busca de padrão",
      "padrão",
      "linear",
      "borda",
    ],
    link: `${REF}algorithm/search`,
  },
  {
    id: "z_function",
    title: "Função Z",
    signature: "z[i] = LCP de s com o sufixo s[i..]  // O(n + m) garantido",
    complexity: "O(n + m) no pior caso",
    example: c`string s = "aba#ababa"; int n = s.size(); vector<int> z(n);
for (int i = 1, l = 0, r = 0; i < n; i++) {
  if (i < r) z[i] = min(r - i, z[i - l]);
  while (i + z[i] < n && s[z[i]] == s[i + z[i]]) z[i]++;
  if (i + z[i] > r) l = i, r = i + z[i]; }
for (int i = 4; i < n; i++) { if (z[i] == 3) cout << i - 4 << ' '; } cout << '\n';`,
    pitfalls: [
      "z[0] fica 0 nesta forma, então comece o laço em i = 1 e trate o prefixo inteiro à parte se precisar.",
      "Ao concatenar p + '#' + t, cada posição i > |p| com z[i] == |p| marca o início de um casamento em i - |p| - 1.",
    ],
    tags: ["função z", "z algorithm", "z_function", "busca de padrão", "padrão", "lcp", "linear"],
    link: `${REF}algorithm/search`,
  },
  {
    id: "string_view",
    title: "string_view",
    signature: "string_view sv(s);  sv.substr(pos, len);",
    complexity: "O(1) para criar e para substr",
    example: c`string s = "maratona";
string_view sv(s);
string_view sub = sv.substr(2, 3);
cout << sub << ' ' << sub.size() << '\n';`,
    pitfalls: [
      "Não é dona dos caracteres, então nunca guarde uma string_view apontando para uma string temporária ou que será realocada.",
      "sv.data() não garante terminador nulo '\\0', então nunca passe direto para funções de C como printf(\"%s\").",
    ],
    tags: ["string_view", "fatia", "substr o(1)", "sem cópia", "c++17"],
    since: "C++17",
    link: `${REF}string/basic_string_view`,
  },
  {
    id: "from_chars_to_chars",
    title: "from_chars e to_chars",
    signature: "from_chars(ini, fim, x);  to_chars(buf, buf + N, x);",
    complexity: "O(dígitos), sem alocação nem locale",
    example: c`char buf[32];
auto [p, e1] = to_chars(buf, buf + 32, 123456789LL);
long long x = 0;
auto [q, e2] = from_chars(buf, p, x);
cout << string(buf, p) << ' ' << x << ' ' << (e1 == errc{} && e2 == errc{} && q == p) << '\n';`,
    pitfalls: [
      "Não pula espaços iniciais nem aceita '+' na frente, e devolve erro em ec em vez de lançar exceção.",
      "to_chars não coloca '\\0' no final do buffer, então use o ponteiro p devolvido como limite.",
    ],
    tags: ["from_chars", "to_chars", "charconv", "parse rápido", "converter", "c++17"],
    since: "C++17",
    link: `${REF}utility/from_chars`,
  },
];
