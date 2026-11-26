#include <iostream>
using namespace std;
int main() {
    int n, x;
    cin >> n >> x;
    int cnt = 0;
    for (int i = 0; i < n; i++) {
        int v;
        cin >> v;
        if (v <= x) cnt++;
    }
    cout << cnt << "\n";
}
