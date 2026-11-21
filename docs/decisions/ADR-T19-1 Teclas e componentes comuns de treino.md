---
id: ADR-T19-1
title: Teclas e componentes comuns de treino
status: proposed
kind: decision
date: 2026-11-20
task: T19
builds_on: [ADR-T18-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T19-1 Teclas e componentes comuns de treino

## Context

Cada tela de treino do popis foi implementada em uma task separada e
definiu atalhos, barra de tempo/placar, resultado e histórico próprios.
`Esc` tinha quatro efeitos diferentes, recomeçar usava teclas distintas
(`Ctrl+Enter` em Código, `Tab` em Texto), e o botão de nova rodada se
chamava "Jogar de novo" em cálculo e "Próximo" em digitação e Vim.

Além disso, `Ctrl+R` conflita com o atalho de recarregar do navegador e
com o `<C-r>` do próprio Vim (refazer no modo normal e colar registrador
no modo de inserção na tela de Edição).

## Decision

1. **Tabela única de teclas em `src/ui/keys.ts`**, que alimenta a linha
   de status da janela (`Shell`), a ajuda `?` e os manipuladores de
   teclado de todas as telas de treino:
   - `Esc` sai do treino e volta ao painel do item, exceto nos três
     treinos de Vim (onde `Esc` pertence ao Vim e sair é `:q` + `Enter`,
     incluindo uma linha de comando mínima de `:` no Movimento);
   - `Ctrl+Enter` (ou `Cmd+Enter`) pula o item atual (questão, trecho,
     alvo ou edição). No cálculo, `Enter` continua pulando nos modos com
     `allowSkip` para manter compatibilidade;
   - `Ctrl+Shift+Enter` (ou `Cmd+Shift+Enter`) recomeça a rodada com uma
     seed nova em todas as telas de treino, conforme a alternativa
     prevista no spec para evitar conflito com o navegador e com o
     `<C-r>` do Vim.
2. **Remoção das dicas soltas** (`.hint` com `·`) nas telas de treino:
   as teclas aparecem apenas na linha de status do `Shell` e na ajuda `?`.
3. **Componentes compartilhados em `src/ui/shell/`**:
   - `RoundBar.tsx`: exibe o tempo (ou progresso) e o placar em pares
     rótulo/valor na mesma posição em todas as telas de treino;
   - `Result.tsx`: exibe linha principal, pares rótulo/valor, lista dos
     piores itens, seed e botão "Jogar de novo" (`Enter`) em todas as
     telas de treino;
   - `History.tsx`: exibe "Últimas 10 rodadas" com sparkline, melhor e
     média, ou o aviso padrão de vazio, em todos os itens de treino.

## Alternatives considered

- **`Ctrl+R` para recomeçar** — descartado porque no Vim `Edição` o
  `<C-r>` já é comando do próprio Vim (refazer e `i_<C-r>` para
  registradores), além de navegadores poderem interceptá-lo para
  recarregar a página. `Ctrl+Shift+Enter` evita os dois conflitos.
- **`Ctrl+Esc` para sair do Vim** — descartado pelo dono (2026-11-20)
  porque KDE e Windows capturam o atalho.

## Consequences

- Todas as telas de treino passam a responder às mesmas teclas e a
  apresentar barra de rodada, resultado e histórico idênticos.
- Quem estava acostumado a `Esc` para trocar texto/trecho ou `Tab` para
  recomeçar no Texto precisa usar `Ctrl+Enter` e `Ctrl+Shift+Enter`,
  ambos visíveis na linha de status e na ajuda `?`.

## Rollback plan

Reverter os commits da `T19` e registrar um ADR `kind: rollback`
apontando para `ADR-T19-1`.
