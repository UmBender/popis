---
id: ADR-0001
title: Kanagawa Dragon theme
status: accepted
kind: decision
date: 2026-11-17
task: T01
builds_on: []
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-0001 Kanagawa Dragon theme

## Context

O usuário quer que o app use as cores do tema atual do Alacritty, o
Kanagawa Dragon (`~/.config/alacritty/themes/kanagawa_dragon.toml`). É o
mesmo tema do draw (ADR-0015 daquele repositório). O arquivo fica fora
deste repositório, e por isso a paleta completa está copiada em [[Theme]].

## Decision

- Usar **só** cores do tema. Nenhuma cor é inventada.
- A interface usa um único tema escuro. Não há modo claro.
- Todas as cores ficam como variáveis CSS em `src/ui/theme.css`, o único
  arquivo do código que define cores. Um teste de guarda
  (`tests/colors.test.ts`) falha se aparecer um literal de cor (`#rgb`,
  `#rrggbb`, `rgb(`, `hsl(`) em qualquer outro arquivo de `src/`.
- Tokens semânticos:

| Token | Uso | Origem no tema | Valor |
|-------|-----|----------------|-------|
| `--bg` | fundo da página | `primary.background` | `#181616` |
| `--surface` | cartões, campo de resposta | `normal.black` | `#0d0c0c` |
| `--text` | texto, questão | `primary.foreground` | `#c5c9c5` |
| `--muted` | texto secundário, bordas | `bright.black` | `#a6a69c` |
| `--accent` | foco, timer, botão principal | `normal.blue` | `#7fa8bc` |
| `--selection` | seleção, item ativo | `selection.background` | `#2d4f67` |
| `--selection-text` | texto sobre `--selection` | `selection.foreground` | `#c8c093` |
| `--correct` | resposta aceita | `normal.green` | `#8aa86e` |
| `--wrong` | resposta errada, tempo esgotado | `normal.red` | `#d16961` |
| `--warning` | últimos segundos, questão pulada | `normal.yellow` | `#ceb680` |

- Séries de gráficos (estatísticas), nesta ordem: `normal.blue`,
  `normal.green`, `normal.yellow`, `normal.magenta`, `normal.cyan`,
  `normal.red`.

## Alternatives considered

- **Variantes `bright` para estados** — mais saturadas, mas cansam a vista
  numa sessão longa sobre fundo escuro. O draw tomou a mesma decisão.
- **Ler o `.toml` do Alacritty em tempo de execução** — o app roda no
  navegador e não tem acesso ao arquivo. As cores ficam compiladas.

## Consequences

- [[T01 Clone do Zetamac]] cria `src/ui/theme.css` e o teste de guarda.
- Trocar de tema depois = um ADR novo que altera este + editar
  `src/ui/theme.css` e [[Theme]].

## Rollback plan

Um ADR de rollback que reverte este e define outra paleta em `src/ui/theme.css`.
