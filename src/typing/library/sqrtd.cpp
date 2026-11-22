int sqrtd(int value) {
    int l = 0, r = 1E5;
    while (l <= r) {
        int m = l + (r - l) / 2;
        if (m * m == value) {
            return m;
        }
        if (m * m < value) {
            l = m + 1;
        } else {
            r = m - 1;
        }
    }
    return -1;
}
