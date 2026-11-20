---
id: T14
title: Vim - edição
status: todo
depends_on: [T13]
branch: task/T14-vim-editing
adrs: []
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

## Notas para o batch

- Base: `after:T13`.
- Comandos extras: os mesmos da T13.
- Risco: `.` com inserção e `u` com agrupamento das mudanças exigem
  cuidado. O oráculo decide.

## Log
