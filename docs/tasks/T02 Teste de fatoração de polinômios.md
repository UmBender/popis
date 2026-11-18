---
id: T02
title: Teste de fatoração de polinômios
status: review
depends_on: [T01]
branch: task/T02-polynomial-factoring
adrs: ["[[ADR-T02-1 Factored answers are checked by expansion and factor count]]"]
tags: [task]
---

# T02 Teste de fatoração de polinômios

## Goal

Um modo cronometrado em que aparece um polinômio e a pessoa digita a forma
fatorada, por exemplo `x² − 2x − 15` → `(x-5)(x+3)`. A resposta é aceita
sozinha, como em [[T01 Clone do Zetamac]].

## Spec

- **AC-1**: Um parser lê a resposta digitada: `+ - * ^`, parênteses,
  multiplicação implícita, inteiros e as variáveis `x` e `y`. Também
  aceita `−` (U+2212), `·`, `×` e expoentes sobrescritos (`²`, `³`…), para
  que a resposta canônica exibida possa ser digitada ou colada. Entrada
  inválida, acima de 80 caracteres, com expoente acima de 12 ou com
  coeficiente fora do inteiro seguro dá `null`.
  *Testes:* `src/math/parse.test.ts`, `src/math/poly.test.ts`,
  `src/math/poly.prop.test.ts` (soma e produto comutativos e associativos,
  distributividade, `parse(format(p))` igual a `p`).
- **AC-2**: A resposta é aceita se a expansão dela for igual ao polinômio
  alvo **e** ela tiver o número esperado de fatores não constantes
  (`^2` conta como dois)
  ([[ADR-T02-1 Factored answers are checked by expansion and factor count]]).
  Qualquer ordem e forma equivalente servem; o polinômio sem fatorar, uma
  fatoração parcial ou um sinal trocado são rejeitados.
  *Testes:* `src/gen/factoring.test.ts` ("check …").
- **AC-3**: Os problemas são gerados de trás para frente: sorteia os
  fatores e depois expande. O enunciado é o polinômio expandido, em ordem
  decrescente de grau, com `−` e expoentes sobrescritos.
  *Testes:* `src/gen/factoring.prop.test.ts` ("prompt is the expansion of
  the answer").
- **AC-4**: Níveis (um ou mais podem ser escolhidos; padrão: nível 1):
  1. quadrática mônica `(x − r)(x − s)`, r e s de −9 a 9, não ambos 0;
  2. quadrática não mônica `(ax + b)(cx + d)`, a e c de 1 a 5 com
     `ac > 1`, b e d de −9 a 9 não nulos, fatores primitivos;
  3. fator comum `k(x − r)(x − s)` ou `kx(x − r)(x − s)`, k de 2 a 6;
  4. produtos notáveis: diferença de quadrados `(ax − b)(ax + b)`,
     quadrado perfeito `(ax ± b)²` e soma ou diferença de cubos
     `(ax ± b)(a²x² ∓ abx + b²)`, com fatores primitivos;
  5. cúbica mônica `(x − r)(x − s)(x − t)`, raízes de −6 a 6, não todas 0;
  6. duas variáveis `(x − ry)(x − sy)`, r e s de −9 a 9 não nulos.
  *Testes:* `src/gen/factoring.test.ts`, `src/gen/factoring.prop.test.ts`
  ("each level respects its shape").
- **AC-5**: Enter pula a questão (só na fatoração; o modo aritmética segue
  o Zetamac, sem pulo). Depois de pular, a questão pulada e a resposta
  aparecem embaixo do campo. O resultado tem a tabela "Puladas", com as
  respostas.
  *Testes:* `src/ui/App.test.tsx` ("Enter skips …", "results list skipped
  problems …", "Enter does nothing in arithmetic"),
  `tests/e2e/factoring.spec.ts`.
- **AC-6**: Para muitas seeds e cada nível, o problema gerado aceita a
  resposta canônica, e a mesma seed gera o mesmo problema.
  *Testes:* `src/gen/factoring.prop.test.ts`.
- **AC-7**: A configuração tem a escolha de modo (Aritmética ou Fatoração).
  A configuração salva passa a guardar o modo e os níveis, e a
  configuração salva no formato da T01 continua sendo lida, com os padrões
  para o que falta. O histórico registra o modo da sessão.
  *Testes:* `src/storage/history.test.ts`, `src/ui/App.test.tsx`
  ("mode choice …", "factoring settings are remembered").

## Out of scope

- Modo estrito (fatores primitivos obrigatórios).
- Mais variáveis além de `x` e `y`, fatoração por agrupamento.

## Files owned

- `src/math/**`, `src/gen/factoring*.ts`, `src/storage/**`, `src/ui/**`,
  `src/session/**` (se preciso), `tests/e2e/factoring.spec.ts`,
  `docs/architecture/Theme.md` (só se um token novo for preciso)
- Acrescentados no passo de qualidade (ver Log): `src/core/rng.ts` e
  `src/core/rng.test.ts` (`retry`), e `vite.config.ts` (limiares de cobertura).

## Subtasks (one commit each)

- [x] spec — `docs(T02): specify polynomial factoring acceptance criteria`
- [x] tests — `test(T02): add failing tests for polynomial factoring`
- [x] models — `feat(T02): add polynomial, parser and factoring types`
- [x] behaviour — `feat(T02): implement polynomial factoring mode`
- [x] quality — `chore(T02): pass lint, format and coverage`
- [x] docs — `docs(T02): record polynomial factoring log`

## Decisions

Decididas pelo usuário em 2026-11-17:

- A resposta é a forma fatorada completa, não só as raízes.
- `(2x-2)(x+3)` é aceito para `2x² + 4x − 6`. Um modo estrito, que exige
  tirar o fator comum, fica para depois.

## Log

- **Teclas:** Enter pula, mas só na fatoração. Como a resposta é aceita
  sozinha, Enter não tinha outro uso; o modo aritmética continua sem
  pulo, igual ao Zetamac.
- **Testes da T01 alterados:** "defaults to the zetamac settings and 120 s"
  e "round-trips saved settings" passaram a esperar `mode` e `factoring`,
  como pede o AC-7. A mudança está no commit de testes e não afrouxa
  nenhuma asserção. Os testes de interface da T01 continuam gravando a
  configuração no formato antigo, e por isso também provam a migração.
- **Fora de *Files owned*:** no passo de qualidade, o `drawUntil` do gerador
  virou `retry` em `src/core/rng.ts`, com teste do limite de tentativas.
  Sem isso, a linha do erro ficava sem cobertura e quebrava o limiar de
  100% de `src/gen`. O `vite.config.ts` recebeu os limiares de `src/math`.
- **Cobertura:** `src/math` ficou em 99% das linhas, com limiar no valor
  medido. A linha sem cobertura é o `throw` defensivo do parser para erros
  que não são de entrada inválida, impossível de disparar sem mock. Os
  limiares de branches de `src/core` (88 → 92) e `src/ui` (75 → 90) subiram.
- **Fuzz:** `npm run test:fuzz` (20 000 casos) passou sem falhas: parser,
  anel de polinômios e os seis níveis do gerador. Não houve regressão a
  registrar.
- **Gates no último commit:** `npm run check` verde (200 testes),
  `npm run coverage` verde, `npm run test:fuzz` verde e `npm run test:e2e`
  verde (2 casos).
