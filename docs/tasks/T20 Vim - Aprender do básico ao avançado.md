---
id: T20
title: Vim - Aprender do básico ao avançado
status: done
depends_on: [T19]
branch: task/T20-vim-curriculum
adrs: [ADR-T20-1]
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

## Spec

- **AC-1**: **Currículo** em `src/vim/curriculum.ts`: uma lista ordenada
  de 15 unidades (39 lições), cada uma com lições. A ordem é a padrão, e o dono pode
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
  unidades 14 e 15 são as 8 que já existem.
  - Testes: `src/vim/curriculum.test.ts` ("every command of levelHelp and EDIT_HELP appears in exactly one lesson", "motion units follow levels 1 through 7 in order", "units 14 and 15 keep the 8 register and macro lessons").
- **AC-2**: **Lição:** explicação curta (até 3 frases), exemplo animado e
  exercício guiado, como em `LESSONS`. O exemplo de cada lição usa um
  trecho de programação competitiva, e os exemplos de movimento rodam no
  motor de movimento. Todo exemplo entra nos casos do oráculo (`npm run
  vim:oracle`) e bate com o `nvim --clean`.
  - Testes: `src/vim/curriculum.test.ts` ("every lesson has a short explanation in Portuguese", "every lesson example reaches its promised end state and has an oracle case"), `npm run vim:oracle`.
- **AC-3**: **Exercícios com retirada da ajuda.** Cada lição tem 3
  exercícios:
  1. com a sequência de teclas da referência à vista e a próxima tecla
     destacada (como na T16);
  2. só com os comandos da lição à vista;
  3. sem ajuda.

  A lição conta como concluída quando a pessoa termina o exercício 3. Se
  ela fizer o exercício 1 ou 2 com o mínimo de teclas, o próximo nível de
  ajuda é pulado (retirada adaptativa).
  - Testes: `src/vim/curriculum.test.ts` ("nextExerciseStep applies adaptive fading", "every lesson has 3 exercises whose references reach their targets"), `src/ui/VimScreenLearn.test.tsx` ("adaptive fading skips step 2 on minimum keys and finishes on step 3", "extra keys on step 1 advance to step 2 with commands only").
- **AC-4**: **Progresso:**
  - a tela mostra as unidades em lista, cada uma com "concluída",
    "em andamento" ou "nova";
  - Enter abre a próxima lição não concluída;
  - nenhuma lição é bloqueada: a pessoa pode abrir qualquer uma;
  - o progresso fica em `popis.vim-learn`, migrando o formato atual (lista
    de tipos liberados) sem perder nada.
  - Testes: `src/storage/vim-learn.test.ts` ("migrates T16 unlocked format without losing progress", "saves and loads completed lesson ids in version 2 format"), `src/vim/curriculum.test.ts` ("unitStatus reports nova, em andamento and concluída", "nextUncompletedLesson returns the first uncompleted lesson"), `src/ui/VimScreenLearn.test.tsx` ("lists all units with status badges and lets any lesson open", "Enter opens the next uncompleted lesson").
- **AC-5**: **Ligação com o treino:**
  - ao concluir uma lição de movimento, o botão "Treinar" abre o
    Movimento no nível dela;
  - ao concluir uma lição de edição, o botão abre a Edição com os tipos
    da lição marcados;
  - no Movimento e na Edição, cada comando do painel "Comandos" tem um
    link "aprender" para a sua lição.
  - Testes: `src/ui/VimScreenLearn.test.tsx` ("Treinar opens Motion at the lesson level", "Treinar opens Edit with the lesson kinds selected", "aprender link in Motion and Edit commands panels opens the command lesson").
- **AC-6**: **Layout:**
  - segue a ordem do painel da T18: título, descrição, a lista de
    unidades em cima, e a lição aberta abaixo;
  - nenhum seletor no pé da página;
  - no celular, o Aprender aparece só para leitura (exemplo animado e
    explicação), porque o exercício precisa de teclado físico, como o
    resto do Vim;
  - o *Log* registra se isso foi feito.
  - Testes: `src/ui/shell/sections.test.ts` ("sections keep Aprender visible on touch screens and hide typing, motion and edit"), `src/ui/VimScreenLearn.test.tsx` ("read-only mode on touch screens shows explanation and example without exercise"), `tests/e2e/vim.spec.ts` (fluxo E2E do currículo).

## Out of scope

- Comandos que nenhum treino usa (janelas, buffers, `:g`, plugins).
- Mudar o motor ou os níveis de Movimento.

## Files owned

- `src/vim/curriculum.ts` (novo), `src/vim/curriculum.test.ts` (novo)
- `src/vim/lessons.ts`, `src/vim/lessons.test.ts`
- `src/vim/cases/curriculum-motion.ts` (novo), `src/vim/cases/curriculum-edit.ts` (novo), `src/vim/cases/index.ts`
- `src/storage/vim-learn.ts`, `src/storage/vim-learn.test.ts`
- `src/ui/vim/LearnDrill.tsx`, `src/ui/VimScreen.tsx`, `src/ui/vim/EditDrill.tsx`, `src/ui/App.tsx`, `src/ui/shell/sections.ts`, `src/ui/shell/Shell.tsx`, `src/ui/app.css`
- `src/ui/VimScreenLearn.test.tsx`, `src/ui/coherence.test.tsx`, `src/ui/shell/sections.test.ts`, `tests/e2e/vim.spec.ts`

## Subtasks

- [x] Definir ADR-T20-1 e especificar ACs e testes
- [x] Escrever testes unitários, de migração, de componente e casos do currículo
- [x] Criar tipos e assinaturas em `src/vim/curriculum.ts` e `src/storage/vim-learn.ts`
- [x] Implementar currículo completo (unidades 1–15), casos do oráculo, migração e telas
- [x] Validar `npm run vim:oracle`, `npm run check`, `npm run coverage`, `npm run test:e2e` e screenshots
- [x] Atualizar *Log* e status para `review`

## Notas para o batch

- **Tamanho:** grande, com cerca de 35 lições novas. Se o lote apertar,
  divida em duas: unidades 1–7 (movimento) e 8–13 (edição).
- **Bloquear se:** um exemplo não bater com o Neovim e não houver
  variante simples que bata. Nesse caso, troque o exemplo e registre no
  *Log*.

## Log

- 2026-11-21 — Escopo de *Files owned* ampliado para incluir `src/ui/VimScreen.tsx`, `src/ui/vim/EditDrill.tsx`, `src/ui/App.tsx`, `src/ui/shell/sections.ts`, `src/ui/shell/Shell.tsx`, `src/ui/coherence.test.tsx` e `src/ui/app.css`, necessários para AC-5 (botão "Treinar" e links "aprender" nos painéis de comandos), AC-6 (Aprender visível somente leitura no celular, layout das unidades e remoção do ramo morto de pasta vazia em `Shell.tsx`) e atualização do seletor da lista em `coherence.test.tsx`.
- 2026-11-21 — Currículo completo implementado em `src/vim/curriculum.ts` com todas as 15 unidades e 39 lições (unidades 1–7 de movimento em ordem dos níveis 1–7, unidades 8–13 de edição e unidades 14–15 mantendo as 8 lições de registradores e macros da T16). Todo comando de `levelHelp(7)` (33) e `EDIT_HELP` (59) aparece em exatamente uma lição, reaproveitando as descrições originais sem duplicação.
- 2026-11-21 — Ajustes menores: pontuação das explicações de `number-lines` e `increment-indexes` em `src/vim/lessons.ts` ajustada para até 3 frases (AC-2); exercícios das lições da T16 carregados de forma preguiçosa (`get exercises()`) e lista de comandos de `EditDrill` memoizada para evitar trabalho desnecessário na importação/renderização.
- 2026-11-21 — Gates verdes:
  - `npm run vim:oracle`: `2200/2200 cases agree` (todos os 39 exemplos `learn:` validados no `nvim --clean --headless`).
  - `npm run check`: verde (`tsc --noEmit`, `eslint --max-warnings 0`, `prettier --check`, `107/107` arquivos / `3892/3892` testes, `vite build`).
  - `npm run coverage`: verde (`99.96%` statements, `99.4%` branches, `100%` functions, `99.97%` lines; todos os limiares atendidos).
  - `npm run test:e2e`: `27/27 passed` (incluindo fluxo completo de retirada adaptativa e botão "Treinar").
- 2026-11-21 — Verificação visual (AC-6): capturadas e inspecionadas 5 capturas Playwright em `.batch/visual/shots/` (`desktop-t20-learn-units.png`, `desktop-t20-learn-lesson.png`, `desktop-t20-motion-commands.png`, `phone-t20-learn-units.png`, `phone-t20-learn-lesson.png`). Layout desktop e celular conferidos: ordem do painel da T18 mantida, sem seletor no rodapé, Aprender visível e somente leitura no celular, links `aprender` no painel Comandos.
- 2026-11-21 — Verificação manual para o dono: percorrer as unidades 1, 8 e 15 e avaliar a clareza das explicações e dos exemplos.
