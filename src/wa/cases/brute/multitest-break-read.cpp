#include <iostream>
#include <vector>
using namespace std;
int main() {
    int t;
    cin >> t;
    while (t--) {
        int n;
        cin >> n;
        vector<int> a(n);
        for (int i = 0; i < n; i++) cin >> a[i];
        bool ok = false;
        for (int x : a) if (x == 0) ok = true;
        cout << (ok ? "SIM\n" : "NAO\n");
    }
}
