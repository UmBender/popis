---
id: T25
title: GDB - comandos
status: done
depends_on: [T20, T22]
branch: task/T25-gdb-commands
adrs: [ADR-T25-1]
tags: [task]
---

# T25 GDB - comandos

## Goal

Uma pasta **GDB** na árvore com dois itens: **Aprender** e **Comandos**.
No Comandos, aparece um programa C++ curto com o ponto onde o gdb está
parado e um objetivo em português ("pare na linha 14 só quando
`i == 5`"). A pessoa digita o comando do gdb que faz isso, e o app aceita
qualquer forma equivalente (`b 14 if i == 5`, `break sol.cpp:14 if i==5`).
O Aprender é um currículo em ordem, como o do Vim (T20, ADR-T20-1): cada
lição tem explicação, uma sessão de exemplo animada e exercícios com
retirada da ajuda. Esta task não simula a execução de programas. As
sessões de exemplo são transcrições gravadas do gdb real e conferidas
pelo oráculo.

## Base em pesquisa

A mesma da T20: exemplo resolvido antes do problema, com a ajuda
retirada aos poucos e de forma adaptativa (Salden et al., 2010), e pulo
livre de lição por causa do *expertise reversal*. Fontes em
[[Métricas e evolução]].

## Escolhas de padrão (o dono pode mudar)

- **Referência:** GNU gdb 18.1 e g++ 16.2 (os instalados), em x86-64,
  com `g++ -g -O0`. Os programas são C++ no estilo de programação
  competitiva.
- A rodada dura 60 s, como o Movimento do Vim.
- Enter envia o comando, como no gdb. Um erro mostra a resposta canônica
  e uma linha explicando por quê, e passa ao próximo item.
- Tudo funciona no celular, porque os comandos são curtos e digitados
  numa caixa de texto. O Vim só aparece para leitura no celular, mas
  aqui não há motivo para isso.

## Spec

- **AC-1**: **Comandos e abreviações** em `src/gdb/commands.ts`, em
  TypeScript puro:
  - uma tabela com os comandos dos treinos e das lições e com os aliases
    predefinidos do gdb (`b`, `c`, `n`, `s`, `p`, `bt`, `where`, `i`,
    `u`, `f`, `tb`);
  - `parseCommand(texto)` resolve prefixos únicos como o gdb faz
    (`brea` → `break`, `fin` → `finish`) e rejeita os ambíguos com a
    mesma mensagem que o gdb dá;
  - o resultado é uma **ação normalizada**, por exemplo
    `{ kind: "break", at: { line: 14 }, cond: "i == 5", temporary: false }`.
  - Testes: `src/gdb/commands.test.ts` ("parser resolves unique prefixes like gdb", "parser rejects ambiguous prefixes", "parser normalizes break forms to the same action").
- **AC-2**: **Verificador por efeito:** a resposta é certa quando a ação
  normalizada dela é igual à esperada. Precisa ter uma tabela de casos
  com:
  - formas aceitas: alias contra nome completo, `arquivo:linha` contra
    `linha`, função contra `arquivo:função`, espaços na condição, `==`
    nos dois sentidos, `next 3` contra `n 3`;
  - quase-acertos rejeitados: `step` no lugar de `next` quando o
    objetivo é pular a chamada, a linha errada, a condição com `=` no
    lugar de `==`, `break` no lugar de `tbreak`, `watch` no lugar de
    `rwatch`, `frame 2` no lugar de `up 2` quando a contagem relativa
    leva a outro frame.
  - Testes: `src/gdb/check.test.ts` ("checker accepts equivalent command forms", "checker rejects near misses").
- **AC-3**: **Programas e gerador:**
  - `src/gdb/programs.ts` tem pelo menos 12 programas C++ curtos (até
    40 linhas) de programação competitiva: laços, prefix sum, busca
    binária, DFS recursiva, struct, lista ligada e um que dá
    segmentation fault;
  - o gerador `src/gdb/cmd-drill.ts` sorteia, a partir da seed, o
    programa, o estado de parada e os valores do objetivo;
  - os tipos (KC `gdb.cmd.<tipo>`) são: `iniciar` (`run`,
    `run < in.txt`, `start`), `break-linha`, `break-funcao`, `tbreak`,
    `break-cond`, `condition`, `gerir` (`delete`, `disable`, `enable`,
    `info breakpoints`), `ignore`, `andar` (`next`, `step`, `finish`,
    `until`, `advance`, `continue N`), `olhar` (`print`, `display`,
    `info locals`, `info args`, `list`), `pilha` (`bt`, `frame`, `up`,
    `down`), `vigia` (`watch`, `rwatch`, `awatch`, `watch -l`), `mudar`
    (`set var`, `print x = …`, `call`) e `crash` (`bt` e `frame` depois
    de um sinal, `catch throw`);
  - a pessoa marca quais tipos quer treinar, como na Edição do Vim.
  - Testes: `src/gdb/cmd-drill.prop.test.ts`, que verifica para muitas
    seeds e cada tipo: a resposta canônica é aceita; a linha, a função
    e a variável existem no programa e fazem sentido no estado de parada;
    a mesma seed gera o mesmo item. Também `src/gdb/programs.test.ts`
    ("every program has unique line numbers for its targets").
- **AC-4**: **Oráculo** `npm run gdb:oracle` (`scripts/gdb-oracle.mjs`),
  fora do `check` porque exige `gdb` e `g++`, no mesmo molde do
  `vim:oracle`:
  - compila cada programa com `g++ -g -O0` e roda o gdb em `-batch` com
    `set debuginfod enabled off`;
  - para uma amostra fixa de seeds de cada tipo, confere que a resposta
    canônica e cada forma equivalente aceita têm o mesmo efeito
    observável no gdb real: a saída de `info breakpoints`, de
    `info display` e a linha de parada;
  - confere que toda abreviação que o parser aceita ou rejeita como
    ambígua o gdb também aceita ou rejeita;
  - confere cada transcrição de exemplo do Aprender, com os endereços
    mascarados (`0x7ff…` → `ADDR`);
  - `--write` regrava as transcrições a partir do gdb real.
  - Testes: `npm run gdb:oracle`, com o resultado registrado no *Log*.
- **AC-5**: **Treino Comandos** (`src/ui/GdbScreen.tsx`,
  `src/ui/gdb/CommandDrill.tsx`):
  - o código aparece com números de linha, a seta na linha atual, os
    breakpoints marcados e as últimas linhas da sessão;
  - usa as teclas e os componentes comuns da T19 (ADR-T19-1): RoundBar,
    Result e RoundHistory;
  - o resultado mostra, por tipo, os acertos, o tempo e os comandos
    errados com a forma canônica;
  - cada item vira um evento no registro da T22, com drill `gdb.cmd` e o
    KC do tipo.
  - Testes: `src/ui/GdbScreenCommands.test.tsx` ("Enter submits and an accepted alias counts as correct", "a wrong command shows the canonical form and moves on", "the round ends at 60 s on the fake clock"), `src/stats/event.test.ts` (o drill `gdb.cmd` é aceito).
- **AC-6**: **Aprender** (`src/gdb/curriculum.ts`), com unidades em
  ordem:

  | Unidade | Lições | Libera |
  |---|---|---|
  | 1 Preparar | `g++ -g -O0` e por quê; `gdb ./sol`; `run`, `run < in.txt`, `start`, `kill`, `quit` | tipo `iniciar` |
  | 2 Pontos de parada | `break` linha, função e `arquivo:linha`; `tbreak`; `info breakpoints`, `delete`, `disable`, `enable` | `break-*`, `tbreak`, `gerir` |
  | 3 Andar | `next` × `step`; `continue`, `finish`, `until`, `advance`; contagem e Enter repetindo | `andar` |
  | 4 Olhar | `print`; `display`/`undisplay`; `info locals`, `info args`; `list` | `olhar` |
  | 5 Pilha | `backtrace`; `frame`, `up`, `down` | `pilha` |
  | 6 Condições | `break … if`; `condition`; `ignore` | `break-cond`, `condition`, `ignore` |
  | 7 Vigias | `watch`; `rwatch`, `awatch`; `watch -l` | `vigia` |
  | 8 Mudar o estado | `set var`, `print x = …`; `call` | `mudar` |
  | 9 Crash | `bt` depois de SIGSEGV, SIGFPE e abort; subir até o código da pessoa; `catch throw` | `crash` |

  Cada lição tem:
  - uma explicação de até 3 frases em português;
  - uma sessão de exemplo animada, comando a comando, com a seta
    andando no código;
  - 3 exercícios: (1) o comando inteiro à vista; (2) só os comandos da
    lição à vista; (3) sem ajuda.

  Acertar de primeira no exercício 1 ou 2 pula o próximo nível de ajuda
  (a mesma regra de ADR-T20-1). Ao concluir a lição, o botão "Treinar"
  abre o Comandos com os tipos dela marcados. No painel de comandos do
  treino, cada comando tem um link "aprender" para a sua lição.
  - Testes: `src/gdb/curriculum.test.ts` ("every command of the table appears in exactly one lesson", "every lesson has a short explanation and 3 exercises whose answers pass the checker", "every lesson example has an oracle transcript"), `src/ui/GdbScreenLearn.test.tsx` ("adaptive fading skips step 2 on a first-try answer", "Treinar opens Comandos with the lesson kinds selected", "aprender link opens the command lesson").
- **AC-7**: **Reuso e progresso:**
  - a regra de retirada, o status das unidades (nova, em andamento,
    concluída) e "Enter abre a próxima lição não concluída" vêm do Vim;
  - se esse código for específico do Vim, ele é extraído para
    `src/learn/` sem mudar o comportamento do Vim, e os testes do Vim
    continuam passando sem edição;
  - o progresso fica em `popis.gdb-learn`, no formato v2 de
    `popis.vim-learn`;
  - as configurações do Comandos ficam em `popis.gdb`.
  - Testes: `src/storage/gdb-learn.test.ts`, `src/storage/gdb.test.ts`, os testes existentes de `src/vim/curriculum.test.ts` sem mudança.
- **AC-8**: **Árvore e layout:**
  - a pasta "GDB" entra depois de "Vim", com "Aprender" e "Comandos",
    os dois visíveis no celular;
  - os atalhos 1–9 não mudam;
  - o layout segue a ordem do painel da T18.
  - Testes: `src/ui/shell/sections.test.ts` ("GDB folder follows Vim and keeps shortcuts 1-9"), `tests/e2e/gdb.spec.ts` (abrir uma lição, fazer os 3 exercícios, treinar uma rodada; também no projeto mobile).

## Out of scope

- Executar ou simular programas (T27). As paradas são estados gravados.
- Formatos de saída (`p/x`, `x/`) e o valor impresso (T26).
- Assembly (`disas`, `stepi`, `info registers`), TUI, Python, threads,
  `attach` e core dumps.

## Files owned

- `src/gdb/` (novo): `commands.ts`, `check.ts`, `programs.ts`,
  `cmd-drill.ts`, `round.ts`, `curriculum.ts`, `cases/` e os testes ao lado
- `src/learn/` (novo): `curriculum.ts`, `curriculum.test.ts`; `src/vim/curriculum.ts`
- `src/storage/gdb.ts`, `src/storage/gdb-learn.ts` e os testes
- `src/stats/event.ts`, `src/stats/event.test.ts` (novo)
- `src/ui/GdbScreen.tsx`, `src/ui/gdb/` (novo), `src/ui/App.tsx`,
  `src/ui/shell/sections.ts`, `src/ui/shell/sections.test.ts`,
  `src/ui/shell/Shell.tsx`, `src/ui/shell/Shell.test.tsx`,
  `src/ui/coherence.test.tsx`, `src/ui/app.css`,
  `src/ui/GdbScreenCommands.test.tsx` (novo), `src/ui/GdbScreenLearn.test.tsx` (novo)
- `scripts/gdb-oracle.mjs` (novo), `package.json` (script `gdb:oracle`),
  `vite.config.ts` (limiares de cobertura para `src/gdb/**` e `src/learn/**`),
  `playwright.config.ts` (incluir `gdb.spec.ts` no projeto `mobile`)
- `tests/e2e/gdb.spec.ts` (novo), `tests/e2e/coherence.spec.ts`

## Subtasks (one commit each)

- [x] spec: ADR-T25-1 (simulação por transcrição gravada, oráculo gdb, reuso do Aprender) e testes nomeados
- [x] tests: parser, verificador, gerador, currículo, telas
- [x] models: tipos de ação, programa, item e lição
- [x] behaviour: parser, gerador, transcrições, telas e oráculo
- [x] quality: `npm run check`, `gdb:oracle`, coverage, e2e e screenshots
- [x] docs: *Log* e status `review`

## Notas para o batch

- **Tamanho:** grande, porque são cerca de 30 lições. Se apertar,
  entregue as unidades 1–5 e o treino com os tipos delas, e deixe as
  unidades 6–9 registradas no *Log* para uma task nova.
- **Bloquear se:** o gdb real discordar de uma transcrição e não houver
  variante simples do programa que concorde.

## Log

- 2026-11-22 — Escopo completo entregue (sem recorte): todas as 9 unidades (28 lições) do Aprender, todos os 14 tipos (`iniciar`, `break-linha`, `break-funcao`, `tbreak`, `break-cond`, `condition`, `gerir`, `ignore`, `andar`, `olhar`, `pilha`, `vigia`, `mudar`, `crash`), 14 programas C++ curtos em `src/gdb/programs.ts`, parser com vocabulário real do GNU gdb 18.1, verificador por efeito em `src/gdb/check.ts`, motor de rodada em `src/gdb/round.ts` com eventos `gdb.cmd` (T22), e oráculo `npm run gdb:oracle`.
- 2026-11-22 — Extração de reuso (AC-7): helpers de status de unidade, próxima lição não concluída e retirada adaptativa (`unitStatus`, `nextUncompleted`, `nextFadingStep`) extraídos para `src/learn/curriculum.ts`; `src/vim/curriculum.ts` apenas reexporta e delega, mantendo `src/vim/curriculum.test.ts` intacto e verde. Progresso salvo em `popis.gdb-learn` (v2) e configurações/resultados em `popis.gdb` e `popis.gdb-results`.
- 2026-11-22 — UNATTENDED CHOICE e ampliação de *Files owned*:
  - `TreeItem` (`src/ui/shell/sections.ts`, `src/ui/shell/Shell.tsx`) ganhou campo opcional `ariaLabel` (`"Aprender (GDB)"` em `gdb-learn`, mantendo rótulo visível `"Aprender"` e `<h1>Aprender</h1>`), evitando rádios homônimos no `radiogroup` e preservando todos os testes existentes do Vim sem alteração.
  - `src/ui/shell/Shell.test.tsx`, `src/ui/coherence.test.tsx` e `tests/e2e/coherence.spec.ts` ajustados minimamente para clicar pelo `ariaLabel ?? label` e conferir unicidade por `(pasta, h1)` e por `aria-label`.
  - `playwright.config.ts` atualizado para incluir `gdb.spec.ts` no projeto `mobile` (Pixel 7 sob `/popis/`); `vite.config.ts` atualizado com limiares para `src/gdb/**` (`99/98/100/95`) e `src/learn/**` (`100/100/100/100`).
- 2026-11-22 — Achados corrigidos pelo oráculo real e pelos testes:
  - No `abort-assert` com glibc local, `check_idx` fica no frame `#5` (5 frames internos da libc `#0..#4`), ajustado no gerador e em `u9-up-user`.
  - Em `two-pointers`, `cur > thresh` só dispara após `cur += a[r]` (linha 8); em `sum-loop`, `condition` precisa de dois breakpoints dentro do escopo de `i` (linhas 6 e 7); em `binary-search`, `set lo = ...` é ambíguo no gdb real (`local-environment`, `logging`), removida essa alternativa em favor de `set var`/`set variable`/`p`.
  - Corrigida a normalização de condições compostas entre parênteses (`(i > 0 && a[i] != -1) || sum == 0`) em `src/gdb/commands.ts` ao remover parênteses de cada ramo `||` antes de dividir por `&&`.
- 2026-11-22 — Verificação visual: capturadas e inspecionadas 10 capturas Playwright em `.batch/visual/shots/` (`desktop` e `phone` para lista do Aprender, lição aberta com exemplo e exercício, Comandos, feedback de erro e tela de resultado). Duas falhas visuais encontradas e corrigidas: crases literais de Markdown nas explicações de `src/gdb/curriculum.ts` removidas, e sondas de `frame` e `info breakpoints` separadas em `scripts/gdb-oracle.mjs` (com verificação permanente em `src/gdb/curriculum.test.ts`) para a seta `=>` não acender antes de `run`; capturas da lição refeitas e conferidas.
- 2026-11-22 — Gates verdes:
  - `npm run gdb:oracle`: `gdb oracle: prefixes 159/159, transcripts 28/28, equivalences 119/119`.
  - `npm run check`: verde (`tsc --noEmit`, `eslint . --max-warnings 0`, `prettier --check .`, `137/137` arquivos / `4079/4079` testes, `vite build`).
  - `npm run coverage`: verde (`99.86%` statements, `98.97%` branches, `100%` functions, `99.97%` lines; `src/gdb/**` `98.75/97.27/100/99.84`, `src/learn/**` `100/100/100/100`, `src/ui/gdb/**` `100/99.4/100/100`; todos os limiares atendidos).
  - `npm run test:fuzz -- src/gdb/cmd-drill.prop.test.ts`: verde (`25/25` arquivos / `199/199` testes com `FC_NUM_RUNS=20000`).
  - `npm run test:e2e`: `tests/e2e/gdb.spec.ts` verde em `chromium` e `mobile` (`/popis/`), mais toda a suíte E2E (`31/32` antes do ajuste de `coherence.spec.ts` + `4/4` em `coherence.spec.ts` após ajuste).
- 2026-11-22 — Verificação manual para o dono: ler as explicações das unidades 1, 3 e 9 no Aprender, e digitar alguns comandos no celular.
