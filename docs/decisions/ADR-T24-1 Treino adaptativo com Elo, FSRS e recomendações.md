---
id: ADR-T24-1
title: Treino adaptativo com Elo, FSRS e recomendações
status: accepted
kind: decision
date: 2026-11-21
task: T24
builds_on:
  - "[[ADR-0001 Kanagawa Dragon theme]]"
  - "[[ADR-0002 Static web app in Vite, TypeScript and React]]"
  - "[[ADR-T18-1 Janela de editor com menu recolhível]]"
  - "[[ADR-T22-1 Registro por item, retenção e exportação]]"
  - "[[ADR-T23-1 Painel de evolução com estatística pura e SVG próprio]]"
amends:
  - "[[ADR-T06-1 Review replays the original problems]]"
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T24-1 Treino adaptativo com Elo, FSRS e recomendações

## Context

Com o registro por item (T22) e o painel de evolução (T23), o app já mede
velocidade, precisão, platô, BIS e CV por componente de conhecimento (KC).
Faltava transformar essas medidas em decisões de treino: ajustar a
dificuldade perto da zona de aprendizado ótimo (~85%), agendar o Revisar
por repetição espaçada em vez de uma lista fixa por `SLOW_FACTOR`, montar
um "Treino do dia" e exibir recomendações honestas sem prometer ganhos
numéricos.

## Decision

1. **Elo por KC e por nível (`src/stats/elo.ts`):**
   - Cada KC tem uma nota da pessoa (`userRating`, inicial 1000) e cada
     nível de dificuldade de um gerador tem sua nota (`itemRating`,
     espaçadas inicialmente por nível).
   - Probabilidade esperada: `E = 1 / (1 + 10^((itemRating - userRating) / 400))`.
   - Uma tentativa conta como vitória (`1`) se `ok === true` e
     `timeMs <= targetTimeMs`, onde `targetTimeMs` é a mediana dos acertos
     daquele KC nas últimas 2 semanas (`14 * DAY_MS`, ou `null` sem acertos
     prévios, caso em que o primeiro acerto conta como vitória).
   - Fator `K` decrescente conforme Pelánek (2016):
     `K(n) = 64 / (1 + 0.05 * n)`. A atualização usa o mesmo `K` para a
     pessoa (`+delta`) e para o item (`-delta`), garantindo soma zero das
     variações (`Δpessoa + Δitem = 0`).
2. **Dificuldade automática e meta de 85% (`src/stats/elo.ts`, `src/storage/adaptive.ts`):**
   - Opção "Nível automático" (desligada por padrão) nos quatro treinos com
     níveis/faixas: Movimento do Vim (níveis 1–7), Aritmética (5 faixas
     progressivas), Estimativa (3 níveis progressivos de tipos) e
     Somatórios (2 níveis: somatório → somatório + laços).
   - A meta de acerto é 85% por padrão (Wilson et al., 2019), ajustável
     pela pessoa entre 70% e 95% (em passos de 5%).
   - Entre rodadas, `chooseNextLevel` avalia apenas `{nível - 1, nível,
     nível + 1}` dentro dos limites do treino e escolhe o nível cuja
     probabilidade prevista `E` fica mais próxima da meta — subindo ou
     descendo no máximo 1 nível por rodada.
3. **Revisar com FSRS-4.5 (`src/stats/fsrs.ts`, `src/storage/review.ts`), emendando ADR-T06-1:**
   - Implementação própria do **FSRS-4.5** (sem dependências externas),
     usando a função de recuperabilidade de `docs/architecture/Métricas e evolução.md`:
     `R(t, S) = (1 + (19/81) · t / S)^(-0,5)`, retenção desejada padrão
     `0,9` e os 17 parâmetros padrão publicados do FSRS-4.5:
     `[0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755]`.
   - Fontes de referência:
     - <https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm>
     - <https://borretti.me/article/implementing-fsrs-in-100-lines>
     - <https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-45>
   - Cada problema errado/pulado, corrigido ou lento vira um cartão em
     `popis.review-cards.v1` com `{ stability, difficulty, dueAt, lastReviewAt, reps, lapses }`.
     A nota 1–4 sai automaticamente do resultado:
     `1` errou/pulou, `2` acertou devagar (`corrections > 0` ou
     `timeMs > 1,5 × mediana`), `3` acertou no tempo normal, `4` acertou
     abaixo da mediana do KC.
   - Emenda a ADR-T06-1: o agendamento FSRS substitui a seleção fixa por
     `SLOW_FACTOR` da T06; `reviewItems(history)` é mantida para migrar
     automaticamente os itens existentes no histórico para cartões FSRS
     novos (`dueAt = now`) sem perda de compatibilidade.
   - A contagem do Revisar na árvore mostra apenas os cartões **vencidos**
     (`dueAt <= now`), somando cartões de cálculo e cartões de comandos do
     Vim que falharam (ex.: ``chegar ao `(` com 2 teclas``).
4. **Treino do dia e experimento semanal (`src/stats/recommend.ts`, `src/ui/DailyScreen.tsx`):**
   - O item `"Treino do dia"` (`id: "daily"`) fica no topo da árvore, na
     pasta `"Hoje"`, sem consumir os atalhos numéricos `1`–`9` dos itens
     seguintes (preservando a memória muscular de T18).
   - Monta uma sessão guiada de 5–10 min combinando os cartões vencidos do
     Revisar e os 3 KCs de menor BIS no nível indicado pelo Elo, exibindo o
     motivo de cada bloco (ex.: `` `f` está irregular: CV 0,6 ``).
   - A pessoa pode alternar o modo da semana entre `"Intercalado"` e
     `"Em bloco"`; as sessões concluídas ficam em `popis.adaptive.v1`
     (incluído em `src/storage/backup.ts` junto com `popis.review-cards.v1`)
     e o painel Evolução compara o ganho de cada modo.
5. **Recomendações honestas (`src/stats/recommend.ts`, `src/ui/Recommendations.tsx`):**
   - Quatro regras testadas em tabela: platô há ≥ 2 semanas, precisão > 97%
     com CV estável (≤ 0,35), precisão < 70% (sugere descer nível ou prévia
     no Vim) e KC sem melhora após 20 oportunidades (sugere lição do
     Aprender no Vim ou treino focado no KC).
   - Todo texto usa formulação honesta ("deve ajudar") e nunca promete
     ganho percentual.

## Alternatives considered

- **Usar biblioteca `ts-fsrs`** — adicionaria dependência externa; o
  algoritmo FSRS-4.5 cabe em ~90 linhas de TypeScript puro e fica 100%
  coberto por testes de referência e propriedade.
- **Usar `K` diferente para usuário e item no Elo** — quebraria a
  invariante de soma zero das variações exigida pelo spec (AC-1).
- **Deslocar os atalhos `1`–`9` ao colocar "Treino do dia" no topo** —
  quebraria os atalhos existentes e os testes da janela (T18).

## Consequences

- Toda a lógica adaptativa (Elo, FSRS, recomendações, plano do dia e
  experimento) permanece pura em `src/stats/` e `src/storage/`, sem DOM nem
  relógio global.
- Cartões FSRS e preferências adaptativas entram no backup/importação da
  T22 (`src/storage/backup.ts`).
- Os parâmetros do FSRS-4.5 ficam centralizados como constantes e poderão
  ser otimizados futuramente sem alterar o formato dos cartões.

## Rollback plan

Remover `src/stats/{elo,fsrs,recommend}.ts`, `src/storage/adaptive.ts`,
`src/ui/{DailyScreen,Recommendations}.tsx`, reverter as extensões em
`src/storage/{review,backup}.ts`, `src/ui/shell/sections.ts`, `App.tsx`,
`ConfigScreen.tsx`, `VimScreen.tsx` e `ProgressScreen.tsx`, e registrar um
ADR de rollback.
