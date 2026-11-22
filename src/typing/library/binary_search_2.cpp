int bs(function<int(int)> f, int target, int upper_bound) {
  int left = 0;
  int right = upper_bound;
  while (left <= right) {
    int middle = left + (right - left) / 2;
    if (f(middle) <= target && f(middle + 1) > target) {
      return middle;
    }

    if (f(middle) > target) {
      right = middle - 1;
    } else {
      left = middle + 1;
    }
  }
  return -1;
}
