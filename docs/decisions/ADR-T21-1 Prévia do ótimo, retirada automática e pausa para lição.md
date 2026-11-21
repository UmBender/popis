---
id: ADR-T21-1
title: Prévia do ótimo, retirada automática e pausa para lição
status: proposed
kind: decision
date: 2026-11-21
task: T21
builds_on: [ADR-T13-1, ADR-T14-1, ADR-T19-1, ADR-T20-1, ADR-T22-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T21-1 Prévia do ótimo, retirada automática e pausa para lição

## Context

Nos treinos de Movimento (T13) e Edição (T14), a solução ótima só aparece
depois que a pessoa termina o alvo. Quem ainda não conhece os comandos fica
preso a `h j k l` e não descobre comandos como `f(`, `ci(` ou `2w` durante
a prática. Por outro lado, manter a ajuda ligada para sempre causa
dependência (*expertise reversal*) e mistura o placar de rodadas com ajuda
ao histórico de rodadas livres.

## Decision

1. **Opção `preview` em `popis.vim-settings` e `popis.vim-edit-settings`:**
   quatro valores (`off` = Desligada, `always` = Sempre, `stuck` = Ao
   travar, `auto` = Automática). O campo é opcional no JSON salvo: quando
   ausente, `defaultPreviewMode(store)` escolhe `"auto"` se `popis.vim` não
   tem nenhuma rodada salva e `"off"` se já existe histórico de Vim. Isso
   preserva a compatibilidade com configurações antigas e separa iniciantes
   de quem já joga.
2. **Constantes e regra da retirada automática em `src/vim/preview.ts`:**
   `AUTO_EFFICIENCY_THRESHOLD = 0.85`, `AUTO_WINDOW = 20`,
   `STUCK_EXTRA_KEYS = 2` e `STUCK_IDLE_MS = 5000` ficam centralizadas num
   único módulo puro. No modo `"auto"`, calculamos a eficiência média das
   últimas `AUTO_WINDOW` metas de cada comando presente na solução do alvo
   (lendo os eventos de `popis.events.v1` mais as metas já feitas na rodada
   atual). Um comando precisa ter ao menos `AUTO_WINDOW` metas e eficiência
   média `>= 0.85` para passar a `"stuck"`; abaixo disso, a prévia aparece
   desde o início. Quando um alvo combina vários comandos, basta um deles
   estar abaixo do limiar para a prévia aparecer.
3. **Recálculo imediato com busca em `src/vim/optimal.ts`:**
   `recalculateOptimal(state, target, level)` busca a partir do estado
   atual com aprofundamento progressivo (para manter o tempo abaixo de
   16 ms mesmo no nível 7) e cai para um caminho direto válido do nível se
   o cursor estiver além do limite de busca. Na Edição, quando a pessoa sai
   do caminho ótimo com o buffer intacto, recalculamos o movimento até o
   ponto inicial da edição com `recalculateOptimal` no nível 7; se o buffer
   já mudou, sugerimos `<Esc>` (quando fora do modo normal) e `u` até o
   buffer original seguidos do movimento recalculado e da edição de
   referência.
4. **Histórico e placar separados (`assisted`):** cada `TargetResult` e
   `EditResult` registra `assisted: boolean` (verdadeiro sempre que a prévia
   ficou visível no alvo, inclusive via `Ctrl+P`). A tela de resultado exibe
   os pares `sem prévia` e `com prévia`. Em `popis.vim`, `VimResult` e
   `VimEditResult` guardam `assisted?: boolean`; registros antigos sem o
   campo carregam como `assisted: false`. `vimSummary`, `vimEditSummary` e
   `RoundHistory` contam apenas rodadas com `assisted === false` e informam
   quantas rodadas assistidas ficaram de fora.
5. **Lição em modal com pausa da rodada (`src/ui/vim/Preview.tsx`):**
   clicar num bloco de comando da prévia pausa a rodada (`pauseRound` /
   `pauseEditRound`), congela o relógio e o temporizador de inatividade, e
   abre a lição correspondente da T20 em um diálogo modal sobre o treino.
   Fechar o diálogo (`Esc` ou botão) retoma a rodada deslocando `startedAt`
   e `targetStartedAt` pela duração da pausa e devolve o foco ao campo do
   Vim sem perder nenhum progresso.

## Alternatives considered

- **Navegar para o item Aprender na árvore ao clicar num bloco** —
  desmontaria `MotionDrill` / `EditDrill` e perderia a rodada em andamento,
  ou exigiria elevar todo o estado da rodada para `App.tsx`. O modal
  local mantém o estado intacto com pausa explícita no motor da rodada.
- **Usar média com menos de 20 metas para desligar a prévia no modo
  automático** — faria a prévia sumir após a primeira meta concluída com
  ajuda (100% de eficiência), quebrando o efeito de retirada gradual.

## Consequences

- `src/vim/round.ts` e `src/vim/edit-round.ts` passam a suportar pausa e
  retomada determinísticas via relógio injetado.
- Os eventos já gravados pela T22 (`popis.events.v1`) alimentam o modo
  automático sem criar nova chave de armazenamento.
- `src/ui/VimScreenEdit.test.tsx` precisa fixar `preview: "off"` no teste
  de resumo não assistido porque um `store` vazio agora inicia em `"auto"`.

## Rollback plan

Reverter os commits da branch `task/T21-vim-optimal-preview` e registrar um
ADR `kind: rollback` apontando para `ADR-T21-1`. Os campos opcionais
`preview` e `assisted` nos dados salvos são ignorados com segurança por
versões anteriores.
