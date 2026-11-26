#include <iostream>
#include <numeric>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    long long total = 0;
    for (int s = 1; s <= n; s++) {
        total += m / gcd(s, m);
    }
    cout << total << "\n";
}
