import { createRng, deriveSeed, type Rng } from "../core/rng";
import { compile, type MatchMode, type RegexDialect } from "./compile";
import {
  REGEX_ITEM_KINDS,
  type CasarItem,
  type ExtrairItem,
  type LerItem,
  type RegexItem,
  type RegexItemKind,
  type TrocarItem,
} from "./types";

const pad2 = (n: number): string => String(n).padStart(2, "0");

type CasarBuilder = (rng: Rng, dialect: RegexDialect, id: string) => CasarItem;

function makeCasar(
  id: string,
  family: string,
  dialect: RegexDialect,
  mode: MatchMode,
  prompt: string,
  positive: readonly string[],
  negative: readonly string[],
  canonicalByDialect: Readonly<Record<RegexDialect, string>>,
  explanation: string,
): CasarItem {
  return {
    id,
    kind: "casar",
    kc: "regex.casar",
    family,
    dialect,
    mode,
    prompt,
    positive,
    negative,
    canonical: canonicalByDialect[dialect],
    canonicalByDialect,
    explanation,
  };
}

const CASAR_BUILDERS: readonly (readonly [string, CasarBuilder])[] = [
  [
    "signed-int",
    (rng, dialect, id) => {
      const a = rng.int(10, 99);
      const b = rng.int(1, 89);
      const c = rng.int(100, 999);
      return makeCasar(
        id,
        "signed-int",
        dialect,
        "search",
        "Número inteiro com sinal opcional (linha inteira).",
        [String(a), `-${String(b)}`, `+${String(c)}`, "0"],
        [`${String(a)}a`, "+", `--${String(b)}`, `${String(b)}.5`, ` ${String(a)}`],
        { python: "^[+-]?\\d+$", ere: "^[+-]?[0-9]+$" },
        "Âncoras ^ e $ garantem que nada sobre antes ou depois dos dígitos.",
      );
    },
  ],
  [
    "decimal",
    (rng, dialect, id) => {
      const a = rng.int(1, 49);
      const b = rng.int(10, 99);
      const c = rng.int(1, 9);
      const d = rng.int(10, 99);
      const e = rng.int(0, 9);
      return makeCasar(
        id,
        "decimal",
        dialect,
        "search",
        "Número decimal com sinal opcional e ponto obrigatório (linha inteira).",
        [`${String(a)}.${String(b)}`, `-${String(e)}.${String(c)}`, `+${String(d)}.05`],
        [
          `${String(a)}a${String(b)}`,
          `${String(a)}.`,
          `.${String(b)}`,
          `${String(a)}.${String(b)}x`,
          String(a),
        ],
        { python: "^[+-]?\\d+\\.\\d+$", ere: "^[+-]?[0-9]+\\.[0-9]+$" },
        "Escapar o ponto (\\.) evita casar letras no meio do número.",
      );
    },
  ],
  [
    "sci-num",
    (rng, dialect, id) => {
      const m1 = rng.int(1, 9);
      const f1 = rng.int(1, 9);
      const e1 = rng.int(2, 12);
      const m2 = rng.int(1, 9);
      const e2 = rng.int(3, 18);
      const m3 = rng.int(1, 9);
      const f3 = rng.int(10, 99);
      const e3 = rng.int(1, 9);
      return makeCasar(
        id,
        "sci-num",
        dialect,
        "search",
        "Número em notação científica (ex.: 1.5e-9 ou 3E+12, linha inteira).",
        [
          `${String(m1)}.${String(f1)}e-${String(e1)}`,
          `${String(m2)}E+${String(e2)}`,
          `-${String(m3)}.${String(f3)}e${String(e3)}`,
        ],
        [
          `${String(m1)}a${String(f1)}e-${String(e1)}`,
          `${String(m1)}.${String(f1)}e`,
          `e${String(e2)}`,
          `${String(m1)}.${String(f1)}e-${String(e1)}x`,
          `${String(m2)}E+-${String(e2)}`,
        ],
        {
          python: "^[+-]?\\d+(\\.\\d+)?[eE][+-]?\\d+$",
          ere: "^[+-]?[0-9]+(\\.[0-9]+)?[eE][+-]?[0-9]+$",
        },
        "A parte decimal (\\.\\d+)? é opcional, mas o expoente após e/E é obrigatório.",
      );
    },
  ],
  [
    "case-header",
    (rng, dialect, id) => {
      const n1 = rng.int(1, 19);
      const n2 = rng.int(20, 49);
      const n3 = rng.int(50, 99);
      const v1 = rng.int(1, 95);
      const v2 = rng.int(100, 990);
      const v3 = rng.int(0, 9);
      return makeCasar(
        id,
        "case-header",
        dialect,
        "search",
        "Linha de resposta no formato 'Case #N: V' com inteiros não negativos.",
        [
          `Case #${String(n1)}: ${String(v1)}`,
          `Case #${String(n2)}: ${String(v2)}`,
          `Case #${String(n3)}: ${String(v3)}`,
        ],
        [
          `Case ${String(n1)}: ${String(v1)}`,
          `Case #${String(n1)}: `,
          `case #${String(n1)}: ${String(v1)}`,
          `Case #${String(n1)}: ${String(v1)}x`,
          `Case #: ${String(v2)}`,
        ],
        { python: "^Case #\\d+: \\d+$", ere: "^Case #[0-9]+: [0-9]+$" },
        "Case e # são literais, seguidos de dígitos antes e depois de ': '.",
      );
    },
  ],
  [
    "test-status",
    (rng, dialect, id) => {
      const n1 = rng.int(1, 15);
      const n2 = rng.int(16, 40);
      const n3 = rng.int(41, 80);
      return makeCasar(
        id,
        "test-status",
        dialect,
        "search",
        "Linha de log de teste aprovado no formato 'Teste N: OK'.",
        [`Teste ${String(n1)}: OK`, `Teste ${String(n2)}: OK`, `Teste ${String(n3)}: OK`],
        [
          `Teste ${String(n1)}: WA`,
          `Teste ${String(n1)}: OK!`,
          `Teste ${String(n1)} OK`,
          "Teste : OK",
          `teste ${String(n2)}: OK`,
        ],
        { python: "^Teste \\d+: OK$", ere: "^Teste [0-9]+: OK$" },
        "Ancorar o fim ($) impede aceitar 'OK!' ou sufixos extras.",
      );
    },
  ],
  [
    "diff-line",
    (rng, dialect, id) => {
      const v1 = rng.int(1, 99);
      const v2 = rng.int(100, 999);
      const v3 = rng.int(1, 50);
      return makeCasar(
        id,
        "diff-line",
        dialect,
        "search",
        "Linha de conteúdo do diff tradicional (começa com '< ' ou '> ' e tem texto).",
        [`< ${String(v1)}`, `> ${String(v2)}`, `< ans=${String(v3)}`],
        [`a< ${String(v1)}`, `<${String(v1)}`, "< ", "---", "3c3"],
        { python: "^[<>] .+$", ere: "^[<>] .+$" },
        "^[<>] ancora o marcador no início e .+ exige ao menos um caractere após o espaço.",
      );
    },
  ],
  [
    "judge-log",
    (rng, dialect, id) => {
      const n1 = rng.int(1, 20);
      const n2 = rng.int(21, 50);
      const n3 = rng.int(51, 90);
      return makeCasar(
        id,
        "judge-log",
        dialect,
        "search",
        "Linha de falha do juiz no formato 'caso N: WA', 'TLE' ou 'RTE'.",
        [`caso ${String(n1)}: WA`, `caso ${String(n2)}: TLE`, `caso ${String(n3)}: RTE`],
        [
          `caso ${String(n1)}: AC`,
          `caso ${String(n1)}: WAA`,
          `caso ${String(n2)}: TLE!`,
          "caso : WA",
          `caso ${String(n3)}: OK`,
        ],
        { python: "^caso \\d+: (WA|TLE|RTE)$", ere: "^caso [0-9]+: (WA|TLE|RTE)$" },
        "Os parênteses limitam a alternância | apenas ao veredito final.",
      );
    },
  ],
  [
    "date",
    (rng, dialect, id) => {
      const y1 = rng.int(2020, 2029);
      const m1 = rng.int(1, 9);
      const d1 = rng.int(10, 28);
      const y2 = rng.int(2015, 2025);
      const m2 = rng.int(10, 12);
      const d2 = rng.int(1, 9);
      const y3 = rng.int(2021, 2028);
      const m3 = rng.int(1, 9);
      const d3 = rng.int(1, 9);
      const p1 = `${String(y1)}-${pad2(m1)}-${pad2(d1)}`;
      return makeCasar(
        id,
        "date",
        dialect,
        "search",
        "Data no formato AAAA-MM-DD (quatro, dois e dois dígitos, linha inteira).",
        [p1, `${String(y2)}-${pad2(m2)}-${pad2(d2)}`, `${String(y3)}-${pad2(m3)}-${pad2(d3)}`],
        [
          `${String(y1)}/${pad2(m1)}/${pad2(d1)}`,
          `${p1}0`,
          `${String(y1)}a${pad2(m1)}-${pad2(d1)}`,
          `${String(y1).slice(2)}-${pad2(m1)}-${pad2(d1)}`,
          `${String(y1)}-${String(m1)}-${pad2(d1)}`,
        ],
        { python: "^\\d{4}-\\d{2}-\\d{2}$", ere: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
        "{4} e {2} fixam a quantidade exata de dígitos em cada bloco.",
      );
    },
  ],
  [
    "time",
    (rng, dialect, id) => {
      const h1 = rng.int(1, 9);
      const m1 = rng.int(10, 59);
      const s1 = rng.int(10, 59);
      const h2 = rng.int(10, 23);
      const m2 = rng.int(0, 9);
      const s2 = rng.int(0, 59);
      const h3 = rng.int(10, 23);
      const m3 = rng.int(10, 59);
      const s3 = rng.int(0, 9);
      const p1 = `${pad2(h1)}:${pad2(m1)}:${pad2(s1)}`;
      return makeCasar(
        id,
        "time",
        dialect,
        "fullmatch",
        "Horário no formato HH:MM:SS (dois dígitos por campo, modo fullmatch).",
        [p1, `${pad2(h2)}:${pad2(m2)}:${pad2(s2)}`, `${pad2(h3)}:${pad2(m3)}:${pad2(s3)}`],
        [
          `${pad2(h1)}-${pad2(m1)}:${pad2(s1)}`,
          `${p1}0`,
          `${pad2(h1)}:${pad2(m1)}`,
          `${String(h1)}:${pad2(m1)}:${pad2(s1)}`,
          `ab:${pad2(m1)}:${pad2(s1)}`,
        ],
        { python: "\\d{2}:\\d{2}:\\d{2}", ere: "[0-9]{2}:[0-9]{2}:[0-9]{2}" },
        "No modo fullmatch a linha inteira já precisa casar sem precisar de ^ e $.",
      );
    },
  ],
  [
    "cpp-ident",
    (rng, dialect, id) => {
      const n1 = rng.int(1, 9);
      const n2 = rng.int(10, 99);
      const ch = rng.pick(["A", "B", "X", "Z"]);
      const p1 = `cnt_${String(n1)}`;
      const p2 = `_dp${String(n2)}`;
      const p3 = `solve${ch}`;
      return makeCasar(
        id,
        "cpp-ident",
        dialect,
        "search",
        "Identificador válido de C++ (começa com letra ou '_', seguido de letras, dígitos ou '_').",
        [p1, p2, p3],
        [`1${p2}`, `cnt-${String(n1)}`, `cnt ${String(n1)}`, `${String(n1)}${String(n2)}`, "a.b"],
        { python: "^[A-Za-z_]\\w*$", ere: "^[A-Za-z_][A-Za-z0-9_]*$" },
        "O primeiro caractere não pode ser dígito; os seguintes podem usar letras, dígitos ou '_'.",
      );
    },
  ],
  [
    "ipv4",
    (rng, dialect, id) => {
      const a = rng.int(10, 192);
      const b = rng.int(0, 168);
      const c = rng.int(0, 99);
      const d = rng.int(1, 254);
      const e = rng.int(1, 99);
      const p1 = `${String(a)}.${String(b)}.${String(c)}.${String(d)}`;
      return makeCasar(
        id,
        "ipv4",
        dialect,
        "search",
        "Endereço IPv4 (quatro blocos de 1 a 3 dígitos separados por ponto).",
        [p1, `127.0.0.${String(e)}`, `10.${String(e)}.0.1`],
        [
          `${String(a)}a${String(b)}.${String(c)}.${String(d)}`,
          `${String(a)}.${String(b)}.${String(c)}.`,
          `${String(a)}.${String(b)}.${String(c)}`,
          `${String(a)}.${String(b)}.${String(c)}.1234`,
          `${p1}.1`,
        ],
        {
          python: "^(\\d{1,3}\\.){3}\\d{1,3}$",
          ere: "^([0-9]{1,3}\\.){3}[0-9]{1,3}$",
        },
        "Repetir o grupo (bloco + ponto literal) 3 vezes deixa o padrão curto e exato.",
      );
    },
  ],
  [
    "repeated-token",
    (rng, dialect, id) => {
      const w = rng.pick(["ok", "wa", "no", "ha"]);
      return makeCasar(
        id,
        "repeated-token",
        dialect,
        "search",
        `Palavra '${w}' repetida duas ou mais vezes, separada por espaços (linha inteira).`,
        [`${w} ${w}`, `${w} ${w} ${w}`, `${w}  ${w}`],
        [w, `${w}_${w}`, `${w}${w}`, `${w} ${w}!`, `${w} ${w}x`],
        { python: `^${w}( +${w})+$`, ere: `^${w}( +${w})+$` },
        "O + exige pelo menos uma repetição depois da primeira ocorrência.",
      );
    },
  ],
  [
    "blank-line",
    (_rng, dialect, id) =>
      makeCasar(
        id,
        "blank-line",
        dialect,
        "search",
        "Linha em branco (vazia ou contendo apenas espaços).",
        ["", " ", "   "],
        [".", " a", "  x", "0"],
        { python: "^\\s*$", ere: "^[[:space:]]*$" },
        "^\\s*$ (ou ^[[:space:]]*$ no grep -E) aceita zero ou mais espaços entre início e fim.",
      ),
  ],
  [
    "trailing-space",
    (rng, dialect, id) => {
      const n1 = rng.int(1, 50);
      const n2 = rng.int(10, 99);
      const n3 = rng.int(1, 9);
      return makeCasar(
        id,
        "trailing-space",
        dialect,
        "search",
        "Linha com um ou mais espaços sobrando no final.",
        [`int x = ${String(n1)}; `, `ans = ${String(n2)}  `, `ok_${String(n3)} `],
        [`int x = ${String(n1)};`, ` ans = ${String(n2)}`, `ok_${String(n3)}`, "a b"],
        { python: " +$", ere: " +$" },
        "Ancorar com $ garante que o espaço esteja exatamente no fim da linha.",
      );
    },
  ],
];

export const CASAR_FAMILIES: readonly string[] = CASAR_BUILDERS.map(([name]) => name);

type ExtrairBuilder = (rng: Rng, dialect: RegexDialect, id: string) => ExtrairItem;

function makeExtrair(
  id: string,
  family: string,
  dialect: RegexDialect,
  prompt: string,
  cases: readonly { readonly line: string; readonly expected: string | null }[],
  canonicalByDialect: Readonly<Record<RegexDialect, string>>,
  explanation: string,
): ExtrairItem {
  return {
    id,
    kind: "extrair",
    kc: "regex.extrair",
    family,
    dialect,
    mode: "search",
    prompt,
    cases,
    canonical: canonicalByDialect[dialect],
    canonicalByDialect,
    explanation,
  };
}

const EXTRAIR_BUILDERS: readonly ExtrairBuilder[] = [
  (rng, dialect, id) => {
    const n1 = rng.int(1, 9);
    const n2 = rng.int(10, 49);
    const n3 = rng.int(50, 99);
    const v1 = rng.int(1, 99);
    const v2 = -rng.int(10, 99);
    const v3 = rng.int(100, 500);
    return makeExtrair(
      id,
      "case-answer",
      dialect,
      "Extraia no grupo 1 o número de resposta após 'Case #N: '.",
      [
        { line: `Case #${String(n1)}: ${String(v1)}`, expected: String(v1) },
        { line: `Case #${String(n2)}: ${String(v2)}`, expected: String(v2) },
        { line: `Case #${String(n3)}: ${String(v3)}`, expected: String(v3) },
        { line: `Case ${String(n1)}: ${String(v1)}`, expected: null },
      ],
      { python: "Case #\\d+: (-?\\d+)", ere: "Case #[0-9]+: (-?[0-9]+)" },
      "O sinal opcional -? dentro do grupo 1 captura também respostas negativas.",
    );
  },
  (rng, dialect, id) => {
    const t1 = rng.int(10, 99);
    const t2 = rng.int(100, 999);
    const t3 = rng.int(1, 9);
    return makeExtrair(
      id,
      "time-ms",
      dialect,
      "Extraia no grupo 1 o tempo em milissegundos de 'time=Nms'.",
      [
        { line: `run=1 time=${String(t1)}ms status=OK`, expected: String(t1) },
        { line: `run=2 time=${String(t2)}ms status=TLE`, expected: String(t2) },
        { line: `time=${String(t3)}ms`, expected: String(t3) },
        { line: `run=4 time=${String(t1)}s status=OK`, expected: null },
      ],
      { python: "time=(\\d+)ms", ere: "time=([0-9]+)ms" },
      "Deixe 'time=' e 'ms' fora dos parênteses para o grupo 1 conter só os dígitos.",
    );
  },
  (rng, dialect, id) => {
    const f1 = rng.pick(["graph.h", "dsu.hpp", "seg.h"]);
    const f2 = rng.pick(["io.h", "fft.hpp", "math.h"]);
    const f3 = rng.pick(["debug.h", "flow.h", "tree.h"]);
    return makeExtrair(
      id,
      "quoted-name",
      dialect,
      "Extraia no grupo 1 o nome de arquivo entre aspas duplas.",
      [
        { line: `#include "${f1}"`, expected: f1 },
        { line: `open("${f2}")`, expected: f2 },
        { line: `file="${f3}" ok`, expected: f3 },
        { line: "#include <vector>", expected: null },
      ],
      { python: '"([^"]+)"', ere: '"([^"]+)"' },
      '[^"]+ casa tudo até a próxima aspa, evitando captura gulosa demais.',
    );
  },
  (rng, dialect, id) => {
    const s1 = rng.int(1, 99);
    const s2 = rng.int(100, 999);
    const s3 = rng.int(1000, 9999);
    return makeExtrair(
      id,
      "flag-seed",
      dialect,
      "Extraia no grupo 1 o número passado em '--seed=N'.",
      [
        { line: `./gen --seed=${String(s1)} --fast`, expected: String(s1) },
        { line: `run --n=5 --seed=${String(s2)}`, expected: String(s2) },
        { line: `--seed=${String(s3)} ok`, expected: String(s3) },
        { line: `./gen --limit=${String(s1)}`, expected: null },
      ],
      { python: "--seed=(\\d+)", ere: "--seed=([0-9]+)" },
      "Ancorar no prefixo --seed= evita pegar o valor de outras flags.",
    );
  },
  (rng, dialect, id) => {
    const c1 = rng.int(1, 20);
    const c2 = rng.int(21, 50);
    const c3 = rng.int(51, 90);
    return makeExtrair(
      id,
      "bracket-tag",
      dialect,
      "Extraia no grupo 1 o veredito em maiúsculas dentro de colchetes '[...]'.",
      [
        { line: `[WA] caso ${String(c1)}`, expected: "WA" },
        { line: `[TLE] caso ${String(c2)}`, expected: "TLE" },
        { line: `[RTE] caso ${String(c3)}`, expected: "RTE" },
        { line: `(WA) caso ${String(c1)}`, expected: null },
      ],
      { python: "\\[([A-Z]+)\\]", ere: "\\[([A-Z]+)\\]" },
      "Colchetes literais precisam de escape \\[ e \\].",
    );
  },
];

type TrocarBuilder = (rng: Rng, dialect: RegexDialect, id: string) => TrocarItem;

function makeTrocar(
  id: string,
  family: string,
  dialect: RegexDialect,
  prompt: string,
  cases: readonly { readonly before: string; readonly after: string }[],
  canonicalByDialect: Readonly<
    Record<RegexDialect, { readonly pattern: string; readonly replacement: string }>
  >,
  explanation: string,
): TrocarItem {
  const canon = canonicalByDialect[dialect];
  return {
    id,
    kind: "trocar",
    kc: "regex.trocar",
    family,
    dialect,
    mode: "search",
    prompt,
    cases,
    canonical: canon.pattern,
    canonicalReplacement: canon.replacement,
    canonicalByDialect,
    explanation,
  };
}

const TROCAR_BUILDERS: readonly TrocarBuilder[] = [
  (rng, dialect, id) => {
    const y1 = rng.int(2021, 2027);
    const m1 = pad2(rng.int(1, 12));
    const d1 = pad2(rng.int(1, 28));
    const y2 = rng.int(2020, 2026);
    const m2 = pad2(rng.int(1, 12));
    const d2 = pad2(rng.int(1, 28));
    return makeTrocar(
      id,
      "date-br",
      dialect,
      "Converta datas AAAA-MM-DD para DD/MM/AAAA usando grupos.",
      [
        { before: `${String(y1)}-${m1}-${d1}`, after: `${d1}/${m1}/${String(y1)}` },
        { before: `data=${String(y2)}-${m2}-${d2} ok`, after: `data=${d2}/${m2}/${String(y2)} ok` },
        { before: `${String(y1)}/${m1}/${d1}`, after: `${String(y1)}/${m1}/${d1}` },
      ],
      {
        python: { pattern: "(\\d{4})-(\\d{2})-(\\d{2})", replacement: "\\3/\\2/\\1" },
        ere: { pattern: "([0-9]{4})-([0-9]{2})-([0-9]{2})", replacement: "\\3/\\2/\\1" },
      },
      "\\3, \\2 e \\1 reorganizam dia, mês e ano capturados nos grupos.",
    );
  },
  (rng, dialect, id) => {
    const a = rng.int(1, 30);
    const b = rng.int(31, 90);
    const c = rng.int(1, 9);
    return makeTrocar(
      id,
      "collapse-spaces",
      dialect,
      "Troque sequências de dois ou mais espaços por um único espaço.",
      [
        { before: `${String(a)}   ${String(b)}`, after: `${String(a)} ${String(b)}` },
        { before: `a  b    ${String(c)}`, after: `a b ${String(c)}` },
        { before: `${String(a)} ${String(b)}`, after: `${String(a)} ${String(b)}` },
      ],
      {
        python: { pattern: " {2,}", replacement: " " },
        ere: { pattern: " {2,}", replacement: " " },
      },
      "Um espaço seguido de {2,} (ou dois espaços e +) reduz qualquer bloco a um espaço.",
    );
  },
  (rng, dialect, id) => {
    const a = rng.int(1, 50);
    const b = rng.int(51, 99);
    return makeTrocar(
      id,
      "trim-trailing",
      dialect,
      "Remova os espaços sobrando no fim de cada linha.",
      [
        { before: `x = ${String(a)};   `, after: `x = ${String(a)};` },
        { before: `  y = ${String(b)} `, after: `  y = ${String(b)}` },
        { before: `z = ${String(a)}`, after: `z = ${String(a)}` },
      ],
      {
        python: { pattern: " +$", replacement: "" },
        ere: { pattern: " +$", replacement: "" },
      },
      " +$ remove apenas os espaços no final sem tocar na indentação do início.",
    );
  },
  (rng, dialect, id) => {
    const k1 = rng.pick(["n", "k", "ans"]);
    const k2 = rng.pick(["dp", "sum", "cnt"]);
    const v1 = rng.int(1, 40);
    const v2 = rng.int(41, 99);
    return makeTrocar(
      id,
      "swap-pair",
      dialect,
      "Troque pares 'chave=valor' por 'valor:chave'.",
      [
        { before: `${k1}=${String(v1)}`, after: `${String(v1)}:${k1}` },
        {
          before: `${k1}=${String(v1)} ${k2}=${String(v2)}`,
          after: `${String(v1)}:${k1} ${String(v2)}:${k2}`,
        },
        { before: `${k2}:${String(v2)}`, after: `${k2}:${String(v2)}` },
      ],
      {
        python: { pattern: "([a-z]+)=(\\d+)", replacement: "\\2:\\1" },
        ere: { pattern: "([a-z]+)=([0-9]+)", replacement: "\\2:\\1" },
      },
      "Grupo 1 captura a chave, grupo 2 o número, e \\2:\\1 inverte os dois.",
    );
  },
  (rng, dialect, id) => {
    const n1 = rng.int(1, 15);
    const n2 = rng.int(16, 45);
    const v1 = rng.int(1, 90);
    const v2 = rng.int(100, 400);
    return makeTrocar(
      id,
      "case-to-caso",
      dialect,
      "Troque 'Case #N:' por 'Caso N:' preservando o resto da linha.",
      [
        {
          before: `Case #${String(n1)}: ${String(v1)}`,
          after: `Caso ${String(n1)}: ${String(v1)}`,
        },
        {
          before: `Case #${String(n2)}: ${String(v2)}`,
          after: `Caso ${String(n2)}: ${String(v2)}`,
        },
        { before: `Teste ${String(n1)}: OK`, after: `Teste ${String(n1)}: OK` },
      ],
      {
        python: { pattern: "Case #(\\d+):", replacement: "Caso \\1:" },
        ere: { pattern: "Case #([0-9]+):", replacement: "Caso \\1:" },
      },
      "O grupo 1 guarda o número do caso para reaproveitá-lo em 'Caso \\1:'.",
    );
  },
];

type LerBuilder = (rng: Rng, dialect: RegexDialect, id: string) => LerItem;

function makeLer(
  id: string,
  family: string,
  dialect: RegexDialect,
  mode: MatchMode,
  pattern: string,
  lines: readonly string[],
  explanation: string,
): LerItem {
  const compiled = compile(pattern, dialect, mode);
  if (!compiled.ok) throw new Error(`invalid ler pattern ${pattern}: ${compiled.error}`);
  const expected = lines.map((l) => compiled.matcher.test(l));
  const indices = expected
    .map((ok, i) => (ok ? String(i + 1) : null))
    .filter((x): x is string => x !== null);
  return {
    id,
    kind: "ler",
    kc: "regex.ler",
    family,
    dialect,
    mode,
    prompt: "Marque todas as linhas em que a expressão abaixo casa.",
    pattern,
    lines,
    expected,
    canonical: `linhas ${indices.join(", ")}`,
    explanation,
  };
}

const LER_BUILDERS: readonly LerBuilder[] = [
  (rng, dialect, id) => {
    const ch = rng.pick(["a", "x", "p"]);
    const tail = rng.pick(["b", "y", "q"]);
    const escaped = rng.int(0, 1) === 1;
    const pat = escaped ? `${ch}\\.${tail}` : `${ch}.${tail}`;
    return makeLer(
      id,
      "dot",
      dialect,
      "search",
      pat,
      [`${ch}.${tail}`, `${ch}5${tail}`, `_${ch}.${tail}_`, `${ch}${tail}`, `${ch}..${tail}`],
      escaped
        ? "\\. casa apenas ponto literal."
        : "Ponto sem escape casa qualquer caractere (inclusive dígito ou ponto).",
    );
  },
  (rng, dialect, id) => {
    const w = rng.pick(["ok", "wa", "ac"]);
    const other = w === "ok" ? "ko" : "ok";
    const anchored = rng.int(0, 1) === 1;
    const pat = anchored ? `^${w}$` : w;
    return makeLer(
      id,
      "anchors",
      dialect,
      "search",
      pat,
      [w, `${w}!`, `x${w}`, ` ${w} `, other],
      anchored
        ? "^ e $ exigem que a linha inteira seja exatamente a palavra."
        : "Sem âncoras, search casa em qualquer posição da linha.",
    );
  },
  (rng, dialect, id) => {
    const a = rng.pick(["a", "b", "c"]);
    const b = rng.pick(["x", "y", "z"]);
    const q = rng.pick(["+", "*", "?"]);
    const pat = `^${a}${b}${q}$`;
    return makeLer(
      id,
      "quantifier",
      dialect,
      "search",
      pat,
      [a, `${a}${b}`, `${a}${b}${b}`, `${a}${b}${b}${b}`, `${b}${a}`],
      q === "+"
        ? "+ exige uma ou mais ocorrências."
        : q === "*"
          ? "* aceita zero ou mais ocorrências."
          : "? aceita zero ou uma ocorrência.",
    );
  },
  (rng, dialect, id) => {
    const d = dialect === "python" ? "\\d" : "[0-9]";
    const pat = `^${d}{2,3}$`;
    const n1 = rng.int(1, 9);
    const n2 = rng.int(10, 99);
    const n3 = rng.int(100, 999);
    const n4 = rng.int(1000, 9999);
    return makeLer(
      id,
      "bounds",
      dialect,
      "search",
      pat,
      [String(n1), String(n2), String(n3), String(n4), `${String(n2)}a`],
      "{2,3} exige exatamente 2 ou 3 dígitos na linha inteira.",
    );
  },
  (rng, dialect, id) => {
    const pat = dialect === "python" ? "^[^\\d]+$" : "^[^0-9]+$";
    const n = rng.int(1, 9);
    return makeLer(
      id,
      "negated-class",
      dialect,
      "search",
      pat,
      ["abc", `a${String(n)}c`, "ok_test", "", `-${String(n)}`],
      "O ^ dentro de [...] nega a classe, e + exige ao menos um caractere.",
    );
  },
  (rng, dialect, id) => {
    const a = rng.pick(["WA", "RE"]);
    const b = rng.pick(["TLE", "MLE"]);
    const pat = `^(${a}|${b})$`;
    return makeLer(
      id,
      "alternation",
      dialect,
      "search",
      pat,
      [a, b, `${a}${b}`, `caso ${a}`, "AC"],
      "Parênteses aplicam ^ e $ às duas alternativas igualmente.",
    );
  },
  (rng, dialect, id) => {
    const pat = dialect === "python" ? "\\bcat\\b" : "^[[:upper:]][[:digit:]]+$";
    const n1 = rng.int(1, 9);
    const n2 = rng.int(10, 99);
    return dialect === "python"
      ? makeLer(
          id,
          "word-boundary",
          dialect,
          "search",
          pat,
          ["cat", "my cat!", "scatter", "cat_1", "a-cat"],
          "\\b exige fronteira entre caractere de palavra (\\w) e não-palavra; '_' pertence a \\w.",
        )
      : makeLer(
          id,
          "posix-class",
          dialect,
          "search",
          pat,
          [`A${String(n1)}`, `Z${String(n2)}`, `a${String(n1)}`, "AB", `A${String(n1)}x`],
          "[[:upper:]] casa só maiúscula ASCII e [[:digit:]]+ um ou mais dígitos.",
        );
  },
];

/** Deterministic generator for regex practice items (AC-3). */
export function generateRegexItem(
  seed: number,
  index: number,
  dialect: RegexDialect,
  kinds?: readonly RegexItemKind[],
): RegexItem {
  const pool = kinds !== undefined && kinds.length > 0 ? kinds : REGEX_ITEM_KINDS;
  const seedRng = createRng(seed);
  const kindOffset = seedRng.int(0, pool.length - 1);
  const familyOffset = seedRng.int(0, 100);
  const kind = pool[(kindOffset + index) % pool.length]!;
  const rng = createRng(deriveSeed(seed, index));
  const id = `rx-${String(seed)}-${String(index)}-${kind}-${dialect}`;

  if (kind === "casar") {
    const [, build] = CASAR_BUILDERS[(familyOffset + index) % CASAR_BUILDERS.length]!;
    return build(rng, dialect, id);
  }
  if (kind === "extrair") {
    const build = EXTRAIR_BUILDERS[(familyOffset + index) % EXTRAIR_BUILDERS.length]!;
    return build(rng, dialect, id);
  }
  if (kind === "trocar") {
    const build = TROCAR_BUILDERS[(familyOffset + index) % TROCAR_BUILDERS.length]!;
    return build(rng, dialect, id);
  }
  const build = LER_BUILDERS[(familyOffset + index) % LER_BUILDERS.length]!;
  return build(rng, dialect, id);
}
