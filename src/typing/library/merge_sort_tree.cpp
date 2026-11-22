struct MergeSortTree {
    int n;
    vector<vector<int>> tree;
    MergeSortTree(vector<int>& base): n(base.size()), tree(4 * n + 50) {
        build(1, 0, n - 1, base);
    }
    void build(int tp, int tl, int tr, vector<int>& a) {
        if (tr < tl) {
            return;
        }
        if (tl == tr) {
            tree[tp] = {a[tl]};
            return;
        }
        int tm = tl + (tr - tl) / 2;
        build(2 * tp, tl, tm, a);
        build(2 * tp + 1, tm + 1, tr, a);
        auto& first = tree[2 * tp];
        auto& second = tree[2 * tp + 1];
        tree[tp].resize(first.size() + second.size());

        merge(begin(first), end(first), begin(second), end(second), begin(tree[tp]));
    }
    int query(int l, int r, int k) {
        return query(1, 0, n - 1, l, r, k);
    }

    int query(int tp, int tl, int tr, int l, int r, int k) {
        if (tl > r || tr < l) {
            return 0;
        }
        if (l <= tl && tr <= r) {
            int temp = lower_bound(begin(tree[tp]), end(tree[tp]), k) - begin(tree[tp]);
            return temp;
        }
        int tm = tl + (tr - tl) / 2;
        return query(tp * 2, tl, tm, l, r, k) + query(tp * 2 + 1, tm + 1, tr, l, r, k);
    }
};
