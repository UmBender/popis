#include <iomanip>
#include <iostream>
using namespace std;
int main() {
    long long a, b;
    cin >> a >> b;
    cout << setprecision(10) << (double)((long double)a / (long double)b) << "\n";
}
