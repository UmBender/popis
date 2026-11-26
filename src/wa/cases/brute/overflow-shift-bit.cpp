#include <iostream>
using namespace std;
int main() {
    int k;
    cin >> k;
    unsigned long long ans = 1;
    for (int i = 0; i < k; i++) ans *= 2;
    cout << ans << "\n";
}
