---
id: T21
title: Vim - prévia do ótimo
status: in-progress
depends_on: [T20]
branch: task/T21-vim-optimal-preview
adrs: [ADR-T21-1]
tags: [task]
---

# T21 Vim - prévia do ótimo

## Goal

No Movimento e na Edição, a pessoa só vê a solução ótima (`ótimo: 2
(f()`) **depois** do alvo. Quem não conhece os comandos não tem como
chegar ao ótimo e fica preso ao `h j k l`. Esta task adiciona uma opção
"Prévia do ótimo", que mostra a solução antes e destaca a próxima tecla
enquanto a pessoa digita. Assim dá para aprender praticando. A ajuda vai
sendo retirada conforme a pessoa acerta, e as rodadas com ajuda ficam
separadas no histórico.

## Base em pesquisa

- **Exemplo resolvido e retirada da ajuda** (Renkl e Atkinson; Salden et
  al., 2010): mostrar a solução ajuda o iniciante, e retirá-la conforme
  ele aprende evita a dependência (*expertise reversal*).
- **Regra dos 85%** (Wilson et al., 2019): o aprendizado é mais rápido
  com cerca de 15% de erro. O modo "automático" usa isso para decidir
  quando mostrar a prévia.

Fontes em [[Métricas e evolução]].

## Spec

- **AC-1**: **Opção "Prévia do ótimo"** nas opções do Movimento e da
  Edição, salva com as configurações de cada treino, com quatro valores:
  - **Desligada** (padrão para quem já tem rodadas): como hoje;
  - **Sempre:** a solução aparece desde o começo de cada alvo;
  - **Ao travar:** a solução aparece depois de 2 teclas a mais que o
    ótimo, ou de 5 s sem avançar;
  - **Automática** (padrão para quem nunca jogou): a prévia aparece
    sempre enquanto a eficiência das últimas 20 metas, contando cada
    comando separadamente, está abaixo de 85%. Acima disso, ela vira
    "Ao travar" para aquele comando.

  Testes:
  - `src/storage/vim.test.ts` (`preview option round-trips and validates`, `defaultPreviewMode is auto without vim results and off with results`)
  - `src/storage/vim-edit.test.ts` (`edit settings preview option round-trips and validates`)
  - `src/vim/preview.test.ts` (`shouldShowPreview` para os 4 modos, `commandEfficiencies` com janela de 20 metas e limiar de 85%, gatilho "Ao travar" por 2 teclas extras ou 5 s)
  - `src/ui/VimScreenPreview.test.tsx` (seletor "Prévia do ótimo" no Movimento e na Edição, padrão Automática/Desligada conforme histórico, persistência e comportamento dos 4 valores)

- **AC-2**: **Como a prévia aparece:**
  - a sequência ótima fica acima do código, cada comando num bloco (`2w`
    `f(` `ci(`), com a descrição de uma linha do comando (de `levelHelp`
    ou `EDIT_HELP`) ao passar o foco ou o mouse;
  - o bloco da próxima tecla fica em `--accent`, e os já feitos em
    `--muted`;
  - se a pessoa sair do caminho ótimo, a prévia é **recalculada a partir
    da posição atual**, com a mesma busca de `optimal.ts`, e mostra o
    novo ótimo daquele ponto;
  - no Movimento, o caminho também aparece no código como pontos de
    passagem discretos (sublinhado em `--muted`), sem cobrir o alvo.

  Testes:
  - `src/vim/optimal.test.ts` (`recalculateOptimal` recalcula a partir de posição fora do caminho em todos os níveis e tem fallback quando distante)
  - `src/vim/preview.test.ts` (`parseSolutionBlocks` cobre todos os níveis de movimento e os 36 tipos de edição; `motionWaypoints` exclui cursor e alvo; `recalculateEditPreview` recalcula fora do caminho com buffer intacto e com buffer alterado)
  - `src/ui/VimScreenPreview.test.tsx` (blocos acima do código, estados `next`/`done`, descrição no foco e no mouse, recálculo no Movimento e na Edição, marcadores `.vim-waypoint` sem cobrir `.vim-target`)
  - `tests/e2e/vim.spec.ts` (`T21: optimal preview guides, recalculates off-path, pauses on lesson and separates assisted history`)

- **AC-3**: **Desempenho:** recalcular depois de cada tecla leva menos de
  16 ms no nível 7 e nas edições maiores, no pior caso do corpus (mesma
  medição da T13, AC de desempenho). Se não couber, recalcule só quando
  a pessoa para por 150 ms e registre no *Log*.

  Testes:
  - `src/vim/optimal.test.ts` (`recalculateOptimal answers in under 16 ms on level 7 worst-case corpus snippets`)
  - `src/vim/preview.test.ts` (`recalculateEditPreview answers in under 16 ms on the largest corpus edits`)

- **AC-4**: **Histórico separado:**
  - cada alvo guarda se a prévia estava visível (`assisted: true`);
  - o resultado da rodada mostra "com prévia" e "sem prévia" em pares
    separados;
  - recordes e médias do histórico contam só rodadas sem prévia nenhuma,
    e o resumo diz quantas rodadas assistidas ficaram de fora.

  Os resultados antigos carregam como não assistidos.

  Testes:
  - `src/vim/round.test.ts` (`assisted flag` por alvo e `assistedSplit`)
  - `src/vim/edit-round.test.ts` (`assisted flag` por edição e `assistedSplit`)
  - `src/storage/vim.test.ts` (`legacy results without assisted load as unassisted`, `vimSummary excludes assisted rounds`)
  - `src/storage/vim-edit.test.ts` (`legacy edit results without assisted load as unassisted`, `vimEditSummary excludes assisted rounds`)
  - `src/ui/VimScreenPreview.test.tsx` (pares `sem prévia` e `com prévia` no resultado, exclusão de rodadas assistidas do `vim-summary` e contagem de rodadas assistidas fora)

- **AC-5**: **Atalho:** dentro do treino, `Ctrl+P` mostra a prévia do
  alvo atual uma vez, mesmo com a opção desligada. O alvo conta como
  assistido.

  Testes:
  - `src/ui/VimScreenPreview.test.tsx` (`Ctrl+P` no Movimento e na Edição mostra a prévia uma vez com opção desligada, marca alvo como assistido e não vaza para o alvo seguinte)

- **AC-6**: **Ligação com o Aprender:** cada bloco de comando da prévia
  tem um link para a lição do comando (T20), que abre sem perder a
  rodada: a rodada pausa e o tempo para.

  Testes:
  - `src/vim/round.test.ts` (`pauseRound` / `resumeRound` congelam o tempo e ignoram teclas enquanto pausada)
  - `src/vim/edit-round.test.ts` (`pauseEditRound` / `resumeEditRound` congelam o tempo e ignoram teclas enquanto pausada)
  - `src/ui/VimScreenPreview.test.tsx` (clicar num bloco abre o modal da lição T20, pausa o relógio e fecha retomando a mesma rodada e alvo no Movimento e na Edição)
  - `tests/e2e/vim.spec.ts` (fluxo de abertura de lição com pausa e retomada no navegador)

## Out of scope

- Explicar por que um caminho é ótimo além da linha de cada comando.
- Prévia no Aprender, que já mostra a referência.

## Files owned

- `src/vim/optimal.ts` (recálculo a partir de um estado)
- `src/vim/preview.ts` (novo — blocos da prévia, regra automática 85%/20 metas, gatilho ao travar, pontos de passagem e recálculo da edição)
- `src/vim/round.ts`, `src/vim/edit-round.ts` (pausa/retomada e marcação `assisted`)
- `src/storage/vim.ts` (opção `preview` e campo `assisted` com migração de legados)
- `src/ui/shell/History.tsx` (contagem de rodadas assistidas excluídas no resumo)
- `src/ui/keys.ts` (atalho `Ctrl+P` nas dicas do Vim e na ajuda)
- `src/ui/VimScreen.tsx`, `src/ui/vim/EditDrill.tsx`, `src/ui/vim/Preview.tsx` (novo), `src/ui/app.css`

## Subtasks

- [ ] Spec detalhado com testes nomeados e ADR-T21-1
- [ ] Testes unitários, de desempenho, de migração, de componente e e2e (vermelhos antes do código)
- [ ] Modelos, tipos e assinaturas (typecheck verde)
- [ ] Recálculo ótimo (`src/vim/optimal.ts`) e lógica pura da prévia (`src/vim/preview.ts`)
- [ ] Pausa/retomada e `assisted` nos motores de rodada (`src/vim/round.ts`, `src/vim/edit-round.ts`)
- [ ] Persistência e migração (`src/storage/vim.ts`) e resumo do histórico (`src/ui/shell/History.tsx`)
- [ ] Componente `Preview.tsx` com blocos, descrição no foco/mouse, modal de lição T20 e integração em `VimScreen.tsx` e `EditDrill.tsx`
- [ ] Gates verdes (`npm run check`, `npm run coverage`, `npm run vim:oracle`, `npm run test:e2e`), auditoria visual e atualização de docs

## Notas para o batch

- **Dependência:** depende da T20 só pelos links para as lições. Sem a
  T20, faça a T21 sem o AC-6 e registre no *Log*.

## Log
