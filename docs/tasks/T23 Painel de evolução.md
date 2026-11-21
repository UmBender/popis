---
id: T23
title: Painel de evolução
status: review
depends_on: [T19, T22]
branch: task/T23-progress-panel
adrs: ["[[ADR-T23-1 Painel de evolução com estatística pura e SVG próprio]]"]
tags: [task]
---

# T23 Painel de evolução

## Goal

Hoje a pessoa vê só "melhor" e "média dos últimos 10". Esta task mostra se
ela está melhorando, em quê, e onde parou de melhorar. Para isso usa os
métodos de [[Métricas e evolução]] (seções 1–5 e 11): curva de
aprendizado com platô, taxa semanal, curva por habilidade, velocidade
junto com precisão, regularidade e pares de letras lentos.

## Spec

- **AC-1**: **Estatística pura** em `src/stats/`, com testes de tabela e
  de propriedade:
  - **ajuste da lei da prática** `a − b·n^(−c)`, só com 8 rodadas ou mais.
    Testes: `src/stats/learning.test.ts` (`fitPowerLaw returns null with fewer than 8 rounds`, `fitPowerLaw recovers a and c within 10% on seeded noisy power-law data`), `src/stats/learning.prop.test.ts`;
  - **inclinação de Theil–Sen** das últimas 10 rodadas e **platô**
    (inclinação ≤ 0 com 10 rodadas). Testes: `src/stats/learning.test.ts` (`theilSenSlope ignores a single extreme outlier in the middle`, `detectPlateau flags non-positive slope over last 10 rounds and ignores an outlier`);
  - **taxa semanal**: inclinação por semana nas últimas 4 semanas. Testes: `src/stats/learning.test.ts` (`weeklyRate computes slope per week over the last 4 weeks`);
  - **curva por KC**: taxa de erro e mediana do tempo na 1ª, 2ª, …,
    20ª oportunidade. Testes: `src/stats/kc.test.ts` (`kcCurve computes error rate and median time per opportunity up to 20`), `src/stats/kc.prop.test.ts`;
  - **BIS** por KC sobre o histórico da própria pessoa (`z(taxa de acerto) − z(mediana do tempo)` conforme Liesefeld & Janczyk, 2019; menor BIS = KC mais fraco). Testes: `src/stats/kc.test.ts` (`kcStats orders weaker KCs first by BIS`);
  - **CV** dos tempos de acerto por KC, com pelo menos 10 acertos. Testes: `src/stats/kc.test.ts` (`kcStats computes CV only with at least 10 hits and labels stable vs irregular`);
  - **digitação:** mediana do intervalo por par de letras (pelo menos 5
    ocorrências) e erro por caractere. Testes: `src/stats/typing-stats.test.ts` (`slowestBigrams requires at least 5 occurrences and ranks by median`, `errorChars ranks characters by error rate and tags code symbols`).
- **AC-2**: **Item "Evolução" na árvore** (T18), com uma seção por
  treino:
  - a linha principal ("Aritmética 120 s: 38 → 46 acertos/min em 6
    semanas, +1,3 por semana");
  - o gráfico das rodadas (pontos), com a curva ajustada, o teto estimado
    e a meta opcional;
  - o selo **platô** quando for o caso, com a data de início;
  - uma tabela dos KCs ordenados pelo BIS (os mais fracos primeiro), com
    acertos/min, precisão, mediana do tempo, CV ("estável"/"irregular")
    e oportunidades;
  - na Digitação e no Texto, os 10 pares de letras mais lentos e os 10
    caracteres com mais erro.
  - Testes: `src/ui/shell/sections.test.ts`, `src/ui/progress/ProgressScreen.test.tsx`, `tests/e2e/progress.spec.ts`.
- **AC-3**: **Gráficos sem dependência nova:**
  - SVG desenhado em `src/ui/progress/ProgressChart.tsx` com as cores do
    tema (pontos em `--muted`, curva em `--accent`, meta em `--warning`);
  - cada gráfico tem uma tabela equivalente para leitor de tela
    (`<details>` `"Ver como tabela"`);
  - eixo do tempo em datas, não em número da rodada.
  - Testes: `src/ui/progress/ProgressChart.test.tsx`, `tests/colors.test.ts`.
- **AC-4**: **Comparação justa:** só entram na mesma curva rodadas com a
  mesma configuração (a chave de config que já existe em cada store).
  Rodadas com a prévia do ótimo (T21) aparecem com outro símbolo e ficam
  fora do ajuste. Mudar a configuração começa uma curva nova, e o painel
  mostra as configurações mais jogadas.
  - Testes: `src/stats/progress.test.ts` (`groupDrillConfigs separates configurations and ranks most played first`, `assisted rounds stay visible but are excluded from power-law fit and plateau`), `src/ui/progress/ProgressChart.test.tsx`.
- **AC-5**: **Painel do item:** o histórico de cada item da árvore (T18,
  AC-4) ganha a taxa semanal e o selo de platô, ligando para a seção
  dele em "Evolução".
  - Testes: `src/ui/progress/ProgressScreen.test.tsx` (`RoundHistory shows weekly rate, plateau badge and links to Evolução`).
- **AC-6**: **Meta:** a pessoa define uma meta por item (valor e data).
  O gráfico mostra a linha da base até a meta, como no CBM, e o painel
  diz se ela está acima ou abaixo da linha.
  - Testes: `src/storage/goals.test.ts`, `src/stats/learning.test.ts` (`evaluateGoal reports above or below the CBM goal line`), `src/ui/progress/ProgressScreen.test.tsx` (`user can set a goal and sees above/below status and goal line`), `tests/e2e/progress.spec.ts`.
- **AC-7**: **Celular:** os gráficos ocupam a largura toda, sem rolagem
  horizontal, e as tabelas viram listas rótulo/valor.
  - Testes: `tests/e2e/progress.spec.ts` (viewport estreito sem overflow horizontal), inspeção visual em `.batch/visual/`.

## Out of scope

- Escolher o próximo treino (T24).
- Comparar com outras pessoas ou com normas externas: as normas de
  matemática são fracas, e o app é local.

## Files owned

- `src/stats/**`
- `src/storage/goals.ts` e `src/storage/goals.test.ts` (persistência das metas da AC-6)
- `src/storage/backup.ts` (incluir `popis.goals.v1` no backup/exportação)
- `src/ui/progress/**` (novo)
- `src/ui/shell/sections.ts` e `src/ui/shell/sections.test.ts` (item "Evolução" na árvore)
- `src/ui/shell/History.tsx` (AC-5: taxa semanal, selo de platô e link para Evolução)
- `src/ui/App.tsx`, `src/ui/ConfigScreen.tsx`, `src/ui/TypingScreen.tsx`, `src/ui/TextTypingScreen.tsx`, `src/ui/VimScreen.tsx`, `src/ui/vim/EditDrill.tsx` (ligação com Evolução e dados de taxa/platô no histórico)
- `src/ui/app.css` (estilos do painel, SVG e responsivo em celular)
- `tests/e2e/progress.spec.ts`

## Subtasks

- [x] Spec e `ADR-T23-1`
- [x] Testes vermelhos para estatística pura (`learning`, `kc`, `typing-stats`, `progress`), armazenamento de metas e UI/E2E
- [x] Modelos e assinaturas em `src/stats/`, `src/storage/goals.ts` e `src/ui/progress/`
- [x] Implementação da estatística pura, persistência de metas, SVG próprio, painel Evolução e histórico dos itens
- [x] Qualidade (`npm run check`, `npm run coverage`, `npm run test:e2e`, `npm run test:fuzz`) e inspeção visual (desktop + phone)
- [x] Documentação e log final

## Notas para o batch

- **Visual:** capture o painel com dados simulados (gerador com seed e um
  ano de rodadas) e examine as capturas.

## Log

- 2026-11-21 — Spec e `ADR-T23-1` escritos. Arquivos adicionados a *Files owned* além dos listados no rascunho: `src/storage/goals.ts` e `src/storage/backup.ts` (persistência e backup de metas da AC-6), `src/ui/shell/sections.ts`, `src/ui/shell/History.tsx`, `src/ui/App.tsx`, `src/ui/ConfigScreen.tsx`, `src/ui/TypingScreen.tsx`, `src/ui/TextTypingScreen.tsx`, `src/ui/VimScreen.tsx`, `src/ui/vim/EditDrill.tsx` e `src/ui/app.css` (item da árvore, AC-5 e AC-7).
- 2026-11-21 — UNATTENDED CHOICE: `BIS = z(taxa de acerto) − z(mediana do tempo)` conforme Liesefeld & Janczyk (2019), de modo que menor BIS = KC mais fraco e a ordenação crescente coloca os mais fracos primeiro.
- 2026-11-21 — UNATTENDED CHOICE: item `"Evolução"` posicionado na pasta `Treino` após `"Dados"`, preservando os atalhos `1`–`9` existentes.
- 2026-11-21 — Inspeção visual (`.batch/visual/t23-progress.spec.ts`, 1 ano de dados simulados com PRNG com seed, desktop e celular): detectados e corrigidos (1) assíntota distante (`fit.a > 1,5 × max`) achatando o eixo Y em curvas quase lineares, agora omitida do eixo Y; (2) agrupamento de `<code>` + `(símbolo)` em tabelas no celular (`justify-content: space-between`). Capturas revalidadas em desktop e celular sem overflow horizontal.
- 2026-11-21 — Gates finais verdes: `npm run check` (`tsc`, `eslint`, `prettier`, `vitest run` 118 suites / 3972 testes, `vite build`), `npm run coverage` (100% em `src/stats/**`, `src/storage/**` e `src/ui/progress/**`; total 99,97% statements / 99,33% branches / 100% functions / 99,98% lines) e `npm run test:e2e` (29/29 passando em desktop e mobile).
- 2026-11-21 — Verificação manual restante para o dono: conferir os gráficos e metas com dados reais após alguns dias de uso.
