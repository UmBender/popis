#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<long long> a(n + 1);
    for (int i = 1; i <= n; i++) cin >> a[i];
    int l, r;
    cin >> l >> r;
    long long s = 0;
    for (int i = l; i <= r; i++) s += a[i];
    cout << s << "\n";
}
