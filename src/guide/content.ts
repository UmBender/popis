import type { LessonId } from "../learn/curriculum";
import type { ItemId } from "../ui/shell/sections";

export type GuideLearnItem = "vim-learn" | "gdb-learn" | "shell-learn" | "regex-learn";

export type GuideLink =
  | { readonly kind: "item"; readonly item: ItemId; readonly label: string }
  | {
      readonly kind: "lesson";
      readonly item: GuideLearnItem;
      readonly lesson: LessonId;
      readonly label: string;
    };

export type GuideItem = {
  readonly id: string;
  readonly text: string;
  readonly link?: GuideLink;
};

export type GuideSection = {
  readonly id: string;
  readonly title: string;
  readonly items: readonly GuideItem[];
};

/** Contest checklists for the team notebook, linked to popis drills and lessons (T44, ADR-T44-1). */
export const GUIDE_SECTIONS: readonly GuideSection[] = [
  {
    id: "setup",
    title: "Primeiros 15 minutos",
    items: [
      {
        id: "setup-template",
        text: "Digitar o template base no editor",
        link: { kind: "item", item: "typing", label: "Digitação" },
      },
      {
        id: "setup-bashrc",
        text: "Configurar ~/.bashrc com função de compilar e ulimit -s",
        link: { kind: "lesson", item: "shell-learn", lesson: "u8-bashrc", label: "Shell: .bashrc" },
      },
      {
        id: "setup-hello",
        text: "Compilar um hello, testar a impressão e o envio no juiz",
        link: { kind: "lesson", item: "shell-learn", lesson: "u2-judge", label: "Shell: compilar" },
      },
      {
        id: "setup-readers",
        text: "Dois leitores começam por pontas opostas da prova",
      },
      {
        id: "setup-scoreboard",
        text: "Terceiro monitora o placar para achar o problema mais fácil",
      },
    ],
  },
  {
    id: "submit",
    title: "Antes de submeter",
    items: [
      {
        id: "submit-samples",
        text: "Conferir todos os exemplos do enunciado com diff",
        link: { kind: "lesson", item: "shell-learn", lesson: "u4-diff", label: "Shell: diff" },
      },
      {
        id: "submit-edges",
        text: "Testar casos de borda (n = 1, máximo, zeros, todos iguais)",
      },
      {
        id: "submit-long-long",
        text: "Checar se precisa de long long e overflow intermediário",
        link: { kind: "item", item: "stl", label: "STL" },
      },
      {
        id: "submit-format",
        text: "Conferir formato de saída (maiúsculas, espaços, casas decimais)",
      },
      {
        id: "submit-file",
        text: "Confirmar arquivo e problema certos, sem cerr de debug",
        link: { kind: "lesson", item: "shell-learn", lesson: "u1-nav", label: "Shell: arquivos" },
      },
      {
        id: "submit-paper",
        text: "Imprimir e depurar no papel enquanto outro usa o computador",
      },
    ],
  },
  {
    id: "wa",
    title: "WA",
    items: [
      {
        id: "wa-reread",
        text: "Reler o enunciado: restrições, casos impossíveis e empates",
      },
      {
        id: "wa-overflow",
        text: "Procurar overflow de int, cast em multiplicação e módulo negativo",
        link: { kind: "item", item: "division", label: "Divisão inteira" },
      },
      {
        id: "wa-multitest",
        text: "Em multitest, verificar se globais e vetores foram zerados",
      },
      {
        id: "wa-edge",
        text: "Checar borda: n = 0/1, grafo desconexo, índices 0 ou 1",
      },
      {
        id: "wa-precision",
        text: "Revisar precisão de ponto flutuante (long double, eps, inteiro)",
        link: { kind: "item", item: "ref-cpp", label: "Referência C++" },
      },
      {
        id: "wa-stress",
        text: "Rodar stress test contra força bruta com gerador e diff",
        link: { kind: "lesson", item: "shell-learn", lesson: "u5-loop", label: "Shell: stress" },
      },
    ],
  },
  {
    id: "tle",
    title: "TLE",
    items: [
      {
        id: "tle-complexity",
        text: "Conferir complexidade contra o limite de operações da prova",
        link: { kind: "item", item: "estimation", label: "Estimativa" },
      },
      {
        id: "tle-fastio",
        text: "Ativar I/O rápido (ios::sync_with_stdio(false); cin.tie(nullptr))",
        link: { kind: "item", item: "ref-cpp", label: "Referência C++" },
      },
      {
        id: "tle-endl",
        text: "Trocar endl por quebra de linha sem flush",
      },
      {
        id: "tle-copies",
        text: "Passar vetores e strings por referência para evitar cópias",
        link: { kind: "item", item: "stl", label: "STL" },
      },
      {
        id: "tle-loop",
        text: "Caçar laço infinito ou busca binária que não converge",
        link: { kind: "lesson", item: "shell-learn", lesson: "u3-time", label: "Shell: timeout" },
      },
      {
        id: "tle-constant",
        text: "Reduzir constante (map, alocação em laço, módulo desnecessário)",
        link: { kind: "item", item: "sums", label: "Somatórios" },
      },
    ],
  },
  {
    id: "rte",
    title: "RTE",
    items: [
      {
        id: "rte-index",
        text: "Checar índice fora do vetor, container vazio e ponteiro nulo",
        link: { kind: "lesson", item: "gdb-learn", lesson: "u9-signals", label: "GDB: sinais" },
      },
      {
        id: "rte-stack",
        text: "Verificar pilha da recursão e testar com ulimit -s",
        link: { kind: "lesson", item: "shell-learn", lesson: "u6-limits", label: "Shell: ulimit" },
      },
      {
        id: "rte-divzero",
        text: "Procurar divisão ou resto por zero",
        link: {
          kind: "lesson",
          item: "gdb-learn",
          lesson: "u5-backtrace",
          label: "GDB: backtrace",
        },
      },
      {
        id: "rte-sanitizers",
        text: "Compilar com -fsanitize=address,undefined e _GLIBCXX_DEBUG",
        link: {
          kind: "lesson",
          item: "shell-learn",
          lesson: "u2-sanitizers",
          label: "Shell: sanitizers",
        },
      },
      {
        id: "rte-read-error",
        text: "Ler a saída do compilador e do sanitizer antes de editar",
        link: { kind: "item", item: "compile-read", label: "Ler o erro" },
      },
    ],
  },
  {
    id: "mle",
    title: "MLE",
    items: [
      {
        id: "mle-vectors",
        text: "Calcular o tamanho dos vetores e matrizes em MB (sizeof)",
        link: { kind: "lesson", item: "gdb-learn", lesson: "u14-sizeof", label: "GDB: sizeof" },
      },
      {
        id: "mle-map",
        text: "Trocar map ou set por vector ordenado com busca binária",
        link: { kind: "item", item: "stl", label: "STL" },
      },
      {
        id: "mle-recursion",
        text: "Reduzir variáveis locais na recursão ou converter para iterativo",
        link: { kind: "item", item: "estimation", label: "Estimativa" },
      },
    ],
  },
  {
    id: "team",
    title: "Time",
    items: [
      {
        id: "team-one-pc",
        text: "Um computador para três: mantenha o teclado sempre produtivo",
      },
      {
        id: "team-off-pc",
        text: "Quem não está digitando lê, pensa ou depura no papel",
      },
      {
        id: "team-no-dup",
        text: "Não deixar dois no mesmo problema sem combinar antes",
      },
      {
        id: "team-switch",
        text: "Se travou por 15 min, imprimir o código e liberar a máquina",
      },
    ],
  },
];

export const GUIDE_ITEMS: readonly GuideItem[] = GUIDE_SECTIONS.flatMap((section) => section.items);

const GUIDE_ID_SET = new Set<string>(GUIDE_ITEMS.map((item) => item.id));

export function isGuideItemId(value: unknown): value is string {
  return typeof value === "string" && GUIDE_ID_SET.has(value);
}
