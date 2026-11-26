#include <iostream>
using namespace std;
int main() {
    long long n;
    cin >> n;
    int divs = 0;
    for (long long d = 1; d <= n; d++) {
        if (n % d == 0) divs++;
    }
    cout << (divs == 2 ? "SIM\n" : "NAO\n");
}
