---
id: ADR-T02-1
title: Factored answers are checked by expansion and factor count
status: accepted
kind: decision
date: 2026-11-17
task: T02
builds_on: [ADR-0002]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T02-1 Factored answers are checked by expansion and factor count

## Context

No modo de fatoração a pessoa digita a forma fatorada, e ela é aceita
sozinha, sem Enter, como no Zetamac. A mesma fatoração tem muitas formas
corretas: ordem dos fatores, `(x-2)^2` contra `(x-2)(x-2)`, sinais
trocados em pares (`(5-x)(-3-x)`), constante na frente ou dentro de um
fator (`(2x-2)(x+3)`, aceito por decisão do usuário na
[[T02 Teste de fatoração de polinômios]]). Comparar texto não serve.

## Decision

- Um parser próprio (`src/math/parse.ts`) lê a resposta e devolve o
  polinômio expandido e o **número de fatores não constantes** do produto
  de topo (`p^n` conta `n` vezes o que `p` conta; uma soma conta 1).
- A resposta canônica do problema passa pelo mesmo parser para dar o alvo
  e a contagem esperada, que é o número de fatores irredutíveis não
  constantes com multiplicidade.
- A resposta é aceita quando os polinômios são iguais **e** as contagens
  também. Como ℤ[x, y] tem fatoração única, k fatores não constantes cujo
  produto tem exatamente k fatores irredutíveis não constantes são todos
  irredutíveis (a menos de constantes). Uma fatoração parcial tem menos
  fatores, e o polinômio sem fatorar tem 1.
- Os polinômios são esparsos, com várias variáveis e coeficientes
  inteiros. Coeficientes fora de `Number.MAX_SAFE_INTEGER`, expoentes
  acima de 12 ou entradas acima de 80 caracteres são rejeitados, para que
  uma entrada maliciosa ou acidental não trave a página.

## Alternatives considered

- **Comparar com a string canônica** — rejeita formas corretas.
- **Pedir só as raízes** — o usuário escolheu a forma fatorada.
- **Biblioteca de álgebra (mathjs, nerdamer)** — dependência grande para
  um parser de ~150 linhas, e nenhuma dá a contagem de fatores.
- **Avaliar em pontos aleatórios** em vez de expandir — mais rápido, mas
  probabilístico; a expansão exata é barata nesses tamanhos.

## Consequences

- Os geradores de fatoração só precisam produzir a resposta canônica
  formatada; o verificador é o mesmo para todos os níveis.
- Um modo estrito (sem conteúdo nos fatores) pode ser adicionado depois
  exigindo que cada fator seja primitivo, sem mudar o parser.

## Rollback plan

Um ADR de rollback troca o verificador; geradores e parser ficam.
