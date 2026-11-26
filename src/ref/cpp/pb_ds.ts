import type { EntryDraft } from "../model";

const c = String.raw;
const REF = "https://en.cppreference.com/w/cpp/";

/** Section 9: GNU policy-based data structures (pb_ds). */
export const PB_DS: readonly EntryDraft[] = [
  {
    id: "ordered_set",
    title: "ordered_set (pb_ds)",
    signature: "tree<T, null_type, less<T>, rb_tree_tag, tree_order_statistics_node_update>",
    complexity: [
      ["insert / erase / find", "O(log n)"],
      ["find_by_order(k)", "O(log n)"],
      ["order_of_key(x)", "O(log n)"],
    ],
    example: c`#include <ext/pb_ds/assoc_container.hpp>
using namespace __gnu_pbds;
tree<int, null_type, less<int>, rb_tree_tag, tree_order_statistics_node_update> s;
for (int x : {5, 1, 9}) s.insert(x);
cout << *s.find_by_order(1) << ' ' << s.order_of_key(9) << '\n';`,
    pitfalls: [
      "Com less<T> ele não guarda repetidos, então para um multiconjunto use pares (valor, índice).",
      "Só existe no GCC, que é o compilador da maratona.",
    ],
    tags: ["ordered set", "pb_ds", "k-ésimo", "order statistics"],
    link: `${REF}container/set`,
  },
  {
    id: "ordered_map",
    title: "ordered_map (tree do pb_ds)",
    signature: "tree<K, V, less<K>, rb_tree_tag, tree_order_statistics_node_update>",
    complexity: [
      ["m[k] / insert / erase / find", "O(log n)"],
      ["find_by_order(k)", "O(log n)"],
      ["order_of_key(k)", "O(log n)"],
    ],
    example: c`#include <ext/pb_ds/assoc_container.hpp>
using namespace __gnu_pbds;
tree<int, int, less<int>, rb_tree_tag, tree_order_statistics_node_update> m;
m[10] = 1; m[30] = 3; m[20] = 2;
auto it = m.find_by_order(1);
cout << it->first << ':' << it->second << ' ' << m.order_of_key(25) << '\n';`,
    pitfalls: [
      "Trocar null_type pelo tipo do valor transforma a tree num mapa com m[k], find_by_order e order_of_key.",
      "find_by_order(k) devolve end() quando k >= size(), então verifique antes de desreferenciar.",
    ],
    tags: ["ordered map", "pb_ds", "tree", "mapa ordenado", "k-ésimo"],
    link: `${REF}container/map`,
  },
  {
    id: "ordered_multiset",
    title: "ordered_multiset (par com índice)",
    signature:
      "tree<pair<T, int>, null_type, less<pair<T, int>>, rb_tree_tag, tree_order_statistics_node_update>",
    complexity: [
      ["insert / erase / lower_bound", "O(log n)"],
      ["find_by_order(k) / order_of_key({x, 0})", "O(log n)"],
    ],
    example: c`#include <ext/pb_ds/assoc_container.hpp>
using namespace __gnu_pbds;
using oms = tree<pair<int, int>, null_type, less<pair<int, int>>, rb_tree_tag, tree_order_statistics_node_update>;
oms s; int id = 0; for (int x : {5, 2, 5, 8}) s.insert({x, id++});
s.erase(s.lower_bound({5, 0}));
cout << s.size() << ' ' << s.find_by_order(1)->first << ' ' << s.order_of_key({5, 0}) << '\n';`,
    pitfalls: [
      "Usar less_equal<T> quebra find e erase e inverte lower_bound com upper_bound, então use pares (valor, id).",
      "Antes de apagar com s.erase(it), confira se it != s.end() e it->first == x.",
    ],
    tags: ["ordered multiset", "multiconjunto ordenado", "pb_ds", "less_equal", "repetidos"],
    link: `${REF}container/multiset`,
  },
  {
    id: "pbds_split_join",
    title: "tree::split e join (pb_ds)",
    signature: "a.split(chave, b);  a.join(b);",
    complexity: "O(log n) para split e join",
    example: c`#include <ext/pb_ds/assoc_container.hpp>
using namespace __gnu_pbds;
using oset = tree<int, null_type, less<int>, rb_tree_tag, tree_order_statistics_node_update>;
oset a, b; for (int x : {1, 3, 5, 7}) a.insert(x);
a.split(3, b); cout << a.size() << ' ' << b.size() << ' ';
a.join(b); cout << a.size() << ' ' << b.size() << '\n';`,
    pitfalls: [
      "a.split(k, b) apaga o conteúdo anterior de b e move para b todas as chaves estritamente maiores que k.",
      "a.join(b) exige que todas as chaves de uma árvore sejam menores que todas as da outra e esvazia b.",
    ],
    tags: ["split", "join", "pb_ds", "tree", "fundir árvores"],
    link: `${REF}container/set/merge`,
  },
  {
    id: "pbds_trie",
    title: "trie com prefix_range (pb_ds)",
    signature:
      "trie<string, null_type, trie_string_access_traits<>, pat_trie_tag, trie_prefix_search_node_update>",
    complexity: [
      ["insert / erase / find", "O(|s|)"],
      ["prefix_range(p)", "O(|p|) para os iteradores"],
    ],
    example: c`#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/trie_policy.hpp>
using namespace __gnu_pbds;
trie<string, null_type, trie_string_access_traits<>, pat_trie_tag, trie_prefix_search_node_update> tr;
for (string w : {"ab", "abc", "abd", "b"}) tr.insert(w);
auto [l, r] = tr.prefix_range("ab"); cout << distance(l, r) << ' ' << *l << '\n';`,
    pitfalls: [
      "Inclua também <ext/pb_ds/trie_policy.hpp>, senão trie_prefix_search_node_update não existe.",
      "distance(l, r) percorre todos os resultados do prefixo, então custa O(saída) e não O(1).",
    ],
    tags: ["trie", "prefix_range", "prefixo", "pb_ds", "patricia"],
    link: `${REF}container/set`,
  },
  {
    id: "pbds_priority_queue",
    title: "priority_queue com join e modify (pb_ds)",
    signature: "__gnu_pbds::priority_queue<T, less<T>, pairing_heap_tag> pq;",
    complexity: [
      ["push / top / join", "O(1)"],
      ["pop / modify / erase", "O(log n) amortizado"],
    ],
    example: c`#include <ext/pb_ds/priority_queue.hpp>
__gnu_pbds::priority_queue<int> a, b;
auto it = a.push(3);
a.modify(it, 10);
b.push(7); a.join(b);
cout << a.top() << ' ' << a.size() << ' ' << b.size() << '\n';`,
    pitfalls: [
      "Qualifique como __gnu_pbds::priority_queue porque priority_queue colide com o std::priority_queue.",
      "O point_iterator devolvido por push permanece válido após join e permite decrease-key com modify.",
    ],
    tags: [
      "pb_ds",
      "priority_queue",
      "pairing heap",
      "modify",
      "join",
      "point_iterator",
      "decrease key",
    ],
    link: `${REF}container/priority_queue`,
  },
  {
    id: "cc_hash_table",
    title: "cc_hash_table (pb_ds)",
    signature: "cc_hash_table<K, V, Hash> m;",
    complexity: [
      ["m[k] / find / erase", "O(1) médio"],
      ["pior caso sem hash próprio", "O(n)"],
    ],
    example: c`#include <ext/pb_ds/assoc_container.hpp>
using namespace __gnu_pbds;
cc_hash_table<int, int> m;
m[10] = 42;
m[20] = 99;
cout << m[10] << ' ' << (m.find(30) == m.end()) << '\n';`,
    pitfalls: [
      "Usa encadeamento separado (chaining), então costuma perder do gp_hash_table em consultas mas aguenta melhor remoções frequentes.",
      "Não tem count(), então verifique existência com m.find(k) != m.end().",
    ],
    tags: ["cc_hash_table", "hash", "tabela hash", "pb_ds", "chaining"],
    link: `${REF}container/unordered_map`,
  },
  {
    id: "gp_hash_table",
    title: "gp_hash_table (pb_ds)",
    signature: "gp_hash_table<K, V> m;",
    complexity: [
      ["m[k] / find / erase", "O(1) médio (probing, em geral mais rápido que unordered_map)"],
      ["pior caso sem hash próprio", "O(n)"],
    ],
    example: c`#include <ext/pb_ds/assoc_container.hpp>
using namespace __gnu_pbds;
gp_hash_table<int, int> m;
m[3] = 7;
cout << m[3] << ' ' << (m.find(4) == m.end()) << '\n';`,
    pitfalls: [
      "Também sofre com testes contra o hash padrão, então passe um hash próprio como o splitmix64.",
      "Não tem count(), então teste existência com m.find(k) != m.end().",
    ],
    tags: ["hash", "tabela hash", "pb_ds", "dicionário", "gp_hash_table"],
    link: `${REF}container/unordered_map`,
  },
  {
    id: "gp_hash_table_hash",
    title: "gp_hash_table com splitmix64",
    signature: "gp_hash_table<long long, int, SplitMix64> m;",
    complexity: "O(1) esperado mesmo contra testes adversariais",
    example: c`#include <ext/pb_ds/assoc_container.hpp>
struct H { size_t operator()(uint64_t x) const {
  x += 0x9e3779b97f4a7c15; x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9;
  x = (x ^ (x >> 27)) * 0x94d049bb133111eb; return x ^ (x >> 31); } };
__gnu_pbds::gp_hash_table<long long, int, H> m;
m[1000000007LL] = 9; cout << m[1000000007LL] << '\n';`,
    pitfalls: [
      "Em provas hackeáveis, some uma constante vinda de chrono::steady_clock antes do splitmix64 para impedir colisões planejadas.",
      "Como o gp_hash_table usa tabela de tamanho potência de 2, um hash fraco como identidade colide ainda mais fácil que no unordered_map.",
    ],
    tags: ["gp_hash_table", "splitmix64", "anti-hash", "hash próprio", "pb_ds"],
    link: `${REF}container/unordered_map`,
  },
];
