---
id: T04
title: Divisão inteira e resto em C++
status: in-progress
depends_on: [T02]
branch: task/T04-integer-division
adrs: []
tags: [task]
---

# T04 Divisão inteira e resto em C++

## Goal

Um modo "Divisão inteira" que treina o erro clássico de CP com negativos:
`/` e `%` do C++ (truncam para zero), piso, teto, mod matemático e
desigualdades lineares resolvidas com arredondamento. Também cria o
registro de modos, para que os próximos modos entrem sem `if` espalhado.

## Spec

- **AC-1**: Tipos de questão, com operandos inteiros, divisor com
  |b| de 2 a 12 e pelo menos um operando negativo (exceto nas desigualdades):
  - `C++: a / b`, quociente truncado para zero;
  - `C++: a % b`, resto com o sinal do dividendo;
  - `⌊a / b⌋` e `⌈a / b⌉`, com a não divisível por b;
  - `a mod b`, com b > 0 e resultado em [0, b);
  - desigualdade: "maior (ou menor) x inteiro com `ax + b ≤ c`" (ou `≥`),
    sempre com resposta finita.
  *Testes:* `src/gen/division.test.ts` (casos conhecidos, ex.: `-7 / 2` → −3,
  `-7 % 3` → −1, `⌊−7/2⌋` → −4, `−7 mod 3` → 2),
  `src/gen/division.prop.test.ts` (para qualquer seed e tipo: a resposta
  satisfaz a definição, ex.: `a = b·q + r` com `|r| < |b|`; o x da
  desigualdade a satisfaz e o vizinho não; mesma seed → mesmo problema).
- **AC-2**: A resposta aceita `-` ou `−` e espaços em volta.
  *Teste:* `src/gen/division.test.ts` ("check …").
- **AC-3**: O modo aparece na configuração com os tipos marcáveis (padrão:
  todos). A configuração salva guarda os tipos, e configurações salvas
  antes desta task continuam sendo lidas.
  *Testes:* `src/storage/history.test.ts`, `src/ui/App.test.tsx`
  ("division mode …").
- **AC-4**: Enter pula a questão em todos os modos, menos na aritmética,
  que segue o Zetamac.
  *Teste:* `src/ui/App.test.tsx` ("Enter skips in division").
- **AC-5**: Os modos ficam num registro único (`src/modes.ts`): gerador,
  nome, dica, configuração salva, se pula e tipo de teclado. Os testes da
  T01 e da T02 continuam passando sem mudança.
  *Testes:* `src/modes.test.ts`, a suíte existente.

## Out of scope

- Divisão por expressões e `long long` vs `int` (overflow fica na T07).

## Files owned

- `src/modes.ts`, `src/modes.test.ts`, `src/gen/kinds.ts`, `src/gen/division*.ts`,
  `src/storage/**`, `src/ui/**`, `vite.config.ts`

## Subtasks (one commit each)

- [ ] spec — `docs(T04): specify integer division acceptance criteria`
- [ ] tests — `test(T04): add failing tests for integer division`
- [ ] models — `feat(T04): add mode registry and division types`
- [ ] behaviour — `feat(T04): implement integer division mode`
- [ ] quality — `chore(T04): pass lint, format and coverage`
- [ ] docs — `docs(T04): record integer division log`

## Log
