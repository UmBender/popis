import { generateEdit, type EditKind } from "./drills/edit";
import type { RegisterKind } from "./drills/register-edit";
import { pressEditKey } from "./edit";
import { EDIT_HELP } from "./edit-help";
import { pressKey } from "./engine";
import { parseKeys } from "./keys";
import { LESSONS, lessonFor, type Frame } from "./lessons";
import { levelHelp, type Level } from "./levels";
import { createState, type Pos } from "./state";

export type LessonId = string;

export type UnitStatus = "new" | "in-progress" | "done";

export type ExerciseStep = 0 | 1 | 2;

export type MotionExample = {
  readonly kind: "motion";
  readonly level: Level;
  readonly lines: readonly string[];
  readonly start: Pos;
  readonly keys: string;
  readonly target: Pos;
};

export type EditExample = {
  readonly kind: "edit";
  readonly lines: readonly string[];
  readonly start: Pos;
  readonly keys: string;
  readonly after: readonly string[];
};

export type MotionExercise = {
  readonly kind: "motion";
  readonly level: Level;
  readonly lines: readonly string[];
  readonly start: Pos;
  readonly target: Pos;
  readonly reference: string;
};

export type EditExercise = {
  readonly kind: "edit";
  readonly lines: readonly string[];
  readonly start: Pos;
  readonly after: readonly string[];
  readonly reference: string;
};

export type LessonExercise = MotionExercise | EditExercise;

export type PracticeLink =
  | { readonly drill: "motion"; readonly level: Level }
  | { readonly drill: "edit"; readonly kinds: readonly EditKind[] };

export type CurriculumLesson = {
  readonly id: LessonId;
  readonly unitId: string;
  readonly title: string;
  readonly explanation: string;
  readonly helpKeys: readonly string[];
  readonly commands: readonly string[];
  readonly example: MotionExample | EditExample;
  readonly exercises: readonly [LessonExercise, LessonExercise, LessonExercise];
  readonly practice: PracticeLink;
  readonly registerKind?: RegisterKind;
};

export type Unit = {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly level?: Level;
  readonly lessons: readonly CurriculumLesson[];
};

const p = (line: number, col: number): Pos => ({ line, col });

const mEx = (
  level: Level,
  lines: readonly string[],
  start: Pos,
  target: Pos,
  reference: string,
): MotionExercise => ({ kind: "motion", level, lines, start, target, reference });

const eEx = (
  lines: readonly string[],
  start: Pos,
  after: readonly string[],
  reference: string,
): EditExercise => ({ kind: "edit", lines, start, after, reference });

function t16Lesson(
  unitId: string,
  kind: RegisterKind,
  helpKeys: readonly string[],
): CurriculumLesson {
  const base = lessonFor(kind);
  let cachedExercises: readonly [LessonExercise, LessonExercise, LessonExercise] | null = null;
  const ex = (index: number): EditExercise => {
    const generated = generateEdit(base.exercise.seed, index, [kind]);
    return {
      kind: "edit",
      lines: generated.lines,
      start: generated.start,
      after: generated.after,
      reference: generated.reference,
    };
  };
  return {
    id: kind,
    unitId,
    title: base.title,
    explanation: base.explanation,
    helpKeys,
    commands: base.commands,
    example: {
      kind: "edit",
      lines: base.example.lines,
      start: base.example.start,
      keys: base.example.keys,
      after: base.example.after,
    },
    get exercises() {
      return (cachedExercises ??= [ex(0), ex(1), ex(2)]);
    },
    practice: { drill: "edit", kinds: [kind] },
    registerKind: kind,
  };
}

const SNIP_BS = [
  "int lo = 0, hi = n - 1;",
  "while (lo <= hi) {",
  "    int mid = (lo + hi) / 2;",
  "    if (a[mid] >= x) hi = mid - 1;",
  "}",
];

const SNIP_BFS = ["vector<int> dist(n, -1);", "queue<int> q;", "dist[s] = 0;", "q.push(s);"];

const SNIP_PARA = [
  "int gcd(int a, int b) {",
  "    return b ? gcd(b, a % b) : a;",
  "}",
  "",
  "int main() {",
  "    cout << gcd(12, 8);",
  "}",
];

export const UNITS: readonly Unit[] = [
  // Unit 1: Modos e h j k l (Movimento 1)
  {
    id: "u1-modes-hjkl",
    number: 1,
    title: "Modos e h j k l",
    level: 1,
    lessons: [
      {
        id: "motion-hjkl",
        unitId: "u1-modes-hjkl",
        title: "Mover com h j k l",
        explanation:
          "No modo normal, h e l movem um caractere para a esquerda ou direita, enquanto j e k descem e sobem uma linha. Manter os dedos na fileira base evita tirar a mão do teclado para usar as setas.",
        helpKeys: ["h", "j", "k", "l"],
        commands: ["h", "j", "k", "l"],
        example: {
          kind: "motion",
          level: 1,
          lines: ["int n, m;", "cin >> n >> m;", "cout << n + m;"],
          start: p(0, 4),
          keys: "jllk",
          target: p(0, 6),
        },
        exercises: [
          mEx(1, ["int n, m;", "cin >> n >> m;"], p(0, 0), p(1, 2), "jll"),
          mEx(1, ["int a = 1;", "int b = 2;", "int c = 3;"], p(2, 4), p(0, 4), "kk"),
          mEx(1, ["ans = max(ans, x);", "cnt++;"], p(0, 6), p(1, 3), "jhh"),
        ],
        practice: { drill: "motion", level: 1 },
      },
      {
        id: "edit-modes",
        unitId: "u1-modes-hjkl",
        title: "Modo normal e inserção: i, a e Esc",
        explanation:
          "No Vim você navega no modo normal e digita texto no modo de inserção. i entra em inserção antes do cursor, a entra depois do cursor e Esc volta ao modo normal.",
        helpKeys: ["i", "a"],
        commands: ["i", "a", "<Esc>"],
        example: {
          kind: "edit",
          lines: ["int n;", "cin >> n"],
          start: p(1, 7),
          keys: "a;<Esc>",
          after: ["int n;", "cin >> n;"],
        },
        exercises: [
          eEx(["int x = 0"], p(0, 8), ["int x = 0;"], "a;<Esc>"),
          eEx(["vector<int> a(n);"], p(0, 0), ["// vector<int> a(n);"], "i// <Esc>"),
          eEx(["cout << ans"], p(0, 10), ["cout << ans;"], "a;<Esc>"),
        ],
        practice: { drill: "motion", level: 1 },
      },
    ],
  },

  // Unit 2: Palavras (Movimento 2)
  {
    id: "u2-words",
    number: 2,
    title: "Palavras",
    level: 2,
    lessons: [
      {
        id: "motion-wbe",
        unitId: "u2-words",
        title: "Saltar palavras: w, b e e",
        explanation:
          "w avança ao início da próxima palavra, b volta ao início da anterior e e vai ao fim da palavra. Pontuação conta como palavra separada, útil para pular operadores em C++.",
        helpKeys: ["w", "b", "e"],
        commands: ["w", "b", "e"],
        example: {
          kind: "motion",
          level: 2,
          lines: ["int mid = (lo + hi) / 2;"],
          start: p(0, 0),
          keys: "wwe",
          target: p(0, 10),
        },
        exercises: [
          mEx(2, ["int lo = 0, hi = n;"], p(0, 0), p(0, 7), "ww"),
          mEx(2, ["int mid = lo + hi;"], p(0, 13), p(0, 4), "bbb"),
          mEx(2, ["long long ans = 0;"], p(0, 0), p(0, 8), "we"),
        ],
        practice: { drill: "motion", level: 2 },
      },
      {
        id: "motion-WBE",
        unitId: "u2-words",
        title: "PALAVRAS separadas por espaço: W, B e E",
        explanation:
          "W, B e E funcionam como w, b e e, mas ignoram pontuação e só param em espaços. Assim você pula expressões inteiras como a[mid] ou v.begin() num único salto.",
        helpKeys: ["W", "B", "E"],
        commands: ["W", "B", "E"],
        example: {
          kind: "motion",
          level: 2,
          lines: ["if (a[mid] >= x) hi = mid - 1;"],
          start: p(0, 4),
          keys: "WWE",
          target: p(0, 15),
        },
        exercises: [
          mEx(2, ["sort(v.begin(), v.end());"], p(0, 0), p(0, 16), "W"),
          mEx(2, ["dist[v] = dist[u] + 1;"], p(0, 20), p(0, 10), "BB"),
          mEx(2, ["pre[i+1] = pre[i] + a[i];"], p(0, 0), p(0, 7), "E"),
        ],
        practice: { drill: "motion", level: 2 },
      },
      {
        id: "motion-ge",
        unitId: "u2-words",
        title: "Voltar ao fim da palavra anterior: ge",
        explanation:
          "ge volta o cursor para o último caractere da palavra anterior. É o par inverso de e quando você passou um pouco do ponto onde queria parar.",
        helpKeys: ["ge"],
        commands: ["ge"],
        example: {
          kind: "motion",
          level: 2,
          lines: ["int ans = max(a, b);"],
          start: p(0, 10),
          keys: "gege",
          target: p(0, 6),
        },
        exercises: [
          mEx(2, ["int sum = 0;"], p(0, 8), p(0, 6), "ge"),
          mEx(2, ["long long res = 1;"], p(0, 10), p(0, 8), "ge"),
          mEx(2, ["int lo = 0, hi = n;"], p(0, 12), p(0, 9), "gege"),
        ],
        practice: { drill: "motion", level: 2 },
      },
    ],
  },

  // Unit 3: Linha (Movimento 3)
  {
    id: "u3-line",
    number: 3,
    title: "Linha",
    level: 3,
    lessons: [
      {
        id: "motion-line",
        unitId: "u3-line",
        title: "Início e fim da linha: 0, ^ e $",
        explanation:
          "0 vai à coluna 0, ^ vai ao primeiro caractere que não é espaço (depois do recuo) e $ vai ao último caractere da linha. Em código indentado, ^ e $ levam direto ao começo e ao fim do comando.",
        helpKeys: ["0", "^", "$"],
        commands: ["0", "^", "$"],
        example: {
          kind: "motion",
          level: 3,
          lines: ["    ans = max(ans, x);"],
          start: p(0, 10),
          keys: "^$0",
          target: p(0, 0),
        },
        exercises: [
          mEx(3, ["    int mid = (lo + hi) / 2;"], p(0, 15), p(0, 4), "^"),
          mEx(3, ["    int mid = (lo + hi) / 2;"], p(0, 4), p(0, 27), "$"),
          mEx(3, ["    cout << ans << endl;"], p(0, 12), p(0, 0), "0"),
        ],
        practice: { drill: "motion", level: 3 },
      },
    ],
  },

  // Unit 4: Achar na linha (Movimento 4)
  {
    id: "u4-find",
    number: 4,
    title: "Achar na linha",
    level: 4,
    lessons: [
      {
        id: "motion-find",
        unitId: "u4-find",
        title: "Buscar caractere na linha: f, F, t e T",
        explanation:
          "f{c} salta para o próximo caractere {c} na linha e t{c} para logo antes dele; F{c} e T{c} fazem o mesmo para trás. Muito rápido para chegar em vírgulas, parênteses ou colchetes.",
        helpKeys: ["f{c}", "F{c}", "t{c}", "T{c}"],
        commands: ["f{c}", "F{c}", "t{c}", "T{c}"],
        example: {
          kind: "motion",
          level: 4,
          lines: ["if (a[mid] >= x) hi = mid - 1;"],
          start: p(0, 0),
          keys: "f[t]",
          target: p(0, 8),
        },
        exercises: [
          mEx(4, ["sort(v.begin(), v.end());"], p(0, 0), p(0, 14), "f,"),
          mEx(4, ["for (int i = 0; i < n; i++)"], p(0, 0), p(0, 13), "t;"),
          mEx(4, ["ans = min(ans, dist[v]);"], p(0, 22), p(0, 10), "Fa"),
        ],
        practice: { drill: "motion", level: 4 },
      },
      {
        id: "motion-repeat-find",
        unitId: "u4-find",
        title: "Repetir busca na linha: ; e ,",
        explanation:
          "; repete o último f, F, t ou T na mesma direção e , repete na direção contrária. Serve para pular vários argumentos separados por vírgula sem redigitar o caractere.",
        helpKeys: [";", ","],
        commands: [";", ","],
        example: {
          kind: "motion",
          level: 4,
          lines: ["int a = 1, b = 2, c = 3;"],
          start: p(0, 0),
          keys: "f,;,",
          target: p(0, 9),
        },
        exercises: [
          mEx(4, ["int a = 1, b = 2, c = 3;"], p(0, 0), p(0, 16), "f,;"),
          mEx(4, ["for (int i = 0; i < n; i++)"], p(0, 0), p(0, 21), "f;;"),
          mEx(4, ["cin >> a >> b >> c;"], p(0, 0), p(0, 4), "f>;,"),
        ],
        practice: { drill: "motion", level: 4 },
      },
    ],
  },

  // Unit 5: Contagens (Movimento 5)
  {
    id: "u5-counts",
    number: 5,
    title: "Contagens",
    level: 5,
    lessons: [
      {
        id: "motion-counts",
        unitId: "u5-counts",
        title: "Repetir movimentos com contagem: 3w, 2f(",
        explanation:
          "Um número antes de qualquer movimento o repete aquela quantidade de vezes, como 3w ou 2f,. Em vez de apertar j quatro vezes, 4j desce direto em duas teclas.",
        helpKeys: ["{n}"],
        commands: ["3w", "2f,", "4j"],
        example: {
          kind: "motion",
          level: 5,
          lines: SNIP_BS,
          start: p(0, 0),
          keys: "3j2w",
          target: p(3, 7),
        },
        exercises: [
          mEx(5, SNIP_BS, p(0, 0), p(3, 0), "3j"),
          mEx(5, ["int a = 1, b = 2, c = 3;"], p(0, 0), p(0, 16), "2f,"),
          mEx(5, ["int lo = 0, hi = n - 1;"], p(0, 0), p(0, 9), "3w"),
        ],
        practice: { drill: "motion", level: 5 },
      },
    ],
  },

  // Unit 6: Arquivo (Movimento 6)
  {
    id: "u6-file",
    number: 6,
    title: "Arquivo",
    level: 6,
    lessons: [
      {
        id: "motion-file-lines",
        unitId: "u6-file",
        title: "Ir para o topo, fim ou linha n: gg, G e {n}G",
        explanation:
          "gg vai à primeira linha do arquivo, G vai à última e {n}G vai direto à linha de número n. Ideal para ir a uma linha apontada pelo compilador.",
        helpKeys: ["gg", "G", "{n}G"],
        commands: ["gg", "G", "{n}G"],
        example: {
          kind: "motion",
          level: 6,
          lines: SNIP_BFS,
          start: p(0, 0),
          keys: "G2Ggg",
          target: p(0, 0),
        },
        exercises: [
          mEx(6, SNIP_BFS, p(0, 0), p(3, 0), "G"),
          mEx(6, SNIP_BFS, p(3, 0), p(0, 0), "gg"),
          mEx(6, SNIP_BFS, p(0, 0), p(2, 0), "3G"),
        ],
        practice: { drill: "motion", level: 6 },
      },
      {
        id: "motion-paragraphs",
        unitId: "u6-file",
        title: "Saltar blocos de código: { e }",
        explanation:
          "{ volta à linha vazia anterior e } avança à próxima linha vazia. Em arquivos com várias funções separadas por linha em branco, você pula de função em função.",
        helpKeys: ["{", "}"],
        commands: ["{", "}"],
        example: {
          kind: "motion",
          level: 6,
          lines: SNIP_PARA,
          start: p(0, 0),
          keys: "}{",
          target: p(0, 0),
        },
        exercises: [
          mEx(6, SNIP_PARA, p(0, 0), p(3, 0), "}"),
          mEx(6, SNIP_PARA, p(5, 4), p(3, 0), "{"),
          mEx(6, SNIP_PARA, p(0, 0), p(6, 0), "}}"),
        ],
        practice: { drill: "motion", level: 6 },
      },
      {
        id: "motion-match",
        unitId: "u6-file",
        title: "Saltar para o par correspondente: %",
        explanation:
          "% leva o cursor ao parêntese, colchete ou chave que abre ou fecha o par atual. Funciona até quando o cursor está antes do delimitador na mesma linha.",
        helpKeys: ["%"],
        commands: ["%"],
        example: {
          kind: "motion",
          level: 6,
          lines: SNIP_BS,
          start: p(1, 17),
          keys: "%",
          target: p(4, 0),
        },
        exercises: [
          mEx(6, SNIP_BS, p(1, 17), p(4, 0), "%"),
          mEx(6, SNIP_BS, p(4, 0), p(1, 17), "%"),
          mEx(6, ["int mid = (lo + hi) / 2;"], p(0, 10), p(0, 18), "%"),
        ],
        practice: { drill: "motion", level: 6 },
      },
    ],
  },

  // Unit 7: Busca (Movimento 7)
  {
    id: "u7-search",
    number: 7,
    title: "Busca",
    level: 7,
    lessons: [
      {
        id: "motion-search",
        unitId: "u7-search",
        title: "Buscar texto no arquivo: / e ?",
        explanation:
          "/texto<CR> busca para frente e ?texto<CR> busca para trás no buffer inteiro. Em arquivos grandes, buscar 2 ou 3 letras do identificador é mais rápido que contar linhas.",
        helpKeys: ["/", "?"],
        commands: ["/", "?"],
        example: {
          kind: "motion",
          level: 7,
          lines: SNIP_BS,
          start: p(0, 0),
          keys: "/mid<CR>",
          target: p(2, 8),
        },
        exercises: [
          mEx(7, SNIP_BS, p(0, 0), p(2, 8), "/mid<CR>"),
          mEx(7, SNIP_BS, p(3, 20), p(1, 0), "?while<CR>"),
          mEx(7, SNIP_BFS, p(0, 0), p(3, 2), "/push<CR>"),
        ],
        practice: { drill: "motion", level: 7 },
      },
      {
        id: "motion-search-next",
        unitId: "u7-search",
        title: "Próxima e anterior ocorrência: n e N",
        explanation:
          "Depois de uma busca com / ou ?, n salta para a próxima ocorrência na mesma direção e N vai na direção oposta. Útil para revisar todos os usos de uma variável.",
        helpKeys: ["n", "N"],
        commands: ["n", "N"],
        example: {
          kind: "motion",
          level: 7,
          lines: SNIP_BS,
          start: p(0, 0),
          keys: "/mid<CR>n",
          target: p(3, 10),
        },
        exercises: [
          mEx(7, SNIP_BS, p(0, 0), p(3, 10), "/mid<CR>n"),
          mEx(7, SNIP_BS, p(0, 0), p(2, 8), "/mid<CR>nN"),
          mEx(7, SNIP_BFS, p(0, 0), p(2, 0), "/dist<CR>n"),
        ],
        practice: { drill: "motion", level: 7 },
      },
      {
        id: "motion-search-word",
        unitId: "u7-search",
        title: "Buscar a palavra sob o cursor: * e #",
        explanation:
          "* busca para frente a palavra inteira sob o cursor e # busca para trás, sem precisar digitar o nome. Excelente para acompanhar onde uma variável é atualizada.",
        helpKeys: ["*", "#"],
        commands: ["*", "#"],
        example: {
          kind: "motion",
          level: 7,
          lines: SNIP_BS,
          start: p(0, 12),
          keys: "*",
          target: p(1, 13),
        },
        exercises: [
          mEx(7, SNIP_BS, p(0, 12), p(1, 13), "*"),
          mEx(7, SNIP_BS, p(2, 20), p(1, 13), "#"),
          mEx(7, SNIP_BS, p(0, 4), p(1, 7), "*"),
        ],
        practice: { drill: "motion", level: 7 },
      },
    ],
  },

  // Unit 8: Operadores
  {
    id: "u8-operators",
    number: 8,
    title: "Operadores",
    lessons: [
      {
        id: "edit-operators",
        unitId: "u8-operators",
        title: "Operadores com movimento: d, c e y",
        explanation:
          "Operadores se combinam com qualquer movimento: d apaga, c apaga e entra em inserção e y copia. Assim dw apaga uma palavra, dt; apaga até o ponto e vírgula e cw troca a palavra.",
        helpKeys: ["d", "c", "y"],
        commands: ["dw", "cw", "yw", "dt;"],
        example: {
          kind: "edit",
          lines: ["int tmp = 0;"],
          start: p(0, 4),
          keys: "cwans<Esc>",
          after: ["int ans = 0;"],
        },
        exercises: [
          eEx(["int old = 0;"], p(0, 4), ["int val = 0;"], "cwval<Esc>"),
          eEx(["int tmp x = 0;"], p(0, 4), ["int x = 0;"], "dw"),
          eEx(["cout << a + b;"], p(0, 8), ["cout << ;"], "dt;"),
        ],
        practice: { drill: "edit", kinds: ["delete-word", "change-word", "delete-to-char"] },
      },
      {
        id: "edit-line-ops",
        unitId: "u8-operators",
        title: "Agir na linha inteira: dd, cc, yy e Y",
        explanation:
          "Dobrar o operador age na linha inteira: dd apaga a linha, cc troca o conteúdo dela e yy (ou Y) copia a linha inteira. Comum para apagar um print de debug ou duplicar uma linha.",
        helpKeys: ["dd", "Y"],
        commands: ["dd", "cc", "yy", "Y"],
        example: {
          kind: "edit",
          lines: ["int n;", "cerr << n;", "cout << n;"],
          start: p(1, 0),
          keys: "dd",
          after: ["int n;", "cout << n;"],
        },
        exercises: [
          eEx(["int n;", "cerr << n;", "cout << n;"], p(1, 2), ["int n;", "cout << n;"], "dd"),
          eEx(["int a = 1;", "int b = 2;"], p(0, 0), ["int b = 2;"], "dd"),
          eEx(["int n;", "int m;"], p(0, 0), ["int n;", "int n;", "int m;"], "yyp"),
        ],
        practice: { drill: "edit", kinds: ["delete-line", "duplicate-line"] },
      },
      {
        id: "edit-char-ops",
        unitId: "u8-operators",
        title: "Trocar ou apagar caractere: x, r e ~",
        explanation:
          "x apaga o caractere sob o cursor, r{c} substitui esse caractere por {c} sem sair do modo normal e ~ inverte maiúscula e minúscula. Ótimo para corrigir um sinal ou dígito.",
        helpKeys: ["x", "r{c}", "~"],
        commands: ["x", "X", "r{c}", "~"],
        example: {
          kind: "edit",
          lines: ["if (a < b) ans = 1;"],
          start: p(0, 6),
          keys: "r>",
          after: ["if (a > b) ans = 1;"],
        },
        exercises: [
          eEx(["int x = 0;"], p(0, 8), ["int x = 1;"], "r1"),
          eEx(["int x = a + b;"], p(0, 10), ["int x = a - b;"], "r-"),
          eEx(["int x = 10;;"], p(0, 11), ["int x = 10;"], "x"),
        ],
        practice: { drill: "edit", kinds: ["replace-digit", "change-operator"] },
      },
      {
        id: "edit-paste",
        unitId: "u8-operators",
        title: "Colar texto: p e P",
        explanation:
          "p cola o último texto copiado ou apagado depois do cursor (ou na linha abaixo, se for uma linha inteira) e P cola antes. Combinar ddp troca duas linhas de lugar instantaneamente.",
        helpKeys: ["p"],
        commands: ["p", "P", "ddp"],
        example: {
          kind: "edit",
          lines: ["ans = mid;", "hi = mid - 1;"],
          start: p(0, 0),
          keys: "ddp",
          after: ["hi = mid - 1;", "ans = mid;"],
        },
        exercises: [
          eEx(["int a = 1;", "int b = 2;"], p(0, 0), ["int b = 2;", "int a = 1;"], "ddp"),
          eEx(
            ["cin >> n;", "cout << n;"],
            p(0, 0),
            ["cin >> n;", "cin >> n;", "cout << n;"],
            "yyp",
          ),
          eEx(["a = 1;", "b = 2;"], p(0, 0), ["b = 2;", "a = 1;"], "ddp"),
        ],
        practice: { drill: "edit", kinds: ["swap-lines", "duplicate-line"] },
      },
    ],
  },

  // Unit 9: Objetos de texto
  {
    id: "u9-textobjects",
    number: 9,
    title: "Objetos de texto",
    lessons: [
      {
        id: "edit-textobj-word",
        unitId: "u9-textobjects",
        title: "Palavra inteira: iw e aw",
        explanation:
          "iw seleciona a palavra sob o cursor de qualquer posição dentro dela, e aw inclui o espaço ao lado. Com ciw você troca um identificador sem precisar voltar ao início da palavra.",
        helpKeys: ["iw", "aw"],
        commands: ["ciw", "daw", "iw", "aw"],
        example: {
          kind: "edit",
          lines: ["int total = 0;"],
          start: p(0, 6),
          keys: "ciwsum<Esc>",
          after: ["int sum = 0;"],
        },
        exercises: [
          eEx(["int total = 0;"], p(0, 7), ["int ans = 0;"], "ciwans<Esc>"),
          eEx(["int unused x = 0;"], p(0, 7), ["int x = 0;"], "daw"),
          eEx(["long count = 1;"], p(0, 8), ["long cnt = 1;"], "ciwcnt<Esc>"),
        ],
        practice: { drill: "edit", kinds: ["change-word", "delete-word", "change-type"] },
      },
      {
        id: "edit-textobj-pairs",
        unitId: "u9-textobjects",
        title: "Delimitadores: i( a(, i[, i{ e i<",
        explanation:
          "Objetos de pares agem no conteúdo dentro (i) ou incluindo (a) parênteses, colchetes, chaves e sinais de menor/maior. ci( troca os argumentos de uma função e ci[ troca o índice de um vetor.",
        helpKeys: ["i(", "a(", "i[", "i{", "i<"],
        commands: ["ci(", "da(", "ci[", "ci{", "ci<"],
        example: {
          kind: "edit",
          lines: ["ans = max(a, b);"],
          start: p(0, 11),
          keys: "ci(x, y<Esc>",
          after: ["ans = max(x, y);"],
        },
        exercises: [
          eEx(["cout << a[mid];"], p(0, 11), ["cout << a[i];"], "ci[i<Esc>"),
          eEx(["vector<int> a(n);"], p(0, 8), ["vector<long long> a(n);"], "ci<lt>long long<Esc>"),
          eEx(
            ["if (ok) { return 1; }"],
            p(0, 12),
            ["if (ok) { return 0; }"],
            "ci{ return 0; <Esc>",
          ),
        ],
        practice: {
          drill: "edit",
          kinds: ["change-parens", "change-brackets", "change-braces"],
        },
      },
      {
        id: "edit-textobj-quotes",
        unitId: "u9-textobjects",
        title: "Aspas e crases: i\", i' e i`",
        explanation:
          'i", i\' e i` agem no texto dentro de aspas duplas, simples ou crases na linha atual. Mesmo com o cursor antes da abertura, ci" salta até as aspas e troca o conteúdo.',
        helpKeys: ['i"', "i'", "i`"],
        commands: ['ci"', "ci'", "ci`"],
        example: {
          kind: "edit",
          lines: ['cout << "YES";'],
          start: p(0, 10),
          keys: 'ci"NO<Esc>',
          after: ['cout << "NO";'],
        },
        exercises: [
          eEx(['cout << "YES";'], p(0, 10), ['cout << "NO";'], 'ci"NO<Esc>'),
          eEx(["char c = 'a';"], p(0, 10), ["char c = 'z';"], "ci'z<Esc>"),
          eEx(['string s = "ok";'], p(0, 13), ['string s = "no";'], 'ci"no<Esc>'),
        ],
        practice: { drill: "edit", kinds: ["change-quotes"] },
      },
    ],
  },

  // Unit 10: Repetir e desfazer
  {
    id: "u10-repeat-undo",
    number: 10,
    title: "Repetir e desfazer",
    lessons: [
      {
        id: "edit-dot",
        unitId: "u10-repeat-undo",
        title: "Repetir a última mudança: .",
        explanation:
          "O ponto . repete a última mudança inteira, incluindo o texto inserido. Quando precisa fazer a mesma edição em várias linhas, faça uma vez, mova com j e aperte .",
        helpKeys: ["."],
        commands: ["."],
        example: {
          kind: "edit",
          lines: ["int a;", "int b;"],
          start: p(0, 0),
          keys: "ciwlong long<Esc>j0.",
          after: ["long long a;", "long long b;"],
        },
        exercises: [
          eEx(
            ["int a;", "int b;"],
            p(0, 0),
            ["long long a;", "long long b;"],
            "ciwlong long<Esc>j0.",
          ),
          eEx(["a[0] = 1", "a[1] = 2"], p(0, 0), ["a[0] = 1;", "a[1] = 2;"], "A;<Esc>j."),
          eEx(["x = 1;", "y = 1;"], p(0, 4), ["x = 0;", "y = 0;"], "r0j."),
        ],
        practice: { drill: "edit", kinds: ["change-type", "append-semicolon"] },
      },
      {
        id: "edit-undo",
        unitId: "u10-repeat-undo",
        title: "Desfazer e refazer: u e <C-r>",
        explanation:
          "u desfaz a última mudança inteira (uma inserção até o Esc conta como um passo) e <C-r> refaz o que u desfez. Errar um comando nunca é problema: um u devolve o código intacto.",
        helpKeys: ["u", "<C-r>"],
        commands: ["u", "<C-r>"],
        example: {
          kind: "edit",
          lines: ["int n;", "cin >> n;"],
          start: p(0, 0),
          keys: "ddu",
          after: ["int n;", "cin >> n;"],
        },
        exercises: [
          eEx(["int n;", "cin >> n;"], p(0, 0), ["int n;", "cin >> n;"], "ddu"),
          eEx(["int a = 1;"], p(0, 8), ["int a = 2;"], "r2u<C-r>"),
          eEx(["int x;", "int y;"], p(0, 0), ["int y;"], "ddu<C-r>"),
        ],
        practice: { drill: "edit", kinds: ["delete-line", "replace-digit"] },
      },
    ],
  },

  // Unit 11: Inserção
  {
    id: "u11-insert",
    number: 11,
    title: "Inserção",
    lessons: [
      {
        id: "edit-insert-line",
        unitId: "u11-insert",
        title: "Inserir nas pontas e abrir linhas: I, A, o e O",
        explanation:
          "I insere no início do texto da linha, A no fim da linha, o abre uma linha nova abaixo e O abre acima. Ideais para comentar com I//, fechar com A; ou adicionar uma linha de código.",
        helpKeys: ["I", "A", "o", "O"],
        commands: ["I", "A", "o", "O"],
        example: {
          kind: "edit",
          lines: ["    int ans = 0"],
          start: p(0, 8),
          keys: "A;<Esc>I// <Esc>",
          after: ["    // int ans = 0;"],
        },
        exercises: [
          eEx(["    cin >> n"], p(0, 6), ["    cin >> n;"], "A;<Esc>"),
          eEx(["    cerr << x;"], p(0, 10), ["    // cerr << x;"], "I// <Esc>"),
          eEx(["int n;"], p(0, 2), ["int n;", "cin >> n;"], "ocin >> n;<Esc>"),
        ],
        practice: { drill: "edit", kinds: ["append-semicolon", "comment-line", "open-line"] },
      },
      {
        id: "edit-change-short",
        unitId: "u11-insert",
        title: "Atalhos de troca e corte: s, S, C e D",
        explanation:
          "s troca o caractere sob o cursor, S troca a linha toda, C troca até o fim da linha e D apaga até o fim da linha. Trocar < por <= com s<=<Esc> ou cortar o resto da linha com D economiza teclas.",
        helpKeys: ["s", "D"],
        commands: ["s", "S", "C", "D"],
        example: {
          kind: "edit",
          lines: ["if (a < b) // debug"],
          start: p(0, 11),
          keys: "D",
          after: ["if (a < b) "],
        },
        exercises: [
          eEx(["int x = 0; // old"], p(0, 10), ["int x = 0;"], "D"),
          eEx(["while (lo < hi)"], p(0, 10), ["while (lo <= hi)"], "s<lt>=<Esc>"),
          eEx(["return a + b;"], p(0, 7), ["return 0;"], "C0;<Esc>"),
        ],
        practice: { drill: "edit", kinds: ["delete-to-end", "change-operator"] },
      },
    ],
  },

  // Unit 12: Visual
  {
    id: "u12-visual",
    number: 12,
    title: "Visual",
    lessons: [
      {
        id: "edit-visual-modes",
        unitId: "u12-visual",
        title: "Modos visuais: v, V e <C-v>",
        explanation:
          "v seleciona caracteres, V seleciona linhas inteiras e <C-v> seleciona um bloco retangular de colunas. Qualquer movimento estende a seleção e operadores como d, y ou > agem sobre ela.",
        helpKeys: ["v", "V", "<C-v>"],
        commands: ["v", "V", "<C-v>"],
        example: {
          kind: "edit",
          lines: ["// a = 1;", "// b = 2;", "// c = 3;"],
          start: p(0, 0),
          keys: "<C-v>2j2ld",
          after: ["a = 1;", "b = 2;", "c = 3;"],
        },
        exercises: [
          eEx(
            ["// a = 1;", "// b = 2;", "// c = 3;"],
            p(0, 0),
            ["a = 1;", "b = 2;", "c = 3;"],
            "<C-v>2j2ld",
          ),
          eEx(
            ["a = 1;", "b = 2;", "c = 3;"],
            p(0, 0),
            ["    a = 1;", "    b = 2;", "c = 3;"],
            "Vj>",
          ),
          eEx(["int tmp = 1;"], p(0, 4), ["int  = 1;"], "v2ld"),
        ],
        practice: { drill: "edit", kinds: ["uncomment-block", "indent-lines"] },
      },
      {
        id: "edit-visual-reselect",
        unitId: "u12-visual",
        title: "Trocar ponta e reselecionar: o e gv",
        explanation:
          "No modo visual, o move o cursor para a outra ponta da seleção para ajustar o início sem recomeçar. No modo normal, gv seleciona novamente o último trecho visual.",
        helpKeys: ["vo", "gv"],
        commands: ["o", "gv"],
        example: {
          kind: "edit",
          lines: ["a = 1;", "b = 2;"],
          start: p(0, 0),
          keys: "Vj>gv>",
          after: ["        a = 1;", "        b = 2;"],
        },
        exercises: [
          eEx(["a = 1;", "b = 2;"], p(0, 0), ["        a = 1;", "        b = 2;"], "Vj>gv>"),
          eEx(["int x = 1;"], p(0, 3), ["x = 1;"], "vohhhd"),
          eEx(["    a = 1;", "    b = 2;"], p(0, 0), ["a = 1;", "b = 2;"], "Vj<lt>"),
        ],
        practice: { drill: "edit", kinds: ["indent-lines"] },
      },
      {
        id: "edit-visual-block",
        unitId: "u12-visual",
        title: "Inserir em bloco: <C-v>I, <C-v>A e <C-v>$A",
        explanation:
          "Com um bloco selecionado em <C-v>, I insere antes do bloco em todas as linhas ao apertar Esc, e A acrescenta depois (com $A, no fim de cada linha). Perfeito para comentar blocos ou pôr ; em várias linhas.",
        helpKeys: ["<C-v>I", "<C-v>A", "<C-v>$A"],
        commands: ["<C-v>I", "<C-v>A", "<C-v>$A"],
        example: {
          kind: "edit",
          lines: ["int a = 1", "int b = 2", "int c = 3"],
          start: p(0, 0),
          keys: "<C-v>2j$A;<Esc>",
          after: ["int a = 1;", "int b = 2;", "int c = 3;"],
        },
        exercises: [
          eEx(
            ["int a = 1", "int b = 2", "int c = 3"],
            p(0, 0),
            ["int a = 1;", "int b = 2;", "int c = 3;"],
            "<C-v>2j$A;<Esc>",
          ),
          eEx(
            ["a = 1;", "b = 2;", "c = 3;"],
            p(0, 0),
            ["// a = 1;", "// b = 2;", "// c = 3;"],
            "<C-v>2jI// <Esc>",
          ),
          eEx(["x = 1", "y = 2"], p(0, 0), ["x = 1;", "y = 2;"], "<C-v>j$A;<Esc>"),
        ],
        practice: { drill: "edit", kinds: ["comment-block", "append-semicolons"] },
      },
    ],
  },

  // Unit 13: Linhas
  {
    id: "u13-lines",
    number: 13,
    title: "Linhas",
    lessons: [
      {
        id: "edit-indent-join",
        unitId: "u13-lines",
        title: "Indentar e juntar linhas: >>, <<, > e J",
        explanation:
          ">> indenta a linha, << tira recuo e o operador > aceita objetos como >i{ para indentar um bloco inteiro. J junta a linha atual com a próxima usando um espaço.",
        helpKeys: [">>", "<<", ">", "J"],
        commands: [">>", "<<", ">i{", "J"],
        example: {
          kind: "edit",
          lines: ["if (x > 0)", "    ans++;"],
          start: p(0, 0),
          keys: "J",
          after: ["if (x > 0) ans++;"],
        },
        exercises: [
          eEx(["if (ok)", "    break;"], p(0, 0), ["if (ok) break;"], "J"),
          eEx(
            ["for (int i = 0; i < n; i++) {", "sum += a[i];", "}"],
            p(1, 0),
            ["for (int i = 0; i < n; i++) {", "    sum += a[i];", "}"],
            ">i{",
          ),
          eEx(["    return 0;"], p(0, 0), ["return 0;"], "<lt><lt>"),
        ],
        practice: { drill: "edit", kinds: ["indent-block", "dedent-block", "join-lines"] },
      },
      {
        id: "edit-substitute",
        unitId: "u13-lines",
        title: "Substituir texto: :s, :%s e :noh",
        explanation:
          ":s/velho/novo/g troca na linha e :%s troca no arquivo inteiro; \\< e \\> casam palavras inteiras. :noh limpa o destaque da busca no Vim real.",
        helpKeys: [":s", ":%s", ":noh"],
        commands: [":s", ":%s", ":noh"],
        example: {
          kind: "edit",
          lines: ["cout << a << endl;", "cout << b << endl;"],
          start: p(0, 0),
          keys: ":%s/endl/'\\\\n'/g<CR>",
          after: ["cout << a << '\\n';", "cout << b << '\\n';"],
        },
        exercises: [
          eEx(
            ["cout << a << endl;", "cout << b << endl;"],
            p(0, 0),
            ["cout << a << '\\n';", "cout << b << '\\n';"],
            ":%s/endl/'\\\\n'/g<CR>",
          ),
          eEx(
            ["int x = 1;", "ans += x;"],
            p(0, 0),
            ["int val = 1;", "ans += val;"],
            ":%s/\\<lt>x\\>/val/g<CR>",
          ),
          eEx(["int a = b + b;"], p(0, 0), ["int a = c + c;"], ":s/b/c/g<CR>"),
        ],
        practice: {
          drill: "edit",
          kinds: ["rename-variable", "rename-in-function", "replace-endl"],
        },
      },
    ],
  },

  // Unit 14: Registradores (the 4 register lessons from T16)
  {
    id: "u14-registers",
    number: 14,
    title: "Registradores",
    lessons: [
      t16Lesson("u14-registers", "copy-block", ['"a', '"A']),
      t16Lesson("u14-registers", "delete-debug-line", ['"_', '"0']),
      t16Lesson("u14-registers", "paste-saved-text", ['"1', '"-', '""']),
      t16Lesson("u14-registers", "swap-columns", ["i_<C-r>"]),
    ],
  },

  // Unit 15: Macros e números (the 4 macro & <C-a> lessons from T16)
  {
    id: "u15-macros",
    number: 15,
    title: "Macros e números",
    lessons: [
      t16Lesson("u15-macros", "number-lines", ["q", "@a"]),
      t16Lesson("u15-macros", "declarations-to-cin", ["@@", "9@a"]),
      t16Lesson("u15-macros", "array-initializer", []),
      t16Lesson("u15-macros", "increment-indexes", ["<C-a>", "<C-x>"]),
    ],
  },
];

export const ALL_LESSONS: readonly CurriculumLesson[] = UNITS.flatMap((u) => u.lessons);

const LESSON_BY_ID: ReadonlyMap<string, CurriculumLesson> = new Map(
  ALL_LESSONS.map((lesson) => [lesson.id, lesson]),
);

const LESSON_BY_HELP_KEY: ReadonlyMap<string, CurriculumLesson> = new Map(
  ALL_LESSONS.flatMap((lesson) => lesson.helpKeys.map((key) => [key, lesson] as const)),
);

const HELP_DESCRIPTIONS: ReadonlyMap<string, string> = new Map([
  ...levelHelp(7).map((h) => [h.keys, h.text] as const),
  ...EDIT_HELP.map((h) => [h.keys, h.text] as const),
]);

export function curriculumLessonById(id: string): CurriculumLesson | undefined {
  return LESSON_BY_ID.get(id);
}

export function lessonForHelpKey(key: string): CurriculumLesson | undefined {
  return LESSON_BY_HELP_KEY.get(key);
}

/** One-line description from levels.ts or edit-help.ts, without duplicating text. */
export function commandDescription(key: string): string | undefined {
  return HELP_DESCRIPTIONS.get(key);
}

/** Animated frames for any curriculum lesson (motion engine or edit engine). */
export function curriculumExampleFrames(lesson: CurriculumLesson): readonly Frame[] {
  const { example } = lesson;
  let state = createState(example.lines, example.start);
  const frames: Frame[] = [
    { key: null, lines: state.lines, cursor: state.cursor, mode: state.mode },
  ];
  for (const key of parseKeys(example.keys)) {
    state =
      example.kind === "motion"
        ? pressKey(state, key, example.level).state
        : pressEditKey(state, key);
    frames.push({ key, lines: state.lines, cursor: state.cursor, mode: state.mode });
  }
  return frames;
}

export function unitStatus(unit: Unit, completed: ReadonlySet<string>): UnitStatus {
  const doneCount = unit.lessons.filter((l) => completed.has(l.id)).length;
  if (doneCount === 0) return "new";
  if (doneCount === unit.lessons.length) return "done";
  return "in-progress";
}

export function nextUncompletedLesson(completed: ReadonlySet<string>): CurriculumLesson | null {
  return ALL_LESSONS.find((lesson) => !completed.has(lesson.id)) ?? null;
}

/**
 * Adaptive fading (AC-3): finishing exercise 1 or 2 with at most `minKeys` skips
 * the next help level; finishing exercise 3 always completes the lesson.
 */
export function nextExerciseStep(
  step: ExerciseStep,
  typedKeys: number,
  minKeys: number,
): ExerciseStep | "done" {
  if (step === 2) return "done";
  const optimal = typedKeys <= minKeys;
  if (step === 0) return optimal ? 2 : 1;
  return optimal ? "done" : 2;
}

// Keep LESSONS referenced so T16 exports stay aligned with units 14 and 15.
export { LESSONS };
