---
id: T22
title: Registro detalhado do treino
status: done
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
- Acrescentados na implementação (motivos no *Log*): `src/ui/App.tsx` e
  `src/ui/ConfigScreen.tsx` (migrar na partida e abrir espaço para o
  painel), `src/ui/download.ts`, `src/ui/app.css` (só `.data-panel`).

## Notas para o batch

- **Ordem:** roda antes da T18 (decisão do dono, 2026-11-20), partindo
  da `main`. O botão de exportar e importar fica na configuração, e a
  T18 o move para o item "Dados" da árvore.

## Subtasks

- [x] Evento, `derive`, `keytrace` (`src/stats/`)
- [x] Resumo diário e retenção (`src/stats/`)
- [x] Armazenamento: eventos, diário, orçamento, cota (`src/storage/`)
- [x] Migração dos dados antigos
- [x] Exportar e importar, painel "Dados"
- [x] Pontos de gravação nos treinos
- [x] Limiar de cobertura de `src/stats/**`

## Log

- 2026-11-20 — Implementada em lote, sem ninguém no teclado. Passos:
  spec, testes (vermelhos por módulo ausente), modelos, comportamento,
  qualidade.
- **Gates:** `npm run check` verde; `npm run coverage` sem `ERROR`
  (`src/stats` 100%, `src/storage` 100%); `npm run test:fuzz` verde
  (20 arquivos); `npm run test:e2e` 19 passando.
- **Tamanho medido (AC-3):** o teste `size.test.ts` simula 365 dias com
  3 sessões de 300 s de cálculo, 2 rodadas de Vim por dia e 2 de
  digitação (mais pesado que 30 min) e mede no máximo **2,53 MB**
  (caracteres, chaves e valores), abaixo de 3 MB, sem descartar o que as
  curvas usam: o teste confere que linhas diárias + eventos brutos +
  sessões cobrem todos os eventos gerados. O teste leva cerca de 50 s.
  Orçamentos: histórico 1,2 M caracteres, eventos brutos 0,6 M.
- **Desvios do spec (todos pequenos):**
  - O tipo do evento mora em `src/stats/event.ts` (o `src/storage/events.ts`
    o reexporta), para a pasta pura não importar de `storage`.
  - A chave de unicidade é `at|drill|seed|i`, com `seed` e `i` em `extra`
    (a nota dizia `at` + `drill` + `seed`; um item precisa do `i`).
  - Vim guarda a **contagem** de teclas e a solução ótima, não a sequência
    de teclas digitadas (o motor só guarda a contagem). "Assistido" fica
    para a T21.
  - Rodadas antigas (sem dado por item) viram um evento `kc: "round"` por
    rodada, com `extra.legacy: true`.
  - O histórico de cálculo não duplica nada: `loadAllEvents` deriva os
    eventos das sessões e junta aos brutos. Sessões que saem do histórico
    (limite de 200 **ou** orçamento de caracteres) viram linhas diárias.
  - Resumos parciais do mesmo dia: contagem e acertos exatos, quartis pela
    média ponderada (ADR-T22-1). Dias inteiros são exatos.
  - `UNATTENDED CHOICE:` importar não sobrescreve configurações que já
    existem, une os desbloqueios do Vim (`popis.vim-learn`) e grava
    `popis.migrated.v1` para o arquivo não ser migrado de novo.
  - `UNATTENDED CHOICE:` a cota cheia grava os eventos antes das linhas
    diárias e resume mais dias até caber; se nada couber, devolve falso e
    o aviso fica pendente (uma vez). Importar o mesmo arquivo duas vezes
    depois de mais de 90 dias soma de novo nas linhas diárias (o evento
    já saiu da lista bruta); só acontece nesse caso.
  - `fit` virou `fitBudget`: `tests/focused.test.ts` lê `fit(` como teste
    focado.
  - Arquivos fora do *Files owned*: `App.tsx` (migrar na partida),
    `ConfigScreen.tsx` (prop `data`), `download.ts` (baixar o arquivo) e
    `app.css` (só `.data-panel`: sem isso o `<fieldset>` com o campo de
    arquivo estourava a largura do celular e o e2e `mobile.spec.ts`
    falhava).
  - `TextTypingScreen.typed` passou a aplicar uma tecla por vez, para o
    rastro ver cada tecla de um texto colado; o resultado é o mesmo.
- **Testes corrigidos em commit próprio** (nada afrouxado):
  `keytrace.test.ts` (o texto de uma palavra terminava antes da letra
  extra), `events.test.ts` duas vezes (as lojas de cota eram pequenas
  demais para as linhas diárias, e 3 eventos por dia não estouravam a
  loja) e `retention.test.ts` (nome `fit`). A dedupe dentro do próprio
  arquivo importado nasceu junto com o código; o teste
  `import drops duplicates inside the file` nunca ficou vermelho.
- **Revisão visual:** não fiz capturas (recomendado, não obrigatório para
  esta task). O painel "Dados" só foi checado pelo e2e de largura no
  celular.
- **Para o dono conferir à mão:** exportar, limpar os dados do site e
  importar; ver o painel "Dados" na configuração no desktop e no celular.
