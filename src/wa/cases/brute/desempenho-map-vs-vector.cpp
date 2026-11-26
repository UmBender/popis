#include <iostream>
#include <set>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    set<int> s;
    for (int i = 1; i <= n; i++) {
        s.insert((int)((1LL * i * i) % m));
    }
    cout << s.size() << "\n";
}
