---
id: T43
title: Placar e penalidade do ICPC
status: done
depends_on: []
branch: task/T43-icpc-scoreboard
adrs: [ADR-T43-1]
tags: [task]
---

# T43 Placar e penalidade do ICPC

## Goal

Um item **Placar** na pasta Maratona, com questões geradas sobre as
regras de pontuação do ICPC e da Maratona SBC: quantos problemas e
quanta penalidade um time tem (minuto do AC + 20 por submissão rejeitada
antes dele, e as rejeições depois do AC ou em problema não resolvido não
contam); quem fica na frente; quanto tempo sobra para passar outro time;
e qual problema atacar olhando quantos times já resolveram cada um. Na
prova, ler o placar rápido ajuda a escolher o próximo problema.

## Spec

- **AC-1**: **Regras puras** `src/icpc/score.ts`: dado um log de
  submissões (`{ team, problem, minute, verdict }`), calcula o placar
  ordenado por problemas (decrescente), penalidade (crescente) e minuto
  do último AC (crescente). Erro de compilação não conta penalidade
  (regra da WF), e isso é configurável.
  - Testes: `src/icpc/score.test.ts` (tabela de casos: rejeição depois do AC, CE, empate desfeito pelo último AC), `src/icpc/score.prop.test.ts` (o placar é uma permutação dos times; adicionar um AC nunca piora a posição de quem o recebe; a ordem não depende da ordem do log).
- **AC-2**: **Gerador** `src/icpc/drill.ts` com os tipos (KC
  `icpc.<tipo>`):
  - `penalidade`: a linha de um time, para responder a penalidade total;
  - `posicao`: um placar pequeno com uma submissão nova, para responder
    a nova posição;
  - `ultrapassar`: o placar e o minuto atual, para responder até que
    minuto o time precisa de um AC para passar o outro;
  - `escolher`: as contagens de AC e de tentativas por problema, para
    responder qual problema tem a maior taxa de acerto.
  - Testes: `src/icpc/drill.prop.test.ts` (a resposta canônica é aceita; os minutos ficam em 0..300; a resposta é única; a mesma seed gera o mesmo item), `src/icpc/check.test.ts` (tabela de formas equivalentes aceitas e quase-acertos rejeitados).
- **AC-3**: **Tela** `src/ui/IcpcScreen.tsx`, com o placar desenhado como
  no BOCA e no DOMjudge (balões nas cores de token existentes),
  resposta numérica ou letra do problema, rodada de 90 s e eventos com
  drill `icpc.score`. Entra na pasta Maratona logo após `STL` como item
  `Placar` (`id: "icpc"`), sem alterar os atalhos 1–9.
  - Testes: `src/icpc/round.test.ts`, `src/storage/icpc.test.ts`, `src/stats/event.test.ts`, `src/ui/IcpcScreen.test.tsx`, `src/ui/shell/sections.test.ts`, `tests/e2e/icpc.spec.ts`.

## Out of scope

- Placar congelado e o resolver.
- Placar ao vivo de contests reais.

## Files owned

- `src/icpc/` (novo), `src/storage/icpc.ts`, `src/storage/icpc.test.ts`, `src/stats/event.ts`, `src/stats/event.test.ts`
- `src/ui/IcpcScreen.tsx`, `src/ui/IcpcScreen.test.tsx`, `src/ui/App.tsx`, `src/ui/shell/sections.ts`, `src/ui/shell/sections.test.ts`, `src/ui/app.css`
- `tests/e2e/icpc.spec.ts`, `playwright.config.ts` (projeto mobile para `icpc.spec.ts`), `vite.config.ts` (limiar de cobertura de `src/icpc/**`)

## Subtasks (one commit each)

- [x] spec
- [x] tests
- [x] models
- [x] behaviour
- [x] quality
- [x] docs

## Log

- 2026-11-26 — Spec e `ADR-T43-1` escritos. *Files owned* ampliado minimamente para testes e configurações de gate correspondentes (`src/storage/icpc.test.ts`, `src/stats/event.test.ts`, `src/ui/IcpcScreen.test.tsx`, `src/ui/shell/sections.test.ts`, `playwright.config.ts`, `vite.config.ts`).
- 2026-11-26 — Implementado o item **Placar** na pasta **Maratona** logo após **STL** (`Ler o erro → STL → Placar`, visível no celular, atalhos 1–9 inalterados):
  - `src/icpc/score.ts`: motor puro `computeScoreboard` e `compareStandings` com penalidade `acMinute + 20 * rejected` (configurável), rejeições após o 1º AC e em problemas não resolvidos ignoradas, `CE` sem penalidade por padrão (regra WF) com flag `compileErrorCounts`, ordenação por `solved` desc, `penalty` asc e `lastAcMinute` asc, e rank de competição compartilhado (`1, 1, 3`) com desempate estável por nome.
  - `src/icpc/drill.ts` e `src/icpc/check.ts`: gerador determinístico para os quatro tipos (`icpc.penalidade`, `icpc.posicao`, `icpc.ultrapassar`, `icpc.escolher`), com minutos sempre em `0..300`, resposta única garantida (`posicao` sem empate na classificação final; `ultrapassar` provado em `m` e `m + 1`; `escolher` com máximo estrito via multiplicação cruzada inteira) e verificador aceitando formas equivalentes (`min` opcional, `2º`/`2o`/`#2`, letra maiúscula/minúscula) e rejeitando quase-acertos.
  - `src/icpc/round.ts`, `src/storage/icpc.ts` e `src/stats/event.ts`: motor de rodada de `60 | 90 | 120` s (padrão `90` s), persistência em `popis.icpc` e `popis.icpc-results`, e registro de eventos T22 com `drill: "icpc.score"` e `kc: "icpc.<tipo>"`.
  - `src/ui/IcpcScreen.tsx` e `src/ui/app.css`: placar estilo BOCA/DOMjudge com balões SVG usando apenas tokens existentes de `src/ui/theme.css` (`--accent`, `--correct`, `--warning`, `--wrong`, `--selection-text`, `--text`, `--muted`, `--selection`), opção de duração, filtro de tipo e flag `CE conta penalidade`, teclado numérico/texto adaptativo (`inputMode`), atalhos uniformes e componentes da T19 (`PanelTitle`, `RoundBar`, `Result`, `RoundHistory`, `Reference`).
- 2026-11-26 — UNATTENDED CHOICE (`ADR-T43-1`): para garantir independência total da ordem do log sem segundos/IDs em `{ team, problem, minute, verdict }`, rejeições no mesmo minuto do primeiro AC (`minute <= acMinute`) contam como anteriores ao AC e `minute > acMinute` são ignoradas como posteriores; os balões de `A` a `H` mapeiam diretamente para os 8 tokens existentes de `src/ui/theme.css` sem criar cores novas.
- 2026-11-26 — **Verificação visual** (Playwright em desktop 1280×900 e celular 412×915 para os 4 tipos): encurtado o rótulo `"Escolher problema"` para `"Escolher"` (evitando truncamento no `<select>` no celular), ocultada a contagem pré-filtrada `tentativas/min` nas células da linha resumo de `penalidade` (mostrando balão + `AC` para não entregar o filtro de CE/pós-AC antes do cálculo), adicionado resumo do problema alvo abaixo da tabela em `ultrapassar` e compactada a tabela no mobile (ocultando balões dentro de `<td>` e mantendo-os nos cabeçalhos `<th>`).
- 2026-11-26 — **Gates verdes:**
  - `npm run check`: `tsc --noEmit`, `eslint . --max-warnings 0`, `prettier --check .`, `vitest run` (215 arquivos, 4608 testes passando) e `vite build` verdes.
  - `npm run coverage`: todos os limiares verdes; `src/icpc/**` em 99,29% statements, 95,90% branches, 100% functions e 100% lines (`score.ts` e `check.ts` em 100/100/100/100); `src/storage/icpc.ts` em 100/100/100/100; `src/ui/IcpcScreen.tsx` em 100% lines/statements/functions e 99,2% branches; novo limiar `src/icpc/**` (`100/99/100/95`) registrado em `vite.config.ts`.
  - `npm run test:e2e`: 61/61 passando (desktop + mobile), incluindo `tests/e2e/icpc.spec.ts` (zero scroll horizontal em ambos) e `tests/e2e/coherence.spec.ts`.
- 2026-11-26 — **Checagens manuais para o dono:** conferir a legibilidade do placar no celular (especialmente com 5 problemas) e revisar o painel de referência de regras.
