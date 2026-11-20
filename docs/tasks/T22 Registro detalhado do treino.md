---
id: T22
title: Registro detalhado do treino
status: in-progress
depends_on: []
branch: task/T22-training-log
adrs: [ADR-T22-1]
tags: [task]
---

# T22 Registro detalhado do treino

## Goal

Para medir a evolução ([[Métricas e evolução]]), o app precisa de dados
por item e de um histórico longo. Hoje:
- o Vim guarda só o total da rodada;
- as digitações não guardam nada por tecla;
- todo histórico perde as sessões antigas depois de 200.

Esta task guarda o que falta, sem perder o começo da curva, e permite
exportar e importar tudo, porque `localStorage` some ao limpar o
navegador. Não muda nenhuma tela de treino.

## Spec

Formato, retenção e exportação: [[ADR-T22-1 Registro por item, retenção e exportação]].
Os nomes abaixo são arquivos de teste ao lado do código (`src/…`) e o nome
do `it(...)` dentro deles.

- **AC-1**: **Evento por item**, num formato comum
  (`src/stats/event.ts`, usado por `src/storage/events.ts`):
  `{ at, drill, config, kc, ok, timeMs, extra }`, com `kc` igual a:
  - **cálculo e CP:** o `skill` do problema (o evento é derivado do `log`
    da sessão, sem gravar duas vezes);
  - **Vim Movimento:** um evento por alvo, com as teclas usadas (a
    contagem), a solução ótima, o mínimo, o tempo e se pulou; o `kc` é o
    comando principal da solução ótima (`f`, `w`, `/`…). O campo
    "assistido" fica para a T21;
  - **Vim Edição:** um evento por edição, com `kc` = tipo de edição;
  - **Digitação e Texto:** um evento por linha (Código) ou palavra
    (Texto), com os intervalos entre teclas e os caracteres errados.

  Testes:
  - `src/stats/derive.test.ts`: `calc events use the problem skill as kc`,
    `skipped and timed out attempts are not ok`,
    `vim motion events carry keys, minimum and solution`,
    `main command skips counts and registers`,
    `vim edit events use the edit kind as kc`.
  - `src/stats/keytrace.test.ts`: `code trace gives one event per line with
    intervals and wrong characters`, `text trace gives one event per word`,
    `backspaces add no interval`, `a corrected mistake still counts as wrong`.
  - `src/stats/derive.prop.test.ts`: `events of a calc session add up to
    the session score`, `events of a vim round add up to the round stats`.
- **AC-2**: **Sem perder o começo:**
  - o que passa do limite não é descartado: é **resumido por dia, treino,
    configuração e KC** (contagem, acertos, quartis do tempo) em
    `popis.daily.v1`;
  - os eventos brutos ficam só nos últimos 90 dias.

  Testes:
  - `src/stats/summary.test.ts`: `summarize groups by day drill config
    and kc`, `quartiles of one value are that value`, `merge adds counts
    and weights quartiles`, `dayOf handles epoch, leap days and negative
    times`.
  - `src/stats/summary.prop.test.ts`: `curves from daily rows equal curves
    from raw events after retiring whole days`.
  - `src/stats/retention.test.ts`: `retire moves events older than 90 days`,
    `fit moves the oldest whole days until the budget holds`.
  - `src/storage/events.test.ts`: `recording events keeps 90 days raw and
    summarizes the rest`, `history overflow turns dropped sessions into
    daily rows`.
- **AC-3**: **Tamanho:**
  - o uso total do `localStorage` fica abaixo de 3 MB com um ano de uso
    diário de 30 min (simulação com seed);
  - se `setItem` falhar por cota, o app resume mais cedo e avisa uma vez,
    sem perder a rodada atual.

  Testes:
  - `src/storage/size.test.ts`: `a year of daily practice stays under
    3 MB`.
  - `src/storage/events.test.ts`: `a full store makes events summarize
    early and keeps the current round`, `the quota notice is pending once`.
- **AC-4**: **Migração:** os dados atuais (`popis.history.v1`,
  `popis.vim`, `popis.typing`, `popis.text-typing`) são lidos e viram
  eventos ou resumos diários, uma vez, sem apagar as chaves antigas.

  Testes em `src/storage/migrate.test.ts`: `migrates old vim motion and
  edit rounds to round events`, `migrates old typing results`,
  `migrates old text results`, `old rounds beyond 90 days become daily
  rows`, `keeps the old keys and writes the marker`, `runs only once`,
  `a failing write leaves no marker so it runs again`,
  `ignores corrupt old data`.
- **AC-5**: **Exportar e importar:**
  - um botão gera `popis-<data>.json` com tudo;
  - importar junta os dados sem duplicar e valida a versão;
  - ida e volta: exportar → apagar → importar dá os mesmos dados.

  Testes:
  - `src/storage/backup.test.ts`: `export names the file by date`,
    `export then clear then import gives the same data`, `importing twice
    does not duplicate`, `import merges with existing data`,
    `import rejects another app or version`, `import keeps existing
    settings`.
  - `src/ui/DataPanel.test.tsx`: `export button downloads a dated json`,
    `import button merges a chosen file and says so`, `an invalid file
    shows an error`, `the quota notice shows once`.
  - `src/ui/TrainingLog.test.tsx`: `a finished calc session leaves its
    events`, `a finished vim motion round records one event per target`,
    `a finished vim edit round records one event per edit`,
    `a finished code run records one event per line`,
    `a finished text test records one event per word`.
- **AC-6**: **Pureza:** a agregação e os resumos são TypeScript puro em
  `src/stats/`, testados sem navegador, com cobertura de 100%
  (limiar em `vite.config.ts`; `tests/purity.test.ts` já cobre a pasta).
- **AC-7**: **ADR-T22-1** registra o formato do evento, a retenção e a
  exportação. Feito neste passo.

## Out of scope

- Telas de análise (T23) e recomendações (T24).
- Sincronizar entre dispositivos ou com um servidor.

## Files owned

- `src/storage/**`, `src/stats/**` (novo)
- Os pontos de gravação em `src/ui/**` (só a chamada que grava o evento)
- O botão de exportar e importar: `src/ui/DataPanel.tsx`, usado pela
  configuração (a T18 o move para o item "Dados" da árvore)
- `vite.config.ts` (só o limiar de `src/stats/**`)

## Notas para o batch

- **Ordem:** roda antes da T18 (decisão do dono, 2026-11-20), partindo
  da `main`. O botão de exportar e importar fica na configuração, e a
  T18 o move para o item "Dados" da árvore.

## Subtasks

- [ ] Evento, `derive`, `keytrace` (`src/stats/`)
- [ ] Resumo diário e retenção (`src/stats/`)
- [ ] Armazenamento: eventos, diário, orçamento, cota (`src/storage/`)
- [ ] Migração dos dados antigos
- [ ] Exportar e importar, painel "Dados"
- [ ] Pontos de gravação nos treinos
- [ ] Limiar de cobertura de `src/stats/**`

## Log
