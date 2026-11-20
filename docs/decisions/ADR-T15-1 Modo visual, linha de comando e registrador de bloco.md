---
id: ADR-T15-1
title: Modo visual, linha de comando e registrador de bloco
status: accepted
kind: decision
date: 2026-11-20
task: T15
builds_on: [ADR-T13-1, ADR-T14-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T15-1 Modo visual, linha de comando e registrador de bloco

## Context

A T15 acrescenta ao motor da T14 o modo visual (caractere, linha e bloco),
a linha de comando (`:s` e amigos), `>`, `<` e `J`. O comportamento de
referência continua sendo o `nvim --clean`, agora com `shiftwidth=4` e
`expandtab` ligados no motor e no oráculo.

## Decision

- `Mode` ganha `visual` e `cmdline`. O estado ganha `visual` (o tipo da
  seleção e a âncora; o cursor é a outra ponta), `lastVisual` (para `gv` e
  para as marcas `'<` e `'>`) e `cmdline` (o texto digitado depois do `:`).
- **Registrador de bloco:** `Register` ganha o campo opcional `block` (a
  largura). `getregtype()` dá `"\x16<largura>"` e o oráculo o compara como
  está. Os casos da T15 ficam em uma lista própria (`VISUAL_CASES`), para
  não mexer nos testes da T14 sobre `EDIT_CASES`.
- **Inserção em bloco:** a sessão de inserção guarda o bloco. No `<Esc>` o
  motor compara a primeira linha antes e depois, e repete o texto novo nas
  outras linhas (`I`: linhas curtas demais não mudam; `A`: linhas curtas
  são preenchidas com espaços; `$A`: acrescenta no fim de cada linha).
  Se o texto trouxe uma quebra de linha, as outras linhas não mudam.
- **`:s`:** o padrão é traduzido para `RegExp` (literal, `.`, `\<`, `\>`,
  `^`, `$` e `\/`); a troca aceita `&`, `\&`, `\/` e `\\`. Faixas:
  `%`, `n`, `.`, `$`, `+n`, `-n`, `'<`, `'>` e pares separados por vírgula.
  `:noh`, `:w` e `:q` são aceitos e não fazem nada.
- **Fora do motor, de propósito:** `.` depois de um comando visual não
  repete a seleção (a última mudança fica como estava), e `>`/`<` em bloco
  são ignorados. Os dois ficam para quando uma task precisar deles.
- **Arquivos:** a análise das teclas sai de `edit.ts` para `parse.ts`, e os
  auxiliares do buffer para `buffer.ts`, para o visual e o `:s` os
  reusarem sem importação circular.

## Alternatives considered

- **Reusar `EDIT_CASES` com o registrador de bloco** — obrigaria a mudar o
  teste que confere os três tipos de registrador da T14.
- **Biblioteca de expressões regulares do Vim** — fora de escopo e sem
  dependência nova.

## Consequences

- O oráculo roda com `shiftwidth=4` e `expandtab` para todos os casos; os
  casos da T14 não usam `>`, `<` nem Tab e seguem iguais.
