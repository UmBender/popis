import { generateEdit, type EditTarget } from "./drills/edit";
import type { RegisterKind } from "./drills/register-edit";
import { pressEditKey } from "./edit";
import { parseKeys, type Key } from "./keys";
import { createState, type Mode, type Pos } from "./state";

/** One lesson of the Learn mode (ADR-T16-1). */
export type Lesson = {
  readonly kind: RegisterKind;
  readonly title: string;
  /** A short explanation in Portuguese. */
  readonly explanation: string;
  /** The commands the lesson introduces, as shown. */
  readonly commands: readonly string[];
  /** The animated example: a small buffer, the keys and the buffer they give. */
  readonly example: {
    readonly lines: readonly string[];
    readonly start: Pos;
    readonly keys: string;
    readonly after: readonly string[];
  };
  /** The guided exercise is `generateEdit(seed, 0, [kind])`. */
  readonly exercise: { readonly seed: number };
};

/** The editor after each key of an example; the first frame has no key. */
export type Frame = {
  readonly key: Key | null;
  readonly lines: readonly string[];
  readonly cursor: Pos;
  readonly mode: Mode;
};

const HOME: Pos = { line: 0, col: 0 };

export const LESSONS: readonly Lesson[] = [
  {
    kind: "number-lines",
    title: "Gerar linhas com uma macro",
    explanation:
      "Uma macro grava teclas e as repete: qa começa a gravar no registrador a, " +
      "yyp copia a linha, <C-a> soma 1 ao número e q para. Depois, 2@a repete " +
      "a gravação duas vezes para gerar entradas de teste numeradas.",
    commands: ["qa … q", "@a", "9@a", "<C-a>"],
    example: {
      lines: ["1"],
      start: HOME,
      keys: "qayyp<C-a>q2@a",
      after: ["1", "2", "3", "4"],
    },
    exercise: { seed: 3 },
  },
  {
    kind: "copy-block",
    title: "Copiar um bloco n vezes",
    explanation:
      'O registrador "a guarda um trecho sem que o próximo apagar ou copiar o ' +
      'perca: "a2yy copia duas linhas para ele e 3"ap cola três vezes. Assim ' +
      "você multiplica um caso de teste sem digitar de novo.",
    commands: ['"a2yy', '"ap', '3"ap'],
    example: {
      lines: ["2", "7 8"],
      start: HOME,
      keys: '"a2yyj2"ap',
      after: ["2", "7 8", "2", "7 8", "2", "7 8"],
    },
    exercise: { seed: 3 },
  },
  {
    kind: "array-initializer",
    title: "Números num inicializador",
    explanation:
      "A linha de exemplo da entrada vira o inicializador de um vetor: :s/ /, /g " +
      "troca cada espaço por vírgula e espaço, I{ abre a chave no começo e A} " +
      "fecha no fim. Pronto para colar no código.",
    commands: [":s/ /, /g", "I", "A"],
    example: {
      lines: ["3 1 4 1 5"],
      start: HOME,
      keys: ":s/ /, /g<CR>I{<Esc>A}<Esc>",
      after: ["{3, 1, 4, 1, 5}"],
    },
    exercise: { seed: 3 },
  },
  {
    kind: "declarations-to-cin",
    title: "Declarações viram leituras",
    explanation:
      "Grave a troca de uma linha e deixe a macro fazer as outras: qa0cwcin >> " +
      "troca a primeira palavra, j desce e q para. Com 2@a ela corre as linhas " +
      "que faltam e para sozinha ao chegar no fim do arquivo.",
    commands: ["qa … q", "0", "cw", "2@a"],
    example: {
      lines: ["int a;", "int b;", "int c;"],
      start: HOME,
      keys: "qa0cwcin >><Esc>jq2@a",
      after: ["cin >> a;", "cin >> b;", "cin >> c;"],
    },
    exercise: { seed: 3 },
  },
  {
    kind: "swap-columns",
    title: "Trocar duas colunas",
    explanation:
      'dw apaga a primeira coluna e o apagado fica no registrador ": <C-r>" ' +
      "cola esse texto no modo de inserção. Dentro de uma macro, a troca corre " +
      "todas as linhas. O <BS> tira o espaço que sobrou.",
    commands: ["dw", '<C-r>"', "<BS>", "qa … q"],
    example: {
      lines: ["1 a", "2 b", "3 c"],
      start: HOME,
      keys: 'qa0dwA <C-r>"<BS><Esc>j0q2@a',
      after: ["a 1", "b 2", "c 3"],
    },
    exercise: { seed: 3 },
  },
  {
    kind: "delete-debug-line",
    title: "Apagar o debug e guardar a cópia",
    explanation:
      'Apagar uma linha com dd troca o que você copiou. O registrador "_ é o ' +
      'buraco negro: "_dd apaga sem guardar nada, e o p cola a cópia de antes. ' +
      '(Depois de um dd comum, "0p também cola a última cópia.)',
    commands: ['"_dd', "p", '"0p'],
    example: {
      lines: ["int n;", "cin >> n;", "cerr << n << endl;", "cout << n;"],
      start: HOME,
      keys: 'yy2j"_ddp',
      after: ["int n;", "cin >> n;", "cout << n;", "int n;"],
    },
    exercise: { seed: 3 },
  },
  {
    kind: "paste-saved-text",
    title: "Guardar um trecho e colar em dois lugares",
    explanation:
      '"ayy guarda a linha no registrador a. Você pode apagar e copiar outras ' +
      'coisas à vontade: "ap cola o trecho guardado quantas vezes quiser. Os ' +
      "registradores de a a z só mudam quando você escolhe.",
    commands: ['"ayy', '"ap', "dd"],
    example: {
      lines: ["int n;", "cin >> n;", "x = y + 1;", "cout << n;"],
      start: HOME,
      keys: '"ayyjdd"apj"ap',
      after: ["int n;", "x = y + 1;", "int n;", "cout << n;", "int n;"],
    },
    exercise: { seed: 3 },
  },
  {
    kind: "increment-indexes",
    title: "Incrementar índices com ponto",
    explanation:
      "<C-a> soma 1 ao próximo número da linha e <C-x> subtrai; com j. você " +
      "repete a soma na linha de baixo, pois o ponto repete a última mudança. " +
      "Serve para passar um bloco de índices de 0-base para 1-base.",
    commands: ["<C-a>", "<C-x>", "j."],
    example: {
      lines: ["a[0] = 1;", "a[1] = 2;", "a[2] = 3;"],
      start: HOME,
      keys: "<C-a>j.j.",
      after: ["a[1] = 1;", "a[2] = 2;", "a[3] = 3;"],
    },
    exercise: { seed: 3 },
  },
];

export function lessonFor(kind: RegisterKind): Lesson {
  return LESSONS.find((lesson) => lesson.kind === kind) as Lesson;
}

/** The guided exercise of a lesson: always the same edit. */
export function exerciseFor(lesson: Lesson): EditTarget {
  return generateEdit(lesson.exercise.seed, 0, [lesson.kind]);
}

/** The frames of the example: the start, then the state after each key. */
export function exampleFrames(lesson: Lesson): readonly Frame[] {
  const { lines, start, keys } = lesson.example;
  let state = createState(lines, start);
  const frames: Frame[] = [
    { key: null, lines: state.lines, cursor: state.cursor, mode: state.mode },
  ];
  for (const key of parseKeys(keys)) {
    state = pressEditKey(state, key);
    frames.push({ key, lines: state.lines, cursor: state.cursor, mode: state.mode });
  }
  return frames;
}
