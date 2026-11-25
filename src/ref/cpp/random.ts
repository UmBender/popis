import type { EntryDraft } from "../model";

const c = String.raw;
const REF = "https://en.cppreference.com/w/cpp/";

/** Section 8: random numbers and the clock. */
export const RANDOM: readonly EntryDraft[] = [
  {
    id: "mt19937",
    title: "mt19937",
    signature: "mt19937 rng(chrono::steady_clock::now().time_since_epoch().count());",
    complexity: "O(1) por número",
    example: c`mt19937 rng(chrono::steady_clock::now().time_since_epoch().count());
mt19937_64 fixo(42);
cout << fixo() % 1000 << '\n';
cout << (rng() % 6 + 1 <= 6) << '\n';`,
    pitfalls: [
      "O rand() no Windows só vai até 32767 e é previsível, então use mt19937.",
      "Seed fixa deixa a solução hackeável no Codeforces, então use o relógio.",
    ],
    tags: ["aleatório", "random", "gerador", "seed"],
    since: "C++11",
    link: `${REF}numeric/random/mersenne_twister_engine`,
  },
  {
    id: "uniform_int_distribution",
    title: "uniform_int_distribution",
    signature: "uniform_int_distribution<int> d(l, r);  d(rng)  // em [l, r]",
    complexity: "O(1) por número",
    example: c`mt19937 rng(7);
uniform_int_distribution<int> d(1, 6);
int ok = 1;
for (int i = 0; i < 100; i++) { int x = d(rng); ok &= (1 <= x && x <= 6); }
cout << ok << '\n';`,
    pitfalls: [
      "O intervalo é fechado [l, r], diferente de rng() % n.",
      "A sequência pode mudar entre bibliotecas, então não grave saídas que dependem dela.",
    ],
    tags: ["aleatório", "intervalo", "dado", "distribuição"],
    link: `${REF}numeric/random/uniform_int_distribution`,
  },
  {
    id: "uniform_real_distribution",
    title: "uniform_real_distribution",
    signature: "uniform_real_distribution<double> d(a, b);  d(rng)  // em [a, b)",
    complexity: "O(1) por número",
    example: c`mt19937 rng(3);
uniform_real_distribution<double> d(0, 1);
double x = d(rng);
cout << (0 <= x && x < 1) << '\n';`,
    pitfalls: ["O intervalo é semiaberto [a, b), então b nunca sai."],
    tags: ["aleatório", "real", "double", "simulated annealing"],
    link: `${REF}numeric/random/uniform_real_distribution`,
  },
  {
    id: "shuffle",
    title: "shuffle",
    signature: "shuffle(v.begin(), v.end(), rng);",
    complexity: "O(n)",
    example: c`mt19937 rng(1);
vector<int> v = {1, 2, 3, 4, 5};
shuffle(v.begin(), v.end(), rng);
cout << accumulate(v.begin(), v.end(), 0) << ' ' << v.size() << '\n';`,
    pitfalls: ["O random_shuffle foi removido no C++17, então use shuffle com um mt19937."],
    tags: ["embaralhar", "aleatório", "permutação aleatória"],
    link: `${REF}algorithm/random_shuffle`,
  },
  {
    id: "time_cutoff",
    title: "Cortar a busca pelo relógio",
    signature: "auto t0 = chrono::steady_clock::now();",
    complexity: "O(1) por consulta",
    example: c`auto t0 = chrono::steady_clock::now();
auto passou = [&] { return chrono::duration<double>(chrono::steady_clock::now() - t0).count(); };
long long it = 0;
while (passou() < 0.05) it++;
cout << (it > 0) << '\n';`,
    pitfalls: [
      "Deixe folga grande, porque o juiz é mais lento que sua máquina e conta o tempo total.",
      "Consultar o relógio a cada iteração é caro, então olhe a cada 1000 iterações.",
    ],
    tags: ["tempo", "relógio", "chrono", "heurística", "timer"],
    link: `${REF}chrono/steady_clock`,
  },
];
