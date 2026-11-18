---
id: T08
title: Somatórios e contagem de laços
status: done
depends_on: [T05]
branch: task/T08-sums
adrs: [ADR-T08-1]
tags: [task]
---

# T08 Somatórios e contagem de laços

## Goal

Um modo "Somatórios" que pede a forma fechada, em função de n, de um
somatório ou de quantas vezes um laço aninhado executa.

## Spec

- **AC-1** ([[ADR-T08-1 Parsed answers are fractions with a constant denominator]],
  altera o ADR-T02-1): o parser aceita divisão por constante (`/`, `÷`).
  O resultado guarda numerador inteiro e denominador positivo (`poly /
  denom`), reduzido, e a igualdade (`sameValue`) compara em produto
  cruzado; a contagem de fatores não muda. Divisão por algo não constante
  ou por zero dá `null`. O teste da T02 que rejeitava `1/2` muda de valor
  esperado, justificado no commit. Fatoração e álgebra comparam com
  `sameValue` e rejeitam a resposta dividida por uma constante.
  *Testes:* `src/math/parse.test.ts` ("parse: division …"),
  `src/math/fraction.test.ts`, `src/math/fraction.prop.test.ts`,
  `src/gen/factoring.test.ts` e `src/gen/algebra.test.ts`
  ("… divided by a constant …").
- **AC-2**: o parser aceita uma opção de variáveis (por exemplo, só `n`),
  e `format`/`formatFraction` escrevem com o nome escolhido.
  *Testes:* `src/math/parse.test.ts` ("parse: variables …"),
  `src/math/poly.test.ts` ("format … names …"),
  `src/math/fraction.prop.test.ts` (ida e volta com `n`).
- **AC-3**: **Somatórios:** `Σᵢ₌₁ⁿ f(i)` ou `Σᵢ₌₀ⁿ⁻¹ f(i)` com f polinomial
  de grau 1 ou 2 e coeficientes pequenos.
  *Testes:* `src/gen/sums.test.ts` ("sum prompt …"),
  `src/gen/sums.prop.test.ts` (a resposta vale o somatório do enunciado
  para n = 1…15; mesma seed → mesmo problema).
- **AC-4**: **Laços:** código C++ de 1 a 3 laços aninhados com início `0`,
  `1`, `v` ou `v + 1` e fim `n` ou `v` (v uma variável de fora); a
  pergunta é quantas vezes `ops++` executa.
  *Testes:* `src/gen/sums.test.ts` ("loop prompt …"),
  `src/gen/sums.prop.test.ts` (um interpretador do código do enunciado
  conta `ops++` e bate com a resposta para n = 1…15).
- **AC-5**: as duas famílias calculam a resposta contando por força bruta
  para n = 1…10, interpolando (diferenças finitas) em n = 1…5 e conferindo
  em n = 6…10; sorteia de novo se a contagem não for polinomial ou for
  constante. A resposta canônica é `(numerador)/d`, reduzida (sem
  parênteses quando o numerador é um monômio, sem `/1`).
  *Testes:* `src/gen/sums.test.ts` ("closedForm …").
- **AC-6**: qualquer forma equivalente é aceita (`n(n+1)/2`,
  `(n² + n)/2`, `n²/2 + n/2`); valores errados, outra letra e o
  enunciado copiado são rejeitados.
  *Testes:* `src/gen/sums.test.ts` ("checker …"),
  `src/gen/sums.prop.test.ts` (a resposta canônica é aceita).
- **AC-7**: o modo "Somatórios" aparece na configuração com os tipos
  marcáveis, as escolhas são lembradas, Enter pula, e o código dos laços é
  exibido em várias linhas.
  *Testes:* `src/ui/App.test.tsx` ("sums mode …"), `src/modes.test.ts`,
  `src/ui/format.test.ts`.

## Files owned

- `src/math/**`, `src/gen/sums*.ts`, `src/modes.ts`, `src/modes.test.ts`,
  `src/storage/**`, `src/ui/**`, `docs/decisions/`
- `src/gen/factoring.ts`, `src/gen/algebra.ts` e seus testes: só a troca de
  `equals(poly, poly)` por `sameValue` (ver *Log*).

## Subtasks (one commit each)

- [x] spec — `docs(T08): specify sums acceptance criteria`
- [x] tests — `test(T08): expect 1/2 to parse as one half` e
      `test(T08): add failing tests for sums`
- [x] models — `feat(T08): add fraction and sums types`
- [x] behaviour — `feat(T08): implement sums mode`
- [x] quality — `chore(T08): pass lint, format and coverage ratchet`
- [x] docs — `docs(T08): record sums log`

## Log

- 2026-11-18 — **Files owned ampliados:** com divisão no parser, `poly`
  vira só o numerador, e os verificadores de fatoração e de álgebra, que
  comparavam `equals(given.poly, target.poly)`, aceitariam `resposta/7`.
  Eles passam a usar `sameValue` (ADR-T08-1), com testes novos que
  rejeitam a resposta dividida por uma constante; nenhum teste existente
  muda. Esses testes novos já passavam no commit de testes (antes, `/` não
  era aceito) e servem de guarda: sem `sameValue`, `(x+3)^2/2 - 7/2` e
  `2x²/7 + 7x/7 − 15/7` seriam aceitos.
- 2026-11-18 — **Teste da T02 alterado:** `"1/2"` saiu da lista de entradas
  rejeitadas e virou o teste "1/2 is one half with no factors", num commit
  `test(T08)` próprio que explica o porquê (decisão do dono, ADR-T08-1).
  Todos os outros testes da T02 e da T05 ficaram iguais e verdes.
- 2026-11-18 — **Files owned ampliados (política do batch):** os testes ao
  lado dos módulos (`src/math/*.test.ts`, `src/storage/history.test.ts`,
  `src/ui/format.test.ts`, `src/modes.test.ts`), o e2e novo
  `tests/e2e/sums.spec.ts` (só o navegador mostra o `white-space: pre`) e
  `vite.config.ts`, só para subir o limiar de `src/math/**` (statements
  98 → 99, branches 95 → 96).
- 2026-11-18 — UNATTENDED CHOICE: o somatório é escrito com índices
  Unicode, `Σᵢ₌₁ⁿ (i² + 3i)` e `Σᵢ₌₀ⁿ⁻¹ …`, com parênteses só quando f tem
  mais de um termo; f tem grau 1 ou 2 (a ∈ [−3, 3], b ∈ [−5, 5],
  c ∈ [−5, 5]), porque f constante dá uma resposta trivial.
- 2026-11-18 — UNATTENDED CHOICE: o enunciado dos laços começa com a linha
  `// quantas vezes ops++ roda?`, indenta 2 espaços por nível e usa só
  `<`. O laço de fora vai de `0` ou `1` até `n`; os de dentro começam em
  `0`, `1`, `v` ou `v + 1` e terminam em `n` ou `v`, para qualquer variável
  de fora `v`. Na tela, um enunciado com quebra de linha ganha a classe
  `code` (`white-space: pre`, fonte menor, rolagem horizontal).
- 2026-11-18 — UNATTENDED CHOICE: a resposta canônica omite `/1` e os
  parênteses quando o numerador é um monômio (`n/2`, `−n²/3`); `÷` também
  divide, como `·` e `×` multiplicam.
- 2026-11-18 — **Forma fechada:** contagem em n = 1…10, Newton com
  diferenças finitas em n = 1…5 multiplicado por 4! = 24 para ter
  coeficientes inteiros, fração reduzida e conferida em todos os 10
  pontos. A contagem vale para n ≥ 1; laços cuja contagem só vira
  polinômio a partir de n maior são sorteados de novo. A propriedade
  confere a resposta contra um interpretador independente do código do
  enunciado (e contra a soma termo a termo) para n = 1…15.
- 2026-11-18 — **Efeito em fatoração e álgebra:** formas com divisão por
  constante e mesmo valor passam a ser aceitas, como `(2x−10)(x+3)/2` na
  fatoração e `4x²/2 + 7x − 15` na expansão (a forma expandida continua
  exigindo uma parcela por monômio e nenhum parêntese).
- 2026-11-18 — **Telas que mostram o enunciado numa linha:** "Pulada:" e a
  tabela de puladas no resultado juntam as linhas do código dos laços
  (espaço normal do HTML). Fica para o dono decidir se vale mudar.
- 2026-11-18 — **Gates no último commit:** `npm run check` (380 testes),
  `npm run coverage` (sem `ERROR`), `npm run test:fuzz` e
  `npm run test:e2e` (4 testes) verdes.
- **Verificação manual para o dono:** ler alguns enunciados de laços e de
  somatórios gerados, inclusive numa tela de celular.
