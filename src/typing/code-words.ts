/**
 * Programming keywords and identifiers written for weak-spot typing (ADR-T30-1):
 * lowercase printable ASCII, unique, no whitespace.
 */
const RAW_CODE_WORDS = `
const return while struct vector queue deque stack graph query prefix suffix
binary search matrix vertex weight parent child depth height length string
double sizeof switch lambda import yield async await class throw catch break
public static inline extern friend assert printf scanf memcpy memset sort
swap push pop size find next prev node edge dist cost path tree root leaf
heap hash mask bits freq rank lazy fenwick dijkstra kruskal floyd trie lca
scc mst bfs dfs gcd lcm mod pow exp log sqrt ceil floor clamp begin end
front back empty clear erase insert append extend filter reduce sorted format
object module export default boolean number buffer stream socket parser
tokens syntax cursor window target result record config option params values
counts totals median sample bucket offset stride factor tuple pair array
index count limit bound lower upper pivot merge split shift slice clone check
valid error match state table cache range delta alpha beta gamma theta sigma
omega proxy quote quick quiet equal equip mixed fixed boxed voxel pixel extra
exact exist fuzzy zebra zoned jazzy quack knuth auto void bool char short
long float signed unsigned typedef using namespace template typename virtual
override explicit constexpr noexcept volatile register mutable private
protected enum union goto continue case default switch try finally raise
except pass elif global nonlocal assert del from with open close read write
flush seek tell print input eval exec super self cls none true false int
uint size_t ptrdiff iter step span view slice_t map set dict list tuple_t
key val cur pos idx len cap max min sum ans res tmp aux ptr ref req hdr
ack crc msg pkt cmd arg env cwd dir tmpdir pathbuf regex glob match_t
chunk frame patch diff commit branch merge_t stash tag fork join spawn
mutex lock guard atomic thread fiber future promise channel select poll
epoll kqueue timer clock tick epoch seed rng hash_t salt digest cipher
encode decode parse lex ast ir cfg ssa dom phi loop hoist unroll vectorize
`;

export const CODE_WORDS: readonly string[] = [...new Set(RAW_CODE_WORDS.trim().split(/\s+/))];
