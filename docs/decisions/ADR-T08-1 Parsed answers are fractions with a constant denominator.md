---
id: ADR-T08-1
title: Parsed answers are fractions with a constant denominator
status: accepted
kind: decision
date: 2026-11-18
task: T08
builds_on: [ADR-0002]
amends: [ADR-T02-1]
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T08-1 Parsed answers are fractions with a constant denominator

## Context

O modo de somatórios da [[T08 Somatórios e contagem de laços]] pede formas
fechadas como `n(n+1)/2` ou `(2n³ + 3n² + n)/6`. O parser do
[[ADR-T02-1 Factored answers are checked by expansion and factor count]]
só conhece polinômios com coeficientes inteiros em `x` e `y` e rejeita `/`.
A pessoa precisa poder escrever a divisão onde quiser (`n²/2 + n/2`,
`(n² + n)/2`, `n(n+1)/2`), e o enunciado usa outra letra (`n`, `i`).

## Decision

- O parser aceita divisão por constante (`/` e `÷`, com a precedência da
  multiplicação, da esquerda para a direita). Todo valor parcial é uma
  fração `poly / denom`: `poly` tem coeficientes inteiros e `denom` é um
  inteiro positivo, reduzida (o mdc dos coeficientes de `poly` e `denom` é
  1). O tipo `Fraction` e as operações ficam em `src/math/fraction.ts`.
- Divisão por algo não constante ou por zero rejeita a entrada (`null`).
- A igualdade de valores (`sameValue`) compara em produto cruzado:
  `p₁ · d₂ = p₂ · d₁`. Um estouro de inteiro seguro nessa conta dá falso.
- A contagem de fatores não muda: dividir por constante conta 0 fatores,
  como multiplicar por constante.
- `Summand` (e `Parsed`) ganham `denom`; `poly` passa a ser o numerador.
  Os verificadores de fatoração e de álgebra trocam `equals(poly, poly)` por
  `sameValue`, para que `resposta/7` nunca seja aceita.
- O parser recebe um mapa opcional de letras para as variáveis internas
  (padrão `{ x: "x", y: "y" }`); `format` e `formatFraction` recebem os
  nomes de exibição. O modo de somatórios usa `{ n: "x" }`.

## Alternatives considered

- **Coeficientes racionais (pares num/den por monômio)** — muda `Poly` e
  todo o código que já o usa; um denominador comum basta para formas
  fechadas.
- **Divisão só com uma opção do parser** — o dono decidiu que `1/2` passa a
  ser aceito por padrão.
- **Comparar avaliando em pontos** — probabilístico, e o
  ADR-T02-1 já preferiu a comparação exata.

## Consequences

- Fatoração e álgebra aceitam formas equivalentes com divisão, como
  `(2x − 10)(x + 3)/2` para `(x − 5)(x + 3)`; o valor e a contagem de
  fatores continuam sendo o critério.
- Todo verificador novo deve comparar com `sameValue`, nunca só `poly`.

## Rollback plan

Um ADR de rollback volta o parser a rejeitar `/` (o token sai do
tokenizador) e `sameValue` vira `equals` com `denom = 1`; o modo de
somatórios sai do registro de modos.
