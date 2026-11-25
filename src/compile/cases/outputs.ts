// Recorded from real g++ 16.2 by `npm run compile:oracle -- --write` (ADR-T40-1).
export const RECORDED_OUTPUTS: Readonly<Record<string, string>> = {
  "comp-nao-declarado":
    "sol.cpp: In function 'int main()':\nsol.cpp:5:13: error: 'm' was not declared in this scope\n    5 |     cout << m << \"\\n\";\n      |             ^",
  "comp-ponto-e-virgula":
    "sol.cpp:5:2: error: expected ';' after struct definition\n    5 | }\n      |  ^\n      |  ;",
  "comp-chamada-incompativel":
    "sol.cpp: In function 'int main()':\nsol.cpp:6:9: error: no matching function for call to 'sort(std::vector<int>&)'\n    6 |     sort(v);\n      |     ~~~~^~~\n  • there are 4 candidates\nIn file included from /usr/include/c++/16/algorithm:63,\n                 from sol.cpp:1:\n    • candidate 1: 'template<class _RAIter> constexpr void std::sort(_RAIter, _RAIter)'\n      /usr/include/c++/16/bits/stl_algo.h:4807:5:\n       4807 |     sort(_RandomAccessIterator __first, _RandomAccessIterator __last)",
  "comp-escrita-em-const":
    "sol.cpp: In function 'void bump(const std::vector<int>&)':\nsol.cpp:4:10: error: assignment of read-only location '(& a)->std::vector<int>::operator[](0)'\n    4 |     a[0] += 1;",
  "comp-redeclaracao":
    "sol.cpp: In function 'int main()':\nsol.cpp:5:9: error: redeclaration of 'int ans'\n    5 |     int ans = 20;\n      |         ^~~\nsol.cpp:4:9: note: 'int ans' previously declared here\n    4 |     int ans = 10;\n      |         ^~~",
  "aviso-sombra":
    "sol.cpp: In function 'int main()':\nsol.cpp:6:13: warning: declaration of 'total' shadows a previous local [-Wshadow]\n    6 |         int total = i;\n      |             ^~~~~\nsol.cpp:4:9: note: shadowed declaration is here\n    4 |     int total = 10;\n      |         ^~~~~",
  "aviso-nao-inicializada":
    "sol.cpp: In function 'int main()':\nsol.cpp:4:9: warning: 'sum' is used uninitialized [-Wuninitialized]\n    4 |     int sum;\n      |         ^~~",
  "aviso-printf-tipo":
    "sol.cpp: In function 'int main()':\nsol.cpp:5:14: warning: format '%d' expects argument of type 'int', but argument 2 has type 'long long int' [-Wformat=]\n    5 |     printf(\"%d\\n\", ans);\n      |             ~^     ~~~\n      |              |     |\n      |              int   long long int\n      |             %lld",
  "aviso-comparacao-sinal":
    "sol.cpp: In function 'int main()':\nsol.cpp:6:23: warning: comparison of integer expressions of different signedness: 'int' and 'std::vector<int>::size_type' {aka 'long unsigned int'} [-Wsign-compare]\n    6 |     for (int i = 0; i < v.size(); i++) {\n      |                     ~~^~~~~~~~~~",
  "aviso-sem-retorno":
    "sol.cpp: In function 'int sign(int)':\nsol.cpp:6:1: warning: control reaches end of non-void function [-Wreturn-type]\n    6 | }\n      | ^",
  "asan-heap-oob":
    "==N==ERROR: AddressSanitizer: heap-buffer-overflow on address ADDR at pc ADDR bp ADDR sp ADDR\nREAD of size 4 at ADDR thread T0\n    #0 ADDR in main sol.cpp:6\nADDR is located 0 bytes after 16-byte region [ADDR,ADDR)\nallocated by thread T0 here:\n    #1 ADDR in main sol.cpp:4\nSUMMARY: AddressSanitizer: heap-buffer-overflow sol.cpp:6 in main",
  "asan-stack-oob":
    "==N==ERROR: AddressSanitizer: stack-buffer-overflow on address ADDR at pc ADDR bp ADDR sp ADDR\nREAD of size 4 at ADDR thread T0\n    #0 ADDR in main sol.cpp:7\nAddress ADDR is located in stack of thread T0 at offset 48 in frame\n    #0 ADDR in main sol.cpp:3\n  This frame has 1 object(s):\n    [32, 48) 'a' (line 4) <== Memory access at offset 48 overflows this variable\nSUMMARY: AddressSanitizer: stack-buffer-overflow sol.cpp:7 in main",
  "asan-uaf":
    "==N==ERROR: AddressSanitizer: heap-use-after-free on address ADDR at pc ADDR bp ADDR sp ADDR\nREAD of size 4 at ADDR thread T0\n    #0 ADDR in main sol.cpp:6\nADDR is located 0 bytes inside of 4-byte region [ADDR,ADDR)\nfreed by thread T0 here:\n    #1 ADDR in main sol.cpp:5\npreviously allocated by thread T0 here:\n    #1 ADDR in main sol.cpp:4\nSUMMARY: AddressSanitizer: heap-use-after-free sol.cpp:6 in main",
  "asan-stack-overflow":
    "==N==ERROR: AddressSanitizer: stack-overflow on address ADDR (pc ADDR bp ADDR sp ADDR T0)\n    #0 ADDR in dfs(int) sol.cpp:3\n    #1 ADDR in dfs(int) sol.cpp:4\n    #2 ADDR in dfs(int) sol.cpp:4\n    ... (frames repetidos)\nSUMMARY: AddressSanitizer: stack-overflow sol.cpp:3 in dfs(int)",
  "asan-global-oob":
    "==N==ERROR: AddressSanitizer: global-buffer-overflow on address ADDR at pc ADDR bp ADDR sp ADDR\nREAD of size 4 at ADDR thread T0\n    #0 ADDR in main sol.cpp:6\nADDR is located 0 bytes after global variable 'g' defined in 'sol.cpp:3:5' (ADDR) of size 16\nADDR is located 48 bytes before global variable '*.Lubsan_type4' defined in 'sol.cpp' (ADDR) of size 21\nSUMMARY: AddressSanitizer: global-buffer-overflow sol.cpp:6 in main",
  "ubsan-overflow":
    "sol.cpp:5:9: runtime error: signed integer overflow: 2000000000 * 2 cannot be represented in type 'int'",
  "ubsan-div-zero": "sol.cpp:6:15: runtime error: division by zero",
  "ubsan-shift":
    "sol.cpp:5:18: runtime error: shift exponent 32 is too large for 32-bit type 'int'",
  "ubsan-array-oob": "sol.cpp:6:18: runtime error: index 4 out of bounds for type 'int [4]'",
  "ubsan-nullptr": "sol.cpp:5:19: runtime error: load of null pointer of type 'int'",
  "glibcxx-vector-oob":
    "Error: attempt to subscript container with out-of-bounds index 3, but\ncontainer only holds 3 elements.\nBacktrace:\n    ADDR main\n    sol.cpp:6\ntype = std::debug::vector<int, std::allocator<int> >;",
  "glibcxx-iter-invalido":
    "Error: attempt to dereference a singular iterator.\nBacktrace:\n    ADDR main\n    sol.cpp:8\ntype = gnu_cxx::normal_iterator<int*, std::vector<int, std::allocator<int> > > (mutable iterator);",
  "glibcxx-iter-end":
    "Error: attempt to dereference a past-the-end iterator.\nBacktrace:\n    ADDR main\n    sol.cpp:7\ntype = gnu_cxx::normal_iterator<int*, std::vector<int, std::allocator<int> > > (mutable iterator);",
  "glibcxx-comparator":
    "Error: comparison doesn't meet irreflexive requirements, assert(!(a < a)).\nBacktrace:\n    ADDR ordenar(std::debug::vector<int, std::allocator<int> >&)\n    sol.cpp:6\n    ADDR main\n    sol.cpp:10\ntype = bool (*)(int, int);",
  "glibcxx-empty-back":
    "Error: attempt to access an element in an empty container.\nBacktrace:\n    ADDR main\n    sol.cpp:6\ntype = std::debug::vector<int, std::allocator<int> >;",
  "veredito-tle": "Veredito: TLE (tempo limite excedido: 2 s, saída 124)",
  "veredito-mle":
    "terminate called after throwing an instance of 'std::bad_alloc'\n  what():  std::bad_alloc\nVeredito: MLE (limite de memória excedido, sinal SIGABRT)",
  "veredito-sigsegv": "Veredito: RTE (sinal SIGSEGV — falha de segmentação)",
  "veredito-sigfpe": "Veredito: RTE (sinal SIGFPE — exceção aritmética)",
  "veredito-sigabrt":
    "sol: sol.cpp:7: int main(): Assertion `n > 0' failed.\nVeredito: RTE (sinal SIGABRT — abortado)",
};
