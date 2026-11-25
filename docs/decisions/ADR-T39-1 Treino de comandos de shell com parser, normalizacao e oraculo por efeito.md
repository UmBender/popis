---
id: ADR-T39-1
title: Treino de comandos de shell com parser, normalização e oráculo por efeito
status: accepted
kind: decision
date: 2026-11-25
task: T39
builds_on: [ADR-0002, ADR-T18-1, ADR-T19-1, ADR-T20-1, ADR-T22-1, ADR-T25-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T39-1 Treino de comandos de shell com parser, normalização e oráculo por efeito

## Context

O treino de comandos de bash da prova (T39) precisa validar respostas equivalentes ("ordem das flags", `diff -Z` contra `diff --ignore-trailing-space`, `./a <in >out` contra `./a >out <in`, `&&` contra `;` quando o objetivo não exige parar no erro) sem executar bash no navegador (ADR-0002), oferecer 9 unidades de currículo no molde do Aprender de GDB (ADR-T25-1) e funcionar em telas touch. Além disso, o repositório já usa `src/ui/shell/` e `tests/e2e/shell.spec.ts` para a casca da aplicação (T18), e `GDB` já possui itens rotulados `"Aprender"` e `"Comandos"` no mesmo `radiogroup`.

## Decision

1. **Parser de subconjunto do bash em TypeScript puro (`src/shell/parse.ts`):** escrito à mão, sem dependências npm. Cobre comandos simples, argumentos com aspas simples/duplas e escapes, variáveis (`$var`, `${var}`), substituição de comando `$(…)`, substituição de processo `<(…)`, expansão de histórico (`!!`, `!$`), redirecionamentos (`<`, `>`, `>>`, `2>`, `2>&1`, `&>`), pipes (`|`), listas (`&&`, `||`, `;`), laços `for … in …; do …; done` e `while …; do …; done`, e definições de função `nome() { …; }`. Construções fora do subconjunto (`case`, `if`, `until`, `select`, `<<`, `<<<`, `&`) devolvem erro legível em português (`o treino não entende \`case\``), nunca uma exceção. O mesmo módulo exporta `formatShell` para garantir ida e volta (`parseShell(formatShell(t)) === t`).
2. **Verificador por forma normalizada (`src/shell/check.ts`):** cada comando conhecido (`g++`, `diff`, `cmp`, `timeout`, `time`, `ulimit`, `head`, `tail`, `wc`, `sort`, `uniq`, `grep`, `cat`, `seq`, `cp`, `mv`, `mkdir`, `ls`, `cd`, `rm`, `tee`, `alias`, `source`, `.`, `break`, `echo`) normaliza flags agrupadas/separadas, formas longas para curtas, ordem de flags comutativas, redirecionamentos independentes (preservando a diferença semântica entre `> out 2>&1` e `2>&1 > out`), duração `Ns` em `timeout`, `seq 1 N` contra `seq N` e `.` contra `source`. Cada item compara a árvore normalizada contra o conjunto de árvores aceitas e devolve mensagens específicas em português para quase-acertos.
3. **Oráculo por efeito (`scripts/shell-oracle.mjs`, `npm run shell:oracle`):** fora de `npm run check` por rodar GNU bash 5.3 e g++ 16.2. Executa tudo em pasta temporária isolada (`mkdtemp(join(tmpdir(), "popis-shell-"))`) com `HOME` apontando para essa pasta e `LC_ALL=C`, sem nunca tocar o repositório nem o `$HOME` real. Compila fixtures C++ pequenas (`a`, `sol`, `brute`, `gen`, onde `sol` difere de `brute` na seed 7), verifica que a forma canônica e as formas equivalentes produzem o mesmo efeito observável (código de saída, stdout, stderr mascarado e arquivos resultantes), confirma que cada quase-acerto da tabela produz efeito diferente e grava/valida as transcrições animadas do Aprender em `src/shell/cases/transcripts.ts` (`--write`).
4. **Currículo de 9 unidades e `.bashrc` próprio (`src/shell/curriculum.ts`):** reutiliza `src/learn/curriculum.ts` (ADR-T20-1, ADR-T25-1). Cada um dos 8 tipos de treino (`arquivos`, `compilar`, `rodar`, `comparar`, `stress`, `limites`, `texto`, `setup`) é liberado por exatamente uma lição nas unidades 1–8; a unidade 9 (`Atalhos`) é somente lição. A unidade 8 traz uma versão escrita para o popis das funções de prova (`c`, `cs`, `gen`, `rr`, `chk`) com o crédito "inspirado no .bashrc do GEMPRO Notebook", sem copiar o arquivo do notebook.
5. **Árvore, acessibilidade, persistência e organização de arquivos:**
   - A pasta `Shell` entra logo após `GDB` com `shell-learn` (`label: "Aprender"`, `ariaLabel: "Aprender (Shell)"`) e `shell-commands` (`label: "Comandos"`, `ariaLabel: "Comandos (Shell)"`), ambos `touch: true`, preservando os atalhos 1–9 e nomes acessíveis únicos no `radiogroup`.
   - Eventos usam `drill: "shell.cmd"` em `DRILLS` (`src/stats/event.ts`) e KC `shell.<tipo>`.
   - Persistência em `popis.shell`, `popis.shell-results` e `popis.shell-learn` (formato v2 `{ version: 2, completed }`).
   - Componentes da tela ficam em `src/ui/shell-drill/` (separados da casca `src/ui/shell/`) e os testes Playwright em `tests/e2e/shell-drill.spec.ts` (preservando `tests/e2e/shell.spec.ts` da T18).

## Alternatives considered

- **Usar um parser npm de bash (`bash-parser` / `mvdan-sh` WASM)** — violaria a política de zero novas dependências e aumentaria o bundle; o subconjunto de comandos de contest é pequeno e testável por propriedade.
- **Comparar comandos por string ou regex** — frágil para combinações de ordem de flags, redirecionamentos e aspas; a árvore normalizada trata todas as permutações de forma composicional.
- **Reutilizar `tests/e2e/shell.spec.ts`** — esse arquivo testa a navegação de teclado da casca do app (T18, somente desktop); separar `tests/e2e/shell-drill.spec.ts` permite incluí-lo no projeto `mobile` do Playwright sem quebrar os testes de desktop.

## Consequences

- Todas as equivalências e quase-acertos ficam ancorados no comportamento real do GNU bash 5.3 e g++ 16.2 via `npm run shell:oracle`.
- O verificador rejeita construções fora do subconjunto de forma explícita e amigável, sem exceções.
- A desambiguação de `ariaLabel` em `Shell` mantém todos os seletores de Vim e GDB intactos.

## Rollback plan

Reverter os commits da branch `task/T39-shell-commands`, remover `src/shell/`, `src/ui/ShellScreen.tsx`, `src/ui/shell-drill/`, `src/storage/shell*.ts`, `scripts/shell-oracle.mjs`, `tests/e2e/shell-drill.spec.ts` e retirar `"shell.cmd"` de `DRILLS` e a pasta `Shell` de `SECTIONS`.
