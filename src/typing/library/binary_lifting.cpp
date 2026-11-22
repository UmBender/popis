struct BL {
    static constexpr int K = 18;
    vector<array<int,K>> bl;
    int n;

    BL(vector<int>& p): n(p.size()), bl(p.size()) {
        for (int i = 0; i < n; i++) {
            bl[i][0] = p[i];
        }
        build();
    }

    void build() {
        for (int k = 1; k < K; k++) {
            for (int i = 0; i < n; i++) {
                int temp = bl[i][k - 1];
                bl[i][k] = bl[temp][k - 1];
            }
        }
    }

    int query(int actual, int k) {
        int ans = actual;
        for (int i = 0; i < K; i++) {
            if ((k >> i) & 1) {
                ans = bl[ans][i];
            }
        }
        return ans;
    }
};
