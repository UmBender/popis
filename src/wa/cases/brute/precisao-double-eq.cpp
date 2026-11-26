#include <cmath>
#include <iostream>
using namespace std;
int main() {
    double a, b, c;
    cin >> a >> b >> c;
    long long ia = llround(a * 100.0);
    long long ib = llround(b * 100.0);
    long long ic = llround(c * 100.0);
    cout << (ia + ib == ic ? "SIM\n" : "NAO\n");
}
