#include <iostream>
#include <vector>
using namespace std;
int main() {
    int t;
    cin >> t;
    while (t--) {
        int n, m;
        cin >> n >> m;
        vector<int> deg(n + 1, 0);
        for (int i = 0; i < m; i++) {
            int u, v;
            cin >> u >> v;
            deg[u]++;
            deg[v]++;
        }
        cout << deg[n] << "\n";
    }
}
