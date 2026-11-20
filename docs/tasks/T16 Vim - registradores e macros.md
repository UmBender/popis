---
id: T16
title: Vim - registradores e macros
status: in-progress
depends_on: [T15]
branch: task/T16-vim-macros
adrs: [ADR-T16-1]
tags: [task]
---

# T16 Vim - registradores e macros

## Goal

Registradores e macros no motor de Vim, com um treino feito das tarefas
repetitivas de CP em que eles economizam tempo. Exemplos: gerar entradas
de teste numeradas, transformar a entrada de exemplo num inicializador
de vetor, ler várias variáveis com `cin`, e apagar uma linha sem perder o
que foi copiado. O dono ainda não usa esses comandos, então cada um vem
com uma explicação curta e um exercício guiado antes do treino livre.

## Spec (rascunho; o passo de spec nomeia os testes)

Decisões do dono: as mesmas da [[T13 Vim - movimentos]]. O dono pediu
uma forma de praticar registradores e macros ligada a CP.

- **AC-1**: **Registradores:**
  - o sem nome (`""`), o de cópia (`"0`) e os de apagar (`"1`–`"9`, com
    o deslocamento do Vim, e `"-` para apagar dentro de uma linha);
  - os nomeados `"a`–`"z`, e `"A`–`"Z`, que acrescentam;
  - o buraco negro `"_`;
  - `"x` antes de `y d c p P x` e no modo visual;
  - `<C-r>x` no modo de inserção cola o registrador.
- **AC-2**: **Macros:** `q{a-z}` … `q` grava, `@{a-z}` executa, `@@`
  repete, a contagem funciona (`9@a`), e a macro para no primeiro
  movimento que falha, como no Vim. A macro fica no registrador, então
  `"ap` mostra o que foi gravado.
- **AC-3**: **Números:** `<C-a>` e `<C-x>` somam e subtraem no próximo
  número da linha, com contagem e negativos, como no Vim (`nrformats`
  padrão do Neovim).
- **AC-4**: **Fidelidade:** os casos de T16 entram em `src/vim/cases/` e
  no `npm run vim:oracle`, incluindo o conteúdo dos registradores depois
  de cada caso, com pelo menos 5 casos por comando.
- **AC-5**: **Tipos de edição de CP** (pelo menos 8), cada um com a
  referência verificada pelo motor (teste de propriedade):
  - gerar as linhas `1`…`n` a partir de `1` (`qayyp<C-a>q` e
    `{n-2}@a`);
  - gerar `n` casos de teste copiando um bloco (`"ayap` e `"ap`
    repetido);
  - transformar `3 1 4 1 5` em `{3, 1, 4, 1, 5}` (macro ou `:s`);
  - transformar várias declarações `int a;` em `cin >> a;` (macro sobre
    as linhas);
  - trocar a ordem de duas colunas em várias linhas (macro);
  - apagar linhas de debug sem perder o yank anterior (`"_dd` e depois
    `p`, ou `"0p`);
  - guardar um trecho em `"a`, editar outra coisa e colar o trecho em dois
    lugares;
  - incrementar todos os índices de um bloco (`<C-a>` com `.`, ou em
    bloco visual com `g<C-a>`).
- **AC-6**: **Aprender antes de treinar:** um modo "Aprender" mostra
  cada comando novo com:
  - uma explicação curta em português;
  - um exemplo animado (as teclas aparecem uma a uma, e o buffer muda);
  - um exercício guiado com a referência visível, que só libera o treino
    livre daquele tipo depois de feito uma vez.

  Os tipos já liberados ficam salvos.
- **AC-7**: **Tela:**
  - a linha de status mostra "gravando @a" durante a gravação;
  - um painel mostra os registradores não vazios (como o `:reg`), com
    `^J` no lugar das quebras de linha;
  - o painel "Comandos" ganha a explicação de cada registrador e de cada
    macro, com o uso em CP.
- **AC-8**: **E2E:** no Chromium, o tipo "gerar linhas 1…n" é feito com
  a macro digitada no navegador, e o painel de registradores mostra a
  macro gravada.

## Testes por critério

- **AC-1**: `src/vim/registers.test.ts` (grupos "named and unnamed",
  "numbered shift", "small delete", "black hole", "append", "insert
  paste") e os casos `"ay`, `"_d`, `"1p`, `"-p`, `"Ay`, `<C-r>`.
- **AC-2**: `src/vim/macros.test.ts` (gravar, `@a`, `@@`, contagem,
  parada no primeiro erro, `"ap` mostra a macro) e os casos `q`, `@`.
- **AC-3**: `src/vim/increment.test.ts` e os casos `<C-a>`, `<C-x>`.
- **AC-4**: `src/vim/register-cases.test.ts` (o motor contra cada caso,
  incluindo os registradores, pelo menos 5 casos por comando) e
  `npm run vim:oracle`.
- **AC-5**: `src/vim/drills/register-edit.test.ts` (8 tipos, forma da
  referência) e `src/vim/drills/edit.prop.test.ts` (a referência dá o
  "depois", para todo tipo).
- **AC-6**: `src/vim/lessons.test.ts` (uma lição por tipo, o exemplo
  chega ao "depois"), `src/storage/vim-learn.test.ts` (liberados salvos),
  `src/ui/VimScreenLearn.test.tsx` (animação com relógio falso,
  exercício guiado, liberação do tipo).
- **AC-7**: `src/ui/VimScreenRegisters.test.tsx` ("gravando @a", painel
  de registradores com `^J`) e `src/vim/edit-help.test.ts`.
- **AC-8**: `tests/e2e/vim.spec.ts` (caso da T16).

## Out of scope

- Registradores de sistema (`"+`, `"*`), que dependem da área de
  transferência, e os somente leitura (`".`, `"%`, `":`).
- Macros recursivas e edição de macro colando e copiando de volta.
- `:normal` e `:g`.
- `<C-a>`/`<C-x>`/`g<C-a>` no modo visual e `p` no modo visual (a T15 não
  tem `p` visual): o AC-5 usa `<C-a>` com `.` (ADR-T16-1).

## Files owned

- `src/vim/**`
- `src/storage/vim*.ts` (tipos liberados no modo Aprender)
- `src/ui/VimScreen*.tsx`, `src/ui/vim/**`, `src/ui/app.css`
- `tests/e2e/vim.spec.ts`
- `vite.config.ts` (só limiares de cobertura)
- `scripts/vim-oracle.mjs` (acrescentado: o AC-4 pede o conteúdo dos
  registradores no oráculo, e o script é dele)
- `src/ui/App.test.tsx`, só se um teste existente quebrar por causa da
  tela nova (com motivo no *Log*)
- `docs/decisions/ADR-T16-*.md`

## Subtasks

- [ ] Spec e ADR-T16-1.
- [ ] Testes vermelhos (casos do oráculo, motor, geradores, lições, tela, e2e).
- [ ] Modelos (tipos e assinaturas).
- [ ] Comportamento (registradores, macros, `<C-a>`, geradores, Aprender, tela).
- [ ] Qualidade: `check`, cobertura, oráculo.
- [ ] Docs e *Log*.

## Notas para o batch

- Base: `after:T15`.
- Comandos extras: os mesmos da T13.
- Risco: o exemplo animado do AC-6 usa timers; nos testes, use o relógio
  falso.

## Log
