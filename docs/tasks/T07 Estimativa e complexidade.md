---
id: T07
title: Estimativa e complexidade
status: done
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

- [x] spec — `docs(T07): specify estimation acceptance criteria`
- [x] tests — `test(T07): add failing tests for estimation`
- [x] models — `feat(T07): add estimation types and choices field`
- [x] behaviour — `feat(T07): implement estimation mode`
- [x] quality — `chore(T07): pass lint, format and coverage ratchet`
- [x] docs — `docs(T07): record estimation log`

## Log

- 2026-11-18 — Rodada sem ninguém no teclado (batch). Decisões do dono
  seguidas: número da opção como resposta, dígito errado fica na caixa e
  conta correção, sem resultado novo no motor, 1 s e 10⁸ operações/s.
  Registradas em ADR-T07-1.
- **UNATTENDED CHOICE:** `log` da escala de complexidade e de `n log n` na
  base 2; N da questão de complexidade vem de números redondos (8 a 30 e
  d·10ᵏ até 9·10¹⁸), mostrados como `2·10⁵` a partir de 10⁴; ordem de
  grandeza só com respostas de 10² a 10¹⁸ e opções a partir de 10¹.
- **UNATTENDED CHOICE:** formas do overflow: `a × b` (2 a 11 dígitos
  cada), `n!` (5 a 30), `2ᵏ` (10 a 80) e `n(n + 1)/2` (n com 4 a 11
  dígitos); o tipo certo é sorteado antes, para os três saírem igualmente.
- **UNATTENDED CHOICE:** a tela esconde o `=` quando há opções, mostra as
  opções numeradas como `1) int32` numa lista "Opções", e a resposta em
  "Pulada" e nos resultados vira `2) int64` (`answerText` em `format.ts`).
  A lista de modos da configuração passou a quebrar linha (`flex-wrap`),
  porque cinco modos não cabem numa linha de celular.
- **Teste de registro ajustado** (commit `test(T07)` próprio):
  `src/modes.test.ts` fixava o teclado numérico só na aritmética; a
  estimativa também o usa (ADR-T07-1). As outras asserções não mudaram.
- **Teste com regex errada** (commit `test(T07)` próprio, antes do
  comportamento): `[⁰-⁹]` não cobre ¹, ² e ³, que ficam no Latin-1
  (U+00B9, U+00B2, U+00B3). Os testes passaram a listar os dez dígitos; as
  expectativas não mudaram.
- **Arquivos fora da lista**, permitidos pela política do batch:
  `src/modes.test.ts` (teste ao lado de `src/modes.ts`) e `vite.config.ts`
  (limiar de branches de `src/ui/**` de 93 para 94, a cobertura subiu para
  94,2%).
- **Cobertura:** `src/gen/**` exige 100% de branches; os `??` de fallback
  inalcançáveis do gerador saíram no commit de qualidade.
- **Gates no último commit:** `npm run check`, `npm run coverage`,
  `npm run test:fuzz` e `npm run test:e2e` verdes (335 testes Vitest, 3
  Playwright).
- **Verificação manual para o dono:** o layout das opções numa largura de
  celular.
