#include <iostream>
using namespace std;
int main() {
    long long a, b;
    cin >> a >> b;
    __int128 p = (__int128)a * b;
    cout << (long long)(p % 1000000007) << "\n";
}
