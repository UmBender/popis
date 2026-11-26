---
id: T52
title: Ritmo-alvo preso abaixo da velocidade
status: in-progress
depends_on: []
branch: fix/pace-target-stuck
adrs:
  - "[[ADR-T52-1 Ritmo-alvo mede só palavras certas e alcança a velocidade]]"
tags: [task, bug]
---

# T52 Ritmo-alvo preso abaixo da velocidade

## Goal

O alvo do ritmo-alvo (T29) acompanha a velocidade real da pessoa. Ele
não fica preso muito abaixo dela por causa de erros de digitação, e a
tela explica o que a meta significa.

## O bug (relatado pelo dono, 2026-11-26)

No Texto (palavras, inglês, 200, 60 s), com média de 67 WPM nas últimas
10 rodadas, a rodada deu 70 WPM e 97% de precisão. O resultado foi
"88% das palavras no ritmo · alvo 39 → 39 WPM", com a meta em 95%.

**Causas:**

1. Uma palavra com qualquer tecla errada, mesmo corrigida, conta como
   "fora do ritmo" (`textEvents` em `src/stats/keytrace.ts`). Com 97% de
   precisão por tecla, cerca de 1 palavra em 10 tem erro, e a fração no
   ritmo fica presa perto de 88–90%, qualquer que seja o alvo. Para subir,
   a regra pede meta + 5 pontos: 90% com a meta em 85%, e 100% com a meta
   em 95%. O alvo quase nunca sobe. O erro já é barrado pela trava de 95%
   de precisão, então ele é punido duas vezes.
2. O alvo nasceu em 30 WPM (sem histórico) e só anda 2 WPM por rodada.
3. A tela não diz que uma meta maior dá um alvo **mais fácil**.

## Spec

- **AC-1**: **Só palavras certas contam.** A fração no ritmo é medida só
  sobre as unidades certas (`ok`) e completas: as palavras (Texto) ou
  linhas (Código) com erro, ou a última palavra cortada pelo fim do tempo,
  ficam fora do numerador e do denominador. Sem nenhuma unidade
  contável, o alvo fica igual. A trava de 95% de precisão continua
  valendo para subir.
  - Testes: `tests/regressions/T52-pace-target-stuck.test.ts` ("typist at 70 wpm with 97% accuracy lifts a target stuck at 39"), `src/typing/pace.test.ts` ("evaluatePaceRound ignores wrong and incomplete units", "evaluatePaceRound keeps the target when no unit counts"), `src/stats/keytrace.test.ts` ("textPaceUnits marks wrong and cut words", "codePaceUnits counts typeable characters per line").
- **AC-2**: **Alcance rápido.** Quando a regra manda subir e o alvo está
  mais de 10 WPM abaixo da "velocidade da meta" da rodada, o próximo alvo
  salta direto para ela, em vez de subir 2 WPM. A velocidade da meta é a
  maior velocidade (WPM, arredondada para baixo) que uma fração ≥ meta das
  unidades contáveis alcançou. Assim, a mesma rodada repetida com o novo
  alvo fica na meta e não faz o alvo cair de volta.
  - Testes: `src/typing/pace.test.ts` ("goalSpeedWpm is the speed reached by the goal share of units", "evaluatePaceRound jumps to the goal speed when far below"), `src/typing/pace.prop.test.ts` ("replaying a round at its caught-up target never lowers it").
- **AC-3**: **Meta explicada.** Ao lado do seletor "Meta no ritmo", um
  texto diz "% das palavras certas acima do alvo; maior = alvo mais
  fácil" ("linhas" no Código), ligado ao seletor por `aria-describedby`.
  O resultado passa a dizer "das palavras certas no ritmo" ("linhas
  certas" no Código).
  - Testes: `src/ui/TextTypingScreen.test.tsx` e `src/ui/TypingScreen.test.tsx` ("pace goal select explains that a higher goal means an easier target", "result shows on-pace share and the next target"), `tests/e2e/text-typing.spec.ts` e `tests/e2e/typing.spec.ts`.

## Out of scope

- Inverter o controle para "Desafio" (o dono escolheu só explicar).
- Mudar a regra dos ±5 pontos, o passo de 2 WPM ou o cursor fantasma.
- Migrar alvos salvos: o alcance rápido corrige um alvo antigo na
  primeira rodada boa.

## Files owned

- `src/typing/pace.ts`, `src/typing/pace.test.ts`, `src/typing/pace.prop.test.ts`
- `src/stats/keytrace.ts`, `src/stats/keytrace.test.ts`
- `src/ui/TextTypingScreen.tsx`, `src/ui/TypingScreen.tsx`, `src/ui/app.css` e os testes de tela
- `tests/regressions/T52-pace-target-stuck.test.ts` (novo)
- `tests/e2e/text-typing.spec.ts`, `tests/e2e/typing.spec.ts`

## Subtasks (one commit each)

- [ ] spec: esta nota e ADR-T52-1
- [ ] tests (regressão vermelha)
- [ ] models
- [ ] behaviour (fix)
- [ ] quality: `npm run check`, coverage e e2e
- [ ] docs: *Log* e status `review`

## Log
