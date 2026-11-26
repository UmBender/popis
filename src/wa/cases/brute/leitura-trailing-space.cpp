#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    bool first = true;
    for (int i = 0; i < n; i++) {
        int x;
        cin >> x;
        if (x % 2 == 0) {
            if (!first) cout << " ";
            cout << x;
            first = false;
        }
    }
    cout << "\n";
}
