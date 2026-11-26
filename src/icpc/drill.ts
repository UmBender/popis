import type { Submission, TeamStanding } from "./score";

export const ICPC_KINDS = ["penalidade", "posicao", "ultrapassar", "escolher"] as const;
export type IcpcKind = (typeof ICPC_KINDS)[number];
export type IcpcKindFilter = "all" | IcpcKind;

export const ICPC_KIND_LABELS: Readonly<Record<IcpcKind, string>> = {
  penalidade: "Penalidade",
  posicao: "Posição",
  ultrapassar: "Ultrapassar",
  escolher: "Escolher problema",
};

export const ICPC_MAX_MINUTE = 300;

export type ProblemRatio = {
  readonly problem: string;
  readonly ac: number;
  readonly attempts: number;
};

type BaseItem = {
  readonly index: number;
  readonly seed: number;
  readonly kc: `icpc.${IcpcKind}`;
  readonly prompt: string;
  readonly canonical: string;
  readonly explanation: string;
  readonly compileErrorCounts: boolean;
  readonly currentMinute: number;
};

export type PenalidadeItem = BaseItem & {
  readonly kind: "penalidade";
  readonly team: string;
  readonly problems: readonly string[];
  readonly submissions: readonly Submission[];
  readonly standing: TeamStanding;
};

export type PosicaoItem = BaseItem & {
  readonly kind: "posicao";
  readonly problems: readonly string[];
  readonly submissions: readonly Submission[];
  readonly before: readonly TeamStanding[];
  readonly newSubmission: Submission;
  readonly after: readonly TeamStanding[];
};

export type UltrapassarItem = BaseItem & {
  readonly kind: "ultrapassar";
  readonly problems: readonly string[];
  readonly submissions: readonly Submission[];
  readonly board: readonly TeamStanding[];
  readonly chaser: string;
  readonly rival: string;
  readonly targetProblem: string;
};

export type EscolherItem = BaseItem & {
  readonly kind: "escolher";
  readonly problemStats: readonly ProblemRatio[];
};

export type IcpcItem = PenalidadeItem | PosicaoItem | UltrapassarItem | EscolherItem;

export type IcpcGenerateOptions = {
  readonly kind?: IcpcKindFilter;
  readonly compileErrorCounts?: boolean;
};

export function generateIcpcItem(
  _seed: number,
  _index: number,
  _options?: IcpcGenerateOptions,
): IcpcItem {
  throw new Error("todo");
}
