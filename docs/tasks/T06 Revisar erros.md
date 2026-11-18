---
id: T06
title: Revisar erros
status: ready
depends_on: [T05]
branch: task/T06-review
adrs: []
tags: [task]
---

# T06 Revisar erros

## Goal

Um modo "Revisar" que refaz as questões em que a pessoa errou, pulou ou
foi lenta, regeradas a partir das seeds do histórico. Não precisa de
gerador novo: cada questão volta pelo gerador do modo em que apareceu.

## Spec (rascunho; o passo de spec nomeia os testes)

- **AC-1**: Os itens de revisão saem do histórico (`loadHistory`): questões
  puladas, questões com correções, e acertos lentos (tempo acima de 1,5×
  a média da mesma habilidade naquela sessão). Sem repetir a mesma
  habilidade + seed; no máximo os 50 mais recentes. Tempo esgotado no fim
  da partida não conta.
- **AC-2**: Cada item guarda o modo, a seed e os parâmetros da questão
  original; regenerar dá exatamente a mesma questão (prompt e resposta).
- **AC-3**: O gerador `review` escolhe um item pela seed da questão e
  delega `generate` e `check` ao gerador do modo original. A habilidade da
  questão continua a original, então as estatísticas por tipo continuam
  certas.
- **AC-4**: Na configuração, o modo mostra quantos itens existem; sem itens,
  "Começar" fica desabilitado com a mensagem "Nada para revisar ainda".
- **AC-5**: Enter pula; a sessão de revisão é salva com `mode: "review"`, e
  as questões dela também podem voltar numa revisão futura.

## Decisões

- A lista de itens é montada quando a partida começa, a partir do
  histórico; ela não fica na configuração salva.

## Files owned

- `src/gen/review*.ts`, `src/modes.ts`, `src/storage/**`, `src/ui/**`

## Log
