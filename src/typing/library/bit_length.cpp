int bit_length(int val) {
    int counter = 0;
    while (val) {
        counter++;
        val /= 2;
    }
    return counter;
}
