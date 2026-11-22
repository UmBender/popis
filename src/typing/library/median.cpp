auto median = [&]() -> int {
    int l = 0, r = bs.size() - 1;
    int ans = 0;
    while (l <= r) {
        int m = (l + r) / 2;
        int acc = cnt.query(0, m);
        if (acc * 2 >= k) {
            ans = m;
            r = m - 1;
        } else {
            l = m + 1;
        }
    }
    return ans;
};
