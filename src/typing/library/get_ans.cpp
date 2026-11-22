auto getAns = [&](pii key) -> int & {
    int pos = lower_bound(begin(rev), end(rev), key) - begin(rev);
    return ans[pos];
};
