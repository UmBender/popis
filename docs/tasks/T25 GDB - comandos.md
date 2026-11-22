---
id: T25
title: GDB - comandos
status: in-progress
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
  `src/ui/shell/Shell.tsx`, `src/ui/shell/Shell.test.tsx`, `src/ui/app.css`,
  `src/ui/GdbScreenCommands.test.tsx` (novo), `src/ui/GdbScreenLearn.test.tsx` (novo)
- `scripts/gdb-oracle.mjs` (novo), `package.json` (script `gdb:oracle`),
  `vite.config.ts` (limiares de cobertura para `src/gdb/**` e `src/learn/**`),
  `playwright.config.ts` (incluir `gdb.spec.ts` no projeto `mobile`)
- `tests/e2e/gdb.spec.ts` (novo)

## Subtasks (one commit each)

- [ ] spec: ADR-T25-1 (simulação por transcrição gravada, oráculo gdb, reuso do Aprender) e testes nomeados
- [ ] tests: parser, verificador, gerador, currículo, telas
- [ ] models: tipos de ação, programa, item e lição
- [ ] behaviour: parser, gerador, transcrições, telas e oráculo
- [ ] quality: `npm run check`, `gdb:oracle`, coverage, e2e e screenshots
- [ ] docs: *Log* e status `review`

## Notas para o batch

- **Tamanho:** grande, porque são cerca de 30 lições. Se apertar,
  entregue as unidades 1–5 e o treino com os tipos delas, e deixe as
  unidades 6–9 registradas no *Log* para uma task nova.
- **Bloquear se:** o gdb real discordar de uma transcrição e não houver
  variante simples do programa que concorde.

## Log
