#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<int> pos;
    for (int i = 0; i < n; i++) {
        int x;
        cin >> x;
        if (x > 0) pos.push_back(x);
    }
    if (pos.empty()) cout << -1 << "\n";
    else cout << *min_element(pos.begin(), pos.end()) << "\n";
}
