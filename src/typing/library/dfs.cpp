auto dfs = [&](auto &&self, int actual) -> void {
    int left = nodes[actual].left, right = nodes[actual].right;
    if (left != -1) {
        self(self, left);
        nodes[actual].in = nodes[left].in;
    }
    if (right != -1) {
        self(self, right);
        nodes[actual].out = nodes[right].out;
    }
    ll calc = (nodes[actual].out - nodes[actual].in + 1) * nodes[actual].val;
    mmax = max(mmax, calc);
};
