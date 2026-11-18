---
id: T09
title: Números primos
status: in-progress
depends_on: [T06]
branch: task/T09-primes
adrs: []
tags: [task]
---

# T09 Números primos

## Goal

Um modo "Primos": aparece um número até um limite escolhido e o jogador
digita o seu menor fator primo. Se o número for primo, a resposta é ele
mesmo. Assim, decidir se ele é primo e achar o fator viram uma resposta só,
e chutar não compensa.

## Spec

Decisões do dono (2026-11-18): resposta = menor fator primo; limite por
opções fixas; metade primos e compostos difíceis; modo próprio. Sem ADR
novo: o modo segue o registro de `src/modes.ts` e a resposta é um inteiro,
como na divisão.

- **AC-1**: **Primalidade:** `src/math/primes.ts` exporta
  `smallestPrimeFactor(n)` (por divisão até √n; `RangeError` para n que
  não é inteiro ≥ 2) e `isPrime(n)` (falso abaixo de 2). Para todo `n`
  de 2 a 10⁵, os dois concordam com um crivo de Eratóstenes montado no
  próprio teste.
  *Testes:* `src/math/primes.test.ts`.
- **AC-2**: **Enunciado e resposta:** o enunciado é "menor fator primo de
  N". A resposta canônica é `N` se N for primo; se não for, é o menor fator
  primo de N. O verificador aceita só esse inteiro (espaços nas pontas são
  ignorados). Outro fator, como 13 para 91, é rejeitado, assim como 1, N
  quando N é composto, um sinal trocado ou um texto que não é número.
  *Testes:* `src/gen/primes.test.ts` ("check …", "generate …").
- **AC-3**: **Limites:** os limites são 100, 1000, 10⁴ e 10⁵, com padrão
  1000. O número sorteado fica em [11, limite]. Um limite fora da lista
  faz o `generate` lançar `RangeError` e o `parseSettings` devolver `null`.
  *Testes:* `src/gen/primes.test.ts` ("settings …"),
  `src/gen/primes.prop.test.ts`.
- **AC-4**: **Sorteio:** com probabilidade ½ sai um primo, uniforme entre
  os primos do intervalo. Senão, sai um composto cujo menor fator primo é
  ≥ 7 (sem fator 2, 3 nem 5). Até 100, só 49, 77 e 91 se qualificam, e
  isso é aceito.
  *Testes:* `src/gen/primes.test.ts` ("generate with limit 100 …"),
  `src/gen/primes.prop.test.ts`.
- **AC-5**: **Teste de propriedade** (muitas seeds, cada limite): a resposta
  canônica é aceita e é o menor fator primo do número; o número respeita o
  intervalo; um composto não tem fator < 7; a mesma seed gera o mesmo
  problema; em 2000 seeds, a fração de primos fica entre 40% e 60%.
  *Teste:* `src/gen/primes.prop.test.ts`.
- **AC-6**: **Modo no registro:** `primes`, com rótulo "Primos", teclado
  numérico e Enter para pular. Ele fica antes de "Revisar", que continua
  sendo o último, e a revisão consegue repetir as questões de primos. A
  habilidade é uma só, `primes.spf` ("Menor fator primo"), para que o
  rótulo não entregue se o número é primo.
  *Testes:* `src/modes.test.ts` ("primes …", o teste do teclado numérico),
  `src/ui/format.test.ts` ("skillLabel names the primes skill").
- **AC-7**: **Configurações:** o limite é escolhido na tela de
  configuração num seletor "Limite", salvo e recarregado. Configurações
  gravadas antes da T09 carregam com o limite padrão, e um limite inválido
  volta ao padrão.
  *Testes:* `src/storage/history.test.ts` ("… primes …"),
  `src/ui/App.test.tsx` ("primes mode …"). O layout de celular fica a
  cargo de `tests/e2e/mobile.spec.ts`, que já percorre todo `MODE_IDS`.

## Out of scope

- Dificuldade que sobe durante a partida (o limite é fixo).
- Fatoração completa (só o menor fator).
- Limites acima de 10⁵.

## Files owned

- `src/math/primes*.ts`, `src/gen/primes*.ts`, `src/modes.ts`,
  `src/modes.test.ts`, `src/storage/**`, `src/ui/**`
- `vite.config.ts` (só para subir limiares de cobertura)

## Subtasks (one commit each)

- [ ] spec — `docs(T09): specify primes acceptance criteria`
- [ ] tests — `test(T09): add failing tests for primes`
- [ ] models — `feat(T09): add primes types and registry entry`
- [ ] behaviour — `feat(T09): implement primes mode`
- [ ] quality — `chore(T09): …`
- [ ] docs — `docs(T09): record primes log`

## Log
