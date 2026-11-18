---
id: T07
title: Estimativa e complexidade
status: in-progress
depends_on: [T05]
branch: task/T07-estimation
adrs: [ADR-T07-1]
tags: [task]
---

# T07 Estimativa e complexidade

## Goal

Um modo "Estimativa" com questões de múltipla escolha: qual complexidade
cabe numa restrição, qual a ordem de grandeza de um número de operações, e
se um valor cabe em `int32`/`int64`.

## Spec

Decisões em [[ADR-T07-1 Multiple choice answered by the option number]].

- **AC-1**: `Problem` ganha o campo opcional `choices` (lista de textos).
  A interface mostra as opções numeradas, e a resposta é o número da opção
  (`1`–`4`), aceita sozinha como nas outras. Um dígito errado fica na
  caixa; Enter pula; a resposta mostrada é `n) texto da opção`.
  *Testes:* `src/gen/estimation.test.ts` ("check …"),
  `src/ui/App.test.tsx` ("estimation mode …"), `src/ui/format.test.ts`
  ("answerText …").
- **AC-2**: **Restrição → complexidade:** "n ≤ N, 1 s: maior complexidade
  viável?", com 4 opções consecutivas da escala O(n!), O(2ⁿ·n), O(n³),
  O(n²), O(n√n), O(n log n), O(n), O(√n), O(log n). Com orçamento de 10⁸
  operações por segundo, a resposta faz ≤ 2·10⁸ operações e a próxima
  classe da escala faz ≥ 10⁹ (sem casos de fronteira).
  *Testes:* `src/gen/estimation.test.ts` ("complexity …"),
  `src/gen/estimation.prop.test.ts` ("complexity …").
- **AC-3**: **Ordem de grandeza:** "O(f(n)) com n = N: quantas operações?",
  opções 10ᵏ consecutivas; a resposta é a potência mais próxima, e o log₁₀
  do valor fica a mais de 0,15 da metade entre duas potências.
  *Testes:* `src/gen/estimation.test.ts` ("magnitude …"),
  `src/gen/estimation.prop.test.ts` ("magnitude …").
- **AC-4**: **Overflow:** "cabe em qual tipo?" para produtos, fatoriais,
  potências de 2 e somas n(n+1)/2; opções `int32`, `int64`, `nenhum`;
  calculado com `BigInt`.
  *Testes:* `src/gen/estimation.test.ts` ("overflow …"),
  `src/gen/estimation.prop.test.ts` ("overflow …").
- **AC-5**: Teste de propriedade por tipo: a opção correta satisfaz a regra
  e as outras não; a resposta canônica é aceita; mesma seed → mesmo
  problema.
  *Teste:* `src/gen/estimation.prop.test.ts`.
- **AC-6**: O modo aparece na configuração com os tipos marcáveis (padrão:
  todos) e é salvo nas configurações.
  *Testes:* `src/ui/App.test.tsx` ("estimation mode lists its kinds"),
  `src/modes.test.ts`, `src/storage/history.test.ts`.

## Files owned

- `src/core/problem.ts`, `src/gen/estimation*.ts`, `src/modes.ts`,
  `src/storage/**`, `src/ui/**`

## Subtasks (one commit each)

- [ ] spec — `docs(T07): specify estimation acceptance criteria`
- [ ] tests — `test(T07): add failing tests for estimation`
- [ ] models — `feat(T07): add estimation types and choices field`
- [ ] behaviour — `feat(T07): implement estimation mode`
- [ ] quality — `chore(T07): pass lint, format and coverage ratchet`
- [ ] docs — `docs(T07): record estimation log`

## Log
