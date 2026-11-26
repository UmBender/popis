---
id: ADR-T52-1
title: Ritmo-alvo mede só palavras certas e alcança a velocidade
status: accepted
kind: decision
date: 2026-11-26
task: T52
builds_on: []
amends:
  - "[[ADR-T29-1 Ritmo-alvo adaptativo e cursor fantasma na digitação]]"
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T52-1 Ritmo-alvo mede só palavras certas e alcança a velocidade

## Context

Pela ADR-T29-1, uma unidade (palavra no Texto, linha no Código) está no
ritmo se saiu certa **e** rápida, e o alvo anda 2 WPM por rodada. Na
prática, uma pessoa a 70 WPM com 97% de precisão ficou com o alvo preso em
39 WPM (T52). Cerca de 1 palavra em 10 tem uma tecla errada, então a
fração no ritmo não passa de ~90%, qualquer que seja o alvo. Isso fica
abaixo do que a regra pede para subir, e a precisão já tem a sua própria
trava de 95%. Um alvo que nasceu em 30 WPM também leva dezenas de rodadas
para chegar à velocidade real.

## Decision

1. **Fração no ritmo só sobre unidades contáveis.** Conta uma unidade
   certa (`ok`) e completa. As unidades com erro e a última palavra
   cortada pelo fim do tempo saem do numerador e do denominador. Sem
   unidade contável, o alvo fica igual. Os eventos da T22 continuam
   gravando `extra.onPace` como antes.
2. **Velocidade da meta.** É a maior velocidade inteira `v` (WPM,
   arredondada para baixo) tal que uma fração ≥ meta das unidades
   contáveis tem velocidade ≥ `v`. Com velocidades em ordem decrescente,
   é a de posição `ceil(meta × n)`.
3. **Alcance rápido.** Quando a regra dos ±5 pontos da ADR-T29-1 manda
   subir (fração e precisão), e a velocidade da meta passa do alvo por
   mais de 10 WPM, o próximo alvo é a velocidade da meta. Nos outros
   casos, vale a regra antiga de 2 WPM. Repetir a mesma rodada com o
   novo alvo deixa a fração ≥ meta, e por isso o alvo não oscila.
4. **Tela.** O seletor "Meta no ritmo" ganha a descrição "% das palavras
   certas acima do alvo; maior = alvo mais fácil" ("linhas" no Código),
   e o resultado diz "das palavras certas no ritmo".

O resto da ADR-T29-1 vale como está: a meta, a banda de ±5 pontos, o
passo de 2 WPM, a trava de 95%, o alvo inicial e o cursor fantasma.

## Alternatives considered

- **Saltar para a mediana das rodadas recentes** (a primeira proposta ao
  dono). Com a meta em 85%, o equilíbrio da regra fica perto do 15º
  percentil das velocidades por palavra, bem abaixo da média. Saltar para
  a mediana faria o alvo cair 2 WPM por rodada até o equilíbrio e depois
  saltar de novo, oscilando. A velocidade da meta é o próprio equilíbrio.
- **Inverter o controle para "Desafio"**: o dono preferiu manter a meta e
  explicá-la.
- **Recalcular o alvo do zero a cada rodada pela velocidade da meta**:
  ficaria ruidoso, sem a estabilidade da banda morta.

## Consequences

- Um alvo antigo e baixo se corrige na primeira rodada com precisão de
  pelo menos 95%.
- A precisão só pesa pela trava de 95%, não duas vezes.
- `evaluatePaceRound` recebe as unidades (certa, completa, caracteres e
  tempo) em vez de booleanos, e o cálculo das unidades fica em
  `textPaceUnits`/`codePaceUnits` (`src/stats/keytrace.ts`).

## Rollback plan

Reverter os commits da T52. `evaluatePaceRound` volta a receber os
booleanos de `extra.onPace`, e um ADR `kind: rollback` registra isso.
