auto fastExp = [&](vvi base, int exp) -> vvi {
    vvi ans = getIden(base.size());
    for (int i = 0; i < 64; i++) {
        if ((exp >> i) & 1) {
            ans = mult(base, ans);
        }
        base = mult(base, base);
    }
    return ans;
};
