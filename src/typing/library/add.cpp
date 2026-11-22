void add(string &s) {
    int node = 0;
    for (int i = 0; i < s.size(); i++) {
        int ch = s[i] - 'a';
        if (trie[node].next[ch] == -1) { trie[node].next[ch] = actual++; }
        node = trie[node].next[ch];
    }
    trie[node].cnt = 1;
}
