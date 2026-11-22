export type TranscriptFrame = {
  readonly cmd: string | null;
  readonly output: readonly string[];
  readonly line: number | null;
  readonly breakpoints: readonly number[];
};

export type LessonTranscript = {
  readonly programId: string;
  readonly frames: readonly TranscriptFrame[];
};

// Recorded from real GNU gdb 18.1 by `npm run gdb:oracle -- --write` (ADR-T25-1).
export const LESSON_TRANSCRIPTS: Readonly<Record<string, LessonTranscript>> = {
  "u1-compile": {
    programId: "sum-loop",
    frames: [
      {
        cmd: null,
        output: ["Reading symbols from ./sum-loop..."],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "start",
        output: [
          "Temporary breakpoint 1 at ADDR: file sol.cpp, line 3.",
          "Temporary breakpoint 1, main () at sol.cpp:3",
          "3\t  int a[] = {3, 7, 2, 8, 5, 1};",
        ],
        line: 3,
        breakpoints: [],
      },
      {
        cmd: "list",
        output: [
          "1\t#include <iostream>",
          "2\tint main() {",
          "3\t  int a[] = {3, 7, 2, 8, 5, 1};",
          "4\t  int n = 6;",
          "5\t  int sum = 0;",
          "6\t  for (int i = 0; i < n; ++i) {",
          "7\t    sum += a[i];",
          "8\t  }",
          '9\t  std::cout << sum << "\\n";',
          "10\t  return 0;",
        ],
        line: 3,
        breakpoints: [],
      },
    ],
  },
  "u1-run": {
    programId: "stdin-sum",
    frames: [
      {
        cmd: null,
        output: ["Reading symbols from ./stdin-sum..."],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "start",
        output: [
          "Temporary breakpoint 1 at ADDR: file stdin_sum.cpp, line 3.",
          "Temporary breakpoint 1, main () at stdin_sum.cpp:3",
          "3\t  int n = 0;",
        ],
        line: 3,
        breakpoints: [],
      },
      {
        cmd: "break 8",
        output: ["Breakpoint 2 at ADDR: file stdin_sum.cpp, line 8."],
        line: 3,
        breakpoints: [8],
      },
      {
        cmd: "run < in.txt",
        output: ["Breakpoint 2, main () at stdin_sum.cpp:8", "8\t    std::cin >> x;"],
        line: 8,
        breakpoints: [8],
      },
    ],
  },
  "u1-stop": {
    programId: "sum-loop",
    frames: [
      {
        cmd: null,
        output: [
          "Breakpoint 1 at ADDR: file sol.cpp, line 7.",
          "Breakpoint 1, main () at sol.cpp:7",
          "7\t    sum += a[i];",
        ],
        line: 7,
        breakpoints: [7],
      },
      {
        cmd: "kill",
        output: ["[Inferior 1 (process N) killed]"],
        line: null,
        breakpoints: [7],
      },
      {
        cmd: "info breakpoints",
        output: [
          "Num     Type           Disp Enb Address            What",
          "1       breakpoint     keep y   ADDR in main() at sol.cpp:7",
          "\tbreakpoint already hit 1 time",
        ],
        line: null,
        breakpoints: [7],
      },
    ],
  },
  "u2-break": {
    programId: "prefix-sum",
    frames: [
      {
        cmd: null,
        output: ["Reading symbols from ./prefix-sum..."],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "break 11",
        output: ["Breakpoint 1 at ADDR: file prefix.cpp, line 11."],
        line: null,
        breakpoints: [11],
      },
      {
        cmd: "break range_sum",
        output: ["Breakpoint 2 at ADDR: file prefix.cpp, line 4."],
        line: null,
        breakpoints: [11, 4],
      },
      {
        cmd: "run",
        output: ["Breakpoint 1, main () at prefix.cpp:11", "11\t    pref[i + 1] = pref[i] + a[i];"],
        line: 11,
        breakpoints: [11, 4],
      },
    ],
  },
  "u2-tbreak": {
    programId: "sum-loop",
    frames: [
      {
        cmd: null,
        output: ["Reading symbols from ./sum-loop..."],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "tbreak 7",
        output: ["Temporary breakpoint 1 at ADDR: file sol.cpp, line 7."],
        line: null,
        breakpoints: [7],
      },
      {
        cmd: "run",
        output: ["Temporary breakpoint 1, main () at sol.cpp:7", "7\t    sum += a[i];"],
        line: 7,
        breakpoints: [],
      },
      {
        cmd: "info breakpoints",
        output: ["No breakpoints, watchpoints, tracepoints, or catchpoints."],
        line: 7,
        breakpoints: [],
      },
    ],
  },
  "u2-info-bp": {
    programId: "sum-loop",
    frames: [
      {
        cmd: null,
        output: ["Reading symbols from ./sum-loop..."],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "break 6",
        output: ["Breakpoint 1 at ADDR: file sol.cpp, line 6."],
        line: null,
        breakpoints: [6],
      },
      {
        cmd: "break 9",
        output: ["Breakpoint 2 at ADDR: file sol.cpp, line 9."],
        line: null,
        breakpoints: [6, 9],
      },
      {
        cmd: "info breakpoints",
        output: [
          "Num     Type           Disp Enb Address            What",
          "1       breakpoint     keep y   ADDR in main() at sol.cpp:6",
          "2       breakpoint     keep y   ADDR in main() at sol.cpp:9",
        ],
        line: null,
        breakpoints: [6, 9],
      },
    ],
  },
  "u2-manage-bp": {
    programId: "sum-loop",
    frames: [
      {
        cmd: null,
        output: [
          "Breakpoint 1 at ADDR: file sol.cpp, line 7.",
          "Breakpoint 2 at ADDR: file sol.cpp, line 9.",
        ],
        line: null,
        breakpoints: [7, 9],
      },
      {
        cmd: "disable 1",
        output: [],
        line: null,
        breakpoints: [7, 9],
      },
      {
        cmd: "enable 1",
        output: [],
        line: null,
        breakpoints: [7, 9],
      },
      {
        cmd: "delete 2",
        output: [],
        line: null,
        breakpoints: [7],
      },
      {
        cmd: "info breakpoints",
        output: [
          "Num     Type           Disp Enb Address            What",
          "1       breakpoint     keep y   ADDR in main() at sol.cpp:7",
        ],
        line: null,
        breakpoints: [7],
      },
    ],
  },
  "u3-next-step": {
    programId: "prefix-sum",
    frames: [
      {
        cmd: null,
        output: [
          "Breakpoint 1 at ADDR: file prefix.cpp, line 13.",
          "Breakpoint 1, main () at prefix.cpp:13",
          "13\t  int ans = range_sum(pref, 1, 4);",
        ],
        line: 13,
        breakpoints: [13],
      },
      {
        cmd: "step",
        output: [
          "range_sum (pref=std::vector of length 7, capacity 7 = {...}, l=1, r=4) at prefix.cpp:4",
          "4\t  return pref[r + 1] - pref[l];",
        ],
        line: 4,
        breakpoints: [13],
      },
      {
        cmd: "next",
        output: ["5\t}"],
        line: 5,
        breakpoints: [13],
      },
    ],
  },
  "u3-continue-finish": {
    programId: "binary-search",
    frames: [
      {
        cmd: null,
        output: [
          "Breakpoint 1 at ADDR: file bsearch.cpp, line 5.",
          "Breakpoint 1, lower_idx (a=ADDR, n=7, target=16) at bsearch.cpp:5",
          "5\t    int mid = lo + (hi - lo) / 2;",
        ],
        line: 5,
        breakpoints: [],
      },
      {
        cmd: "finish",
        output: [
          "ADDR in main () at bsearch.cpp:16",
          "16\t  int pos = lower_idx(a, 7, 16);",
          "Value returned is $1 = 4",
        ],
        line: 16,
        breakpoints: [],
      },
      {
        cmd: "continue",
        output: ["4", "[Inferior 1 (process N) exited normally]"],
        line: null,
        breakpoints: [],
      },
    ],
  },
  "u3-until-advance": {
    programId: "sum-loop",
    frames: [
      {
        cmd: null,
        output: [
          "Breakpoint 1 at ADDR: file sol.cpp, line 7.",
          "Breakpoint 1, main () at sol.cpp:7",
          "7\t    sum += a[i];",
        ],
        line: 7,
        breakpoints: [],
      },
      {
        cmd: "until 9",
        output: ["main () at sol.cpp:9", '9\t  std::cout << sum << "\\n";'],
        line: 9,
        breakpoints: [],
      },
      {
        cmd: "advance 10",
        output: ["main () at sol.cpp:10", "10\t  return 0;"],
        line: 10,
        breakpoints: [],
      },
    ],
  },
  "u3-repeat": {
    programId: "sum-loop",
    frames: [
      {
        cmd: null,
        output: [
          "Breakpoint 1 at ADDR: file sol.cpp, line 7.",
          "Breakpoint 1, main () at sol.cpp:7",
          "7\t    sum += a[i];",
        ],
        line: 7,
        breakpoints: [7],
      },
      {
        cmd: "continue 3",
        output: ["Breakpoint 1, main () at sol.cpp:7", "7\t    sum += a[i];"],
        line: 7,
        breakpoints: [7],
      },
      {
        cmd: "print i",
        output: ["$1 = 3"],
        line: 7,
        breakpoints: [7],
      },
    ],
  },
  "u4-print": {
    programId: "sum-loop",
    frames: [
      {
        cmd: null,
        output: [
          "Breakpoint 1 at ADDR: file sol.cpp, line 7.",
          "Breakpoint 1, main () at sol.cpp:7",
          "7\t    sum += a[i];",
        ],
        line: 7,
        breakpoints: [7],
      },
      {
        cmd: "print i",
        output: ["$1 = 0"],
        line: 7,
        breakpoints: [7],
      },
      {
        cmd: "print a[i]",
        output: ["$2 = 3"],
        line: 7,
        breakpoints: [7],
      },
      {
        cmd: "next",
        output: ["6\t  for (int i = 0; i < n; ++i) {"],
        line: 6,
        breakpoints: [7],
      },
      {
        cmd: "print sum",
        output: ["$3 = 3"],
        line: 6,
        breakpoints: [7],
      },
    ],
  },
  "u4-display": {
    programId: "sum-loop",
    frames: [
      {
        cmd: null,
        output: [
          "Breakpoint 1 at ADDR: file sol.cpp, line 7.",
          "Breakpoint 1, main () at sol.cpp:7",
          "7\t    sum += a[i];",
        ],
        line: 7,
        breakpoints: [7],
      },
      {
        cmd: "display sum",
        output: [],
        line: 7,
        breakpoints: [7],
      },
      {
        cmd: "continue",
        output: ["Breakpoint 1, main () at sol.cpp:7", "7\t    sum += a[i];", "1: sum = 3"],
        line: 7,
        breakpoints: [7],
      },
      {
        cmd: "undisplay 1",
        output: [],
        line: 7,
        breakpoints: [7],
      },
    ],
  },
  "u4-info-vars": {
    programId: "binary-search",
    frames: [
      {
        cmd: null,
        output: [
          "Breakpoint 1 at ADDR: file bsearch.cpp, line 6.",
          "Breakpoint 1, lower_idx (a=ADDR, n=7, target=16) at bsearch.cpp:6",
          "6\t    if (a[mid] < target) {",
        ],
        line: 6,
        breakpoints: [6],
      },
      {
        cmd: "info args",
        output: ["a = ADDR", "n = 7", "target = 16"],
        line: 6,
        breakpoints: [6],
      },
      {
        cmd: "info locals",
        output: ["mid = 3", "lo = 0", "hi = 7"],
        line: 6,
        breakpoints: [6],
      },
    ],
  },
  "u4-list": {
    programId: "binary-search",
    frames: [
      {
        cmd: null,
        output: ["Reading symbols from ./binary-search..."],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "list lower_idx",
        output: [
          "1\t#include <iostream>",
          "2\tint lower_idx(const int* a, int n, int target) {",
          "3\t  int lo = 0, hi = n;",
          "4\t  while (lo < hi) {",
          "5\t    int mid = lo + (hi - lo) / 2;",
          "6\t    if (a[mid] < target) {",
          "7\t      lo = mid + 1;",
          "8\t    } else {",
          "9\t      hi = mid;",
          "10\t    }",
        ],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "list 15",
        output: [
          "10\t    }",
          "11\t  }",
          "12\t  return lo;",
          "13\t}",
          "14\tint main() {",
          "15\t  int a[] = {2, 5, 8, 12, 16, 23, 38};",
          "16\t  int pos = lower_idx(a, 7, 16);",
          '17\t  std::cout << pos << "\\n";',
          "18\t  return 0;",
          "19\t}",
        ],
        line: null,
        breakpoints: [],
      },
    ],
  },
  "u5-backtrace": {
    programId: "dfs-tree",
    frames: [
      {
        cmd: null,
        output: [
          "Breakpoint 1 at ADDR: file dfs.cpp, line 6.",
          "Breakpoint 1, dfs (u=4, parent=2, depth=2) at dfs.cpp:6",
          "6\t  sub[u] = 1;",
        ],
        line: 6,
        breakpoints: [6],
      },
      {
        cmd: "bt",
        output: [
          "#0  dfs (u=4, parent=2, depth=2) at dfs.cpp:6",
          "#1  ADDR in dfs (u=2, parent=1, depth=1) at dfs.cpp:9",
          "#2  ADDR in dfs (u=1, parent=0, depth=0) at dfs.cpp:9",
          "#3  ADDR in main () at dfs.cpp:19",
        ],
        line: 6,
        breakpoints: [6],
      },
    ],
  },
  "u5-frame": {
    programId: "dfs-tree",
    frames: [
      {
        cmd: null,
        output: [
          "Breakpoint 1 at ADDR: file dfs.cpp, line 6.",
          "Breakpoint 1, dfs (u=4, parent=2, depth=2) at dfs.cpp:6",
          "6\t  sub[u] = 1;",
        ],
        line: 6,
        breakpoints: [6],
      },
      {
        cmd: "up",
        output: [
          "#1  ADDR in dfs (u=2, parent=1, depth=1) at dfs.cpp:9",
          "9\t    dfs(v, u, depth + 1);",
        ],
        line: 9,
        breakpoints: [6],
      },
      {
        cmd: "print u",
        output: ["$1 = 2"],
        line: 9,
        breakpoints: [6],
      },
      {
        cmd: "frame 3",
        output: ["#3  ADDR in main () at dfs.cpp:19", "19\t  dfs(1, 0, 0);"],
        line: 19,
        breakpoints: [6],
      },
      {
        cmd: "down",
        output: [
          "#2  ADDR in dfs (u=1, parent=0, depth=0) at dfs.cpp:9",
          "9\t    dfs(v, u, depth + 1);",
        ],
        line: 9,
        breakpoints: [6],
      },
    ],
  },
  "u6-break-if": {
    programId: "sum-loop",
    frames: [
      {
        cmd: null,
        output: ["Reading symbols from ./sum-loop..."],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "break 7 if i == 4",
        output: ["Breakpoint 1 at ADDR: file sol.cpp, line 7."],
        line: null,
        breakpoints: [7],
      },
      {
        cmd: "run",
        output: ["Breakpoint 1, main () at sol.cpp:7", "7\t    sum += a[i];"],
        line: 7,
        breakpoints: [7],
      },
      {
        cmd: "print i",
        output: ["$1 = 4"],
        line: 7,
        breakpoints: [7],
      },
    ],
  },
  "u6-condition": {
    programId: "sum-loop",
    frames: [
      {
        cmd: null,
        output: ["Reading symbols from ./sum-loop..."],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "break 7",
        output: ["Breakpoint 1 at ADDR: file sol.cpp, line 7."],
        line: null,
        breakpoints: [7],
      },
      {
        cmd: "condition 1 i == 3",
        output: [],
        line: null,
        breakpoints: [7],
      },
      {
        cmd: "run",
        output: ["Breakpoint 1, main () at sol.cpp:7", "7\t    sum += a[i];"],
        line: 7,
        breakpoints: [7],
      },
    ],
  },
  "u6-ignore": {
    programId: "sum-loop",
    frames: [
      {
        cmd: null,
        output: ["Reading symbols from ./sum-loop..."],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "break 7",
        output: ["Breakpoint 1 at ADDR: file sol.cpp, line 7."],
        line: null,
        breakpoints: [7],
      },
      {
        cmd: "ignore 1 3",
        output: [],
        line: null,
        breakpoints: [7],
      },
      {
        cmd: "run",
        output: ["Breakpoint 1, main () at sol.cpp:7", "7\t    sum += a[i];"],
        line: 7,
        breakpoints: [7],
      },
      {
        cmd: "print i",
        output: ["$1 = 3"],
        line: 7,
        breakpoints: [7],
      },
    ],
  },
  "u7-watch": {
    programId: "two-pointers",
    frames: [
      {
        cmd: null,
        output: [
          "Breakpoint 1 at ADDR: file twoptr.cpp, line 6.",
          "Breakpoint 1, main () at twoptr.cpp:6",
          "6\t  for (int r = 0; r < n; ++r) {",
        ],
        line: 6,
        breakpoints: [6],
      },
      {
        cmd: "watch best",
        output: ["Hardware watchpoint 2: best"],
        line: 6,
        breakpoints: [6],
      },
      {
        cmd: "continue",
        output: [
          "Hardware watchpoint 2: best",
          "Old value = 0",
          "New value = 1",
          "main () at twoptr.cpp:6",
          "6\t  for (int r = 0; r < n; ++r) {",
        ],
        line: 6,
        breakpoints: [6],
      },
    ],
  },
  "u7-rw-watch": {
    programId: "two-pointers",
    frames: [
      {
        cmd: null,
        output: [
          "Breakpoint 1 at ADDR: file twoptr.cpp, line 6.",
          "Breakpoint 1, main () at twoptr.cpp:6",
          "6\t  for (int r = 0; r < n; ++r) {",
        ],
        line: 6,
        breakpoints: [6],
      },
      {
        cmd: "rwatch limit",
        output: ["Hardware read watchpoint 2: limit"],
        line: 6,
        breakpoints: [6],
      },
      {
        cmd: "awatch cur",
        output: ["Hardware access (read/write) watchpoint 3: cur"],
        line: 6,
        breakpoints: [6],
      },
      {
        cmd: "info breakpoints",
        output: [
          "Num     Type            Disp Enb Address            What",
          "1       breakpoint      keep y   ADDR in main() at twoptr.cpp:6",
          "\tbreakpoint already hit 1 time",
          "2       read watchpoint keep y                      limit",
          "3       acc watchpoint  keep y                      cur",
        ],
        line: 6,
        breakpoints: [6],
      },
    ],
  },
  "u7-watch-loc": {
    programId: "linked-list",
    frames: [
      {
        cmd: null,
        output: [
          "Breakpoint 1 at ADDR: file list.cpp, line 16.",
          "Breakpoint 1, main () at list.cpp:16",
          "16\t    bump(cur);",
        ],
        line: 16,
        breakpoints: [16],
      },
      {
        cmd: "watch -l cur->val",
        output: ["Hardware watchpoint 2: -location cur->val"],
        line: 16,
        breakpoints: [16],
      },
      {
        cmd: "continue",
        output: [
          "Hardware watchpoint 2: -location cur->val",
          "Old value = 10",
          "New value = 20",
          "bump (p=ADDR) at list.cpp:8",
          "8\t}",
        ],
        line: 8,
        breakpoints: [16],
      },
    ],
  },
  "u8-set-var": {
    programId: "sum-loop",
    frames: [
      {
        cmd: null,
        output: [
          "Breakpoint 1 at ADDR: file sol.cpp, line 7.",
          "Breakpoint 1, main () at sol.cpp:7",
          "7\t    sum += a[i];",
        ],
        line: 7,
        breakpoints: [7],
      },
      {
        cmd: "set var sum = 100",
        output: [],
        line: 7,
        breakpoints: [7],
      },
      {
        cmd: "print sum",
        output: ["$1 = 100"],
        line: 7,
        breakpoints: [7],
      },
    ],
  },
  "u8-call": {
    programId: "gcd-rec",
    frames: [
      {
        cmd: null,
        output: [
          "Breakpoint 1 at ADDR: file gcd.cpp, line 12.",
          "Breakpoint 1, main () at gcd.cpp:12",
          "12\t  int res = lcm(x, y);",
        ],
        line: 12,
        breakpoints: [12],
      },
      {
        cmd: "call gcd(48, 18)",
        output: ["$1 = 6"],
        line: 12,
        breakpoints: [12],
      },
      {
        cmd: "call lcm(12, 8)",
        output: ["$2 = 24"],
        line: 12,
        breakpoints: [12],
      },
    ],
  },
  "u9-signals": {
    programId: "segfault-ptr",
    frames: [
      {
        cmd: null,
        output: ["Reading symbols from ./segfault-ptr..."],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "run",
        output: [
          "Program received signal SIGSEGV, Segmentation fault.",
          "ADDR in sum_nodes (p=0x0, steps=2) at segv.cpp:9",
          "9\t    total += p->val;",
        ],
        line: 9,
        breakpoints: [],
      },
      {
        cmd: "bt",
        output: [
          "#0  ADDR in sum_nodes (p=0x0, steps=2) at segv.cpp:9",
          "#1  ADDR in solve () at segv.cpp:16",
          "#2  ADDR in main () at segv.cpp:19",
        ],
        line: 9,
        breakpoints: [],
      },
      {
        cmd: "print p",
        output: ["$1 = (Node *) 0x0"],
        line: 9,
        breakpoints: [],
      },
    ],
  },
  "u9-up-user": {
    programId: "abort-assert",
    frames: [
      {
        cmd: null,
        output: ["Reading symbols from ./abort-assert..."],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "run",
        output: [
          "Program received signal SIGABRT, Aborted.",
          "ADDR in __pthread_kill_implementation () from /lib64/libc.so.6",
        ],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "bt",
        output: [
          "#0  ADDR in __pthread_kill_implementation () from /lib64/libc.so.6",
          "#1  ADDR in raise () from /lib64/libc.so.6",
          "#2  ADDR in abort () from /lib64/libc.so.6",
          "#3  ADDR in __libc_message_impl.cold () from /lib64/libc.so.6",
          "#4  ADDR in __assert_fail () from /lib64/libc.so.6",
          "#5  ADDR in check_idx (idx=-3) at abort.cpp:4",
          "#6  ADDR in process (x=2) at abort.cpp:8",
          "#7  ADDR in main () at abort.cpp:11",
        ],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "frame 5",
        output: ["#5  ADDR in check_idx (idx=-3) at abort.cpp:4", "4\t  assert(idx >= 0);"],
        line: 4,
        breakpoints: [],
      },
      {
        cmd: "print idx",
        output: ["$1 = -3"],
        line: 4,
        breakpoints: [],
      },
    ],
  },
  "u9-catch-throw": {
    programId: "throw-oob",
    frames: [
      {
        cmd: null,
        output: ["Reading symbols from ./throw-oob..."],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "catch throw",
        output: ["Catchpoint 1 (throw)"],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "run",
        output: [
          "Catchpoint 1 (exception thrown), ADDR in __cxa_throw () from /lib64/libstdc++.so.6",
        ],
        line: null,
        breakpoints: [],
      },
      {
        cmd: "bt 4",
        output: [
          "#0  ADDR in __cxa_throw () from /lib64/libstdc++.so.6",
          "#1  ADDR in std::__throw_out_of_range_fmt(char const*, ...) () from /lib64/libstdc++.so.6",
          "#2  ADDR in std::vector<int, std::allocator<int> >::_M_range_check (this=ADDR, __n=5) at /usr/include/c++/16/bits/stl_vector.h:1283",
          "#3  ADDR in std::vector<int, std::allocator<int> >::at (this=ADDR, __n=5) at /usr/include/c++/16/bits/stl_vector.h:1324",
        ],
        line: null,
        breakpoints: [],
      },
    ],
  },
};
