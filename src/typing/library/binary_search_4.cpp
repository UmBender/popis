while (l < r) {
    ll mid = l + (r - l + 1) / 2;
    if (check(a, mid, len)) {
        l = mid;
    } else {
        r = mid - 1;
    }
}
