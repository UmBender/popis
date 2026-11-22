struct FenwickTree {
    int n;
    vector<int> t;
    FenwickTree(int _n): n(_n + 1), t(_n + 1) {}

    void add(int pos, int delta) {
        for (pos++; pos < n; pos += -pos&pos) {
            t[pos] += delta;
        }
    }

    int query(int r) {
        int acc = 0;
        for (r++; r > 0; r -= -r&r) {
            acc += t[r];
        }
        return acc;
    }
    int query(int l, int r) {
        return query(r) - query(l - 1);
    }
};
