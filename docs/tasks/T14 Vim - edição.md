---
id: T14
title: Vim - edição
status: done
depends_on: [T13]
branch: task/T14-vim-editing
adrs: [ADR-T14-1, ADR-T14-2]
tags: [task]
---

# T14 Vim - edição

## Goal

Um segundo treino na tela "Vim": deixar o trecho igual a um alvo. O app
mostra o "antes" e o "depois" com a diferença destacada, e o jogador faz
a edição com operadores, objetos de texto e o modo de inserção. No fim de
cada edição aparece uma solução de referência curta (`ci(` no lugar de
`F(ldt)i`), para aprender o jeito idiomático. São as edições que mais se
repetem ao escrever e corrigir uma solução de CP.

## Spec (rascunho; o passo de spec nomeia os testes)

Decisões do dono: as mesmas da [[T13 Vim - movimentos]]. A referência de
comportamento continua sendo o `nvim --clean`.

- **AC-1**: **Modo de inserção:** `i a I A o O`, o texto digitado, `<BS>`
  e `<Esc>`, que volta uma coluna, como no Vim.
- **AC-2**: **Operadores** `d c y` com qualquer movimento da T13 e com
  contagem (`2dw`, `d2w`, `c$`, `dt)`, `y3j`).
  - Também `dd cc yy`, `D C`, `x X`, `r{c}`, `s S`, `~`, `p P`.
  - Movimentos lineares (`j`, `G`) tornam a operação de linha, como no
    Vim.
  - Inclui as exceções conhecidas: `cw` age como `ce`, e `dw` na última
    palavra da linha não junta as linhas.
- **AC-3**: **Objetos de texto:** `iw aw iW aW`, `i( a( ib ab`,
  `i{ a{ iB aB`, `i[ a[`, `i< a<`, `i" a"`, `i' a'`, `` i` a` ``, com
  `d c y` e contagem onde o Vim aceita (`d2i(`).
- **AC-4**: **Desfazer e repetir:** `u`, `<C-r>` e `.`, que repete a
  última mudança, incluindo o texto inserido (`ciwfoo<Esc>` e depois
  `.`).
- **AC-5**: **Fidelidade:** as tabelas de casos de T14 entram em
  `src/vim/cases/` e no `npm run vim:oracle`, com pelo menos 5 casos por
  comando dos AC-1 a AC-4, e incluem o conteúdo do registrador sem nome
  depois de `y`/`d`.
- **AC-6**: **Edições geradas por seed** (`src/vim/drills/edit.ts`): pelo
  menos 14 tipos, aplicados a trechos da T10. Cada tipo gera o "antes",
  o cursor, o "depois" e uma solução de referência. Exemplos de tipo:
  - apagar uma palavra; trocar uma palavra por outra;
  - trocar o conteúdo de `( )`, `[ ]`, `{ }` ou de aspas;
  - apagar até um caractere (`dt,`); apagar até o fim da linha;
  - apagar uma linha; duplicar uma linha (`yyp`); trocar duas linhas
    (`ddp`);
  - acrescentar `;` no fim (`A;<Esc>`); inserir no começo da linha
    (`I`);
  - trocar um operador (`<` por `<=`, com `r` ou `s`);
  - abrir uma linha abaixo com código (`o`);
  - trocar `int` por `long long` numa declaração;
  - corrigir um índice (`i` por `i + 1`).

  O teste de propriedade confere, para muitas seeds e cada tipo, que
  aplicar a solução de referência ao "antes" dá exatamente o "depois", e
  que a mesma seed gera a mesma edição.
- **AC-7**: **Rodada de edição:** a tela ganha a escolha "Movimento /
  Edição".
  - A edição termina quando o buffer fica igual ao "depois", em
    qualquer modo.
  - Ctrl+Enter pula a edição.
  - A eficiência é teclas da referência ÷ teclas usadas. Pode passar de
    100%, e então a tela diz "melhor que a referência".
  - Os tipos de edição podem ser marcados um a um, todos por padrão.
- **AC-8**: **Tela:**
  - o "depois" aparece abaixo do buffer, com a diferença destacada em
    `--correct` e `--wrong`;
  - a linha de status mostra o modo (NORMAL / INSERT) e as teclas
    pendentes (`d2`);
  - o painel "Comandos" ganha os operadores e os objetos de texto, com
    uma frase cada;
  - o fim de cada edição mostra "você: 9 · referência: 4 (`ci(x<Esc>`)".
- **AC-9**: **Persistência:** os resultados de edição ficam em
  `popis.vim` com `kind: "edit"`. O resumo mostra o melhor e a média dos
  últimos 10, separados por treino. Os resultados da T13 sem `kind`
  carregam como `kind: "motion"`.
- **AC-10**: **E2E:** no Chromium, uma rodada de edição em que o teste
  digita a referência exposta num `data-` de 3 edições e vê eficiência
  100%.

## Testes por critério

- **AC-1**: `src/vim/edit.test.ts` (grupo "insert mode") e os casos de
  `src/vim/cases/edit-insert.ts`.
- **AC-2**: `src/vim/edit.test.ts` (grupo "operators") e os casos de
  `src/vim/cases/edit-operators.ts`.
- **AC-3**: `src/vim/textobjects.test.ts` e os casos de
  `src/vim/cases/edit-objects.ts`.
- **AC-4**: `src/vim/edit.test.ts` (grupo "undo, redo and dot") e os casos
  de `src/vim/cases/edit-undo.ts`.
- **AC-5**: `src/vim/edit-cases.test.ts` (o motor contra cada caso, pelo
  menos 5 por comando, nomes únicos) e `npm run vim:oracle`.
- **AC-6**: `src/vim/drills/edit.test.ts` (14 tipos, cada tipo gera) e
  `src/vim/drills/edit.prop.test.ts` (a referência dá o "depois", mesma
  seed, mesma edição).
- **AC-7**: `src/vim/edit-round.test.ts`.
- **AC-8**: `src/ui/VimScreenEdit.test.tsx`.
- **AC-9**: `src/storage/vim-edit.test.ts`.
- **AC-10**: `tests/e2e/vim.spec.ts` (caso de edição).

## Out of scope

- Modo visual, `:s`, `>>`, `<<` e `J` (T15).
- Registradores nomeados e macros (T16).
- Autoindentação e `=`; o texto inserido entra como foi digitado.
- Busca da edição ótima (a referência é escrita por tipo).

## Files owned

- `src/vim/**`
- `src/storage/vim*.ts`
- `src/ui/VimScreen*.tsx`, `src/ui/vim/**` (se a tela for dividida),
  `src/ui/app.css`
- `tests/e2e/vim.spec.ts`
- `vite.config.ts` (só limiares de cobertura)
- `scripts/vim-oracle.mjs` (acrescentado: o AC-5 exige que o oráculo rode
  os casos de edição, e o script é dele)
- `docs/decisions/ADR-T14-1 *.md`

## Subtasks

- [x] Spec, ADR-T14-1 e testes por critério.
- [x] Testes vermelhos (motor, objetos, casos, geradores, rodada,
      armazenamento, tela, e2e).
- [x] Modelos (tipos e assinaturas).
- [x] Comportamento (motor, objetos de texto, desfazer, `.`, geradores,
      rodada, armazenamento, tela).
- [x] Qualidade: `check`, cobertura, oráculo.
- [x] Docs e *Log*.

## Notas para o batch

- Base: `after:T13`.
- Comandos extras: os mesmos da T13.
- Risco: `.` com inserção e `u` com agrupamento das mudanças exigem
  cuidado. O oráculo decide.

## Log

- 2026-11-20 — Feito em `task/T14-vim-editing` (base `task/T13-vim-motions`).
  `npm run check` verde, `npm run coverage` sem erro (src/vim 100%),
  `npm run test:fuzz` verde, `npm run test:e2e` 16/16, `npm run vim:oracle`
  1849/1849 casos de acordo (1278 de edição + os de movimento).
- Passo "quality" sem commit `chore` próprio: lint, formato e cobertura foram
  resolvidos nos commits `test` e `fix` finais (casos novos do oráculo e
  limpeza de ramos mortos).
- **Neovim venceu a nota** (sem ADR além do ADR-T14-2): `Y` copia a linha
  inteira (não `y$`); `dd` mantém a coluna desejada (`nostartofline`); objeto
  de texto que vira linhas inteiras deixa o cursor no primeiro não-branco;
  objeto de palavra que falha ainda move o cursor; `cw` em branco age como
  `dw`.
- UNATTENDED CHOICE: o `<Esc>` que fecha uma inserção depois de uma edição
  que já terminou (buffer igual ao "depois" ainda em modo de inserção)
  conta para a edição que acabou, não para a próxima; assim digitar a
  referência inteira dá 100% e pular o `<Esc>` dá mais de 100%.
- UNATTENDED CHOICE: os tipos de edição são 18 (a nota pedia 14) e as opções
  da edição (treino, duração, tipos) ficam em `popis.vim-edit-settings`, sem
  mexer em `popis.vim-settings`.
- `scripts/vim-oracle.mjs` entrou em *Files owned*: o oráculo grava a saída
  em arquivo, traduz `<lt>`, desliga `autoindent` e compara texto, cursor e
  registrador sem nome.
- Correções de teste, cada uma em commit próprio: expectativas erradas de
  `dd`/`Y` e casos com `<` e coluna fora da linha (dados do oráculo);
  limites de teclas da referência (1 a 40) no teste de propriedade.
- Os tipos de edição só foram checados no motor próprio (a referência dá o
  "depois"), não no `nvim`.
- O `git stash pop` não é permitido no batch: o stash `batch-T14-wip` ficou
  na lista (trabalho já refeito e commitado); pode ser descartado.
- Conferir à mão: tentar cada tipo de edição uma vez e julgar as soluções de
  referência; a aparência do realce `--wrong`/`--correct` e do cursor de
  inserção (screenshot revisado: ok no desktop).
