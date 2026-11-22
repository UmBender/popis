vector<int> build_pi_s(string &s) {
    vector<int> pi_s(s.size());
    int len = 0;
    for (int i = 1; i < s.size(); i++) {
        if (s[i] == s[len]) {
            len++;
            pi_s[i] = len;
        } else {
            while (len > 0) {
                len = pi_s[len - 1];
                if (s[i] == s[len]) {
                    len++;
                    pi_s[i] = len;
                    break;
                }
            }
            if (len == 0) { pi_s[i] = 0; }
        }
    }
    return pi_s;
}
