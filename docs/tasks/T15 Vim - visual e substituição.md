---
id: T15
title: Vim - visual e substituição
status: done
depends_on: [T14]
branch: task/T15-vim-visual
adrs: [ADR-T15-1]
tags: [task]
---

# T15 Vim - visual e substituição

## Goal

O motor de Vim ganha o modo visual (caractere, linha e bloco), o `:s` e
a indentação. O treino de edição ganha as tarefas que aparecem em CP:
comentar ou descomentar um bloco de prints de debug, renomear uma
variável num trecho, indentar um bloco e juntar linhas.

## Spec (rascunho; o passo de spec nomeia os testes)

Decisões do dono: as mesmas da [[T13 Vim - movimentos]]. O dono pediu
que os comandos que ele ainda não conhece venham com uma forma de praticar
ligada a CP.

- **AC-1**: **Modo visual:**
  - `v`, `V` e `<C-v>`, com qualquer movimento da T13 e os objetos de
    texto da T14 (`vi(`);
  - `o` troca a ponta da seleção;
  - `d c y > < ~ r` agem sobre a seleção;
  - `gv` reseleciona a última seleção.
- **AC-2**: **Bloco:** `<C-v>` seguido de `I` ou `A`, o texto e `<Esc>`
  insere em todas as linhas, e `$A` acrescenta no fim de linhas de
  tamanhos diferentes. É o jeito de comentar várias linhas com `// `.
- **AC-3**: **Linhas:** `>>`, `<<` e `J`, com contagem, indentando com
  4 espaços (`shiftwidth=4`, `expandtab`). A tela define essas opções, e
  o oráculo passa as mesmas ao `nvim`.
- **AC-4**: **Linha de comando:** `:` abre uma linha de comando na
  barra de status, com `<BS>`, `<Esc>` e `<CR>`.
  - `:s/a/b/` e `:s/a/b/g` funcionam com as faixas `%`, `'<,'>`
    (entra sozinha ao apertar `:` no visual), `.,+n` e `n,m`.
  - O padrão aceita texto literal, `\<`, `\>` e `.`; a troca aceita
    texto literal e `&`.
  - `:noh`, `:w` e `:q` são aceitos e não fazem nada, para não atrapalhar
    o hábito.
- **AC-5**: **Fidelidade:** os casos de T15 entram em `src/vim/cases/` e
  no `npm run vim:oracle`, com pelo menos 5 casos por comando.
- **AC-6**: **Novos tipos de edição** (pelo menos 8), cada um com a
  referência verificada pelo motor (teste de propriedade):
  - comentar de 3 a 6 linhas com `// ` ou `# ` (`<C-v>…I// <Esc>`);
  - descomentar (`<C-v>…lld` ou `x` repetido);
  - renomear uma variável no trecho todo
    (`:%s/\<n\>/m/g<CR>`);
  - renomear só dentro de uma função (`vi{` e depois
    `:'<,'>s/\<i\>/j/g`);
  - indentar ou desindentar um bloco (`>i{`, `V3j>`);
  - juntar duas linhas (`J`);
  - acrescentar `;` em várias linhas (`<C-v>…$A;<Esc>`);
  - trocar `endl` por `'\n'` em todas as linhas.
- **AC-7**: **Painel "Comandos":** uma frase e um exemplo de uso em CP
  para cada comando novo, por exemplo: "`<C-v>` + `I// ` — comenta os
  prints de debug antes de enviar".
- **AC-8**: **E2E:** no Chromium, as referências de uma rodada com os
  tipos "comentar" e "renomear" são digitadas no navegador e completam
  as edições. `<C-v>` chega ao app em vez de colar.

## Testes por critério

- **AC-1**: `src/vim/visual.test.ts` (grupo "visual mode") e os casos
  `v`, `V`, `<C-v>`, `o`, `vd`, `vc`, `vy`, `v>`, `v<`, `v~`, `vr`, `gv`.
- **AC-2**: `src/vim/visual.test.ts` (grupo "block insert") e os casos
  `<C-v>I`, `<C-v>A`, `$A`.
- **AC-3**: `src/vim/visual.test.ts` (grupo "shift and join") e os casos
  `>>`, `<<`, `J`.
- **AC-4**: `src/vim/ex.test.ts` (faixas, padrão, troca, `:noh/:w/:q`,
  linha de comando com `<BS>` e `<Esc>`) e os casos `:s` e `:noh`.
- **AC-5**: `src/vim/visual-cases.test.ts` (o motor contra cada caso, pelo
  menos 5 casos por comando) e `npm run vim:oracle`.
- **AC-6**: `src/vim/drills/edit.test.ts` (22 tipos, cada tipo gera) e
  `src/vim/drills/edit.prop.test.ts` (a referência dá o "depois").
- **AC-7**: `src/vim/edit-help.test.ts` e `src/ui/VimScreenEdit.test.tsx`
  (o painel lista cada comando novo, com um exemplo de CP).
- **AC-8**: `tests/e2e/vim.spec.ts` (caso da T15, com `<C-v>`).
- Tela (modo na barra, `:` na barra, seleção): `src/ui/VimScreenEdit.test.tsx`.

## Out of scope

- `.` depois de um comando visual, `>`/`<` em bloco e `p` de um registrador
  de bloco (ADR-T15-1).
- Expressões regulares além do subconjunto do AC-4.
- `:g`, `:norm` e comandos de arquivo (`:w` só é aceito).
- Registradores e macros (T16).

## Files owned

- `src/vim/**`
- `src/ui/VimScreen*.tsx`, `src/ui/vim/**`, `src/ui/app.css`
- `tests/e2e/vim.spec.ts`
- `vite.config.ts` (só limiares de cobertura)
- `scripts/vim-oracle.mjs` (acrescentado: o AC-3 pede que o oráculo passe
  `shiftwidth=4` e `expandtab` ao `nvim`, e o script é dele)
- `src/ui/App.test.tsx`, só se um teste existente quebrar por causa do
  painel novo (acrescentado na hora, com motivo no *Log*)
- `docs/decisions/ADR-T15-*.md`

## Subtasks

- [x] Spec e ADR-T15-1.
- [x] Testes vermelhos (casos do oráculo, motor, `:s`, geradores, tela, e2e).
- [x] Modelos (tipos e assinaturas).
- [x] Comportamento (visual, bloco, `>`/`<`/`J`, `:`, geradores, tela).
- [x] Qualidade: `check`, cobertura, oráculo.
- [x] Docs e *Log*.

## Notas para o batch

- Base: `after:T14`.
- Comandos extras: os mesmos da T13.

## Log

- 2026-11-20 — Feito em `task/T15-vim-visual` (base `task/T14-vim-editing`).
  `npm run check` verde (3339 testes), `npm run coverage` sem erro (src/vim
  100%), `npm run test:fuzz` verde, `npm run test:e2e` 17/17,
  `npm run vim:oracle` 2014/2014 casos de acordo (163 casos novos de
  visual, bloco, `>>`/`<<`/`J` e `:s`, em `VISUAL_CASES`).
- **Neovim venceu a nota** (sem ADR além do ADR-T15-1): no visual o cursor
  pode ficar na quebra de linha (`$`, `l` no fim, `j` para linha curta),
  e a seleção então inclui a quebra; `>`/`<` e `V d` mantêm a coluna
  desejada (`nostartofline`); um `y` em linhas deixa o cursor na coluna
  0, salvo quando a ponta de cima é o cursor; no yank em bloco, linhas
  mais curtas que o bloco entram preenchidas com espaços; depois de
  `I`/`A` em bloco o cursor vai para o canto de cima à esquerda; `:s` deixa
  o cursor no primeiro não-branco da última linha mudada e, num `g`, um
  casamento vazio não vale no fim da linha (`:s/x*/-/g` em "ab" dá "-a-b");
  `\n` na troca é NUL, então a referência de "trocar endl" usa `\\n`.
- Desvios do spec, todos no ADR-T15-1 ou aqui: `.` depois de um comando
  visual não repete a seleção; `>`/`<` em bloco são ignorados; `p` de um
  registrador de bloco cola como caracteres (não foi implementado como
  bloco); faixa de trás para a frente (`:3,2s`) é um erro (o Vim
  perguntaria); `:q` e `:w` não têm caso no oráculo (o `nvim` fecharia) e
  são cobertos só por teste unitário. `\<` precisa de `<lt>` nas teclas.
- *Files owned*: `scripts/vim-oracle.mjs` entrou (`shiftwidth=4` e
  `expandtab`). A análise das teclas e os auxiliares do buffer saíram de
  `edit.ts` para `parse.ts` e `buffer.ts` (dentro de `src/vim/**`).
- Correções de teste, em commit próprio: teclas `'<,'>` precisam de
  `<lt>`, um caso terminava com operador pendente, e três expectativas de
  coluna dos testes de tela estavam erradas.
- Dez tipos de edição novos (total 28): `comment-block`,
  `uncomment-block`, `rename-variable`, `rename-in-function`,
  `indent-block`, `dedent-block`, `indent-lines`, `join-lines`,
  `append-semicolons`, `replace-endl` (o corpus não tem `endl`: o "antes"
  troca `'\n'` por `endl`). O painel "Comandos" ganhou 15 entradas com um
  exemplo de CP. Quem já tem configurações salvas só vê os tipos novos
  depois de marcá-los.
- UNATTENDED CHOICE: um comando visual não mexe no `.`; a seleção ganhou
  a classe `vim-selected` (tokens `--accent` e `--surface`, sem cor nova).
- Verificação visual não feita: sem capturas de tela nesta execução.
  Conferir à mão a linha de comando `:` na barra e a seleção em bloco.
