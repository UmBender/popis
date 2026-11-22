---
id: ADR-T25-1
title: Treino de comandos do GDB com transcrições gravadas, oráculo e reuso do Aprender
status: accepted
kind: decision
date: 2026-11-21
task: T25
builds_on: [ADR-0002, ADR-T18-1, ADR-T19-1, ADR-T20-1, ADR-T22-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T25-1 Treino de comandos do GDB com transcrições gravadas, oráculo e reuso do Aprender

## Context

O treino de comandos do GDB precisa ensinar 9 unidades de currículo (de compilar e iniciar até crashes e exceções) e oferecer rodadas contra o relógio onde qualquer forma equivalente aceita pelo GNU gdb 18.1 (`b`, `break`, `arquivo:linha`, `if i==5` contra `if 5 == i`, `up` contra `frame` quando levam ao mesmo frame) é validada sem rodar o gdb no navegador (ADR-0002). Além disso, a pasta GDB traz seu próprio item "Aprender", compartilhando a regra de retirada adaptativa e o status de unidades introduzidos na T20 (ADR-T20-1), e ambos os itens de GDB devem funcionar plenamente em telas touch.

## Decision

1. **Parser e verificador por efeito em TypeScript puro (`src/gdb/commands.ts`, `src/gdb/check.ts`):** mantemos o vocabulário real de comandos e aliases do GNU gdb 18.1 para resolver abreviações por prefixo único e rejeitar prefixos ambíguos com a mesma mensagem do gdb (`Ambiguous command "…": …`). Cada comando vira uma ação normalizada (`GdbAction`) comparada no contexto do ponto de parada (arquivo atual, frame selecionado, tamanho da pilha e normalização de condições/expressões).
2. **Transcrições gravadas e oráculo (`scripts/gdb-oracle.mjs`, `src/gdb/cases/`):** esta task não simula a execução de C++. Os exemplos animados das 9 unidades do Aprender são transcrições gravadas do GNU gdb 18.1 compilando cada programa com `g++ -g -O0` em `os.tmpdir()` e rodando `gdb -nx -batch -iex "set debuginfod enabled off"`. Endereços são mascarados como `ADDR`, PIDs como `N` e caminhos temporários removidos. O comando `npm run gdb:oracle` fica fora de `npm run check` (por exigir `gdb` e `g++`) e confere: (a) prefixos aceitos e ambíguos contra o gdb real; (b) equivalência observável (`info breakpoints`, `info display`, linha/frame) entre a resposta canônica e alternativas de uma amostra fixa de seeds de cada tipo do treino; (c) todas as transcrições do Aprender (`--write` regrava as transcrições).
3. **Extração mínima para `src/learn/curriculum.ts`:** os helpers agnósticos de currículo (`unitStatus`, `nextUncompleted`, `nextFadingStep` e tipos `LessonId`, `UnitStatus`, `ExerciseStep`) saem de `src/vim/curriculum.ts` para `src/learn/curriculum.ts`. `src/vim/curriculum.ts` apenas reexporta e delega, mantendo todos os testes existentes do Vim inalterados. O progresso do Aprender de GDB fica em `popis.gdb-learn` no mesmo formato v2 (`{ version: 2, completed }`) e as configurações/resultados do Comandos ficam em `popis.gdb` e `popis.gdb-results`.
4. **Eventos no registro T22:** `gdb.cmd` entra em `DRILLS` (`src/stats/event.ts`), com KC `gdb.cmd.<tipo>` por item da rodada.
5. **Árvore, acessibilidade e mobile:** a pasta `GDB` entra após `Vim` com `Aprender` (`gdb-learn`) e `Comandos` (`gdb-commands`), ambos com `touch: true` e sem modo somente leitura no celular. Como `Vim` já possui um item com rótulo visível `Aprender`, `TreeItem` ganha um campo opcional `ariaLabel` (usado como `"Aprender (GDB)"` em `gdb-learn`), mantendo o texto visível `"Aprender"` na árvore e nomes acessíveis únicos no `radiogroup` sem quebrar leitores de tela nem seletores existentes.

## Alternatives considered

- **Simular execução de C++ já na T25** — escopo da T27; aumentaria muito a complexidade sem benefício para treinar vocabulário e sintaxe de comandos.
- **Manter apenas uma lista reduzida de prefixos no parser** — divergiria do gdb real em prefixos como `ne`, `pr`, `st`, `di`, `fi`, `co`, `un` e falharia no oráculo.
- **Usar o mesmo `aria-label="Aprender"` para Vim e GDB** — criaria dois rádios homônimos no mesmo `radiogroup`, prejudicando acessibilidade e quebrando os testes existentes do Vim.

## Consequences

- Qualquer comando ou alias novo em `src/gdb/commands.ts` é verificado contra o gdb 18.1 instalado pelo oráculo.
- O currículo de GDB da T26 (`Saída`, unidades 10–14) poderá reusar diretamente `src/learn/curriculum.ts`, `src/gdb/curriculum.ts`, `src/gdb/cases/` e `scripts/gdb-oracle.mjs`.
- As transcrições dependem da versão de referência (`gdb 18.1` + `g++ 16.2`); uma atualização futura pode exigir rodar `npm run gdb:oracle -- --write`.

## Rollback plan

Reverter os commits da branch `task/T25-gdb-commands`, restaurar os helpers diretamente em `src/vim/curriculum.ts` e remover `gdb.cmd` de `DRILLS` e a pasta `GDB` de `SECTIONS`.
