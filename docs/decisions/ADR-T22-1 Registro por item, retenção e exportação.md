---
id: ADR-T22-1
title: Registro por item, retenção e exportação
status: accepted
kind: decision
date: 2026-11-20
task: T22
builds_on: [ADR-0002]
amends: []
supersedes: []
reverts: []
superseded_by:
tags: [adr]
---

# ADR-T22-1 Registro por item, retenção e exportação

## Context

Medir a evolução ([[Métricas e evolução]]) pede dados por item (cada
problema, alvo Vim, edição, linha ou palavra) e um histórico longo. Hoje o
Vim e a digitação guardam só o total da rodada, e cada lista perde tudo
que passa de 200 rodadas. O `localStorage` tem cerca de 5 MB e some quando
o navegador é limpo.

## Decision

**Evento.** Um formato comum, `TrainingEvent`
(`src/stats/event.ts`, regravado em `src/storage/events.ts`):
`{ at, drill, config, kc, ok, timeMs, extra }`.

- `at`: hora de relógio (ms desde a época) em que a rodada terminou.
- `drill`: `calc` (cálculo e CP), `vim.motion`, `vim.edit`, `typing.code`,
  `typing.text`.
- `config`: o modo (`calc`), `L<nível>` (Vim Movimento), `edit`,
  a linguagem (código) ou `textConfigKey` (texto).
- `kc`: o componente de conhecimento (`skill`, comando principal da solução
  ótima, tipo de edição, `line`, `word`).
- `extra`: sempre tem `seed` (a seed do item) e `i` (posição do item na
  rodada), mais os dados do treino. A chave de unicidade de um evento é
  `at|drill|seed|i` (a nota dizia `at + drill + seed`; um item precisa do
  `i` para ser único dentro da rodada).
- As rodadas antigas (sem dado por item) viram um evento por rodada com
  `kc: "round"`, para as telas de análise as separarem.

**Onde ficam.**

- Cálculo e CP: o evento é derivado do `log` da sessão em
  `popis.history.v1`; nada é gravado duas vezes.
- Os outros treinos: `popis.events.v1`, uma lista de eventos em formato
  compacto, só dos últimos 90 dias e de no máximo `EVENTS_BUDGET` caracteres.
- `popis.daily.v1`: resumo diário para sempre. Uma linha por
  `(dia UTC, drill, config, kc)` com contagem, acertos e quartis do tempo.
  O que sai das listas brutas vira linha aqui.
- `popis.migrated.v1`: marca que a migração dos dados antigos deu certo.

**Retenção.** Um evento sai da lista bruta quando tem mais de 90 dias ou
quando a lista passa do orçamento; sai sempre por dias inteiros, do mais
antigo para o mais novo, e vira resumo diário. A lista de sessões do
histórico mantém o limite de 200 e ganha um orçamento de caracteres
(`HISTORY_BUDGET`); as sessões que saem viram resumos. Se `setItem` falhar
por cota, resume-se mais cedo, a rodada atual é preservada e um aviso fica
pendente uma única vez (`popis.quota-notice.v1`).

**Resumo parcial.** Dois resumos do mesmo dia e da mesma chave só se juntam
com contagem e acertos exatos; os quartis viram a média ponderada pela
contagem. Isso só acontece quando um dia é dividido entre dois resumos
(sessões que saem do histórico uma a uma, ou importação). Resumir dias
inteiros de uma vez é exato.

**Exportação.** Um arquivo `popis-<AAAA-MM-DD>.json`:
`{ app: "popis", version: 1, exportedAt, data: { <chave>: <valor> } }` com
toda chave `popis.*` conhecida. Importar valida `app` e `version` e junta:
sessões por `finishedAt|mode|seed`, eventos por `at|drill|seed|i`,
resultados antigos por `finishedAt|seed`, resumos diários por chave (vale a
linha de maior contagem, para importar duas vezes não somar duas vezes), e
configurações só quando ainda não existem.

## Alternatives considered

- **Guardar todo evento bruto por 90 dias sem orçamento** — um ano de
  digitação passaria de 10 MB.
- **IndexedDB** — mais espaço, mas é assíncrono, e o app inteiro assume um
  `KeyValueStore` síncrono (ADR-0002). Fica para um ADR futuro se o
  orçamento não bastar.
- **Quartis exatos nos resumos parciais** — pediria guardar todos os tempos.

## Consequences

- O orçamento garante o teto de 3 MB (testado por simulação de um ano), ao
  custo de a lista de sessões do Revisar poder ter menos de 200 sessões
  quando elas são longas.
- Telas de análise (T23) leem `loadAllEvents` (histórico derivado + brutos)
  e `loadDaily`.

## Rollback plan

Apagar `src/stats/`, `src/storage/{events,migrate,backup}.ts` e o painel de
dados; as chaves antigas nunca são apagadas, então o app volta a ler só
elas.
