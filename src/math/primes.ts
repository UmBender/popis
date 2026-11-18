/** Smallest prime factor of an integer n ≥ 2, by trial division up to √n. */
export function smallestPrimeFactor(n: number): number {
  if (!Number.isSafeInteger(n) || n < 2) throw new RangeError(`no prime factor of ${n}`);
  if (n % 2 === 0) return 2;
  for (let d = 3; d * d <= n; d += 2) {
    if (n % d === 0) return d;
  }
  return n;
}

/** Whether n is a prime number; false below 2 and for non-integers. */
export function isPrime(n: number): boolean {
  return Number.isSafeInteger(n) && n >= 2 && smallestPrimeFactor(n) === n;
}
