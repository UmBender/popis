---
id: T41
title: Caça ao WA
status: done
depends_on: [T40]
branch: task/T41-wa-hunt
adrs: [ADR-T41-1]
tags: [task]
---

# T41 Caça ao WA

## Goal

Um item **Caça ao WA** na pasta Maratona. Aparece o enunciado curto de um
problema e uma solução C++ que compila, passa no exemplo e leva WA, TLE
ou RTE no juiz. A pessoa aponta a linha e a classe do bug, como numa
leitura do código impresso antes de submeter. Depois de responder, o app
mostra uma entrada pequena que quebra a solução, a saída errada e a
correção. Os bugs são os que mais custam penalidade na maratona.

## Classes de bug (KC `wa.<classe>`)

- `overflow`: `int` no lugar de `long long`, `a * b` antes do `% MOD`,
  `1 << 40`, `accumulate` com início `0` em vez de `0LL`;
- `limite`: off-by-one em laço, vetor com `n` em vez de `n + 1`,
  `MAXN` pequeno;
- `multitest`: estado global não zerado entre os casos, `break` na
  leitura que deixa entrada para trás;
- `borda`: `n == 1`, resposta vazia, todos iguais, número negativo
  em `%` e `/`;
- `precisao`: `==` com `double`, `sqrt` sem ajuste, `printf` com poucas
  casas;
- `desempenho`: `endl` em laço, `cin` sem `sync_with_stdio(false)`,
  `map` em vez de vetor, cópia de vetor por valor na recursão,
  `memset` dentro do laço de casos;
- `stl`: `lower_bound` contra `upper_bound`, `set::erase(valor)` num
  `multiset`, comparador que não é estrito, `s.size() - 1` com `s` vazio;
- `leitura`: `getline` depois de `cin >>`, formato de saída (espaço no
  fim, `Case #i:`).

## Spec

- **AC-1**: **Casos** em `src/wa/cases/`, com pelo menos 32 casos (4 por
  classe). Cada caso tem `{ id, class, title, statement, sample_input,
  code, fixed, line, breaking_input, expected_verdict, explanation }` e
  as saídas gravadas pelo oráculo (`sample_output`, `wrong_output`,
  `expected_output`, `verdict`), e `fixed` difere de `code` só nas
  linhas em torno do bug. Cada caso possui uma força bruta independente
  em `src/wa/cases/brute/<id>.cpp`.
  - Testes: `src/wa/cases.test.ts` (`fixed differs from code only around the bug line`,
    `every class has at least 4 cases`,
    `there are at least 32 cases with unique ids, valid lines, recorded outputs and brute files`),
    `src/wa/diff.test.ts` (`diffCode and changedHunks locate single-line, multi-line, added and removed edits`).
- **AC-2**: **Oráculo** `npm run wa:oracle` (`scripts/wa-oracle.mjs`), fora
  do `check`. Ele compila `code`, `fixed` e a força bruta com as flags do
  juiz (`g++ -std=c++20 -O2`, ADR-T41-1) e confere que:
  - os dois dão a mesma saída no exemplo do enunciado (`sample_input`);
  - na `breaking_input` eles diferem (ou `code` passa de 2 s enquanto
    `fixed` roda em menos de 0,5 s, com corte em 5 s, ou termina com
    sinal, conforme a classe);
  - `fixed` bate com a força bruta do caso em 200 entradas aleatórias
    pequenas.
  - Testes: `npm run wa:oracle`, com o resultado no *Log*.
- **AC-3**: **Sorteio** `src/wa/drill.ts` e **rodada** `src/wa/round.ts`:
  casos sem repetição por ciclo, 4 classes distintas nas opções (a certa
  e 3 distratores), filtro por classe e motor de rodada de 5 casos sem
  limite de tempo (cronômetro progressivo, revisão pós-resposta e eventos
  `wa.hunt` com KC `wa.<classe>`).
  - Testes: `src/wa/drill.prop.test.ts` (`canonical answer is accepted and near-misses are rejected`,
    `correct class is always among 4 distinct choices`,
    `no case repeats before exhausting the filtered pool`,
    `same seed produces the same sequence`),
    `src/wa/round.test.ts` (`runs a 5-case untimed round with stopwatch, post-answer review, skips, per-class stats and wa.hunt events`),
    `src/stats/event.test.ts` (`DRILLS accepts wa.hunt and stores wa hunt events`).
- **AC-4**: **Tela** `src/ui/WaScreen.tsx`, reaproveitando os seletores
  compartilhados de linha e opções extraídos da T40
  (`src/ui/maratona/LineChoicePicker.tsx`), sem alterar o comportamento
  nem os testes da T40. Sem limite de tempo por rodada: são 5 casos por
  rodada, com cronômetro visível. Ao responder, mostra a entrada que
  quebra, a saída errada contra a certa, o diff da correção e a
  explicação. Cada caso vira um evento com drill `wa.hunt`. O item
  **Caça ao WA** entra na pasta **Maratona** logo após **Ler o erro**,
  mantendo os atalhos 1–9.
  - Testes: `src/ui/WaScreen.test.tsx` (`correct and wrong answers reveal breaking input, wrong vs expected output and fix diff`,
    `supports keyboard arrows + Enter + 1-4, class-first pick, skip, restart, Esc exit and 5-case completion with wa.hunt events`,
    `class filter persists in popis.wa and opens from Maratona in App`),
    `src/storage/wa.test.ts` (`loads, saves and validates popis.wa settings and round results`),
    `src/ui/shell/sections.test.ts` (`Maratona folder places Caça ao WA right after Ler o erro and keeps shortcuts 1-9`),
    `tests/e2e/wa.spec.ts` (`T41: play a 5-case Caça ao WA round on desktop and mobile`).

## Out of scope

- A pessoa escrever a correção. Isso pode virar uma task depois, usando o
  interpretador da T27.

## Files owned

- `src/wa/` (novo), `src/storage/wa.ts`, `src/storage/wa.test.ts`, `src/stats/event.ts`, `src/stats/event.test.ts`
- `src/ui/maratona/LineChoicePicker.tsx`, `src/ui/CompileScreen.tsx`, `src/ui/WaScreen.tsx`, `src/ui/WaScreen.test.tsx`, `src/ui/App.tsx`, `src/ui/shell/sections.ts`, `src/ui/shell/sections.test.ts`, `src/ui/app.css`
- `scripts/wa-oracle.mjs`, `package.json`, `vite.config.ts`, `playwright.config.ts`, `tests/e2e/wa.spec.ts`
- `docs/decisions/ADR-T41-1 Caça ao WA com oráculo de juiz e seletores compartilhados.md`

## Subtasks (one commit each)

- [x] spec: ADR-T41-1 e critérios de aceitação com testes nomeados
- [x] tests
- [x] models
- [x] behaviour
- [x] quality: `npm run check`, `wa:oracle`, coverage, e2e
- [x] docs

## Log

- 2026-11-26 — Implementação concluída na branch `task/T41-wa-hunt` com 32 casos reais em C++20 (4 por classe em `overflow`, `limite`, `multitest`, `borda`, `precisao`, `desempenho`, `stl`, `leitura`), 32 forças brutas independentes em `src/wa/cases/brute/`, saídas verificadas e gravadas em `src/wa/cases/outputs.ts` via `scripts/wa-oracle.mjs`, diff puro linha a linha (`src/wa/diff.ts`), sorteio sem repetição por ciclo com 4 classes nas opções (`src/wa/drill.ts`), motor de rodada sem limite de tempo de 5 casos com cronômetro progressivo e revisão pós-resposta (`src/wa/round.ts`), persistência em `popis.wa` / `popis.wa-results` (`src/storage/wa.ts`), eventos `wa.hunt` (`src/stats/event.ts`), seletores compartilhados `CodeLinePicker` e `ChoiceGrid` extraídos da T40 (`src/ui/maratona/LineChoicePicker.tsx`) mantendo todos os testes da T40 intactos, tela `src/ui/WaScreen.tsx` e item **Caça ao WA** logo após **Ler o erro** na pasta **Maratona** (`src/ui/shell/sections.ts`).
- 2026-11-26 — UNATTENDED CHOICE: cada força bruta vive como arquivo `.cpp` puro em `src/wa/cases/brute/<id>.cpp`, lido apenas por `scripts/wa-oracle.mjs`, mantendo a força bruta fora do pacote web e da cobertura TypeScript (ADR-T41-1).
- 2026-11-26 — UNATTENDED CHOICE: após qualquer resposta (certa ou errada), a tela entra em estado de revisão exibindo a `breaking_input`, a saída errada contra a certa, o diff da correção e a explicação antes de avançar (`Próximo` / `Ver resultado` via clique ou `Enter`), atendendo AC-4 em todos os 5 casos da rodada (ADR-T41-1).
- 2026-11-26 — UNATTENDED CHOICE: nos 4 casos de `desempenho` (`desempenho-vec-copy`, `desempenho-memset-loop`, `desempenho-map-vs-vector`, `desempenho-string-concat`), usamos entradas pequenas (1 linha) que excedem 2 s em `code` e rodam abaixo de 0,5 s em `fixed` com `g++ -std=c++20 -O2` (corte em 5 s); em `stl-non-strict-cmp`, usamos `std::set` com comparador `<=` para produzir WA determinístico sem depender de leitura fora dos limites da heap.
- 2026-11-26 — Ampliação de *Files owned*: incluídos `src/ui/maratona/LineChoicePicker.tsx`, `src/ui/CompileScreen.tsx` (extração dos seletores sem mudar comportamento nem testes da T40), `src/ui/app.css`, `playwright.config.ts` (projeto `mobile`), arquivos de teste correspondentes (`src/storage/wa.test.ts`, `src/stats/event.test.ts`, `src/ui/WaScreen.test.tsx`, `src/ui/shell/sections.test.ts`) e `docs/decisions/ADR-T41-1 Caça ao WA com oráculo de juiz e seletores compartilhados.md`.
- 2026-11-26 — Correção de teste (`d8ab6e5`): em `src/ui/WaScreen.test.tsx`, removida a opção `exact: true` (exclusiva do Playwright) das consultas `getByRole` do Testing Library, que já exigem correspondência exata em strings e falhavam no `tsc --noEmit`.
- 2026-11-26 — Verificação visual (6 capturas em desktop 1280x800 e celular 390x844 nos estados inicial, revisão pós-resposta e resultado): corrigido o contraste de `<kbd>Enter</kbd>` no botão `Próximo` da revisão e usado espaço não separável em `formatSec` para evitar quebra entre número e `s` no celular; capturas refeitas e conferidas.
- 2026-11-26 — Gates: `npm run wa:oracle` (`wa oracle: 32/32 cases ok (200 random brute-force tests each)` contra `g++ 16.2.1 -std=c++20 -O2`: 26 WA, 4 TLE com `code` entre 2,78 s e 5,00 s contra `fixed` entre 3 ms e 141 ms, e 2 RTE `SIGSEGV`); `npm run check` verde (214 arquivos, 4554 testes, `tsc`, `eslint`, `prettier`, `vite build`); `npm run coverage` verde com limiar adicionado para `src/wa/**` (`All files`: 99,73% stmts / 98,17% branches / 100% funcs / 99,86% lines; `src/wa`: 100% / 96,20% / 100% / 100%; `src/wa/cases`: 100%; `src/storage/wa.ts`: 100%; `src/ui/maratona/LineChoicePicker.tsx`: 100%; `src/ui/WaScreen.tsx`: 100% / 96,19% / 100% / 100%); `npm run test:e2e` verde (`61 passed`, incluindo `wa.spec.ts`, `compile.spec.ts` e `coherence.spec.ts` em desktop e mobile).
- 2026-11-26 — Checagens manuais para o dono: ler uma amostra dos 32 casos para avaliar o realismo dos enunciados e explicações.
