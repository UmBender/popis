---
id: ADR-T20-1
title: Currículo e retirada adaptativa no Aprender
status: accepted
kind: decision
date: 2026-11-21
task: T20
builds_on: [ADR-T16-1, ADR-T18-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T20-1 Currículo e retirada adaptativa no Aprender

## Context

O modo Aprender (ADR-T16-1) tinha apenas 8 lições de registradores e macros, cada uma com um único exercício guiado com a sequência de referência sempre visível. Quem está começando no Vim não tinha onde aprender movimentos (`h j k l`, `w`, `f`, `/`), operadores (`d`, `c`, `y`), objetos de texto (`iw`, `ci(`), visual ou substituição em ordem progressiva, nem retirada gradual de ajuda antes do treino livre.

## Decision

1. **Currículo em `src/vim/curriculum.ts`:** organizamos 15 unidades ordenadas (unidades 1–7 de movimento seguindo os níveis 1–7 de `levels.ts`, unidades 8–13 de edição e unidades 14–15 reaproveitando as 8 lições de registradores e macros da T16). Cada lição referencia as chaves de `levelHelp` e `EDIT_HELP` (`helpKeys`) para que as descrições de uma linha venham de uma única fonte sem duplicação, e todo comando de `levelHelp(7)` e `EDIT_HELP` aparece em exatamente uma lição.
2. **Exemplos no oráculo:** cada exemplo animado (de movimento ou edição) entra nos arquivos `src/vim/cases/curriculum-motion.ts` e `src/vim/cases/curriculum-edit.ts`, verificados por `npm run vim:oracle` contra `nvim --clean --headless`.
3. **Retirada adaptativa em 3 exercícios:** cada lição oferece 3 exercícios (passo 0: sequência de referência e próxima tecla destacada; passo 1: apenas os comandos da lição; passo 2: sem ajuda). Concluir o passo 0 ou 1 com no máximo o número mínimo de teclas pula o próximo nível de ajuda; concluir sem ajuda (ou pular o passo 2 ao acertar o passo 1 no mínimo) marca a lição como concluída.
4. **Persistência v2 em `popis.vim-learn`:** guardamos `{ version: 2, completed: LessonId[] }`. Ao ler o formato v1 da T16 (`{ unlocked: RegisterKind[] }`), os tipos liberados migram automaticamente para `completed`, preservando `loadUnlocked` e o backup/importação da T22.
5. **Leitura no celular:** `vim-learn` passa a ter `touch: true` em `SECTIONS`. Em telas touch, o Aprender exibe a explicação, os comandos e o exemplo animado, ocultando o exercício interativo que exige teclado físico.

## Alternatives considered

- **Manter apenas 1 exercício por lição** — não aplica o efeito de retirada gradual (*fading*) nem prepara a passagem para o treino livre.
- **Criar uma nova chave no `localStorage` para o currículo** — fragmentaria o progresso do Aprender e exigiria alterar o esquema de exportação da T22.

## Consequences

- Todo comando de movimento e edição fica alcançável a partir do painel "Comandos" via link "aprender", e toda lição concluída aponta diretamente para o nível ou tipos de edição correspondentes.
- Qualquer novo comando adicionado a `levels.ts` ou `edit-help.ts` precisará entrar em uma lição do currículo (garantido por teste).

## Rollback plan

Reverter os commits da branch `task/T20-vim-curriculum` e restaurar `vim-learn` com `touch: false` em `src/ui/shell/sections.ts`. O formato v2 em `popis.vim-learn` continua compatível com `parseUnlocked`.
