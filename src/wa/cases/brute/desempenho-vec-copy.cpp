#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<int> c(n);
    for (int i = 0; i < n; i++) c[i] = (i * 37 + 11) % 100;
    vector<int> dp(n, 0);
    dp[0] = c[0];
    if (n > 1) dp[1] = c[0] + c[1];
    for (int i = 2; i < n; i++) dp[i] = c[i] + min(dp[i - 1], dp[i - 2]);
    cout << dp[n - 1] << "\n";
}
