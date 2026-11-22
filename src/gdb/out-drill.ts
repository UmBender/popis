import { createRng, deriveSeed, type Rng } from "../core/rng";
import type { OutputCheckKind } from "./check-output";
import { evalGdbCommand } from "./format";
import {
  T_BOOL,
  T_CHAR,
  T_INT,
  T_LLONG,
  T_SCHAR,
  T_SHORT,
  T_UCHAR,
  T_UINT,
  T_ULLONG,
  arrayType,
  buildMemoryState,
  pointerType,
  structType,
  type MemoryState,
  type StructType,
  type VariableSpec,
} from "./memory";

export const GDB_OUT_KINDS = [
  "formato",
  "char",
  "expressao",
  "array",
  "string",
  "struct",
  "ponteiro",
  "sizeof",
  "memoria",
] as const;

export type GdbOutKind = (typeof GDB_OUT_KINDS)[number];
export type GdbOutLevel = 1 | 2 | 3;

export const GDB_OUT_LEVELS: readonly GdbOutLevel[] = [1, 2, 3];

export const GDB_OUT_KIND_LABELS: Readonly<Record<GdbOutKind, string>> = {
  formato: "Formatos (p/x, /d, /u, /o, /t)",
  char: "Caractere (char e p/c)",
  expressao: "Expressões (divisão C, casts)",
  array: "Arrays (fatias @ e <repeats>)",
  string: "Strings (char[] e \\000)",
  struct: "Structs (campos e aninhamento)",
  ponteiro: "Ponteiros (*, ->, nullptr, whatis)",
  sizeof: "sizeof e padding",
  memoria: "Memória (x/Nfu e endianness)",
};

export type OutputLocal = {
  readonly name: string;
  readonly value: string;
};

export type GdbOutputItem = {
  readonly seed: number;
  readonly index: number;
  readonly level: GdbOutLevel;
  readonly kind: GdbOutKind;
  readonly kc: `gdb.out.${GdbOutKind}`;
  readonly file: string;
  readonly lines: readonly string[];
  readonly stopLine: number;
  readonly locals: readonly OutputLocal[];
  readonly command: string;
  readonly commandKind: OutputCheckKind;
  readonly canonical: string;
  readonly reason: string;
  readonly state: MemoryState;
};

type Draft = {
  readonly file?: string;
  readonly preMain?: readonly string[];
  readonly body: readonly string[];
  readonly locals: readonly OutputLocal[];
  readonly command: string;
  readonly reason: string;
  readonly vars: readonly VariableSpec[];
  readonly extraTypes?: readonly StructType[];
};

function cppCharLit(code: number): string {
  switch (code) {
    case 0:
      return "'\\0'";
    case 9:
      return "'\\t'";
    case 10:
      return "'\\n'";
    case 34:
      return "'\"'";
    case 39:
      return "'\\''";
    case 92:
      return "'\\\\'";
    default:
      if (code >= 32 && code <= 126) return `'${String.fromCharCode(code)}'`;
      return String(code);
  }
}

function hexLit(n: number): string {
  return `0x${(n >>> 0).toString(16)}`;
}

function genFormato(rng: Rng, level: GdbOutLevel): Draft {
  if (level === 1) {
    const sub = rng.int(0, 3);
    if (sub === 0) {
      const n = rng.pick([10, 15, 16, 26, 31, 42, 64, 100, 255, 258]);
      return {
        body: [`int n = ${String(n)};`],
        locals: [{ name: "n", value: String(n) }],
        command: "p/x n",
        reason: `/x imprime ${String(n)} em hexadecimal sem zeros à esquerda.`,
        vars: [{ name: "n", type: T_INT, value: n }],
      };
    }
    if (sub === 1) {
      const n = rng.pick([5, 6, 9, 10, 12, 13, 15, 18, 21, 32]);
      return {
        body: [`int n = ${String(n)};`],
        locals: [{ name: "n", value: String(n) }],
        command: "p/t n",
        reason: `/t imprime ${String(n)} em binário sem zeros à esquerda.`,
        vars: [{ name: "n", type: T_INT, value: n }],
      };
    }
    if (sub === 2) {
      const n = rng.pick([0, 8, 9, 10, 15, 16, 64, 65]);
      return {
        body: [`int n = ${String(n)};`],
        locals: [{ name: "n", value: String(n) }],
        command: "p/o n",
        reason:
          n === 0 ? "/o imprime 0 para zero." : `/o imprime ${String(n)} em octal com prefixo 0.`,
        vars: [{ name: "n", type: T_INT, value: n }],
      };
    }
    const flag = rng.pick([true, false]);
    const fmt = rng.pick(["", "/d", "/x"] as const);
    return {
      body: [`bool ok = ${flag ? "true" : "false"};`],
      locals: [{ name: "ok", value: flag ? "true" : "false" }],
      command: `p${fmt} ok`,
      reason:
        fmt === ""
          ? "bool sem formato imprime true ou false."
          : `Com ${fmt}, bool é exibido como inteiro de 1 byte (${flag ? "1" : "0"}).`,
      vars: [{ name: "ok", type: T_BOOL, value: flag }],
    };
  }

  if (level === 2) {
    const sub = rng.int(0, 3);
    if (sub === 0) {
      const neg = -rng.int(1, 16);
      return {
        body: [`int neg = ${String(neg)};`],
        locals: [{ name: "neg", value: String(neg) }],
        command: "p/x neg",
        reason:
          "int tem 4 bytes (32 bits): negativos em /x aparecem com 8 dígitos em complemento de dois.",
        vars: [{ name: "neg", type: T_INT, value: neg }],
      };
    }
    if (sub === 1) {
      const neg = -rng.int(1, 8);
      const fmt = rng.pick(["/x", "/u"] as const);
      return {
        body: [`short s = ${String(neg)};`],
        locals: [{ name: "s", value: String(neg) }],
        command: `p${fmt} s`,
        reason:
          "short tem 2 bytes (16 bits): complemento de dois em 16 bits (0xffff para -1, 65535 em /u).",
        vars: [{ name: "s", type: T_SHORT, value: neg }],
      };
    }
    if (sub === 2) {
      const neg = -rng.int(1, 8);
      const fmt = rng.pick(["/x", "/u", "/t"] as const);
      return {
        body: [`signed char sc = ${String(neg)};`],
        locals: [{ name: "sc", value: String(neg) }],
        command: `p${fmt} sc`,
        reason: "signed char tem 1 byte (8 bits): complemento de dois em 8 bits (256 + valor).",
        vars: [{ name: "sc", type: T_SCHAR, value: neg }],
      };
    }
    const neg = -rng.int(1, 5);
    return {
      body: [`int neg = ${String(neg)};`],
      locals: [{ name: "neg", value: String(neg) }],
      command: "p/u neg",
      reason: "/u reinterpreta os 32 bits de int como sem sinal: 2^32 + valor.",
      vars: [{ name: "neg", type: T_INT, value: neg }],
    };
  }

  // Level 3: 64-bit long long, unsigned char /d, or larger negative ints
  const sub = rng.int(0, 2);
  if (sub === 0) {
    const neg = -rng.int(1, 4);
    const fmt = rng.pick(["/x", "/u"] as const);
    return {
      body: [`long long ll = ${String(neg)}LL;`],
      locals: [{ name: "ll", value: `${String(neg)} (long long)` }],
      command: `p${fmt} ll`,
      reason:
        "long long tem 8 bytes (64 bits): complemento de dois com 16 dígitos hex ou 2^64 + valor.",
      vars: [{ name: "ll", type: T_LLONG, value: BigInt(neg) }],
    };
  }
  if (sub === 1) {
    const uc = rng.int(240, 255);
    return {
      body: [`unsigned char uc = ${String(uc)};`],
      locals: [{ name: "uc", value: `${String(uc)} (unsigned char)` }],
      command: "p/d uc",
      reason: "/d força leitura com sinal na largura de 1 byte (valor - 256).",
      vars: [{ name: "uc", type: T_UCHAR, value: uc }],
    };
  }
  const neg = -rng.pick([17, 32, 42, 64, 100]);
  return {
    body: [`int neg = ${String(neg)};`],
    locals: [{ name: "neg", value: String(neg) }],
    command: "p/x neg",
    reason: "Em 32 bits, p/x exibe 2^32 + valor em hexadecimal (8 dígitos).",
    vars: [{ name: "neg", type: T_INT, value: neg }],
  };
}

function genChar(rng: Rng, level: GdbOutLevel): Draft {
  if (level === 1) {
    const pool = [
      { ch: "A", code: 65 },
      { ch: "B", code: 66 },
      { ch: "C", code: 67 },
      { ch: "Z", code: 90 },
      { ch: "a", code: 97 },
      { ch: "b", code: 98 },
      { ch: "z", code: 122 },
      { ch: "0", code: 48 },
      { ch: "5", code: 53 },
      { ch: "9", code: 57 },
    ];
    const picked = rng.pick(pool);
    const sub = rng.int(0, 2);
    if (sub === 0) {
      return {
        body: [`char c = '${picked.ch}';`],
        locals: [{ name: "c", value: `'${picked.ch}' (ASCII ${String(picked.code)})` }],
        command: "p c",
        reason: `char é impresso como código numérico seguido do literal: ${String(picked.code)} '${picked.ch}'.`,
        vars: [{ name: "c", type: T_CHAR, value: picked.code }],
      };
    }
    if (sub === 1) {
      return {
        body: [`int code = ${String(picked.code)};`],
        locals: [{ name: "code", value: String(picked.code) }],
        command: "p/c code",
        reason: `/c interpreta o byte baixo como caractere ASCII (${String(picked.code)} = '${picked.ch}').`,
        vars: [{ name: "code", type: T_INT, value: picked.code }],
      };
    }
    const fmt = rng.pick(["/d", "/x"] as const);
    return {
      body: [`char c = '${picked.ch}';`],
      locals: [{ name: "c", value: `'${picked.ch}' (ASCII ${String(picked.code)})` }],
      command: `p${fmt} c`,
      reason: `Com ${fmt}, o gdb omite as aspas e imprime só o valor numérico do byte.`,
      vars: [{ name: "c", type: T_CHAR, value: picked.code }],
    };
  }

  if (level === 2) {
    const escapes = [
      { code: 10, desc: "quebra de linha (10, \\n)" },
      { code: 9, desc: "tabulação (9, \\t)" },
      { code: 0, desc: "byte nulo (0, \\000)" },
      { code: 39, desc: "aspa simples (39, \\')" },
      { code: 92, desc: "barra invertida (92, \\\\)" },
      { code: 34, desc: 'aspa dupla (34, ")' },
    ];
    const picked = rng.pick(escapes);
    return {
      body: [`char c = ${cppCharLit(picked.code)};`],
      locals: [{ name: "c", value: picked.desc }],
      command: "p c",
      reason: `O gdb escapa caracteres especiais em char: ${picked.desc}.`,
      vars: [{ name: "c", type: T_CHAR, value: picked.code }],
    };
  }

  // Level 3: negative char / unsigned char > 127 octal escapes
  const sub = rng.int(0, 1);
  if (sub === 0) {
    const val = -rng.int(1, 8);
    return {
      body: [`signed char sc = ${String(val)};`],
      locals: [{ name: "sc", value: String(val) }],
      command: "p sc",
      reason:
        "Em x86-64, signed char negativo imprime o número negativo seguido do octal de 3 dígitos do byte (256 + valor).",
      vars: [{ name: "sc", type: T_SCHAR, value: val }],
    };
  }
  const uc = rng.int(248, 255);
  return {
    body: [`unsigned char uc = ${String(uc)};`],
    locals: [{ name: "uc", value: String(uc) }],
    command: "p uc",
    reason:
      "unsigned char imprime o código positivo (0..255) seguido do escape octal de 3 dígitos para bytes >= 128.",
    vars: [{ name: "uc", type: T_UCHAR, value: uc }],
  };
}

function genExpressao(rng: Rng, level: GdbOutLevel): Draft {
  if (level === 1) {
    const a = -rng.pick([5, 7, 9, 10, 11, 13, 14, 17, 19]);
    const b = rng.pick([2, 3, 4, 5]);
    const sub = rng.int(0, 2);
    if (sub === 0) {
      return {
        body: [`int a = ${String(a)}, b = ${String(b)};`],
        locals: [
          { name: "a", value: String(a) },
          { name: "b", value: String(b) },
        ],
        command: "p a / b",
        reason:
          "Em C/C++, a divisão inteira trunca em direção a zero (não arredonda para -infinito).",
        vars: [
          { name: "a", type: T_INT, value: a },
          { name: "b", type: T_INT, value: b },
        ],
      };
    }
    if (sub === 1) {
      return {
        body: [`int a = ${String(a)}, b = ${String(b)};`],
        locals: [
          { name: "a", value: String(a) },
          { name: "b", value: String(b) },
        ],
        command: "p a % b",
        reason:
          "Em C/C++, o resto a % b tem o mesmo sinal do dividendo a (a / b * b + a % b == a).",
        vars: [
          { name: "a", type: T_INT, value: a },
          { name: "b", type: T_INT, value: b },
        ],
      };
    }
    const pos = rng.pick([7, 10, 11, 13]);
    const negB = -rng.pick([3, 4, 5]);
    return {
      body: [`int a = ${String(pos)}, b = ${String(negB)};`],
      locals: [
        { name: "a", value: String(pos) },
        { name: "b", value: String(negB) },
      ],
      command: "p a % b",
      reason:
        "O sinal de a % b segue o dividendo a (positivo aqui), independente do sinal do divisor.",
      vars: [
        { name: "a", type: T_INT, value: pos },
        { name: "b", type: T_INT, value: negB },
      ],
    };
  }

  if (level === 2) {
    const sub = rng.int(0, 2);
    if (sub === 0) {
      const k = rng.int(1, 5);
      return {
        body: [`int x = -${String(k)};`],
        locals: [{ name: "x", value: `-${String(k)}` }],
        command: "p (unsigned)x",
        reason: "Converter para unsigned int (32 bits) faz volta módulo 2^32 (4294967296 - k).",
        vars: [{ name: "x", type: T_INT, value: -k }],
      };
    }
    if (sub === 1) {
      const k = rng.int(1, 5);
      return {
        body: [`int x = -${String(k)};`],
        locals: [{ name: "x", value: `-${String(k)}` }],
        command: "p (unsigned short)x",
        reason: "Converter para unsigned short (16 bits) faz volta módulo 65536 (65536 - k).",
        vars: [{ name: "x", type: T_INT, value: -k }],
      };
    }
    const v = rng.int(250, 255);
    return {
      body: [`int x = ${String(v)};`],
      locals: [{ name: "x", value: String(v) }],
      command: "p (signed char)x",
      reason:
        "Converter para signed char trunca para 8 bits com sinal (valor - 256) e imprime como char.",
      vars: [{ name: "x", type: T_INT, value: v }],
    };
  }

  // Level 3: C integer promotions
  const sub = rng.int(0, 2);
  if (sub === 0) {
    const k = rng.int(1, 5);
    return {
      body: [`unsigned char u = 0;`],
      locals: [{ name: "u", value: "0 (unsigned char)" }],
      command: `p u - ${String(k)}`,
      reason:
        "unsigned char é promovido para int (com sinal) antes da subtração, resultando em int negativo.",
      vars: [{ name: "u", type: T_UCHAR, value: 0 }],
    };
  }
  if (sub === 1) {
    const k = rng.int(1, 5);
    return {
      body: [`unsigned int u = 0;`],
      locals: [{ name: "u", value: "0 (unsigned int)" }],
      command: `p u - ${String(k)}`,
      reason:
        "unsigned int já tem largura de int: a subtração ocorre sem sinal e dá volta módulo 2^32.",
      vars: [{ name: "u", type: T_UINT, value: 0 }],
    };
  }
  const a = rng.int(150, 220);
  const b = rng.int(100, 150);
  return {
    body: [`unsigned char a = ${String(a)}, b = ${String(b)};`],
    locals: [
      { name: "a", value: `${String(a)} (unsigned char)` },
      { name: "b", value: `${String(b)} (unsigned char)` },
    ],
    command: "p a + b",
    reason:
      "Ambos os unsigned char são promovidos para int antes da soma, evitando overflow de 8 bits.",
    vars: [
      { name: "a", type: T_UCHAR, value: a },
      { name: "b", type: T_UCHAR, value: b },
    ],
  };
}

function genArray(rng: Rng, level: GdbOutLevel): Draft {
  if (level === 1) {
    const len = rng.int(4, 5);
    const elems = Array.from({ length: len }, () => rng.int(1, 9));
    const full = rng.int(0, 1) === 0;
    const initStr = elems.join(", ");
    if (full) {
      return {
        body: [`int a[${String(len)}] = {${initStr}};`],
        locals: [{ name: "a", value: `int[${String(len)}]` }],
        command: "p a",
        reason:
          "Um array de int é impresso entre chaves com elementos separados por vírgula e espaço.",
        vars: [{ name: "a", type: arrayType(T_INT, len), value: elems }],
      };
    }
    const start = rng.int(1, len - 2);
    const count = rng.int(2, len - start);
    return {
      body: [`int a[${String(len)}] = {${initStr}};`],
      locals: [{ name: "a", value: `{${initStr}}` }],
      command: `p a[${String(start)}]@${String(count)}`,
      reason: `O operador @ imprime ${String(count)} elementos consecutivos a partir de a[${String(start)}].`,
      vars: [{ name: "a", type: arrayType(T_INT, len), value: elems }],
    };
  }

  if (level === 2) {
    const sub = rng.int(0, 1);
    if (sub === 0) {
      const elems = Array.from({ length: 5 }, () => rng.int(1, 15));
      const start = rng.int(1, 2);
      const count = rng.int(2, 3);
      return {
        body: [`int a[5] = {${elems.join(", ")}};`, `int* ptr = &a[${String(start)}];`],
        locals: [
          { name: "a", value: `{${elems.join(", ")}}` },
          { name: "ptr", value: `&a[${String(start)}]` },
        ],
        command: `p *ptr@${String(count)}`,
        reason: `*ptr@${String(count)} lê ${String(count)} elementos consecutivos a partir do endereço apontado por ptr.`,
        vars: [
          { name: "a", type: arrayType(T_INT, 5), value: elems },
          { name: "ptr", type: pointerType(T_INT), value: { ref: "a", index: start } },
        ],
      };
    }
    const repLen = rng.int(11, 16);
    const val = rng.pick([0, 1, 5, 7]);
    const body =
      val === 0
        ? [`int a[${String(repLen)}] = {0};`]
        : [
            `int a[${String(repLen)}];`,
            `for (int i = 0; i < ${String(repLen)}; ++i) a[i] = ${String(val)};`,
          ];
    return {
      body,
      locals: [{ name: "a", value: `${String(repLen)}× ${String(val)}` }],
      command: "p a",
      reason: `Com mais de 10 elementos iguais seguidos (${String(repLen)}), o gdb compacta usando <repeats ${String(repLen)} times>.`,
      vars: [
        {
          name: "a",
          type: arrayType(T_INT, repLen),
          value: Array.from({ length: repLen }, () => val),
        },
      ],
    };
  }

  // Level 3: mixed <repeats> OR p/x on array slice
  const sub = rng.int(0, 1);
  if (sub === 0) {
    const head = rng.int(1, 9);
    const midVal = rng.int(1, 9);
    const tail = rng.int(1, 9);
    const headAdj = head === midVal ? (head % 9) + 1 : head;
    const tailAdj = tail === midVal ? (tail % 9) + 1 : tail;
    const repCount = rng.int(11, 14);
    const total = repCount + 2;
    const elems = [headAdj, ...Array.from({ length: repCount }, () => midVal), tailAdj];
    return {
      body: [
        `int a[${String(total)}];`,
        `a[0] = ${String(headAdj)};`,
        `for (int i = 1; i <= ${String(repCount)}; ++i) a[i] = ${String(midVal)};`,
        `a[${String(total - 1)}] = ${String(tailAdj)};`,
      ],
      locals: [{ name: "a", value: `int[${String(total)}]` }],
      command: "p a",
      reason: `Apenas a sequência com mais de 10 elementos iguais (${String(repCount)}× ${String(midVal)}) é compactada em <repeats>.`,
      vars: [{ name: "a", type: arrayType(T_INT, total), value: elems }],
    };
  }
  const elems = Array.from({ length: 4 }, () => rng.pick([10, 15, 16, 20, 31, 32, 42]));
  const start = rng.int(0, 1);
  return {
    body: [`int a[4] = {${elems.join(", ")}};`],
    locals: [{ name: "a", value: `{${elems.join(", ")}}` }],
    command: `p/x a[${String(start)}]@3`,
    reason: "p/x formata cada elemento da fatia em hexadecimal sem zeros à esquerda.",
    vars: [{ name: "a", type: arrayType(T_INT, 4), value: elems }],
  };
}

function genString(rng: Rng, level: GdbOutLevel): Draft {
  const words = ["abc", "gdb", "pop", "xyz", "ok", "hi", "cp"];
  if (level === 1) {
    const word = rng.pick(words);
    const extraZeros = rng.int(1, 3); // total trailing zeros = extraZeros; last one stripped!
    const len = word.length + extraZeros;
    const bytes = [
      ...Array.from(word, (c) => c.charCodeAt(0)),
      ...Array.from({ length: extraZeros }, () => 0),
    ];
    return {
      body: [`char s[${String(len)}] = "${word}";`],
      locals: [{ name: "s", value: `char[${String(len)}]` }],
      command: "p s",
      reason: `O gdb omite apenas o último '\\0' do char[${String(len)}] e imprime os demais como \\000.`,
      vars: [{ name: "s", type: arrayType(T_CHAR, len), value: bytes }],
    };
  }

  if (level === 2) {
    const sub = rng.int(0, 1);
    if (sub === 0) {
      const word = rng.pick(["abc", "hi", "cp"]);
      const len = rng.int(8, 10);
      const bytes = [
        ...Array.from(word, (c) => c.charCodeAt(0)),
        ...Array.from({ length: len - word.length }, () => 0),
      ];
      return {
        body: [`char s[${String(len)}] = "${word}";`],
        locals: [{ name: "s", value: `char[${String(len)}]` }],
        command: "p s",
        reason: `Como restam ${String(len - word.length - 1)} zeros após remover o terminador (<= 10), todos aparecem como \\000 dentro das aspas.`,
        vars: [{ name: "s", type: arrayType(T_CHAR, len), value: bytes }],
      };
    }
    const esc = rng.pick([
      { cpp: "a\\nb", bytes: [97, 10, 98, 0] },
      { cpp: "x\\ty", bytes: [120, 9, 121, 0] },
      { cpp: "a\\\\b", bytes: [97, 92, 98, 0] },
    ]);
    return {
      body: [`char s[4] = "${esc.cpp}";`],
      locals: [{ name: "s", value: "char[4]" }],
      command: "p s",
      reason:
        "O '\\0' final é omitido e caracteres de controle aparecem com escape C dentro das aspas.",
      vars: [{ name: "s", type: arrayType(T_CHAR, 4), value: esc.bytes }],
    };
  }

  // Level 3: char array with <repeats N times>
  const sub = rng.int(0, 1);
  if (sub === 0) {
    const word = rng.pick(["abc", "ok", "hi"]);
    const repZeros = rng.int(11, 14);
    const len = word.length + repZeros + 1; // +1 for trailing null stripped
    const bytes = [
      ...Array.from(word, (c) => c.charCodeAt(0)),
      ...Array.from({ length: repZeros + 1 }, () => 0),
    ];
    return {
      body: [`char s[${String(len)}] = "${word}";`],
      locals: [{ name: "s", value: `char[${String(len)}]` }],
      command: "p s",
      reason: `Descartado o '\\0' final, sobram ${String(repZeros)} bytes '\\000' (> 10), compactados como '\\000' <repeats ${String(repZeros)} times>.`,
      vars: [{ name: "s", type: arrayType(T_CHAR, len), value: bytes }],
    };
  }
  const ch = rng.pick(["a", "x", "z"]);
  const len = rng.int(11, 14);
  const bytes = Array.from({ length: len }, () => ch.charCodeAt(0));
  return {
    body: [`char s[${String(len)}];`, `for (int i = 0; i < ${String(len)}; ++i) s[i] = '${ch}';`],
    locals: [{ name: "s", value: `${String(len)}× '${ch}' (sem '\\0')` }],
    command: "p s",
    reason: `Sem '\\0' no final e com ${String(len)} (> 10) caracteres iguais, o gdb imprime '${ch}' <repeats ${String(len)} times>.`,
    vars: [{ name: "s", type: arrayType(T_CHAR, len), value: bytes }],
  };
}

function genStruct(rng: Rng, level: GdbOutLevel): Draft {
  if (level === 1) {
    const x = rng.int(1, 20);
    const y = rng.int(1, 20);
    const pt = structType("Pt", [
      { name: "x", type: T_INT },
      { name: "y", type: T_INT },
    ]);
    return {
      preMain: ["struct Pt { int x; int y; };"],
      body: [`Pt s{${String(x)}, ${String(y)}};`],
      locals: [{ name: "s", value: `Pt{${String(x)}, ${String(y)}}` }],
      command: "p s",
      reason: "O gdb imprime structs entre chaves com cada campo nomeado: {x = ..., y = ...}.",
      vars: [{ name: "s", type: pt, value: { x, y } }],
    };
  }

  if (level === 2) {
    const ch = rng.pick([
      { ch: "a", code: 97 },
      { ch: "b", code: 98 },
      { ch: "A", code: 65 },
      { ch: "Z", code: 90 },
    ]);
    const x = rng.int(2, 15);
    const y = rng.int(2, 15);
    const item = structType("Item", [
      { name: "c", type: T_CHAR },
      { name: "x", type: T_INT },
      { name: "y", type: T_INT },
    ]);
    const hex = rng.int(0, 1) === 1;
    return {
      preMain: ["struct Item { char c; int x; int y; };"],
      body: [`Item s{'${ch.ch}', ${String(x)}, ${String(y)}};`],
      locals: [{ name: "s", value: `Item{'${ch.ch}', ${String(x)}, ${String(y)}}` }],
      command: hex ? "p/x s" : "p s",
      reason: hex
        ? "p/x em uma struct aplica hexadecimal a cada campo (inclusive char)."
        : `Campos char dentro de struct continuam saindo como código + literal (${String(ch.code)} '${ch.ch}').`,
      vars: [{ name: "s", type: item, value: { c: ch.code, x, y } }],
    };
  }

  // Level 3: nested struct
  const tag = rng.pick([
    { ch: "A", code: 65 },
    { ch: "Z", code: 90 },
    { ch: "k", code: 107 },
  ]);
  const a = rng.int(1, 20);
  const b = rng.pick([
    { ch: "a", code: 97 },
    { ch: "m", code: 109 },
  ]);
  const val = rng.int(10, 99);
  const inner = structType("Inner", [
    { name: "a", type: T_SHORT },
    { name: "b", type: T_CHAR },
  ]);
  const outer = structType("Outer", [
    { name: "tag", type: T_CHAR },
    { name: "in", type: inner },
    { name: "val", type: T_INT },
  ]);
  return {
    preMain: [
      "struct Inner { short a; char b; };",
      "struct Outer { char tag; Inner in; int val; };",
    ],
    body: [`Outer o{'${tag.ch}', {${String(a)}, '${b.ch}'}, ${String(val)}};`],
    locals: [{ name: "o", value: "Outer aninhada" }],
    command: "p o",
    reason:
      "Structs aninhadas aparecem com chaves internas no campo correspondente: {tag = ..., in = {a = ..., b = ...}, val = ...}.",
    vars: [{ name: "o", type: outer, value: { tag: tag.code, in: { a, b: b.code }, val } }],
  };
}

function genPonteiro(rng: Rng, level: GdbOutLevel): Draft {
  if (level === 1) {
    const elems = Array.from({ length: 4 }, () => rng.int(10, 50));
    const idx = rng.int(0, 2);
    const sub = rng.int(0, 2);
    const cmd = sub === 0 ? "p *p" : sub === 1 ? "p p[1]" : "whatis p";
    return {
      body: [`int a[4] = {${elems.join(", ")}};`, `int* p = &a[${String(idx)}];`],
      locals: [
        { name: "a", value: `{${elems.join(", ")}}` },
        { name: "p", value: `&a[${String(idx)}]` },
      ],
      command: cmd,
      reason:
        sub === 0
          ? `*p lê o int no endereço apontado por p (a[${String(idx)}]).`
          : sub === 1
            ? `p[1] equivale a *(p + 1), ou seja, a[${String(idx + 1)}].`
            : "whatis imprime o tipo estático da variável no formato type = int *.",
      vars: [
        { name: "a", type: arrayType(T_INT, 4), value: elems },
        { name: "p", type: pointerType(T_INT), value: { ref: "a", index: idx } },
      ],
    };
  }

  const nodeFields: { name: string; type: ReturnType<typeof pointerType> | typeof T_INT }[] = [];
  const node = structType("Node", nodeFields);
  nodeFields.push({ name: "val", type: T_INT }, { name: "next", type: pointerType(node) });

  const v1 = rng.int(1, 30);
  const v2 = rng.int(31, 60);

  if (level === 2) {
    const sub = rng.int(0, 2);
    const cmd = sub === 0 ? "p h->next->val" : sub === 1 ? "p *n1.next" : "p *h->next";
    return {
      preMain: ["struct Node { int val; Node* next; };"],
      body: [`Node n2{${String(v2)}, nullptr};`, `Node n1{${String(v1)}, &n2};`, "Node* h = &n1;"],
      locals: [
        { name: "n1", value: `{val = ${String(v1)}, next = &n2}` },
        { name: "n2", value: `{val = ${String(v2)}, next = nullptr}` },
        { name: "h", value: "&n1" },
      ],
      command: cmd,
      reason:
        sub === 0
          ? "h->next aponta para n2, então h->next->val vale n2.val."
          : "Desreferenciar o ponteiro para n2 imprime a struct n2 completa com next = 0x0.",
      vars: [
        { name: "n2", type: node, value: { val: v2, next: null } },
        { name: "n1", type: node, value: { val: v1, next: { ref: "n2" } } },
        { name: "h", type: pointerType(node), value: { ref: "n1" } },
      ],
    };
  }

  // Level 3: null dereference error, null pointer print, or struct with ADDR
  const sub = rng.int(0, 2);
  if (sub === 0) {
    return {
      preMain: ["struct Node { int val; Node* next; };"],
      body: ["Node* np = nullptr;"],
      locals: [{ name: "np", value: "nullptr (0x0)" }],
      command: "p *np",
      reason:
        "Desreferenciar um ponteiro nulo (0x0) gera o erro Cannot access memory at address 0x0.",
      vars: [{ name: "np", type: pointerType(node), value: null }],
    };
  }
  if (sub === 1) {
    return {
      preMain: ["struct Node { int val; Node* next; };"],
      body: ["Node* np = nullptr;"],
      locals: [{ name: "np", value: "nullptr" }],
      command: "p np",
      reason:
        "Imprimir um ponteiro no topo mostra o tipo entre parênteses seguido do endereço: (Node *) 0x0.",
      vars: [{ name: "np", type: pointerType(node), value: null }],
    };
  }
  return {
    preMain: ["struct Node { int val; Node* next; };"],
    body: [`Node n2{${String(v2)}, nullptr};`, `Node n1{${String(v1)}, &n2};`],
    locals: [
      { name: "n1", value: `{val = ${String(v1)}, next = &n2}` },
      { name: "n2", value: `{val = ${String(v2)}, next = nullptr}` },
    ],
    command: "p n1",
    reason:
      "Dentro de uma struct, o ponteiro não nulo imprime o endereço (aceita ADDR) sem o cast de tipo.",
    vars: [
      { name: "n2", type: node, value: { val: v2, next: null } },
      { name: "n1", type: node, value: { val: v1, next: { ref: "n2" } } },
    ],
  };
}

function genSizeof(rng: Rng, level: GdbOutLevel): Draft {
  if (level === 1) {
    const sub = rng.int(0, 2);
    if (sub === 0) {
      const choice = rng.pick([
        { cpp: "char", expr: "sizeof(char)", reason: "char ocupa 1 byte na ABI x86-64 LP64." },
        { cpp: "short", expr: "sizeof(short)", reason: "short ocupa 2 bytes na ABI x86-64 LP64." },
        { cpp: "int", expr: "sizeof(int)", reason: "int ocupa 4 bytes na ABI x86-64 LP64." },
        {
          cpp: "long",
          expr: "sizeof(long)",
          reason: "Na ABI LP64 (Linux x86-64), long ocupa 8 bytes.",
        },
        { cpp: "long long", expr: "sizeof(long long)", reason: "long long ocupa 8 bytes." },
        { cpp: "bool", expr: "sizeof(bool)", reason: "bool ocupa 1 byte." },
      ]);
      return {
        body: [`${choice.cpp} v = 0;`],
        locals: [],
        command: `p ${choice.expr}`,
        reason: choice.reason,
        vars: [{ name: "v", type: T_INT, value: 0 }],
      };
    }
    if (sub === 1) {
      const len = rng.int(3, 8);
      return {
        body: [`int a[${String(len)}] = {0};`],
        locals: [{ name: "a", value: `int[${String(len)}]` }],
        command: "p sizeof(a)",
        reason: `Array de ${String(len)} ints: ${String(len)} × 4 = ${String(len * 4)} bytes.`,
        vars: [
          { name: "a", type: arrayType(T_INT, len), value: Array.from({ length: len }, () => 0) },
        ],
      };
    }
    return {
      body: ["int x = 1;", "int* p = &x;"],
      locals: [{ name: "p", value: "int *" }],
      command: "p sizeof(p)",
      reason: "Todo ponteiro em x86-64 (LP64) ocupa 8 bytes.",
      vars: [
        { name: "x", type: T_INT, value: 1 },
        { name: "p", type: pointerType(T_INT), value: { ref: "x" } },
      ],
    };
  }

  if (level === 2) {
    const layouts: readonly {
      readonly decl: string;
      readonly st: StructType;
      readonly reason: string;
    }[] = [
      {
        decl: "struct P { char c; int x; long long y; };",
        st: structType("P", [
          { name: "c", type: T_CHAR },
          { name: "x", type: T_INT },
          { name: "y", type: T_LLONG },
        ]),
        reason:
          "c em 0 (1B), 3B de padding, x em 4 (4B), y em 8 (8B): total 16 bytes (alinhamento 8).",
      },
      {
        decl: "struct P { char c; int x; };",
        st: structType("P", [
          { name: "c", type: T_CHAR },
          { name: "x", type: T_INT },
        ]),
        reason: "c em 0 (1B), 3B de padding para alinhar int em 4, x em 4 (4B): total 8 bytes.",
      },
      {
        decl: "struct P { int x; char c; };",
        st: structType("P", [
          { name: "x", type: T_INT },
          { name: "c", type: T_CHAR },
        ]),
        reason:
          "x em 0 (4B), c em 4 (1B), mais 3B de tail padding para múltiplo do alinhamento 4: total 8 bytes.",
      },
      {
        decl: "struct P { char a; short b; char c; };",
        st: structType("P", [
          { name: "a", type: T_CHAR },
          { name: "b", type: T_SHORT },
          { name: "c", type: T_CHAR },
        ]),
        reason:
          "a em 0, 1B padding, b em 2 (2B), c em 4, 1B tail padding para múltiplo de 2: total 6 bytes.",
      },
      {
        decl: "struct P { char a; long long b; char c; };",
        st: structType("P", [
          { name: "a", type: T_CHAR },
          { name: "b", type: T_LLONG },
          { name: "c", type: T_CHAR },
        ]),
        reason:
          "a em 0, 7B padding, b em 8 (8B), c em 16, 7B tail padding para múltiplo de 8: total 24 bytes.",
      },
    ];
    const picked = rng.pick(layouts);
    return {
      preMain: [picked.decl],
      body: ["P p{};"],
      locals: [],
      command: "p sizeof(P)",
      reason: picked.reason,
      vars: [{ name: "p", type: picked.st, value: {} }],
      extraTypes: [picked.st],
    };
  }

  // Level 3: nested struct, Node with pointer, or array of padded structs
  const sub = rng.int(0, 2);
  if (sub === 0) {
    const inner = structType("In", [
      { name: "a", type: T_SHORT },
      { name: "b", type: T_CHAR },
    ]);
    const outer = structType("Out", [
      { name: "tag", type: T_CHAR },
      { name: "in", type: inner },
      { name: "val", type: T_INT },
    ]);
    return {
      preMain: ["struct In { short a; char b; };", "struct Out { char tag; In in; int val; };"],
      body: ["Out o{};"],
      locals: [],
      command: "p sizeof(Out)",
      reason:
        "In tem tamanho 4 e alinhamento 2: tag em 0, 1B padding, in em 2..5, 2B padding, val em 8..11 -> total 12 bytes.",
      vars: [{ name: "o", type: outer, value: {} }],
      extraTypes: [inner, outer],
    };
  }
  if (sub === 1) {
    const node = structType("Node", [
      { name: "val", type: T_INT },
      { name: "next", type: pointerType(T_INT) },
    ]);
    return {
      preMain: ["struct Node { int val; int* next; };"],
      body: ["Node nd{};"],
      locals: [],
      command: "p sizeof(Node)",
      reason:
        "val em 0 (4B), 4B de padding para alinhar o ponteiro de 8B em 8, next em 8..15 -> total 16 bytes.",
      vars: [{ name: "nd", type: node, value: {} }],
      extraTypes: [node],
    };
  }
  const len = rng.int(2, 4);
  const pair = structType("Pair", [
    { name: "c", type: T_CHAR },
    { name: "x", type: T_INT },
  ]);
  return {
    preMain: ["struct Pair { char c; int x; };"],
    body: [`Pair a[${String(len)}]{};`],
    locals: [],
    command: "p sizeof(a)",
    reason: `Cada Pair ocupa 8 bytes (com 3B de padding); ${String(len)} elementos ocupam ${String(len * 8)} bytes.`,
    vars: [{ name: "a", type: arrayType(pair, len), value: [] }],
    extraTypes: [pair],
  };
}

function genMemoria(rng: Rng, level: GdbOutLevel): Draft {
  if (level === 1) {
    const sub = rng.int(0, 2);
    if (sub === 0) {
      const n = rng.pick([258, 513, 0x04030201, 0x12345678, 0x00010203, 0x0a0b0c0d]);
      const lit = n > 1000 ? hexLit(n) : String(n);
      return {
        body: [`int n = ${lit};`],
        locals: [{ name: "n", value: lit }],
        command: "x/4xb &n",
        reason:
          "x86-64 é little-endian: x/4xb imprime 4 bytes com 2 dígitos hex cada, do byte menos significativo ao mais significativo.",
        vars: [{ name: "n", type: T_INT, value: n }],
      };
    }
    if (sub === 1) {
      const elems = Array.from({ length: 4 }, () => rng.int(1, 20));
      const count = rng.int(3, 4);
      return {
        body: [`int a[4] = {${elems.join(", ")}};`],
        locals: [{ name: "a", value: `{${elems.join(", ")}}` }],
        command: `x/${String(count)}dw a`,
        reason: `x/${String(count)}dw lê ${String(count)} palavras de 4 bytes (w) como inteiros com sinal (d).`,
        vars: [{ name: "a", type: arrayType(T_INT, 4), value: elems }],
      };
    }
    const word = rng.pick(["abc", "gdb", "ok", "cp"]);
    return {
      body: [`char s[8] = "${word}";`],
      locals: [{ name: "s", value: `char[8] = "${word}"` }],
      command: "x/s s",
      reason: "x/s lê bytes a partir do endereço até o primeiro '\\0' e imprime como string C.",
      vars: [{ name: "s", type: arrayType(T_CHAR, 8), value: word }],
    };
  }

  if (level === 2) {
    const sub = rng.int(0, 2);
    if (sub === 0) {
      const n = rng.pick([0x12345678, 0x01020304, 0x00ab00cd, 0x11223344]);
      return {
        body: [`int n = ${hexLit(n)};`],
        locals: [{ name: "n", value: hexLit(n) }],
        command: "x/2xh &n",
        reason:
          "x/2xh lê 2 halfwords de 2 bytes (h) em little-endian: metade baixa primeiro, depois metade alta.",
        vars: [{ name: "n", type: T_INT, value: n }],
      };
    }
    if (sub === 1) {
      const fmt = rng.pick(["ub", "db"] as const);
      return {
        body: ["int neg = -1;"],
        locals: [{ name: "neg", value: "-1 (0xffffffff)" }],
        command: `x/4${fmt} &neg`,
        reason:
          fmt === "ub"
            ? "-1 em complemento de dois tem todos os 4 bytes iguais a 0xff (255 sem sinal)."
            : "-1 em complemento de dois tem todos os 4 bytes iguais a 0xff (-1 com sinal em 1 byte).",
        vars: [{ name: "neg", type: T_INT, value: -1 }],
      };
    }
    const word = rng.pick(["abc", "xyz", "gdb"]);
    return {
      body: [`char s[4] = "${word}";`],
      locals: [{ name: "s", value: `"${word}"` }],
      command: "x/4cb s",
      reason:
        "x/4cb lê 4 bytes individuais como caracteres (código + literal, incluindo o terminador 0 '\\000').",
      vars: [{ name: "s", type: arrayType(T_CHAR, 4), value: word }],
    };
  }

  // Level 3: x/4tb, x/1xg, x/1uw
  const sub = rng.int(0, 2);
  if (sub === 0) {
    const n = rng.pick([258, 5, 10, 257]);
    return {
      body: [`int n = ${String(n)};`],
      locals: [{ name: "n", value: String(n) }],
      command: "x/4tb &n",
      reason:
        "x/4tb imprime cada um dos 4 bytes em binário com 8 bits (preenchidos com zeros à esquerda), em little-endian.",
      vars: [{ name: "n", type: T_INT, value: n }],
    };
  }
  if (sub === 1) {
    const ull = rng.pick([0x0102030405060708n, 0x0011223344556677n, 0x0000000000000102n]);
    const lit = `0x${ull.toString(16)}ULL`;
    return {
      body: [`unsigned long long v = ${lit};`],
      locals: [{ name: "v", value: lit }],
      command: "x/1xg &v",
      reason: "x/1xg lê 1 giant word de 8 bytes (g) em hexadecimal preenchido com 16 dígitos.",
      vars: [{ name: "v", type: T_ULLONG, value: ull }],
    };
  }
  const neg = -rng.int(1, 3);
  return {
    body: [`int neg = ${String(neg)};`],
    locals: [{ name: "neg", value: String(neg) }],
    command: "x/1uw &neg",
    reason: "x/1uw lê 1 word de 4 bytes (w) como inteiro sem sinal (2^32 + valor).",
    vars: [{ name: "neg", type: T_INT, value: neg }],
  };
}

function buildItem(
  seed: number,
  index: number,
  level: GdbOutLevel,
  kind: GdbOutKind,
  draft: Draft,
): GdbOutputItem {
  const state = buildMemoryState(draft.vars, draft.extraTypes);
  const res = evalGdbCommand(draft.command, state);
  if (!res.ok) {
    throw new Error(`generator produced invalid command "${draft.command}": ${res.error}`);
  }

  const lines: string[] = [];
  if (draft.preMain !== undefined) {
    for (const l of draft.preMain) lines.push(l);
  }
  lines.push("int main() {");
  for (const l of draft.body) lines.push(`  ${l}`);
  lines.push("  int done = 0;");
  lines.push("  return done;");
  lines.push("}");

  // Stop on `return done;` so every local declared above is initialized and live under -O0.
  const stopLine = lines.length - 1;

  return {
    seed,
    index,
    level,
    kind,
    kc: `gdb.out.${kind}`,
    file: draft.file ?? "sol.cpp",
    lines,
    stopLine,
    locals: draft.locals,
    command: draft.command,
    commandKind: res.kind,
    canonical: res.output,
    reason: draft.reason,
    state,
  };
}

export function generateOutputItem(
  seed: number,
  index: number,
  level: GdbOutLevel,
  kinds: readonly GdbOutKind[],
): GdbOutputItem {
  const pool = kinds.length > 0 ? kinds : GDB_OUT_KINDS;
  const itemSeed = deriveSeed(seed, index);
  const rng = createRng(itemSeed);
  const kind = rng.pick(pool);

  let draft: Draft;
  switch (kind) {
    case "formato":
      draft = genFormato(rng, level);
      break;
    case "char":
      draft = genChar(rng, level);
      break;
    case "expressao":
      draft = genExpressao(rng, level);
      break;
    case "array":
      draft = genArray(rng, level);
      break;
    case "string":
      draft = genString(rng, level);
      break;
    case "struct":
      draft = genStruct(rng, level);
      break;
    case "ponteiro":
      draft = genPonteiro(rng, level);
      break;
    case "sizeof":
      draft = genSizeof(rng, level);
      break;
    case "memoria":
      draft = genMemoria(rng, level);
      break;
  }

  return buildItem(itemSeed, index, level, kind, draft);
}
