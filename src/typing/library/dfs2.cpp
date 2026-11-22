void dfs2(int node, int parent = -1) {
    int actual = 1;
    for (int next : adj[node]) {
        if (next == parent) {
            continue;
        }
        dfs2(next, node);
        actual += subTree[next];
        dp1[node] += dp1[next];
        dp1[node] += subTree[next];
    }
    subTree[node] = actual;
}
