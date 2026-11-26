#include <iostream>
using namespace std;
int main() {
    long long n;
    cin >> n;
    long long lo = 1, hi = 1000000000LL;
    while (lo < hi) {
        long long mid = lo + (hi - lo + 1) / 2;
        if ((__int128)mid * mid <= n) lo = mid;
        else hi = mid - 1;
    }
    cout << lo << "\n";
}
