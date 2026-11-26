---
id: T51
title: E2E instável dos pontos fracos
status: in-progress
depends_on: []
branch: fix/weak-spots-e2e-flake
adrs: []
tags: [task, bug]
---

# T51 E2E instável dos pontos fracos

## Goal

O e2e "weak spots round with seeded history highlights focused n-gram and
shows before/after result" (`tests/e2e/typing.spec.ts:81`, da T30) passa
sempre, e não só às vezes.

## O bug (visto na integração de T47 e T50, 2026-11-25)

Numa rodada completa de `npm run test:e2e`, o teste falhou uma vez:

```
Locator: getByTestId('weak-results-table')
Expected substring: "->"
Received string:    "N-gramaAntesDepoisSituaçãoqu360 ms292 msEm treino"
```

Rodado sozinho, passou 3 vezes seguidas. O teste digita o bloco 1 a
100 ms por tecla para o `qu` "graduar" (mediana abaixo do intervalo-alvo
de 60 wpm, 200 ms) e o foco passar para `->`. Na falha, a mediana medida
do `qu` foi 292 ms, então ele não graduou e o `->` nunca virou foco.

**Causa (confirmada em 2026-11-25):** `page.clock.install()` instala um
relógio falso que **continua andando com o tempo real**. O `runFor(100)`
soma 100 ms ao tempo real que já passou entre as teclas. Sob carga (todos
os e2e em paralelo), cada tecla leva mais ~190 ms reais, e a mediana sobe
para ~290 ms. Com 200 ms reais de atraso por tecla, a falha se repete
sempre (471 ms). O defeito está no teste, não no app: o app mede certo o
tempo que lhe é dado.

## Spec

- **AC-1**: o roteiro da rodada (sementes do histórico, relógio e
  digitação) fica num helper comum, `tests/e2e/weak-spots.ts`, que pausa o
  relógio falso. Assim, só o `runFor` faz o tempo andar, e o atraso real
  entre as teclas não entra na medição. A asserção do `->` não muda.
  - Testes: `tests/e2e/regression-T51-weak-spots-flake.spec.ts` ("real lag between keys does not leak into the measured intervals", com 200 ms reais antes de cada tecla), além do teste original de `typing.spec.ts` sem mudança de asserção.
- **AC-2**: 20 execuções seguidas do teste original passam
  (`npx playwright test typing.spec.ts -g "weak spots" --repeat-each 20`).

## Files owned

- `tests/e2e/typing.spec.ts`, `tests/e2e/weak-spots.ts` (novo), `tests/e2e/regression-T51-weak-spots-flake.spec.ts` (novo)

## Subtasks (one commit each)

- [x] spec
- [ ] tests (regressão vermelha)
- [ ] fix
- [ ] docs

## Log
