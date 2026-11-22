---
id: T29
title: Digitação - ritmo-alvo
status: review
depends_on: [T24]
branch: task/T29-typing-target-pace
adrs:
  - "[[ADR-T29-1 Ritmo-alvo adaptativo e cursor fantasma na digitação]]"
tags: [task]
---

# T29 Digitação - ritmo-alvo

## Goal

Um **cursor fantasma** anda na velocidade-alvo no Texto e no Código, e
o alvo se ajusta sozinho entre as rodadas pela regra dos 85% que o app
já usa (ADR-T24-1). A pessoa sempre tem um ritmo concreto para
perseguir, sem estacionar no ritmo confortável. Ideia D4 de
[[Datilografia para programação]].

## Base em pesquisa

- A regra dos 85% (Wilson et al., 2019), já adotada no nível
  automático da T24.
- "Precisão de 95% antes de acelerar" é uma regra de prática, sem
  estudo controlado (fonte 9 da proposta). Aqui ela é só um padrão
  ajustável.

## Spec

- **AC-1**: **Regra do alvo** em `src/typing/pace.ts`, pura:
  - uma unidade é uma palavra no Texto ou uma linha no Código, e ela
    está **no ritmo** se saiu certa e com velocidade ≥ alvo. No Código,
    a indentação automática não conta;
  - depois de cada rodada: se a fração no ritmo for ≥ meta + 5 pontos e
    a precisão for ≥ 95%, o alvo sobe 2 WPM; se a fração for
    ≤ meta − 5 pontos, ele desce 2 WPM; fora disso, fica;
  - a meta padrão é 85%, ajustável entre 70% e 95%;
  - o alvo inicial é a mediana do WPM das últimas 10 rodadas daquela
    configuração, ou 30 WPM sem histórico.
  - Testes: `src/typing/pace.test.ts` ("pace target rises 2 wpm when on-pace share is above goal and accuracy is at least 95%", "pace target stays when accuracy is below 95%", "pace target falls 2 wpm when on-pace share is below goal", "initial target is the median of the last 10 rounds"), `src/typing/pace.prop.test.ts` (numa simulação determinística de digitador com velocidade real fixa, a fração no ritmo converge para a meta ± 5 pontos em 70%, 85% e 95%; o alvo nunca passa de 1 passo por rodada).
- **AC-2**: **Cursor fantasma:**
  - parte na primeira tecla e avança `alvo × 5 / 60` caracteres por
    segundo (no Código, pula a indentação automática);
  - é desenhado como um segundo cursor, numa cor de token já existente;
  - liga e desliga numa opção "Ritmo-alvo", que vem ligada por padrão.
  - Testes: `src/typing/pace.test.ts` ("ghost position after t seconds skips auto-indent"), `src/ui/TypingScreen.test.tsx` e `src/ui/TextTypingScreen.test.tsx` ("ghost caret advances with the fake clock at the target pace", "ghost caret is hidden when Ritmo-alvo is off").
- **AC-3**: **Resultado:**
  - mostra a fração no ritmo (por exemplo, "87% das palavras no
    ritmo"), o alvo da rodada e o alvo da próxima, com uma seta;
  - o texto nunca promete resultado.
  - Testes: os mesmos arquivos de tela ("result shows on-pace share and the next target").
- **AC-4**: **Persistência:**
  - o alvo de cada configuração (texto, idioma e modo; ou linguagens
    do Código) e a meta ficam em `popis.typing-pace`;
  - os eventos da T22 ganham `extra.target` e `extra.onPace` em cada
    unidade;
  - um dado corrompido carrega como sem histórico.
  - Testes: `src/storage/typing-pace.test.ts` ("saves and loads pace settings and targets per config", "corrupt data loads as empty history with defaults", "resolves initial target from recent history or 30 WPM"), `src/stats/keytrace.test.ts` ("events carry target and onPace").

## Out of scope

- O ritmo-alvo nos treinos novos das T30–T32. Cada um usa `pace.ts` na
  sua própria task.
- Mudar o Elo ou o nível automático da T24.

## Files owned

- `src/typing/pace.ts` (novo) e os testes (`src/typing/pace.test.ts`, `src/typing/pace.prop.test.ts`)
- `src/storage/typing-pace.ts` (novo) e o teste (`src/storage/typing-pace.test.ts`)
- `src/stats/keytrace.ts` e `src/stats/keytrace.test.ts`
- `src/ui/TypingScreen.tsx`, `src/ui/TextTypingScreen.tsx`, `src/ui/app.css` e os testes de tela (`src/ui/TypingScreen.test.tsx`, `src/ui/TextTypingScreen.test.tsx`)
- `tests/e2e/typing.spec.ts` e `tests/e2e/text-typing.spec.ts` (fluxo do cursor fantasma e resultado no app real)

## Subtasks (one commit each)

- [x] spec: ADR-T29-1 (unidade no ritmo, passo de 2 WPM, trava de 95%) e testes nomeados
- [x] tests
- [x] models
- [x] behaviour
- [x] quality: `npm run check`, coverage, e2e e screenshot do cursor fantasma
- [x] docs: *Log* e status `review`

## Log

- 2026-11-21 — Spec e ADR-T29-1 registrados; `tests/e2e/typing.spec.ts` e
  `tests/e2e/text-typing.spec.ts` incluídos em *Files owned* para cobrir o
  cursor fantasma e o resultado de ritmo no app real.
- 2026-11-21 — UNATTENDED CHOICE: piso positivo `MIN_TARGET_WPM = 4` (mantém
  passos exatos de 0 ou 2 WPM sem nunca zerar o alvo); indicador `alvo` na
  `RoundBar` enquanto "Ritmo-alvo" está ligado; cursor fantasma em `--muted`
  (cedendo ao `--accent` do cursor real quando coincidem na mesma posição);
  chaves de configuração `text:<textConfigKey>` e `code:<linguagens ordenadas
  por +>`.
- 2026-11-21 — Gates verdes:
  - `npm run coverage`: 128 arquivos / 4049 testes passaram; 99,97% statements,
    99,21% branches, 100% functions, 99,98% lines (`src/typing/pace.ts`,
    `src/storage/typing-pace.ts`, `src/stats/keytrace.ts` e
    `src/ui/TextTypingScreen.tsx` em 100/100/100/100; `src/ui/TypingScreen.tsx`
    em 100/98,41/100/100). Nenhum limiar de pasta subiu para inteiro acima do
    atual em `vite.config.ts`.
  - `npm run test:fuzz`: 25 arquivos / 188 testes passaram com
    `FC_NUM_RUNS=20000`.
  - `npm run test:e2e`: 31/31 testes passaram (desktop Chromium + mobile Pixel 7).
  - Verificação visual (`.batch/visual/t29-pace.spec.ts`): 6 capturas abertas e
    inspecionadas (`desktop-t29-code-ghost.png`, `desktop-t29-code-result.png`,
    `desktop-t29-text-ghost.png`, `desktop-t29-text-result.png`,
    `phone-t29-text-ghost.png`, `phone-t29-text-result.png`). Cursor fantasma
    visível e distinto do cursor real sem deslocar o texto; opções e resultados
    cabem sem rolagem horizontal no desktop e no celular.
- 2026-11-21 — Verificações manuais pendentes para o dono: sentir se o cursor
  fantasma acompanha bem na sua velocidade real e se o alvo se ajusta de forma
  natural ao longo de algumas rodadas.
