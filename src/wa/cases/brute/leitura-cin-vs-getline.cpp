#include <iostream>
#include <string>
using namespace std;
int main() {
    string nline, name;
    getline(cin, nline);
    getline(cin, name);
    cout << name << ": " << stoi(nline) << "\n";
}
