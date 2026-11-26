#include <iostream>
using namespace std;
int main() {
    long long n;
    cin >> n;
    const long long MOD = 1000000007;
    long long tri = (n * (n + 1) / 2) % MOD;
    cout << (1 + tri) % MOD << "\n";
}
