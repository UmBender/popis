---
id: ADR-T41-1
title: Caça ao WA com oráculo de juiz e seletores compartilhados
status: accepted
kind: decision
date: 2026-11-26
task: T41
builds_on: [ADR-0002, ADR-T18-1, ADR-T19-1, ADR-T22-1, ADR-T40-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T41-1 Caça ao WA com oráculo de juiz e seletores compartilhados

## Context

O item **Caça ao WA** (T41) apresenta um enunciado curto de programação competitiva, um exemplo de entrada/saída e uma solução C++ que compila e passa no exemplo, mas falha no juiz (WA, TLE ou RTE). Como o popis é uma aplicação web estática (ADR-0002), o navegador não compila nem executa C++, mas o app precisa garantir que cada caso realmente passa no exemplo, falha na `breaking_input` e tem a correção `fixed` equivalente ao enunciado.

Além disso, a interação principal — clicar ou navegar com setas + Enter numa linha de código numerada e escolher uma opção entre 4 botões com atalhos 1–4 — é a mesma da T40 (`CompileScreen.tsx`).

## Decision

1. **Casos em `src/wa/cases/` e saídas gravadas pelo oráculo (`scripts/wa-oracle.mjs`):** são pelo menos 32 casos (4 por classe em `overflow`, `limite`, `multitest`, `borda`, `precisao`, `desempenho`, `stl`, `leitura`). Cada caso define `{ id, class, title, statement, sample_input, code, fixed, line, breaking_input, expected_verdict, explanation }`. As flags do juiz são `g++ -std=c++20 -O2` (`WA_JUDGE_FLAGS`). O oráculo `npm run wa:oracle` (fora de `npm run check` por exigir `g++`) compila `code`, `fixed` e uma força bruta independente em `src/wa/cases/brute/<id>.cpp`, e confere que:
   - `code` e `fixed` produzem a mesma saída exata em `sample_input`;
   - em `breaking_input`, `code` diverge de `fixed` (WA), excede 2 s enquanto `fixed` roda em menos de 0,5 s com limite de morte de 5 s (TLE), ou termina com sinal do sistema operacional (RTE);
   - `fixed` coincide com a força bruta em 200 entradas aleatórias pequenas geradas determinísticamente.
   Com `--write`, o oráculo grava `sample_output`, `wrong_output`, `expected_output` e `verdict` em `src/wa/cases/outputs.ts`. Os arquivos `.cpp` em `src/wa/cases/brute/` só são lidos pelo oráculo e não entram no pacote web.
2. **Diff localizado e cálculo puro (`src/wa/diff.ts`):** uma função pura de diff linha a linha (`diffCode`, `changedHunks`, `diffSnippet`) serve tanto aos testes de invariante de AC-1 (garantindo que `fixed` difere de `code` em um único bloco contíguo junto à linha do bug) quanto à exibição do diff da correção na tela.
3. **Extração dos seletores da T40 (`src/ui/maratona/LineChoicePicker.tsx`):** os componentes `CodeLinePicker` (código numerado clicável e navegável por setas + Enter) e `ChoiceGrid` (grade de 4 botões com atalhos `1`–`4`) são extraídos de `src/ui/CompileScreen.tsx` preservando integralmente o DOM, os atributos e o comportamento da T40 (sem alterar nenhum teste da T40), e reutilizados por `src/ui/WaScreen.tsx`.
4. **Rodada sem limite de tempo (5 casos), revisão pós-resposta e eventos T22:** `src/wa/drill.ts` sorteia casos sem repetição por ciclo completo com filtro por classe e 4 opções de classe (a certa e 3 distratores distintos dentre as demais 7 classes). `src/wa/round.ts` controla rodadas de 5 casos com cronômetro progressivo visível (`elapsedMs`); após cada resposta (certa ou errada), a tela entra em revisão mostrando o contraexemplo (`breaking_input`), a saída errada contra a certa, o diff da correção e a explicação antes de avançar (`Próximo` / `Enter`). Cada caso concluído ou pulado emite um `TrainingEvent` com `drill: "wa.hunt"` e `kc: "wa.<classe>"`.
5. **Árvore e persistência:** o item `Caça ao WA` (`id: "wa-hunt"`, `touch: true`) entra na pasta `Maratona` logo após `Ler o erro` (antes de `STL`), mantendo intactos os atalhos 1–9. O filtro de classes persiste em `popis.wa` e o histórico de rodadas em `popis.wa-results` (`src/storage/wa.ts`).

## Alternatives considered

- **Manter os arquivos de força bruta como módulos `.ts` em `src/wa/cases/brute/`** — entrariam na coleta de cobertura de `vite.config.ts` (`src/**/*.{ts,tsx}`) e aumentariam o código TypeScript sem uso no app web; arquivos `.cpp` puros isolam a força bruta para o oráculo.
- **Avançar automaticamente ao acertar um caso** — impediria ver a entrada que quebra, a saída errada contra a certa e o diff da correção (exigidos em AC-4 ao responder).
- **Duplicar os seletores de linha e opções em `WaScreen.tsx`** — violaria AC-4 e divergiria visualmente da T40.

## Consequences

- Todos os 32 casos têm prova empírica contra `g++ 16.2 -std=c++20 -O2` e 200 testes de força bruta por caso via `npm run wa:oracle`.
- `CompileScreen.tsx` e `WaScreen.tsx` compartilham o mesmo seletor de linhas e grade de escolhas em desktop e celular.
- A verificação de `wa:oracle` inclui 4 casos de TLE (> 2 s cada) e compila 96 binários C++, levando cerca de 30–60 s quando executada.

## Rollback plan

Reverter os commits da branch `task/T41-wa-hunt`, restaurar os seletores inline em `src/ui/CompileScreen.tsx`, remover `"wa.hunt"` de `DRILLS`, remover `"wa-hunt"` de `SECTIONS` e `App.tsx`, remover `src/wa/`, `src/storage/wa.ts`, `src/ui/WaScreen.tsx`, `src/ui/maratona/LineChoicePicker.tsx`, `scripts/wa-oracle.mjs`, `tests/e2e/wa.spec.ts` e registrar um ADR `kind: rollback` apontando para `ADR-T41-1`.
