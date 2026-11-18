---
id: ADR-T07-1
title: Multiple choice answered by the option number
status: accepted
kind: decision
date: 2026-11-18
task: T07
builds_on: [ADR-0002]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T07-1 Multiple choice answered by the option number

## Context

O modo "Estimativa" ([[T07 Estimativa e complexidade]]) pergunta qual
complexidade cabe numa restrição, a ordem de grandeza de uma contagem de
operações e se um valor cabe em `int32`/`int64`. Digitar `O(n log n)` ou
`10^8` é lento e tem muitas grafias; o treino é a estimativa, não a
digitação. O motor da sessão aceita a resposta sozinha quando `check`
devolve verdadeiro e conta correções quando a pessoa apaga.

## Decision

- `Problem` ganha o campo opcional `choices?: readonly string[]`. Quando
  existe, a tela mostra as opções numeradas a partir de 1 e esconde o `=`.
- A resposta canônica é o número da opção correta (base 1) como texto, e
  `check` compara o texto digitado (sem espaços nas pontas) com ele. Um
  dígito errado fica na caixa como qualquer resposta errada e, apagado,
  conta como correção. O motor não ganha resultado novo.
- Teclado numérico; Enter pula a questão.
- **Complexidade:** escala, da mais cara para a mais barata: O(n!),
  O(2ⁿ·n), O(n³), O(n²), O(n√n), O(n log n), O(n), O(√n), O(log n), com
  `log` na base 2. Orçamento de 10⁸ operações por segundo e limite fixo de
  1 s. A resposta faz ≤ 2·10⁸ operações com n = N e a classe logo acima na
  escala faz ≥ 10⁹, então nenhuma questão fica perto da fronteira. As 4
  opções são classes consecutivas da escala que contêm a resposta. N vem
  de uma lista de números redondos (inteiros de 8 a 30 e d·10ᵏ).
- **Ordem de grandeza:** as 4 opções são potências de 10 consecutivas; a
  resposta é a potência mais próxima do valor na escala logarítmica, e a
  parte fracionária de log₁₀ do valor fica fora de [0,35; 0,65].
- **Overflow:** opções fixas `int32`, `int64`, `nenhum`; a resposta é o
  menor tipo com sinal em que o valor cabe (limites 2³¹−1 e 2⁶³−1),
  calculado com `BigInt`.

## Alternatives considered

- **Digitar o texto da opção** — muitas grafias para o verificador e lento
  para quem treina.
- **Botões clicáveis** — tiram as mãos do teclado; as opções numeradas
  mantêm o fluxo de digitar e aceitar sozinho.
- **Resultado novo "errada" no motor** — o dono preferiu tratar o dígito
  errado como qualquer resposta errada.

## Consequences

- Qualquer modo futuro pode ter múltipla escolha preenchendo `choices`.
- A resposta mostrada em "Pulada" e nos resultados passa a ser o número e o
  texto da opção (`2) O(n²)`).
- Os limiares 2·10⁸ e 10⁹ deixam de fora valores de N entre as fronteiras;
  é de propósito: o treino é reconhecer o caso claro rápido.

## Rollback plan

Um ADR de rollback remove o modo e o campo `choices`; os outros modos não
usam o campo.
