struct SegTree {
    vector<int>            a;
    vector<pair<int, int>> tree;
    SegTree(vector<int> &a) : a(a), tree(a.size() * 4, {0, 0}) {
        build(1, 0, a.size() - 1);
    }

    void build(int64_t pos, int64_t tl, int64_t tr) {
        if (tl == tr) {
            tree[pos].first  = a[tl];
            tree[pos].second = max(a[tl], 0LL);

            return;
        }

        int64_t tm = (tl + tr) / 2;
        build(2 * pos, tl, tm);
        build(2 * pos + 1, tm + 1, tr);

        tree[pos] = {tree[pos * 2].first + tree[pos * 2 + 1].first,
                     max(tree[pos * 2].first + tree[pos * 2 + 1].second,
                         tree[pos * 2].second)};
    }

    void update(int64_t pos, int64_t tl, int64_t tr, int64_t value_pos,
                int value) {
        if (tl == tr) {
            tree[pos].first  = value;
            tree[pos].second = max(0LL, value);
            return;
        }

        int64_t tm = (tl + tr) / 2;
        if (tm >= value_pos) {
            update(pos * 2, tl, tm, value_pos, value);
        } else {
            update(pos * 2 + 1, tm + 1, tr, value_pos, value);
        }

        tree[pos].first  = tree[pos * 2].first + tree[pos * 2 + 1].first;
        tree[pos].second = max(tree[pos * 2].first + tree[pos * 2 + 1].second,
                               tree[pos * 2].second);
    }

    inline void update(int64_t value_pos, int value) {
        update(1, 0, a.size() - 1, value_pos, value);
    }

    pair<int, int> query(int64_t pos, int64_t tl, int64_t tr, int64_t l,
                         int64_t r) {
        if (l > r) {
            return {0, 0};
        }

        if (tl == l && tr == r) {
            return tree[pos];
        }

        int64_t        tm   = (tl + tr) / 2;
        pair<int, int> left = query(pos * 2, tl, tm, l, min(tm, r));
        pair<int, int> right =
            query(pos * 2 + 1, tm + 1, tr, max(tm + 1, l), r);

        pair<int, int> term;
        term.first  = left.first + right.first;
        term.second = max(left.second, right.second + left.first);
        return term;
    }

    inline pair<int, int> query(int64_t l, int64_t r) {
        return query(1, 0, a.size() - 1, l, r);
    }
};
