ll fastExp(ll base, ll exp) {
    ll acc = 1;
    while (exp) {
        if (exp & 1) {
            acc *= base;
            acc %= MOD;
        }
        base *= base;
        base %= MOD;
        exp >>= 1;
    }
    return acc;
}
