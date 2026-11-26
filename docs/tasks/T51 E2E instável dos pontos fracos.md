---
id: T51
title: E2E instável dos pontos fracos
status: ready
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

**Hipóteses a conferir:**
- as palavras da rodada vêm de uma seed nova a cada execução, e algumas
  sequências têm poucos `qu`, de modo que a mediana pega intervalos de
  outras teclas;
- ou o tempo do evento de tecla não segue o relógio falso do Playwright
  sob carga (`page.clock.runFor` intercalado com `keyboard.type`).

## Spec

- **AC-1**: a causa é identificada e registrada no *Log*, e o teste fica
  determinístico (seed fixa da rodada, ou medição só nas ocorrências do
  n-grama em foco), sem afrouxar a asserção do `->`.
  - Testes: `tests/e2e/regression-T51-weak-spots-flake.spec.ts`, que reproduz a falha de forma determinística (por exemplo, com a seed que a provoca), além do teste original sem mudança de asserção.
- **AC-2**: 20 execuções seguidas do teste original passam
  (`npx playwright test typing.spec.ts -g "weak spots" --repeat-each 20`).

## Files owned

- `tests/e2e/typing.spec.ts`, `tests/e2e/regression-T51-weak-spots-flake.spec.ts` (novo)
- `src/ui/WeakTypingScreen.tsx` e `src/typing/weak-*.ts`, se a causa estiver no app

## Subtasks (one commit each)

- [ ] spec
- [ ] tests (regressão vermelha)
- [ ] fix
- [ ] docs

## Log
