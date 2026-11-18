import { createRng } from "../core/rng";

export type Language = "cpp" | "python";

export const LANGUAGES: readonly Language[] = ["cpp", "python"];

export const LANGUAGE_LABELS: Readonly<Record<Language, string>> = {
  cpp: "C++",
  python: "Python",
};

/** A curated piece of code to type (ADR-T10-1). */
export type Snippet = {
  readonly id: string;
  readonly language: Language;
  readonly text: string;
};

/**
 * Curated snippets (ADR-T10-1). Each text is a raw template literal, so a
 * "\n" inside the code stays literal; src/typing/corpus.test.ts checks the
 * rules (ASCII, at most 60 columns, 4-space indentation, no blank lines).
 */
const SNIPPETS: readonly Snippet[] = [
  {
    id: "cpp-binary-search",
    language: "cpp",
    text: String.raw`int lo = 0, hi = n - 1, ans = -1;
while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;
    if (a[mid] >= x) {
        ans = mid;
        hi = mid - 1;
    } else {
        lo = mid + 1;
    }
}`,
  },
  {
    id: "cpp-bfs",
    language: "cpp",
    text: String.raw`vector<int> dist(n, -1);
queue<int> q;
dist[s] = 0, q.push(s);
while (!q.empty()) {
    int u = q.front();
    q.pop();
    for (int v : adj[u]) {
        if (dist[v] != -1) continue;
        dist[v] = dist[u] + 1;
        q.push(v);
    }
}`,
  },
  {
    id: "cpp-fast-io",
    language: "cpp",
    text: String.raw`int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    cout << accumulate(a.begin(), a.end(), 0LL) << '\n';
    return 0;
}`,
  },
  {
    id: "cpp-sort-lambda",
    language: "cpp",
    text: String.raw`sort(v.begin(), v.end(), [](const auto &a, const auto &b) {
    if (a.first != b.first) return a.first < b.first;
    return a.second > b.second;
});`,
  },
  {
    id: "cpp-gcd",
    language: "cpp",
    text: String.raw`long long gcd(long long a, long long b) {
    while (b != 0) {
        a %= b;
        swap(a, b);
    }
    return a;
}`,
  },
  {
    id: "cpp-dsu",
    language: "cpp",
    text: String.raw`struct DSU {
    vector<int> p;
    DSU(int n) : p(n) { iota(p.begin(), p.end(), 0); }
    int find(int x) {
        return p[x] == x ? x : p[x] = find(p[x]);
    }
    void unite(int a, int b) { p[find(a)] = find(b); }
};`,
  },
  {
    id: "cpp-prefix-sums",
    language: "cpp",
    text: String.raw`vector<long long> pre(n + 1, 0);
for (int i = 0; i < n; i++) {
    pre[i + 1] = pre[i] + a[i];
}
auto sum = [&](int l, int r) { return pre[r] - pre[l]; };`,
  },
  {
    id: "cpp-two-pointers",
    language: "cpp",
    text: String.raw`int best = 0;
long long sum = 0;
for (int l = 0, r = 0; r < n; r++) {
    sum += a[r];
    while (sum > k) {
        sum -= a[l++];
    }
    best = max(best, r - l + 1);
}`,
  },
  {
    id: "cpp-map-count",
    language: "cpp",
    text: String.raw`map<string, int> freq;
for (const string &w : words) {
    freq[w]++;
}
for (const auto &[word, count] : freq) {
    cout << word << ' ' << count << '\n';
}`,
  },
  {
    id: "cpp-mod-pow",
    language: "cpp",
    text: String.raw`long long power(long long b, long long e, long long m) {
    long long r = 1;
    b %= m;
    while (e > 0) {
        if (e & 1) r = r * b % m;
        b = b * b % m;
        e >>= 1;
    }
    return r;
}`,
  },
  {
    id: "cpp-dijkstra",
    language: "cpp",
    text: String.raw`using P = pair<long long, int>;
priority_queue<P, vector<P>, greater<P>> pq;
dist[s] = 0, pq.push({0, s});
while (!pq.empty()) {
    auto [d, u] = pq.top();
    pq.pop();
    if (d > dist[u]) continue;
    for (auto [v, w] : adj[u]) {
        if (d + w >= dist[v]) continue;
        dist[v] = d + w, pq.push({dist[v], v});
    }
}`,
  },
  {
    id: "cpp-sieve",
    language: "cpp",
    text: String.raw`vector<bool> composite(n + 1, false);
vector<int> primes;
for (int i = 2; i <= n; i++) {
    if (composite[i]) continue;
    primes.push_back(i);
    for (long long j = 1LL * i * i; j <= n; j += i) {
        composite[j] = true;
    }
}`,
  },
  {
    id: "cpp-lis",
    language: "cpp",
    text: String.raw`vector<int> lis;
for (int x : a) {
    auto it = lower_bound(lis.begin(), lis.end(), x);
    if (it == lis.end()) lis.push_back(x);
    else *it = x;
}
cout << lis.size() << '\n';`,
  },
  {
    id: "py-binary-search",
    language: "python",
    text: String.raw`lo, hi = 0, len(a)
while lo < hi:
    mid = (lo + hi) // 2
    if a[mid] < x:
        lo = mid + 1
    else:
        hi = mid
print(lo)`,
  },
  {
    id: "py-bfs",
    language: "python",
    text: String.raw`from collections import deque
dist = [-1] * n
dist[s] = 0
q = deque([s])
while q:
    u = q.popleft()
    for v in adj[u]:
        if dist[v] == -1:
            dist[v] = dist[u] + 1
            q.append(v)`,
  },
  {
    id: "py-fast-input",
    language: "python",
    text: String.raw`import sys
input = sys.stdin.readline
n = int(input())
a = list(map(int, input().split()))
print(sum(a), max(a), min(a))`,
  },
  {
    id: "py-defaultdict",
    language: "python",
    text: String.raw`from collections import defaultdict
groups = defaultdict(list)
for word in words:
    key = "".join(sorted(word))
    groups[key].append(word)
print(len(groups))`,
  },
  {
    id: "py-comprehensions",
    language: "python",
    text: String.raw`squares = [x * x for x in range(10)]
evens = [x for x in squares if x % 2 == 0]
index = {x: i for i, x in enumerate(evens)}
grid = [[0] * m for _ in range(n)]`,
  },
  {
    id: "py-with-open",
    language: "python",
    text: String.raw`with open("input.txt") as f:
    lines = [line.strip() for line in f]
counts = {}
for line in lines:
    counts[line] = counts.get(line, 0) + 1`,
  },
  {
    id: "py-class",
    language: "python",
    text: String.raw`class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y
    def dist2(self, other):
        dx = self.x - other.x
        dy = self.y - other.y
        return dx * dx + dy * dy`,
  },
  {
    id: "py-sort-key",
    language: "python",
    text: String.raw`people.sort(key=lambda p: (-p.age, p.name))
best = max(scores, key=scores.get)
ranked = sorted(scores.items(), key=lambda kv: kv[1])`,
  },
  {
    id: "py-memo",
    language: "python",
    text: String.raw`from functools import lru_cache
@lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
print(fib(90))`,
  },
  {
    id: "py-counter",
    language: "python",
    text: String.raw`from collections import Counter
freq = Counter(s)
for ch, count in freq.most_common(3):
    print(f"{ch}: {count}")`,
  },
  {
    id: "py-dijkstra",
    language: "python",
    text: String.raw`import heapq
dist = [float("inf")] * n
dist[s] = 0
pq = [(0, s)]
while pq:
    d, u = heapq.heappop(pq)
    if d > dist[u]:
        continue
    for v, w in adj[u]:
        if d + w < dist[v]:
            dist[v] = d + w
            heapq.heappush(pq, (dist[v], v))`,
  },
  {
    id: "py-try-except",
    language: "python",
    text: String.raw`def parse(text):
    try:
        return int(text)
    except ValueError:
        return None
values = [parse(t) for t in tokens]
print([v for v in values if v is not None])`,
  },
  {
    id: "py-dataclass",
    language: "python",
    text: String.raw`from dataclasses import dataclass
@dataclass
class Edge:
    u: int
    v: int
    w: int = 1
edges = [Edge(0, 1, 5), Edge(1, 2)]
print(sum(e.w for e in edges))`,
  },
];

export const CORPUS: readonly Snippet[] = SNIPPETS;

/** A snippet of the given languages, picked with the seeded RNG. */
export function pickSnippet(seed: number, languages: readonly Language[]): Snippet {
  if (languages.length === 0) throw new RangeError("pick a snippet of at least one language");
  return createRng(seed).pick(CORPUS.filter((s) => languages.includes(s.language)));
}
