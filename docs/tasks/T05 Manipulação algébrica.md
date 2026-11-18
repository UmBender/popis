---
id: T05
title: Manipulação algébrica
status: review
depends_on: [T04]
branch: task/T05-algebra
adrs: []
tags: [task]
---

# T05 Manipulação algébrica

## Goal

Um modo "Álgebra" com as manipulações que atrasam derivações em CP:
expandir, simplificar, completar o quadrado e dividir por (x − a).

## Spec

- **AC-1**: O parser passa a devolver as parcelas de topo (`summands`),
  cada uma com o sinal, o polinômio e a contagem de fatores.
  *Teste:* `src/math/parse.test.ts` ("summands …").
- **AC-2**: Tipos de questão (padrão: todos):
  - **expandir** `(ax + b)(cx + d)`, `(x + a)²` ou `(x + a)(x² + bx + c)`;
  - **simplificar** uma soma de 2 a 3 parcelas como `3(x − 2) − 2(x + 1) + x`
    ou `x(x + 3) − 2(x − 1)`, com resultado não constante;
  - **completar o quadrado** de `x² + 2hx + c`, com h e o resto não nulos;
  - **dividir** um polinômio cúbico mônico por `(x − a)`, divisão exata.
  *Testes:* `src/gen/algebra.test.ts`, `src/gen/algebra.prop.test.ts`
  (o enunciado vale o mesmo que a resposta; na divisão, quociente ×
  divisor = dividendo; mesma seed → mesmo problema).
- **AC-3**: Respostas de expandir, simplificar e dividir são aceitas em
  forma expandida: sem parênteses, uma parcela por monômio, em qualquer
  ordem. O enunciado copiado, termos semelhantes não somados (`x + x`) e
  respostas erradas são rejeitados.
  *Teste:* `src/gen/algebra.test.ts` ("expanded …").
- **AC-4**: Completar o quadrado aceita `(x + h)² + k` em qualquer ordem
  das parcelas e com `(x + h)(x + h)`; rejeita a forma expandida e um
  produto que não é quadrado.
  *Teste:* `src/gen/algebra.test.ts` ("square …").
- **AC-5**: O modo aparece na configuração com os tipos marcáveis, e Enter
  pula.
  *Testes:* `src/ui/App.test.tsx` ("algebra mode …"), `src/modes.test.ts`.

## Files owned

- `src/math/parse.ts`, `src/math/parse.test.ts`, `src/gen/algebra*.ts`,
  `src/modes.ts`, `src/storage/history.ts`, `src/ui/**`

## Subtasks (one commit each)

- [x] spec — `docs(T05): specify algebra acceptance criteria`
- [x] tests — `test(T05): add failing tests for algebra`
- [x] models — `feat(T05): add algebra types and parser summands`
- [x] behaviour — `feat(T05): implement algebra mode`
- [x] quality — `chore(T05): pass lint, format and coverage`
- [x] docs — `docs(T05): record algebra log`

## Log

- **Commit de modelos com typecheck vermelho:** o helper `parsed()` de
  `parse.test.ts` declarava o retorno `{ poly, factors }` e escondia o
  campo novo `summands` (TS2339). Passei a ver o código de saída do `tsc`
  porque `| head` o escondia; o helper ganhou o tipo `Parsed` num commit de
  teste próprio, sem mudar asserções.
- **Forma expandida:** "sem parênteses e uma parcela por monômio" aceita
  `2·x·x` e qualquer ordem, e rejeita `x + x`, que é o erro de não juntar
  termos semelhantes.
- **Gates no último commit:** `npm run check`, `npm run coverage`,
  `npm run test:fuzz` e `npm run test:e2e` verdes.
