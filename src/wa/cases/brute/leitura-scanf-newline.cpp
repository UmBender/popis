#include <iostream>
using namespace std;
int main() {
    int t, ans = 0;
    cin >> t;
    for (int i = 0; i < t; i++) {
        char c;
        cin >> c;
        if (c == 'A') ans++;
    }
    cout << ans << "\n";
}
