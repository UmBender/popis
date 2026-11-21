---
id: ADR-T23-1
title: Painel de evolução com estatística pura e SVG próprio
status: accepted
kind: decision
date: 2026-11-21
task: T23
builds_on: ["[[ADR-0001 Kanagawa Dragon theme]]", "[[ADR-T18-1 Janela de editor com menu recolhível]]", "[[ADR-T21-1 Prévia do ótimo, retirada automática e pausa para lição]]", "[[ADR-T22-1 Registro por item, retenção e exportação]]"]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T23-1 Painel de evolução com estatística pura e SVG próprio

## Context

A tarefa T23 adiciona o painel **Evolução** com curvas de aprendizado
(`a − b·n^(−c)`), detecção de platô (Theil–Sen), taxa semanal (CBM),
curva por componente de conhecimento (KC), BIS, CV, estatísticas de
digitação (pares de letras e erros por caractere) e metas pessoais por
item. O projeto não usa biblioteca de gráficos (decisão do plano do batch)
e exige que toda lógica fora de `src/ui/` seja TypeScript puro sem
`new Date()`, `Date.now()` ou `Math.random()`.

## Decision

1. **Estatística pura em `src/stats/`:**
   - `src/stats/learning.ts`: ajuste da lei da prática `a − b·n^(−c)` por
     mínimos quadrados em escala log (`ln(a − y) = ln(b) − c·ln(n)`) com
     busca unidimensional em `a > max(y)` e refinamento por seção áurea
     (só com `n ≥ 8` rodadas não assistidas); inclinação de Theil–Sen;
     detecção de platô nas últimas 10 rodadas não assistidas (`slope ≤ 0`);
     taxa semanal nas últimas 4 semanas (exigindo ao menos 2 dias
     distintos); avaliação da linha de meta CBM (`acima` / `abaixo`).
   - `src/stats/kc.ts`: curva por oportunidade (1ª a 20ª) por KC e
     agregada; BIS calculado como `z(taxa de acerto) − z(mediana do tempo)`
     conforme Liesefeld & Janczyk (2019), de modo que valores menores
     indicam KCs mais fracos e a ordenação crescente coloca os mais fracos
     primeiro; CV dos tempos de acerto com pelo menos 10 acertos
     (`≤ 0,35` = `"estável"`, `> 0,35` = `"irregular"`).
   - `src/stats/typing-stats.ts`: mediana do intervalo entre teclas por
     par de caracteres (mínimo 5 ocorrências) e taxa de erro por caractere,
     usando os eventos gravados pela T22 (`extra.iv`, `extra.bad`,
     `extra.w` ou linha do snippet em `CORPUS`).
   - `src/stats/progress.ts`: agrega rodadas por treino e configuração
     (comparação justa: chave de configuração própria de cada store,
     separando rodadas assistidas da T21 para exibição distinta e exclusão
     do ajuste), ordena configurações mais jogadas e formata os dados para
     o painel e para `RoundHistory`.
   - Conversão de data `YYYY-MM-DD` para epoch ms feita por aritmética pura
     (`parseDay`), sem `new Date()`, preservando `tests/purity.test.ts`.
2. **Gráficos em SVG próprio (`src/ui/progress/`):**
   - `ProgressChart.tsx` desenha os pontos (`--muted`), rodadas assistidas
     com símbolo distinto (losango vazado em `--muted`), curva ajustada
     (`--accent`), linha de teto estimado (`--accent` tracejado), linha de
     meta CBM (`--warning` tracejado) e eixo horizontal em datas.
   - Todo gráfico acompanha um `<details>` `"Ver como tabela"` com os
     mesmos dados para leitores de tela.
3. **Metas pessoais em `src/storage/goals.ts`:**
   - Guardadas em `popis.goals.v1` indexadas por chave de treino +
     configuração (`target`, `deadline`, `setAt`, `baseline`), incluídas em
     `src/storage/backup.ts`.
4. **Árvore e histórico do item:**
   - O item `"Evolução"` (`id: "progress"`) entra na pasta `Treino` depois
     de `Dados`, preservando os atalhos `1`–`9` existentes.
   - `RoundHistory` ganha props opcionais `weeklyRate`, `plateau` e
     `onProgress` para mostrar taxa semanal, selo de platô e atalho direto
     para a seção do item em `"Evolução"`.

## Alternatives considered

- **Usar biblioteca de gráficos (Recharts, Chart.js, uPlot)** — adicionaria
  dependência nova e peso de bundle; um SVG simples de ~150 linhas cobre
  pontos, curva, meta, datas e acessibilidade com tokens do tema.
- **Calcular `BIS = z(tempo) − z(acerto)`** — inverteria o sinal padrão da
  literatura (Liesefeld & Janczyk, 2019), onde BIS maior significa melhor
  desempenho; manter o sinal padrão torna a leitura direta e a ordenação
  crescente natural.

## Consequences

- Toda a matemática é testada por tabela e propriedade sem DOM.
- O bundle cresce muito pouco e todas as cores passam por `tests/colors.test.ts`.
- O painel funciona em telas estreitas (`< 48rem`) com SVG em largura
  total e tabelas em lista rótulo/valor.

## Rollback plan

Remover `src/stats/{learning,kc,typing-stats,progress}.ts`,
`src/storage/goals.ts`, `src/ui/progress/**`, a entrada `"progress"` em
`src/ui/shell/sections.ts`, as props extras de `RoundHistory` e registrar
um ADR de rollback.
