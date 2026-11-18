---
tags: [architecture]
status: accepted
adrs: ["[[ADR-0001 Kanagawa Dragon theme]]"]
---

# Theme

Kanagawa Dragon, o tema atual do Alacritty do usuário
([[ADR-0001 Kanagawa Dragon theme]]). Todas as cores são variáveis CSS em
`src/ui/theme.css`, o único arquivo que define cores. Um teste de guarda
falha se aparecer um literal de cor em qualquer outro lugar de `src/`.

## Tokens da interface

| Token | Uso | Valor |
|-------|-----|-------|
| `--bg` | fundo da página | `#181616` |
| `--surface` | cartões, campo de resposta | `#0d0c0c` |
| `--text` | texto, questão | `#c5c9c5` |
| `--muted` | texto secundário, bordas | `#a6a69c` |
| `--accent` | foco, timer, botão principal | `#7fa8bc` |
| `--selection` | seleção, item ativo | `#2d4f67` |
| `--selection-text` | texto sobre `--selection` | `#c8c093` |
| `--correct` | resposta aceita | `#8aa86e` |
| `--wrong` | resposta errada, tempo esgotado | `#d16961` |
| `--warning` | últimos segundos, questão pulada | `#ceb680` |

Séries de gráficos, nesta ordem: `#7fa8bc`, `#8aa86e`, `#ceb680`,
`#aa88ac`, `#82b0ab`, `#d16961`.

## Paleta de origem (referência)

Cópia de `~/.config/alacritty/themes/kanagawa_dragon.toml` em 2026-11-17,
para decisões futuras de tema.

| Grupo | black | red | green | yellow | blue | magenta | cyan | white |
|-------|-------|-----|-------|--------|------|---------|------|-------|
| normal | `#0d0c0c` | `#d16961` | `#8aa86e` | `#ceb680` | `#7fa8bc` | `#aa88ac` | `#82b0ab` | `#d0c58b` |
| bright | `#a6a69c` | `#ec6070` | `#7bb57b` | `#ecc57e` | `#75b8d3` | `#8e7eb5` | `#6db5a7` | `#c5c9c5` |

| Outro | Valor |
|-------|-------|
| primary background | `#181616` |
| primary foreground | `#c5c9c5` |
| selection background | `#2d4f67` |
| selection foreground | `#c8c093` |
| indexed 16 | `#c28f6f` |
| indexed 17 | `#c4886f` |
