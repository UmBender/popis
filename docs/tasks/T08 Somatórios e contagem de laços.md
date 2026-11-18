---
id: T08
title: Somatórios e contagem de laços
status: ready
depends_on: [T05]
branch: task/T08-sums
adrs: []
tags: [task]
---

# T08 Somatórios e contagem de laços

## Goal

Um modo "Somatórios" que pede a forma fechada, em função de n, de um
somatório ou de quantas vezes um laço aninhado executa.

## Spec (rascunho; o passo de spec nomeia os testes)

- **AC-1** (ADR novo, altera o ADR-T02-1): o parser aceita divisão por
  constante. O resultado guarda numerador e denominador inteiros
  (`poly / denom`), e a igualdade compara em produto cruzado; a contagem de
  fatores não muda. Divisão por algo não constante ou por zero dá `null`.
  O teste da T02 que rejeitava `1/2` muda de valor esperado, justificado no
  commit.
- **AC-2**: O parser aceita uma opção de variáveis (por exemplo, só `n`),
  e `format` escreve com o nome escolhido.
- **AC-3**: **Somatórios:** `Σ_{i=1}^{n} f(i)` ou `Σ_{i=0}^{n−1} f(i)` com
  f polinomial de grau ≤ 2 e coeficientes pequenos.
- **AC-4**: **Laços:** código C++ de 1 a 3 laços aninhados com limites
  `0`, `1`, `i`, `i + 1` e `n`, `i`, `j`; a pergunta é quantas vezes
  `ops++` executa.
- **AC-5**: As duas famílias calculam a resposta contando por força bruta
  para n pequenos e interpolando (diferenças finitas); o gerador confere
  em pontos extras que a contagem é polinomial e sorteia de novo se não
  for. A resposta canônica é `(numerador)/d`, reduzida.
- **AC-6**: Qualquer forma equivalente é aceita (`n(n+1)/2`,
  `(n² + n)/2`, `n²/2 + n/2`).

## Files owned

- `src/math/**`, `src/gen/sums*.ts`, `src/modes.ts`, `src/storage/**`,
  `src/ui/**`, `docs/decisions/`

## Log
