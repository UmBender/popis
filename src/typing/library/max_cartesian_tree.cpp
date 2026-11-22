template <class T> vector<int> maxCartesianTree(const vector<T> &a) {
    int n = (int)a.size();
    vector<int> par(n, -1), st;
    for (int i = 0; i < n; i++) {
        int last = -1;
        while (!st.empty() && a[st.back()] < a[i]) last = st.back(), st.pop_back();
        if (last != -1) par[last] = i;
        if (!st.empty()) par[i] = st.back();
        st.push_back(i);
    }
    return par;
}
