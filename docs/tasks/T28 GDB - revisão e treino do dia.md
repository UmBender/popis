---
id: T28
title: GDB - revisão e treino do dia
status: todo
depends_on: [T53]
branch: task/T28-gdb-adaptive
adrs: []
tags: [task]
---

# T28 GDB - revisão e treino do dia

## Goal

Ligar os treinos de GDB ao treino adaptativo da T24 (ADR-T24-1):
- os itens errados ou lentos viram cartões do Revisar com FSRS;
- o Treino do dia passa a intercalar habilidades de GDB;
- a Saída ganha nível automático por Elo;
- o painel Evolução da T23 mostra os drills de GDB.

## Spec (rascunho; o passo de spec nomeia os testes)

- **AC-1**: **Cartões:**
  - comandos errados ou lentos do Comandos viram cartões
    `kind: "gdb-cmd"`, que guardam o item literal (programa, estado,
    objetivo) e não só a seed;
  - valores errados da Saída viram cartões `kind: "gdb-out"`;
  - sessões falhas viram cartões `kind: "gdb-session"`;
  - a nota de 1 a 4 sai do resultado, como na T24;
  - a revisão reapresenta o item original (ADR-T06-1).
- **AC-2**: **Treino do dia:** os KCs `gdb.cmd.*`, `gdb.out.*` e
  `gdb.session.*` entram no sorteio das habilidades mais fracas e são
  intercalados com os demais. Uma habilidade só entra depois de a lição
  correspondente do Aprender estar concluída ou de o tipo já ter sido
  treinado.
- **AC-3**: **Nível automático** na Saída (níveis 1–3), com a mesma
  meta ajustável de 70% a 95% e passo máximo de 1 nível.
- **AC-4**: **Evolução:** os drills `gdb.cmd`, `gdb.out` e `gdb.session`
  aparecem nas tabelas e nos gráficos, e as recomendações citam as
  lições do GDB quando um KC trava.
- **AC-5**: **Dados:** exportar e importar (T22) levam os cartões e o
  progresso `popis.gdb-learn` e `popis.gdb`.

## Out of scope

- Mudar o FSRS, o Elo ou o algoritmo do Treino do dia.

## Files owned

- `src/storage/review.ts`, `src/stats/recommend.ts`, `src/storage/daily.ts`,
  `src/storage/backup.ts`
- `src/ui/gdb/`, as telas de Revisar, Treino do dia e Evolução

## Notas para o batch

- **Ordem:** depende da T53 (a sessão simulada, que saiu da T27 em
  2026-11-26) só para incluir as sessões. Se a T53 demorar ou for
  adiada, esta task pode vir antes dela, sem o tipo `gdb-session`. Nesse
  caso, corrija `depends_on` para `[T26]` e tire as menções a sessão
  antes de começar.

## Log
