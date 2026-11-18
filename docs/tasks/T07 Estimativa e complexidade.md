---
id: T07
title: Estimativa e complexidade
status: ready
depends_on: [T05]
branch: task/T07-estimation
adrs: []
tags: [task]
---

# T07 Estimativa e complexidade

## Goal

Um modo "Estimativa" com questões de múltipla escolha: qual complexidade
cabe numa restrição, qual a ordem de grandeza de um número de operações, e
se um valor cabe em `int32`/`int64`.

## Spec (rascunho; o passo de spec nomeia os testes)

- **AC-1**: `Problem` ganha o campo opcional `choices` (lista de textos).
  A interface mostra as opções numeradas, e a resposta é o número da opção
  (`1`–`4`), aceita sozinha como nas outras.
- **AC-2**: **Restrição → complexidade:** "n ≤ N, 1 s: qual a maior
  complexidade viável?", com 4 opções consecutivas da escala O(n!),
  O(2ⁿ·n), O(n³), O(n²), O(n√n), O(n log n), O(n), O(√n), O(log n). Com
  orçamento de 10⁸ operações por segundo, a resposta faz ≤ 2·10⁸ operações
  e a próxima classe da escala faz ≥ 10⁹ (sem casos de fronteira).
- **AC-3**: **Ordem de grandeza:** "O(f(n)) com n = N: quantas operações?",
  opções 10ᵏ consecutivas; a resposta é a potência mais próxima, e o log₁₀
  do valor fica a mais de 0,15 da metade entre duas potências.
- **AC-4**: **Overflow:** "cabe em qual tipo?" para produtos, fatoriais,
  potências de 2 e somas n(n+1)/2; opções `int32`, `int64`, `nenhum`;
  calculado com `BigInt`.
- **AC-5**: Teste de propriedade por tipo: a opção correta satisfaz a regra
  e as outras não.

## Files owned

- `src/core/problem.ts`, `src/gen/estimation*.ts`, `src/modes.ts`,
  `src/storage/**`, `src/ui/**`

## Log
