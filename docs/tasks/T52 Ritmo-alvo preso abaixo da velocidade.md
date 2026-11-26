---
id: T52
title: Ritmo-alvo preso abaixo da velocidade
status: review
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

- [x] spec: esta nota e ADR-T52-1
- [x] tests (regressão vermelha)
- [x] models
- [x] behaviour (fix)
- [x] quality: `npm run check`, coverage e e2e
- [x] docs: *Log* e status `review`

## Log

- 2026-11-26 — **Bug, causa e teste.** Alvo preso em 39 WPM com média de
  67 WPM e 97% de precisão. Causas: palavras com erro contavam como fora
  do ritmo e travavam a fração perto de 89%, e o alvo só andava 2 WPM por
  rodada. Teste: `tests/regressions/T52-pace-target-stuck.test.ts`. Ele
  falhou vermelho no código antigo (74 unidades contadas em vez de 66).
- 2026-11-26 — **Desvio da proposta ao dono.** O dono aprovou "saltar
  para a mediana das rodadas recentes". Na implementação, o salto vai
  para a *velocidade da meta* da rodada. O motivo: o equilíbrio da regra
  dos 85% fica perto do 15º percentil das velocidades por palavra, bem
  abaixo da mediana, e saltar para a mediana faria o alvo oscilar. O
  detalhe está no ADR-T52-1, em *Alternatives considered*.
- 2026-11-26 — **Testes corrigidos em commit próprio, antes do fix**
  (`test(T52): expect catch-up …`):
  - O fixture de "evaluatePaceRound summarises on-pace share and next
    target", escrito nesta task, ficava longe da velocidade da meta, o
    que o faria saltar. Ele passou a usar 36 WPM, para medir só o passo
    de 2 WPM.
  - Três testes de tela da T29/T31 digitavam muito acima do alvo e
    esperavam "+2": "initial target uses prior round history …" (Texto e
    Código) e "burst keeps its own pace target". A intenção deles é o
    alvo inicial e o alvo separado da rajada, e as asserções continuam
    conferindo isso: o alvo de partida (`alvo 50 →`, `alvo 30 →`), o alvo
    salvo igual ao exibido e o alvo do Código intocado em 60.
- 2026-11-26 — **Qualidade:**
  - a dica da meta quebra para a linha de baixo no celular (`flex-wrap`),
    para não espremer "Meta no ritmo" em três linhas;
  - capturas conferidas em desktop e celular (Texto e Código).
- 2026-11-26 — **Gates:**
  - `npm run check` verde;
  - `npm run coverage`: 4547 testes, limiares atendidos. Uma primeira
    execução falhou só no teste de 16 ms da T21 (`src/vim/optimal.test.ts`,
    19,6 ms sob instrumentação), a instabilidade já conhecida e sem
    relação com esta task. Ele passou na repetição e sozinho;
  - `npm run test:e2e`: 59/59.
- 2026-11-26 — **Verificação manual pendente para o dono:** jogar algumas
  rodadas de Texto. O alvo preso em 39 deve saltar na primeira rodada
  com precisão de pelo menos 95% e depois se manter perto da velocidade
  da meta.
