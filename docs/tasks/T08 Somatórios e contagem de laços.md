---
id: T08
title: Somatórios e contagem de laços
status: in-progress
depends_on: [T05]
branch: task/T08-sums
adrs: [ADR-T08-1]
tags: [task]
---

# T08 Somatórios e contagem de laços

## Goal

Um modo "Somatórios" que pede a forma fechada, em função de n, de um
somatório ou de quantas vezes um laço aninhado executa.

## Spec

- **AC-1** ([[ADR-T08-1 Parsed answers are fractions with a constant denominator]],
  altera o ADR-T02-1): o parser aceita divisão por constante (`/`, `÷`).
  O resultado guarda numerador inteiro e denominador positivo (`poly /
  denom`), reduzido, e a igualdade (`sameValue`) compara em produto
  cruzado; a contagem de fatores não muda. Divisão por algo não constante
  ou por zero dá `null`. O teste da T02 que rejeitava `1/2` muda de valor
  esperado, justificado no commit. Fatoração e álgebra comparam com
  `sameValue` e rejeitam a resposta dividida por uma constante.
  *Testes:* `src/math/parse.test.ts` ("parse: division …"),
  `src/math/fraction.test.ts`, `src/math/fraction.prop.test.ts`,
  `src/gen/factoring.test.ts` e `src/gen/algebra.test.ts`
  ("… divided by a constant …").
- **AC-2**: o parser aceita uma opção de variáveis (por exemplo, só `n`),
  e `format`/`formatFraction` escrevem com o nome escolhido.
  *Testes:* `src/math/parse.test.ts` ("parse: variables …"),
  `src/math/poly.test.ts` ("format … names …"),
  `src/math/fraction.prop.test.ts` (ida e volta com `n`).
- **AC-3**: **Somatórios:** `Σᵢ₌₁ⁿ f(i)` ou `Σᵢ₌₀ⁿ⁻¹ f(i)` com f polinomial
  de grau 1 ou 2 e coeficientes pequenos.
  *Testes:* `src/gen/sums.test.ts` ("sum prompt …"),
  `src/gen/sums.prop.test.ts` (a resposta vale o somatório do enunciado
  para n = 1…15; mesma seed → mesmo problema).
- **AC-4**: **Laços:** código C++ de 1 a 3 laços aninhados com início `0`,
  `1`, `v` ou `v + 1` e fim `n` ou `v` (v uma variável de fora); a
  pergunta é quantas vezes `ops++` executa.
  *Testes:* `src/gen/sums.test.ts` ("loop prompt …"),
  `src/gen/sums.prop.test.ts` (um interpretador do código do enunciado
  conta `ops++` e bate com a resposta para n = 1…15).
- **AC-5**: as duas famílias calculam a resposta contando por força bruta
  para n = 1…10, interpolando (diferenças finitas) em n = 1…5 e conferindo
  em n = 6…10; sorteia de novo se a contagem não for polinomial ou for
  constante. A resposta canônica é `(numerador)/d`, reduzida (sem
  parênteses quando o numerador é um monômio, sem `/1`).
  *Testes:* `src/gen/sums.test.ts` ("closedForm …").
- **AC-6**: qualquer forma equivalente é aceita (`n(n+1)/2`,
  `(n² + n)/2`, `n²/2 + n/2`); valores errados, outra letra e o
  enunciado copiado são rejeitados.
  *Testes:* `src/gen/sums.test.ts` ("checker …"),
  `src/gen/sums.prop.test.ts` (a resposta canônica é aceita).
- **AC-7**: o modo "Somatórios" aparece na configuração com os tipos
  marcáveis, as escolhas são lembradas, Enter pula, e o código dos laços é
  exibido em várias linhas.
  *Testes:* `src/ui/App.test.tsx` ("sums mode …"), `src/modes.test.ts`,
  `src/ui/format.test.ts`.

## Files owned

- `src/math/**`, `src/gen/sums*.ts`, `src/modes.ts`, `src/modes.test.ts`,
  `src/storage/**`, `src/ui/**`, `docs/decisions/`
- `src/gen/factoring.ts`, `src/gen/algebra.ts` e seus testes: só a troca de
  `equals(poly, poly)` por `sameValue` (ver *Log*).

## Subtasks (one commit each)

- [ ] spec — `docs(T08): specify sums acceptance criteria`
- [ ] tests — `test(T08): add failing tests for sums`
- [ ] models — `feat(T08): add fraction and sums types`
- [ ] behaviour — `feat(T08): implement sums mode`
- [ ] quality — `chore(T08): pass lint, format and coverage ratchet`
- [ ] docs — `docs(T08): record sums log`

## Log

- 2026-11-18 — **Files owned ampliados:** com divisão no parser, `poly`
  vira só o numerador, e os verificadores de fatoração e de álgebra, que
  comparavam `equals(given.poly, target.poly)`, aceitariam `resposta/7`.
  Eles passam a usar `sameValue` (ADR-T08-1), com testes novos que
  rejeitam a resposta dividida por uma constante; nenhum teste existente
  muda.
