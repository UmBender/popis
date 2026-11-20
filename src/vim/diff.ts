/** A token of the text and where it starts: a run of word characters, a line break or one other character. */
type Token = { readonly text: string; readonly at: number };

function tokens(text: string): Token[] {
  return Array.from(text.matchAll(/\w+|\n|[^\w\n]/g), (m) => ({ text: m[0], at: m.index }));
}

/**
 * Which characters of `a` and of `b` differ: the tokens outside their longest
 * common subsequence. Word-level, so `int` against `long long` marks both
 * words whole.
 */
export function diffText(
  a: string,
  b: string,
): { readonly aMask: boolean[]; readonly bMask: boolean[] } {
  const aMask = Array.from<boolean>({ length: a.length }).fill(false);
  const bMask = Array.from<boolean>({ length: b.length }).fill(false);
  const ta = tokens(a);
  const tb = tokens(b);

  // What the texts share at both ends needs no search.
  let head = 0;
  while (head < ta.length && head < tb.length && ta[head]?.text === tb[head]?.text) head++;
  let tail = 0;
  while (
    tail < ta.length - head &&
    tail < tb.length - head &&
    ta[ta.length - 1 - tail]?.text === tb[tb.length - 1 - tail]?.text
  ) {
    tail++;
  }
  const ma = ta.slice(head, ta.length - tail);
  const mb = tb.slice(head, tb.length - tail);

  // Longest common subsequence of what is left.
  const width = mb.length + 1;
  const table = new Uint16Array((ma.length + 1) * width);
  for (let i = ma.length - 1; i >= 0; i--) {
    for (let j = mb.length - 1; j >= 0; j--) {
      table[i * width + j] =
        ma[i]?.text === mb[j]?.text
          ? (table[(i + 1) * width + j + 1] as number) + 1
          : Math.max(table[(i + 1) * width + j] as number, table[i * width + j + 1] as number);
    }
  }
  const keptA = new Set<number>();
  const keptB = new Set<number>();
  for (let i = 0, j = 0; i < ma.length && j < mb.length;) {
    if (ma[i]?.text === mb[j]?.text) {
      keptA.add(i++);
      keptB.add(j++);
    } else if ((table[(i + 1) * width + j] as number) >= (table[i * width + j + 1] as number)) {
      i++;
    } else {
      j++;
    }
  }

  const mark = (mask: boolean[], all: readonly Token[], kept: Set<number>) => {
    all.forEach((token, k) => {
      if (kept.has(k)) return;
      for (let c = 0; c < token.text.length; c++) mask[token.at + c] = true;
    });
  };
  mark(aMask, ma, keptA);
  mark(bMask, mb, keptB);
  return { aMask, bMask };
}
