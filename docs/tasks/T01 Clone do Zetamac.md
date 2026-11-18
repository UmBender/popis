---
id: T01
title: Clone do Zetamac
status: review
depends_on: []
branch: task/T01-zetamac-clone
adrs: ["[[ADR-0001 Kanagawa Dragon theme]]", "[[ADR-0002 Static web app in Vite, TypeScript and React]]"]
tags: [task]
---

# T01 Clone do Zetamac

## Goal

Um treino de aritmética no formato do Zetamac: tela de configuração,
partida cronometrada e tela de resultado. Também é o motor genérico
(gerador → questão → sessão) que os outros modos vão reutilizar.

## Spec

- **AC-0**: A infraestrutura de testes do `AGENTS.md` existe. `npm run check`
  roda tsc, eslint, prettier, vitest e build. Também existem
  `npm run test:e2e`, `npm run test:fuzz` e `npm run coverage`, e o RNG com
  seed e o relógio injetável ficam em `src/core/`.
  *Testes:* `tests/purity.test.ts` (sem `Math.random`/`Date.now`/
  `performance.now`/`new Date()` fora de `src/core/rng.ts` e
  `src/core/clock.ts`), `tests/focused.test.ts` (sem `.only`/`.skip` nos
  testes), `src/core/rng.test.ts` e `src/core/rng.prop.test.ts`
  (mesma seed → mesma sequência, inteiros dentro dos limites).
- **AC-1**: Padrões iguais ao Zetamac: adição (2–100)+(2–100), subtração
  como adição invertida, multiplicação (2–12)×(2–100), divisão como
  multiplicação invertida. Faixas e operações configuráveis, com validação
  (faixa invertida, nenhuma operação, divisão por zero).
  *Testes:* `src/gen/arithmetic.test.ts`, `src/gen/arithmetic.prop.test.ts`
  (para qualquer seed e configuração válida: operandos na faixa, divisão
  exata, resposta canônica aceita, mesma seed → mesmo problema).
- **AC-2**: Duração de 30, 60, 120 (padrão), 300 ou 600 s.
  *Testes:* `src/session/engine.test.ts` ("session finishes exactly at the
  duration"), `src/ui/App.test.tsx` ("config offers the five durations").
- **AC-3**: A resposta é aceita sem Enter assim que fica correta, e a
  próxima questão aparece na hora. Placar = número de acertos.
  *Testes:* `src/session/engine.test.ts`, `src/ui/App.test.tsx`
  ("correct answer advances without Enter"), `tests/e2e/zetamac.spec.ts`.
- **AC-4**: Cada questão registra o tempo de resposta e as correções. Uma
  correção é uma edição que encurta a resposta (apagar). O Zetamac não tem
  envio, então não há "tentativa errada" para contar; apagar é o sinal de
  que a pessoa errou e corrigiu. A questão em aberto no fim do tempo fica
  registrada como `timeout`.
  *Testes:* `src/session/engine.test.ts`.
- **AC-5**: A tela de resultado mostra o placar, o tempo médio por operação
  e as questões mais lentas.
  *Testes:* `src/session/stats.test.ts`, `src/ui/App.test.tsx`
  ("results show score, per-operation mean and slowest problems").
- **AC-6**: O histórico de sessões e a última configuração persistem no
  `localStorage`. Dados corrompidos não quebram o app.
  *Testes:* `src/storage/history.test.ts`, `src/ui/App.test.tsx`
  ("finished session is saved", "settings are remembered").
- **AC-7**: Toda questão carrega a `seed` e os parâmetros que a geraram, e a
  tela de resultado mostra a seed. É o que permite reproduzir um bug como
  teste de regressão.
  *Testes:* `src/gen/arithmetic.test.ts` ("same seed and params give the
  same problem"), `src/ui/App.test.tsx` ("results show the seed of slow
  problems").
- **AC-8**: A interface usa os tokens de [[Theme]], definidos só em
  `src/ui/theme.css` ([[ADR-0001 Kanagawa Dragon theme]]).
  *Testes:* `tests/colors.test.ts` (literal de cor fora de `theme.css`
  falha; `theme.css` tem exatamente os tokens de [[Theme]]).

## Out of scope

- Dificuldade adaptativa (vem depois, usando os dados do AC-4).
- Pular questão na interface (o motor suporta; a T02 expõe).

## Files owned

- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`
  (também a config do Vitest), `playwright.config.ts`, `eslint.config.js`,
  `.prettierrc.json`, `.prettierignore`, `index.html`, `.gitignore`
- `src/**`, `tests/**`

## Subtasks (one commit each)

- [x] spec — `docs(T01): specify zetamac clone acceptance criteria`
- [x] scaffold — `chore(T01): scaffold vite, typescript and test tooling`
- [x] tests — `test(T01): add failing tests for zetamac clone`
- [x] models — `feat(T01): add problem, generator and session types`
- [x] behaviour — `feat(T01): implement zetamac clone`
- [x] quality — `chore(T01): pass lint, format and coverage`
- [x] docs — `docs(T01): record zetamac clone log`

## Log

- **Stack:** TypeScript 6.0.3 em vez do 7, porque o typescript-eslint
  8.73 exige `<6.1.0` ([[ADR-0002 Static web app in Vite, TypeScript and React]]).
  O Chromium headless do Playwright foi instalado em `~/.cache/ms-playwright`.
- **Passo extra:** o scaffold (ferramentas, sem lógica) ganhou um commit
  próprio antes dos testes, porque os testes precisam do Vitest instalado.
- **Teste corrigido:** o teste "same seed gives the same problem sequence"
  tinha uma inferência circular de tipo (TS7022). Ganhou uma anotação de
  tipo num commit próprio (`3acafe7`), sem mudar a asserção.
- **Histórico:** um commit de modelos saiu misturado com essa correção do
  teste, por um erro meu na sequência de comandos. Como era o último commit
  de uma branch local nunca publicada, desfiz com `git reset --soft HEAD~1`
  e refiz os dois commits separados.
- **Modelos:** `Generator<P>` e os tipos da sessão perderam a restrição
  `P extends JsonValue`, porque o helper genérico do teste não a declara. O
  formato JSON continua garantido por `Problem.params: JsonValue`.
- **Fuzz:** com `FC_NUM_RUNS=20000`, a propriedade de `rng.int` leva cerca
  de 5,5 s e estourava o timeout padrão de 5 s do Vitest. Nenhuma
  propriedade falhou, então não houve regressão a registrar. O
  `test:fuzz` agora usa `--testTimeout=300000`.
- **Cobertura:** 100% das linhas em todas as pastas. Os limiares por pasta
  ficam em `vite.config.ts`, com branches em 88% (`core`) e 75% (`ui`).
- **E2E:** `tests/e2e/zetamac.spec.ts` usa `page.clock` do Playwright para
  avançar os 2 minutos sem esperar.
- **Gates no último commit:** `npm run check` verde (101 testes),
  `npm run coverage` verde, `npm run test:fuzz` verde e
  `npm run test:e2e` verde.
