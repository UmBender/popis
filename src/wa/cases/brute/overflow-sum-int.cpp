#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    __int128 s = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        s += x;
    }
    cout << (long long)s << "\n";
}
