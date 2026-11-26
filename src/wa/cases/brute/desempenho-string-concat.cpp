#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    long long h = 0;
    for (int i = 0; i < n; i++) {
        int val = (i % 26) + 1;
        h = (h * 31 + val) % 1000000007;
    }
    cout << h << "\n";
}
