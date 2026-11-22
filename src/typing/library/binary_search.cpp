int bsl(vector<int> &arr, int lower) {
    int left = 0;
    int right = arr.size() - 1;
    int mmax = -1;
    while (left <= right) {
        int m = (left + right) / 2;
        if (arr[m] <= lower) {
            mmax = m;
            left = m + 1;
        } else {
            right = m - 1;
        }
    }
    return mmax;
}
