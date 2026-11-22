auto fastExp = [](int base, int exp) -> int {
    if (base == 0) return 0;
    if (exp == 0) return 1;

    int acc = 1;
    while (exp) {
        if (exp & 1) {
            acc *= base;
        }
        base *= base;
        exp >>= 1;
    }
    return acc;
};
