---
id: T30
title: Digitação - pontos fracos
status: done
depends_on: [T29]
branch: task/T30-typing-weak-points
adrs:
  - "[[ADR-T30-1 Seleção, geração e formatura nos pontos fracos de digitação]]"
tags: [task]
---

# T30 Digitação - pontos fracos

## Goal

Um item **Pontos fracos** na pasta Digitação. Ele pega os pares e trios
de caracteres mais lentos e os caracteres com mais erro do registro
(T22, T23) e gera texto e código que os contêm. Cada n-grama é repetido
até chegar ao ritmo-alvo (T29) e então dá lugar ao próximo. Isso fecha o
ciclo medir → treinar, que o método 11 de [[Métricas e evolução]] já
previa. Ideia D2 de [[Datilografia para programação]].

## Base em pesquisa

- Os pares com alternância de mão ou de dedo predizem a velocidade
  (Dhakal et al., 2018).
- Os pares frequentes em código só melhoram com prática em código
  (Edwards, Leinonen et al., 2020).

## Spec

- **AC-1**: **Seleção** em `src/stats/weak.ts`, pura:
  - a partir dos eventos `typing.code`, `typing.text` e `typing.weak`
    dos últimos 14 dias, escolhe os 4 n-gramas mais lentos (bigramas e
    trigramas com pelo menos `MIN_BIGRAM_COUNT` ocorrências, pela
    mediana do intervalo) e os 2 caracteres com mais erro;
  - empates se resolvem de forma estável;
  - n-gramas com espaço ou quebra de linha ficam de fora.
  - Testes: `src/stats/weak.test.ts` ("picks the 4 slowest n-grams with enough samples", "ignores n-grams with whitespace", "uses only the last 14 days"), `src/stats/weak.prop.test.ts` (a seleção não depende da ordem dos eventos).
- **AC-2**: **Gerador** em `src/typing/weak-text.ts`:
  - para um n-grama de letras, sorteia palavras da lista inglesa (T12)
    e de uma lista nova de identificadores e palavras-chave de código
    (`src/typing/code-words.ts`) que o contêm;
  - para um n-grama com símbolo (`);`, `->`, `[i`, `+=`), monta
    fragmentos de código curtos que o contêm;
  - cada linha gerada contém o n-grama pelo menos 2 vezes, e a mesma
    seed gera o mesmo texto.
  - Testes: `src/typing/weak-text.test.ts` (palavras em inglês/código para letras, fragmentos curtos para símbolos, mínimo de 2 ocorrências por linha e determinismo), `src/typing/weak-text.prop.test.ts` (para muitas seeds e n-gramas: o texto contém o n-grama na frequência mínima, só tem ASCII imprimível e é determinístico), `src/typing/code-words.test.ts` (lista única, sem espaço).
- **AC-3**: **Rodada:**
  - blocos de 30 s, cada um focado num n-grama;
  - o n-grama **se forma** quando a mediana do intervalo nele, no bloco,
    fica abaixo do intervalo do ritmo-alvo (`60000 / (5 × alvo)` ms) com
    ≥ 95% de acerto;
  - aí ele sai da lista e entra o próximo da seleção;
  - a rodada termina depois de 5 blocos.
  - Testes: `src/typing/weak-round.test.ts` ("an n-gram graduates under the target interval at 95% accuracy", "the next selected n-gram replaces a graduated one", "the round ends after 5 blocks").
- **AC-4**: **Tela** (`src/ui/WeakTypingScreen.tsx`):
  - reaproveita o motor e a aparência do Texto, com o cursor fantasma
    da T29;
  - o n-grama em foco fica destacado no texto;
  - o resultado mostra, por n-grama, o intervalo antes (o histórico) e
    depois (a rodada);
  - sem dados suficientes, a tela explica e oferece o Texto;
  - fica fora do celular, como o Código.
  - Testes: `src/ui/WeakTypingScreen.test.tsx` ("highlights the focused n-gram", "result shows before and after per n-gram", "no data shows the explanation and a link to Texto").
- **AC-5**: **Registro e árvore:**
  - os eventos têm drill `typing.weak` e KC `typing.ngram.<n-grama>`, e
    entram nas mesmas estatísticas de pares da Evolução;
  - o item "Pontos fracos" entra na pasta Digitação, depois de "Texto";
  - os atalhos 1–9 não mudam.
  - Testes: `src/stats/event.test.ts`, `src/stats/typing-stats.test.ts`, `src/stats/progress.test.ts`, `src/ui/shell/sections.test.ts`, `tests/e2e/typing.spec.ts` (uma rodada com histórico semeado).

## Out of scope

- Métricas de keydown/keyup e *rollover* (D7, adiada).
- Recomendar a rodada no Treino do dia (T33).

## Files owned

- `src/stats/weak.ts`, `src/typing/weak-text.ts`, `src/typing/weak-round.ts`, `src/typing/code-words.ts` (novos) e os testes
- `src/stats/event.ts`, `src/stats/typing-stats.ts`, `src/stats/progress.ts`
- `src/ui/WeakTypingScreen.tsx` (novo), `src/ui/App.tsx`, `src/ui/shell/sections.ts`, `src/ui/app.css`
- `tests/e2e/typing.spec.ts`

## Subtasks (one commit each)

- [x] spec: ADR-T30-1 (seleção, formatura do n-grama, drill novo) e testes nomeados
- [x] tests
- [x] models
- [x] behaviour
- [x] quality: `npm run check`, coverage, e2e e screenshot
- [x] docs: *Log* e status `review`

## Log

- 2026-11-22 — Spec e ADR-T30-1 registrados com todos os testes nomeados (incluindo `src/typing/weak-text.test.ts`, `src/stats/typing-stats.test.ts` e `src/stats/progress.test.ts`). Nenhum arquivo fora de *Files owned* foi modificado.
- 2026-11-22 — UNATTENDED CHOICE:
  - Em `src/stats/weak.ts`, trigramas usam a média dos dois intervalos internos `(ms1 + ms2) / 2` para ficar na mesma escala de ms por caractere que bigramas e `targetIntervalMs(targetWpm)`, e caracteres de erro usam o intervalo de chegada `iv[offset + k - 1]` quando presente.
  - Em `src/typing/weak-text.ts`, cada linha gera 6 tokens (4 contendo o n-grama em foco e 2 de contexto, embaralhados com a seed da linha), com composição de reserva em ASCII imprimível para n-gramas raros ausentes nas listas.
  - Em `src/typing/weak-round.ts`, a rodada termina após 5 blocos ou antes se todos os alvos da fila se formarem; o ritmo-alvo inicial da rodada herda a mediana dos alvos salvos em `popis.typing-pace` (ou do histórico recente de Texto/Código, padrão 30 WPM).
  - Em `src/stats/progress.ts`, eventos `typing.weak` de n-gramas com símbolo entram nas estatísticas de pares de Código e os demais nas de Texto, evitando duplicação entre seções.
  - Em `src/ui/WeakTypingScreen.tsx`, o destaque do n-grama em foco usa `--selection` e `--selection-text` (sem cor nova e sem `border-radius`, respeitando a estética de terminal da ADR-T18-1).
- 2026-11-22 — Gates verdes:
  - `npm run check`: `tsc --noEmit`, `eslint . --max-warnings 0`, `prettier --check .`, `vitest run` (136 arquivos / 4078 testes) e `vite build` verdes.
  - `npm run coverage`: 136 arquivos / 4078 testes passaram; 99,97% statements, 99,24% branches, 100% functions, 99,98% lines. Todos os arquivos novos (`src/stats/weak.ts`, `src/typing/code-words.ts`, `src/typing/weak-text.ts`, `src/typing/weak-round.ts`, `src/ui/WeakTypingScreen.tsx`) e alterados estão em 100/100/100/100. Nenhum limiar de pasta subiu para inteiro acima do atual em `vite.config.ts`.
  - `npm run test:fuzz`: 27 arquivos / 190 testes passaram com `FC_NUM_RUNS=20000`.
  - `npm run test:e2e`: 32/32 testes passaram (desktop Chromium + mobile Pixel 7), incluindo o fluxo completo de Pontos fracos com histórico semeado.
  - Verificação visual (`.batch/visual/t30-weak.spec.ts` via `.batch/visual/t30-playwright.config.ts`): 4 capturas abertas e inspecionadas (`desktop-t30-weak-empty.png`, `desktop-t30-weak-active.png`, `desktop-t30-weak-result.png`, `phone-t30-phone-menu.png`). Destaque do n-grama em foco, cursor real e cursor fantasma legíveis sem deslocar o texto; contraste do chip ativo ajustado; tabela de antes/depois alinhada; item ausente no menu do celular e atalhos 1–9 inalterados.
- 2026-11-22 — Verificações manuais pendentes para o dono: usar Pontos fracos após alguns dias de uso real e conferir se os n-gramas escolhidos correspondem aos que parecem mais lentos na prática.
