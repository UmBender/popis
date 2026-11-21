/** A key and what it does, shown side by side in the status line and help dialog. */
export type Hint = readonly [keys: string, text: string];

/** The uniform actions available during a training round (ADR-T19-1). */
export type TrainingAction = "exit" | "skip" | "restart";

export const MENU_HINTS: readonly Hint[] = [
  ["j/k", "mover"],
  ["1–9", "ir para"],
  ["Enter", "começar"],
  ["Tab", "opções"],
  ["m", "menu"],
  ["?", "atalhos"],
];

export const RESULT_HINTS: readonly Hint[] = [
  ["Enter", "jogar de novo"],
  ["Esc", "menu"],
  ["r", "revisar erros"],
];

export const ROUND_HINTS: readonly Hint[] = [
  ["Ctrl+Enter", "pular"],
  ["Ctrl+Shift+Enter", "recomeçar"],
  ["Esc", "sair"],
];

export const VIM_ROUND_HINTS: readonly Hint[] = [
  ["Ctrl+Enter", "pular"],
  ["Ctrl+Shift+Enter", "recomeçar"],
  [":q", "sair"],
];

export const HELP_HINTS: readonly Hint[] = [
  ["j/k ↓/↑", "mover na árvore"],
  ["h/l ←/→", "fechar e abrir a pasta"],
  ["1–9", "ir para o item"],
  ["Enter", "começar"],
  ["Tab", "ir para as opções"],
  ["Shift+Tab", "voltar"],
  ["m", "recolher ou abrir o menu"],
  ["?", "esta ajuda"],
  ["Ctrl+Enter", "no treino, pular o item atual"],
  ["Ctrl+Shift+Enter", "no treino, recomeçar com seed nova"],
  ["Esc", "sair do treino ou fechar o menu"],
  [":q", "no Vim, sair do treino (com Enter)"],
  ["Enter", "no resultado, jogar de novo"],
  ["r", "no resultado, revisar erros"],
];

/** Matches a keydown event to one of the uniform training actions (ADR-T19-1). */
export function matchTrainingKey(
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey">,
  options?: { readonly vim?: boolean },
): TrainingAction | null {
  void event;
  void options;
  throw new Error("todo");
}
