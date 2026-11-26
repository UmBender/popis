#include <iostream>
using namespace std;
int main() {
    long long a, m;
    cin >> a >> m;
    long long r = a % m;
    if (r < 0) r += m;
    cout << r << "\n";
}
