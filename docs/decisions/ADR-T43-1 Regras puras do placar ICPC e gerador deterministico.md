---
id: ADR-T43-1
title: Regras puras do placar ICPC e gerador determinístico
status: accepted
kind: decision
date: 2026-11-26
task: T43
builds_on: [ADR-0001, ADR-T19-1, ADR-T22-1, ADR-T40-1, ADR-T42-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T43-1 Regras puras do placar ICPC e gerador determinístico

## Context

O treino **Placar** (T43) exercita a leitura rápida de placares do ICPC e da
Maratona SBC sob pressão de tempo: cálculo de penalidade, efeito de uma nova
submissão na classificação, minuto limite para ultrapassar outro time e escolha
do problema com maior taxa de acerto.

Fora de `src/ui/`, toda lógica precisa ser TypeScript puro e determinístico.
Além disso, o motor de regras precisa garantir invariantes algébricas fortes
(permutação dos times, monotonicidade ao adicionar um AC e independência da
ordem do log de submissões) mesmo quando o log contém apenas
`{ team, problem, minute, verdict }` sem segundos nem IDs, e a tela precisa
desenhar balões estilo BOCA/DOMjudge usando apenas os tokens de cor existentes
em `src/ui/theme.css` (ADR-0001).

## Decision

1. **Motor puro de placar (`src/icpc/score.ts`).**
   `computeScoreboard(submissions, options)` aceita submissões
   `{ team, problem, minute, verdict }` com vereditos
   `"AC" | "WA" | "TLE" | "MLE" | "RTE" | "PE" | "CE"` e opções
   `{ compileErrorCounts?: boolean; penaltyPerReject?: number; teams?: readonly string[]; problems?: readonly string[] }`.
   - Para cada par `(team, problem)`, `acMinute` é o menor `minute` entre as
     submissões `"AC"` (ou `null` se não resolvido). Rejeições em problemas não
     resolvidos não somam penalidade; submissões após o primeiro AC
     (`minute > acMinute`) são ignoradas.
   - Sem segundos nem IDs no log, para manter independência total da ordem de
     entrada, rejeições com `minute <= acMinute` contam como anteriores ao
     primeiro AC (como ocorre na prova quando um WA e o AC caem no mesmo minuto
     inteiro).
   - Por padrão (`compileErrorCounts = false`, regra das World Finals / DOMjudge
     / BOCA), `"CE"` não conta penalidade nem tentativa penalizada; com
     `compileErrorCounts = true`, `"CE"` conta como rejeição penalizada.
   - Penalidade por problema resolvido: `acMinute + penaltyPerReject * rejected`
     (padrão `penaltyPerReject = 20`).
   - Ordenação: `solved` decrescente, `penalty` crescente, `lastAcMinute`
     crescente (máximo de `acMinute` entre os problemas resolvidos; `null` para
     0 resolvidos). Empates exatos nos três critérios recebem o mesmo `rank` de
     competição (`1, 1, 3`) e são ordenados de forma determinística por nome do
     time (ordem lexicográfica por código UTF-16).

2. **Gerador determinístico (`src/icpc/drill.ts`) e verificador (`src/icpc/check.ts`).**
   Quatro tipos de questão com KC `icpc.<tipo>`:
   - `penalidade`: linha e histórico de submissões de um time (com armadilhas
     reais de CE, rejeições após o AC e problemas não resolvidos) para responder
     a penalidade total.
   - `posicao`: placar pequeno (4–6 times) e uma nova submissão, garantindo
     posição final única (sem empate exato nos três critérios), para responder a
     nova classificação.
   - `ultrapassar`: placar no `currentMinute` e problema alvo `P` (que pode já
     ter rejeições anteriores), para responder o maior minuto `m` em
     `currentMinute..300` em que um AC (sem novos erros) coloca o time
     estritamente à frente do rival — verificado pelo próprio `computeScoreboard`
     em `m` (passa) e `m + 1` (não passa), incluindo o desempate por último AC.
   - `escolher`: contagens `(ac, attempts)` por problema (`A`..`H`) com máximo
     único verificado por multiplicação cruzada exata (`ac * other.attempts > other.ac * attempts`)
     e margem clara entre o 1º e o 2º colocados, para responder a letra do
     problema de maior taxa de acerto.
   Todos os minutos gerados ficam em `0..300` e toda geração depende apenas de
   `(seed, index, options)` via `deriveSeed` e `createRng`.
   `checkIcpcAnswer` aceita formas equivalentes (espaços, sufixo `min` opcional
   em `penalidade`/`ultrapassar`, ordinal `2º`/`2o`/`#2` em `posicao`, letra
   maiúscula ou minúscula em `escolher`) e rejeita quase-acertos.

3. **Rodada de 90 s, persistência e eventos (`src/icpc/round.ts`, `src/storage/icpc.ts`, `src/stats/event.ts`).**
   Rodadas cronometradas de `60 | 90 | 120` s (padrão `90` s), com filtro de
   tipo (`all` ou um dos quatro) e opção `CE conta penalidade` persistidos em
   `popis.icpc` e histórico em `popis.icpc-results`. Ao encerrar, grava eventos
   T22 com `drill: "icpc.score"` e `kc: "icpc.<tipo>"`.

4. **Tela BOCA/DOMjudge e pasta Maratona (`src/ui/IcpcScreen.tsx`, `src/ui/shell/sections.ts`, `src/ui/app.css`).**
   O item `Placar` (`id: "icpc"`, `touch: true`, `shortcut: null`) entra na
   pasta `Maratona` logo após `STL`, preservando os atalhos `1–9`. Os balões
   SVG usam exclusivamente os tokens existentes em `src/ui/theme.css`
   (`--accent`, `--correct`, `--warning`, `--wrong`, `--selection-text`,
   `--text`, `--muted`, `--selection`), mapeados por letra do problema sem
   nenhum literal de cor novo. A tabela do placar fica em contêiner com rolagem
   horizontal interna para manter zero scroll horizontal da página no celular,
   reutilizando os componentes da T19 (`PanelTitle`, `RoundBar`, `Result`,
   `RoundHistory`, `Reference`).

## Alternatives considered

- **Criar novos tokens de cor para balões (magenta/ciano da paleta base)** —
  o plano da batch fixa usar apenas tokens existentes em `src/ui/theme.css`; os
  8 tokens já existentes distinguem de A até H sem alterar o tema.
- **Usar índice do array para desempatar submissões no mesmo minuto** —
  quebraria a propriedade exigida em AC-1 de que o placar não depende da ordem
  do log.
- **Comparar taxas de `escolher` em ponto flutuante** — pode confundir frações
  equivalentes por arredondamento; multiplicação cruzada inteira é exata.

## Consequences

- O motor `src/icpc/score.ts` serve tanto como biblioteca pura quanto como
  oráculo interno do gerador, eliminando divergências entre regras e questões.
- Mudanças nas regras (ex.: penalidade de CE) refletem imediatamente tanto no
  motor quanto na tela.
- `src/icpc/**` recebe limiar próprio de cobertura em `vite.config.ts` e
  `tests/e2e/icpc.spec.ts` entra no projeto `mobile` de `playwright.config.ts`.

## Rollback plan

Remover `src/icpc/`, `src/storage/icpc.ts`, `src/ui/IcpcScreen.tsx`,
`src/ui/IcpcScreen.test.tsx`, `tests/e2e/icpc.spec.ts`, o item `icpc` de
`src/ui/shell/sections.ts`, `"icpc.score"` de `src/stats/event.ts`, os estilos
`.icpc-*` de `src/ui/app.css` e as entradas correspondentes em
`playwright.config.ts` e `vite.config.ts`; registrar um ADR `kind: rollback`
revertendo `ADR-T43-1`.
