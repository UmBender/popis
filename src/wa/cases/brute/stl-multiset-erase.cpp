#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int q;
    cin >> q;
    vector<int> a;
    while (q--) {
        char op;
        int x;
        cin >> op >> x;
        if (op == '+') a.push_back(x);
        else {
            auto it = find(a.begin(), a.end(), x);
            if (it != a.end()) a.erase(it);
        }
    }
    cout << a.size() << "\n";
}
