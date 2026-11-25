---
id: T45
title: Regex - aprender e praticar
status: review
depends_on: [T25]
branch: task/T45-regex
adrs: [ADR-T45-1]
tags: [task]
---

# T45 Regex - aprender e praticar

## Goal

Uma pasta **Regex** na árvore, com **Aprender** e **Prática**. Na Prática,
a pessoa escreve uma expressão regular e vê **ao vivo**, a cada tecla,
quais linhas de exemplo ela casa: as que devem casar ficam marcadas e as
que não devem também, e o item é aceito quando tudo está certo. O
Aprender é um currículo em ordem, com explicação, exemplo e exercícios
com retirada da ajuda (`src/learn/`, ADR-T20-1). O foco são os usos de
prova e de terminal: `grep` para achar um caso num arquivo de saída,
`re` do Python para ler entradas mal formatadas e `sed`/`re.sub` para
trocar texto.

## Escolhas de padrão (o dono pode mudar)

- **Dialetos:** o padrão é o do Python `re`, que no subconjunto ensinado
  é igual ao `RegExp` do navegador. O dialeto `grep -E` (ERE do POSIX:
  sem `\d`, sem `?:`, sem lookaround, com `[[:digit:]]`) é uma opção na
  tela, e a lição 8 trata das diferenças. Cada item diz em qual dialeto
  está.
- **Fora do ensino:** lookbehind, backreference no padrão, flags inline e
  Unicode. Lookahead aparece numa lição só, no fim.
- A Prática não tem relógio por item: a rodada dura 5 itens, com
  cronômetro visível, porque escrever uma regex exige pensar e testar.

## Spec

- **AC-1**: **Motor e dialetos** em `src/regex/`, em TypeScript puro:
  - `compile(padrão, dialeto)` valida o padrão contra o subconjunto do
    dialeto e devolve um casador ou um erro legível ("`\d` não existe no
    `grep -E`; use `[0-9]`");
  - o casador usa `RegExp` com tradução do ERE (classes POSIX para
    classes do JS) e implementa só o subconjunto permitido;
  - o modo de casamento segue a ferramenta: `search` (casa em qualquer
    ponto da linha, como `grep` e `re.search`) ou `fullmatch`, conforme
    o item.
  - Testes: `src/regex/compile.test.ts` (tabela: recursos aceitos e rejeitados por dialeto, tradução de `[[:alpha:]]`, `[[:space:]]`, `\b` só no Python).
- **AC-2**: **Tipos de item** (KC `regex.<tipo>`):
  - `casar`: duas listas, "deve casar" e "não deve casar", para escrever
    uma regex que separe as duas;
  - `extrair`: uma linha e o trecho que deve sair no grupo 1 (`re.search(…).group(1)`);
  - `trocar`: o texto antes e depois, para escrever o padrão e a troca
    (`\1` no `sed -E`, `\1` ou `\g<1>` no `re.sub`);
  - `ler`: uma regex e 5 linhas, para marcar quais casam (exercita a
    leitura, sem digitação).
  - Testes: `src/regex/check.test.ts` (aceitas: regex diferentes da canônica que separam as listas; rejeitadas: casar só pelo tamanho quando há caso de controle, esquecer âncora, `.` sem escape).
- **AC-3**: **Gerador** `src/regex/drill.ts`. A partir da seed, ele
  monta o item a partir de famílias com formatos de prova e de terminal:
  - número inteiro com sinal, decimal e notação científica;
  - `Case #3: 17`, `Teste 12: OK`, linhas de log do `diff` e do juiz;
  - datas, horas, identificadores de C++, IPs;
  - palavras repetidas, linha em branco, espaço no fim da linha.

  O gerador cria exemplos positivos e negativos próximos (um caractere
  a mais, sinal sem número, ponto sem casas), para que regex frouxas
  falhem.
  - Testes: `src/regex/drill.prop.test.ts` (a regex canônica separa as listas nos dois dialetos em que o item existe; cada lista tem pelo menos 3 linhas; existe um negativo a distância 1 de um positivo; a mesma seed gera o mesmo item).
- **AC-4**: **Oráculo** `npm run regex:oracle` (`scripts/regex-oracle.mjs`),
  fora do `check`. Para uma amostra de seeds e para cada exercício do
  Aprender, ele confere o resultado do motor contra as ferramentas reais:
  `python3 -c 're.search…'`, `/usr/bin/grep -E` e `/usr/bin/sed -E`.
  - O caminho é absoluto porque nesta máquina `grep` é um alias para o
    `ugrep`, que tem outro dialeto.
  - Testes: `npm run regex:oracle`, com o resultado no *Log*.
- **AC-5**: **Prática** (`src/ui/RegexScreen.tsx`, `src/ui/regex/`):
  - uma caixa para a regex, ao vivo; cada linha de exemplo mostra o
    trecho casado sublinhado e um ✓/✗ (texto, não só cor);
  - um erro de sintaxe aparece embaixo da caixa sem travar a tela;
  - Enter aceita quando tudo está certo; "pular" mostra a canônica;
  - o resultado mostra o tempo e as tentativas por item;
  - eventos da T22 com drill `regex.practice`.
  - Testes: `src/regex/round.test.ts`, `src/stats/event.test.ts` (`DRILLS` aceita `regex.practice`), `src/ui/RegexScreen.test.tsx` ("live highlight updates on each key", "Enter is accepted only when every line is right", "syntax error is shown without crashing", "skip shows the canonical regex", "result shows time and attempts per item and records T22 events").
- **AC-6**: **Aprender** (`src/regex/curriculum.ts`):

  | Unidade | Lições |
  |---|---|
  | 1 Literais | caracteres literais; `.` e escape `\.` |
  | 2 Classes | `[abc]`, `[a-z]`, `[^…]`; `\d`, `\w`, `\s` |
  | 3 Repetição | `*`, `+`, `?`; `{n}`, `{n,m}`; guloso contra preguiçoso |
  | 4 Âncoras | `^`, `$`; `\b`; `search` contra `fullmatch` |
  | 5 Grupos | `( )` e `\|`; grupo de captura e `group(1)`; `(?: )` |
  | 6 Trocar | `re.sub` com `\1`; `sed -E 's/…/…/g'` |
  | 7 No terminal | `grep -E`, `-v`, `-n`, `-c`, `-o`; achar o primeiro teste que falhou |
  | 8 Dialetos | Python × `grep -E`: classes POSIX, `\d` × `[0-9]`, BRE (`grep` sem `-E`) |
  | 9 Lookahead | `(?= )` e `(?! )`, com um aviso de quando não vale a pena |

  Cada lição tem até 3 frases de explicação, um exemplo com o destaque
  animado e 3 exercícios com retirada da ajuda.
  - Testes: `src/regex/curriculum.test.ts` ("every exercise canonical answer passes", "every lesson has 3 exercises"), `src/ui/RegexScreenLearn.test.tsx`.
- **AC-7**: **Árvore e armazenamento:** a pasta "Regex" entra depois de
  "Shell" (ou da última pasta de ferramenta que existir), com "Aprender"
  e "Prática" visíveis no celular, e os atalhos 1–9 não mudam. O
  progresso fica em `popis.regex-learn` e as configurações (dialeto) em
  `popis.regex`.
  - Testes: `src/ui/shell/sections.test.ts`, `src/storage/regex.test.ts`, `src/storage/regex-learn.test.ts`, `tests/e2e/regex.spec.ts` (uma lição e um item da prática, também no mobile).

## Out of scope

- Regex do C++ (`<regex>`): é lenta e rara em prova. A Referência de C++
  (T46) só a menciona, com esse aviso.
- Lookbehind, backreference no padrão, recursão e PCRE.

## Files owned

- `src/regex/` (novo), `src/storage/regex.ts`, `src/storage/regex.test.ts`, `src/storage/regex-learn.ts`, `src/storage/regex-learn.test.ts`
- `src/stats/event.ts`, `src/stats/event.test.ts`
- `src/ui/RegexScreen.tsx`, `src/ui/RegexScreen.test.tsx`, `src/ui/RegexScreenLearn.test.tsx`, `src/ui/regex/` (novo), `src/ui/App.tsx`,
  `src/ui/shell/sections.ts`, `src/ui/shell/sections.test.ts`, `src/ui/app.css`
- `scripts/regex-oracle.mjs`, `package.json`, `vite.config.ts`, `playwright.config.ts`
- `tests/e2e/regex.spec.ts`

## Subtasks (one commit each)

- [x] spec: ADR-T45-1 (dialetos Python e ERE, motor por tradução para `RegExp`, oráculo com as ferramentas reais) e testes nomeados
- [x] tests
- [x] models
- [x] behaviour
- [x] quality: `npm run check`, `regex:oracle`, coverage, e2e
- [x] docs

## Log

- 2026-11-25 — Rodada da batch (sem ninguém no teclado). Escopo completo,
  sem fatia menor: as 9 unidades do Aprender e os 4 tipos de item
  (`casar`, `extrair`, `trocar`, `ler`) nos dialetos Python `re` (padrão)
  e `grep -E`.
- 2026-11-25 — Qualidade: o passo foi retomado de uma sessão interrompida.
  As mudanças não commitadas foram revisadas: os testes só ganharam casos
  novos e formatação, sem nenhuma asserção afrouxada. Feito:
  `prettier --write` em três arquivos; um teste novo ("Enter on a focused
  lesson button is left to the button and does not open the next
  lesson"); a remoção de um `return` inalcançável em `apply` da Prática
  (todos os chamadores já excluem a rodada inalterada, e sem ele o pior
  caso é um render idêntico); e o limiar novo `src/regex/**` (lines 100,
  statements 99, functions 100, branches 98) no `vite.config.ts`.
- 2026-11-25 — Gates: `npm run check` verde (176 arquivos, 4312 testes);
  `npm run coverage` verde (`src/regex` 99.52/98.26/100/100,
  `src/ui/regex` 100/98.05/100/100); `npm run test:e2e` com 39 passando,
  incluindo `regex.spec.ts` no desktop e no mobile; `npm run test:fuzz`
  verde (34 arquivos, 249 testes).
- 2026-11-25 — AC-4: `npm run regex:oracle` → python3: 779 checagens
  (0 falhas); `grep -E`: 60 padrões e 369 linhas (0 falhas); `sed -E`:
  20 padrões e 58 linhas (0 falhas).
- 2026-11-25 — AC-7: a pasta Regex entra depois de GDB, porque Shell
  (T39) ainda não está na `main`. Na integração, ela vai para depois de
  Shell.
- 2026-11-25 — Checagem visual: `.batch/visual/t45-regex.spec.ts`
  (desktop e phone) gerou 6 telas por projeto: lista, lição, prática ao
  vivo, erro de dialeto, pular e resultado. Elas foram conferidas, e não
  há nada claramente quebrado.
- 2026-11-25 — Checagens manuais para o dono: (1) resolver três itens,
  um por dialeto, incluindo um erro de sintaxe no meio da digitação;
  (2) durante a rodada, a linha "Nenhuma rodada nesta configuração.
  Enter começa a primeira." fica visível embaixo dos botões, e o "Enter
  começa" pode confundir enquanto um item está aberto; (3) uma rodada no
  celular.
- 2026-11-25 — Arquivos: todos dentro de *Files owned*.
