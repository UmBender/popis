---
id: T01
title: Clone do Zetamac
status: todo
depends_on: []
adrs: ["[[ADR-0001 Kanagawa Dragon theme]]", "[[ADR-0002 Static web app in Vite, TypeScript and React]]"]
tags: [task]
---

# T01 Clone do Zetamac

## Goal

Um treino de aritmética no formato do Zetamac: tela de configuração,
partida cronometrada e tela de resultado. Também é o motor genérico
(gerador → questão → sessão) que os outros modos vão reutilizar.

## Spec

- **AC-0**: A infraestrutura de testes descrita no `AGENTS.md` existe:
  `npm run check` (tsc, eslint, prettier, vitest, build) falha com
  `.only`/`.skip`. Também existem `npm run test:e2e`, `npm run test:fuzz`
  e `npm run coverage`, o teste de pureza (`tests/purity.test.ts`) e o RNG
  com seed e o relógio injetável em `src/core/`.
- **AC-1**: Padrões iguais ao Zetamac: adição (2–100)+(2–100), subtração
  como adição invertida, multiplicação (2–12)×(2–100), divisão como
  multiplicação invertida. Faixas e operações configuráveis.
- **AC-2**: Duração de 30, 60, 120 (padrão), 300 ou 600 s.
- **AC-3**: A resposta é aceita sem Enter assim que fica correta, e a
  próxima questão aparece na hora. Placar = número de acertos.
- **AC-4**: Cada questão registra o tempo de resposta e as tentativas erradas.
- **AC-5**: A tela de resultado mostra o placar, o tempo médio por operação
  e as questões mais lentas.
- **AC-6**: O histórico de sessões persiste no `localStorage`.
- **AC-7**: Toda questão carrega a `seed` e os parâmetros que a geraram, e a
  tela de resultado os mostra. É o que permite reproduzir um bug como
  teste de regressão.
- **AC-8**: A interface usa os tokens de [[Theme]], definidos só em
  `src/ui/theme.css`. O teste `tests/colors.test.ts` falha com um literal
  de cor em qualquer outro arquivo de `src/`
  ([[ADR-0001 Kanagawa Dragon theme]]).

## Out of scope

- Dificuldade adaptativa (vem depois, usando os dados do AC-4).


## Log
