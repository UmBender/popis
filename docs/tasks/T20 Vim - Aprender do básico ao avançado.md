---
id: T20
title: Vim - Aprender do básico ao avançado
status: todo
depends_on: [T19]
branch: task/T20-vim-curriculum
adrs: []
tags: [task]
---

# T20 Vim - Aprender do básico ao avançado

## Goal

Hoje o Aprender (T16, ADR-T16-1) tem 8 lições, todas de registradores e
macros. Quem está começando não tem onde aprender `w`, `f`, `ci(` ou `.`.
Esta task transforma o Aprender num **currículo em ordem**, do básico
(`h j k l`, modos) ao avançado (macros). Cada passo segue o formato que já
existe: explicação, exemplo animado e exercício guiado. Cada passo também
libera e aponta o treino certo: o nível de Movimento ou os tipos de
Edição.

## Base em pesquisa

- **Exemplo resolvido antes do problema** (*worked-example effect*), com
  a ajuda **retirada aos poucos** (*fading*). A retirada que se adapta ao
  aluno ensina mais do que a retirada fixa (Salden et al., 2010), e o
  exemplo deixa de ajudar quem já sabe (*expertise reversal*). Por isso,
  cada lição tem exemplo e exercício guiado, e o treino livre vem depois.
  O pulo de lição é livre: quem já sabe não é obrigado a passar por ela.
  Fontes em [[Métricas e evolução]].

## Spec (rascunho; o passo de spec nomeia os testes)

- **AC-1**: **Currículo** em `src/vim/curriculum.ts`: uma lista ordenada
  de unidades, cada uma com lições. A ordem é a padrão, e o dono pode
  mudar:

  | Unidade | Lições (uma por linha da tabela de comandos) | Libera |
  |---|---|---|
  | 1 Modos e `h j k l` | modo normal × inserção; `h j k l`; `i`, `a`, `Esc` | Movimento 1 |
  | 2 Palavras | `w b e`; `W B E`; `ge` | Movimento 2 |
  | 3 Linha | `0 ^ $` | Movimento 3 |
  | 4 Achar na linha | `f F t T`; `; ,` | Movimento 4 |
  | 5 Contagens | `3w`, `2f(` | Movimento 5 |
  | 6 Arquivo | `gg G {n}G`; `{ }`; `%` | Movimento 6 |
  | 7 Busca | `/ ?`; `n N`; `* #` | Movimento 7 |
  | 8 Operadores | `d c y` + movimento; `dd cc yy`; `x r ~`; `p P` | tipos de Edição básicos |
  | 9 Objetos de texto | `iw aw`; `i( a(`, `i{`, `i"` | tipos de objeto |
  | 10 Repetir e desfazer | `.`; `u`, `<C-r>` | tipos com `.` |
  | 11 Inserção | `I A o O`; `s S C D` | tipos de inserção |
  | 12 Visual | `v V <C-v>`; `o`, `gv`; `I`/`A` em bloco | tipos visuais |
  | 13 Linhas | `>> << J`; `:s` | tipos de linha e `:s` |
  | 14 Registradores | as 4 lições de registrador da T16 | tipos de registrador |
  | 15 Macros e números | as 4 lições de macro e `<C-a>` da T16 | tipos de macro |

  Os textos dos níveis (`levels.ts`) e da ajuda (`edit-help.ts`) continuam
  sendo a fonte das descrições de uma linha, sem duplicar. As lições das
  unidades 14 e 15 são as 8 que já existem. Um teste confere que:
  - todo comando de `levelHelp` e de `EDIT_HELP` aparece em exatamente
    uma lição;
  - as unidades seguem a ordem dos níveis.
- **AC-2**: **Lição:** explicação curta (até 3 frases), exemplo animado e
  exercício guiado, como em `LESSONS`. O exemplo de cada lição usa um
  trecho de programação competitiva, e os exemplos de movimento rodam no
  motor de movimento. Todo exemplo entra nos casos do oráculo (`npm run
  vim:oracle`) e bate com o `nvim --clean`.
- **AC-3**: **Exercícios com retirada da ajuda.** Cada lição tem 3
  exercícios:
  1. com a sequência de teclas da referência à vista e a próxima tecla
     destacada (como na T16);
  2. só com os comandos da lição à vista;
  3. sem ajuda.

  A lição conta como concluída quando a pessoa termina o exercício 3. Se
  ela fizer o exercício 1 ou 2 com o mínimo de teclas, o próximo nível de
  ajuda é pulado (retirada adaptativa).
- **AC-4**: **Progresso:**
  - a tela mostra as unidades em lista, cada uma com "concluída",
    "em andamento" ou "nova";
  - Enter abre a próxima lição não concluída;
  - nenhuma lição é bloqueada: a pessoa pode abrir qualquer uma;
  - o progresso fica em `popis.vim-learn`, migrando o formato atual (lista
    de tipos liberados) sem perder nada. Um teste de migração cobre os
    dados no formato da T16.
- **AC-5**: **Ligação com o treino:**
  - ao concluir uma lição de movimento, o botão "Treinar" abre o
    Movimento no nível dela;
  - ao concluir uma lição de edição, o botão abre a Edição com os tipos
    da lição marcados;
  - no Movimento e na Edição, cada comando do painel "Comandos" tem um
    link "aprender" para a sua lição.
- **AC-6**: **Layout:**
  - segue a ordem do painel da T18: título, descrição, a lista de
    unidades em cima, e a lição aberta abaixo;
  - nenhum seletor no pé da página;
  - no celular, o Aprender aparece só para leitura (exemplo animado e
    explicação), porque o exercício precisa de teclado físico, como o
    resto do Vim;
  - o *Log* registra se isso foi feito.

## Out of scope

- Comandos que nenhum treino usa (janelas, buffers, `:g`, plugins).
- Mudar o motor ou os níveis de Movimento.

## Files owned

- `src/vim/curriculum.ts` (novo), `src/vim/lessons.ts`, `src/vim/cases/**`
- `src/storage/vim-learn.ts`
- `src/ui/vim/LearnDrill.tsx` e o painel "Comandos" das telas de Vim

## Notas para o batch

- **Tamanho:** grande, com cerca de 35 lições novas. Se o lote apertar,
  divida em duas: unidades 1–7 (movimento) e 8–13 (edição).
- **Bloquear se:** um exemplo não bater com o Neovim e não houver
  variante simples que bata. Nesse caso, troque o exemplo e registre no
  *Log*.

## Log
