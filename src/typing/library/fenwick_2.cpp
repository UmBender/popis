struct BIT {
    int n;
    vector<int> t;
    BIT(int n): n(n + 1), t(n + 1) {}
    inline void update(int r, int delta) {
        for (r++; r < n; r += (-r&r)) {
            t[r] += delta;
            t[r] %= MOD;
        }
    }

    inline void update(int l, int r, int delta) {
        update(l, delta);
        update(r + 1, -delta);

    }

    inline int query(int r) {
        int acc = 0;
        for (r++; r > 0; r -= (-r&r)) {
            acc += t[r];
            acc %= MOD;
        }
        return acc;
    }
};
