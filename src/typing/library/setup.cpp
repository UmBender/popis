void setup() {
    fact[0] = 1;
    invFact[0] = 1;
    for (int i = 1; i < SIZE; i++) {
        fact[i] = fact[i - 1] * i;
        fact[i] %= MOD;
    }
    invFact[SIZE - 1] = inv(fact[SIZE - 1]);
    for (int i = SIZE - 2; i >= 1; i--) {
        invFact[i] = invFact[i + 1];
        invFact[i] *= (i + 1);
        invFact[i] %= MOD;
    }
}
