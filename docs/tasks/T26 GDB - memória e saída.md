---
id: T26
title: GDB - memória e saída
status: review
depends_on: [T25]
branch: task/T26-gdb-output
adrs: [ADR-T26-1]
tags: [task]
---

# T26 GDB - memória e saída

## Goal

Um item **Saída** na pasta GDB. O app mostra o código, o ponto de parada
e um comando (`p/x neg`, `p a[1]@3`, `p *h.next`, `x/4xb &n`,
`p sizeof(P)`), e a pessoa digita o que o gdb imprime. Isso exercita o que
trava na hora de depurar: complemento de dois, divisão inteira de C,
arrays e repetições, structs, ponteiros, padding e endianness. O Aprender
ganha as unidades de formatos e memória. A saída vem de um **modelo de
memória** em TypeScript puro, conferido contra o gdb real pelo oráculo
da T25.

## Escolhas de padrão (o dono pode mudar)

- Mesma referência da T25: gdb 18.1, g++ 16.2, x86-64 SysV,
  little-endian, LP64 (`char` com sinal e 1 byte, `int` 4, `long` e
  `long long` 8).
- **Sem ponto flutuante**, porque a formatação de `double` do gdb é um
  assunto à parte. Endereços nunca são perguntados: os exercícios evitam
  imprimi-los, e onde eles aparecem (`next = 0x7ff…`) a resposta aceita
  `ADDR`.
- A resposta é o que vem depois de `$N = `, e o prefixo é opcional.
  Espaços extras são ignorados, mas o resto tem de ser exato. No `x/`,
  a pessoa digita só os valores, separados por espaço.

## Spec

- **AC-1**: **Tipos e memória** em `src/gdb/memory.ts`:
  - tipos inteiros com e sem sinal, `char`, `bool`, arrays, structs
    (com o alinhamento e o padding do x86-64) e ponteiros;
  - um estado é um conjunto de variáveis com valores, serializado em
    bytes little-endian;
  - `sizeof` e `offsetof` seguem a ABI.
  - Testes: `src/gdb/memory.test.ts` ("struct {char; int; long long} has size 16 and offsets 0 4 8", "int 258 is stored as bytes 02 01 00 00"), `src/gdb/memory.prop.test.ts` (ler os bytes escritos devolve o valor; `sizeof` é múltiplo do alinhamento).
- **AC-2**: **Expressões** em `src/gdb/expr.ts`. O subconjunto de
  expressões do gdb que os treinos usam:
  - variáveis, literais, `+ - * / %` e `-` unário;
  - casts para tipos inteiros, `[]`, `.`, `->`, `*` (desreferência),
    `@` e `sizeof`;
  - semântica de C: divisão truncada para zero (`-7/2 = -3`,
    `-7%3 = -1`), promoções inteiras, aritmética sem sinal com volta
    (`(unsigned)-1`);
  - ponteiro nulo desreferenciado devolve o erro
    `Cannot access memory at address 0x0`.
  - Testes: `src/gdb/expr.test.ts` (tabela de casos com as bordas acima), `src/gdb/expr.prop.test.ts` (`a/b*b + a%b == a` para `b != 0`).
- **AC-3**: **Formatação no estilo do gdb** em `src/gdb/format.ts`:
  - `print` sem formato e com `/x /d /u /o /t /c`, onde a largura do
    complemento de dois vem do tipo (`p/x neg` → `0xffffffff`);
  - `char` como `65 'A'` e com escapes (`10 '\n'`);
  - arrays (`{3, 1, 4, 1, 5}`), `<repeats N times>` a partir de 10
    elementos iguais e o limite de 200 elementos com `...`;
  - arrays de `char` como string com `\000` e repetições;
  - structs aninhadas (`{c = 97 'a', x = 7, y = 9}`), ponteiros
    (`0x0`, `ADDR`) e `whatis` (`type = int *`);
  - `x/Nfu` com `f` em `x d u t c` e `u` em `b h w g`, na ordem dos
    bytes little-endian.
  - Testes: `src/gdb/format.test.ts` (uma tabela por formato, com os casos gravados do gdb 18.1, por exemplo `{0 <repeats 16 times>}` e `"abc\000\000\000\000\000\000"`).
- **AC-4**: **Verificador da resposta:** uma tabela de casos que
  inclui:
  - formas aceitas: com e sem `$N = `, espaços extras, `ADDR` no lugar
    de um endereço;
  - quase-acertos rejeitados: o valor decimal no lugar do hexadecimal,
    `0xff` no lugar de `0xffffffff`, os bytes na ordem big-endian,
    `-4` no lugar de `-3` em `-7/2`, `{0, 0, …}` por extenso no lugar
    de `<repeats>`, o struct sem os nomes dos campos.
  - Testes: `src/gdb/check-output.test.ts` ("output checker accepts equivalent forms", "output checker rejects near misses").
- **AC-5**: **Gerador** `src/gdb/out-drill.ts`, com KC `gdb.out.<tipo>`:
  - os tipos são `formato`, `char`, `expressao`, `array`, `string`,
    `struct`, `ponteiro`, `sizeof` e `memoria`;
  - cada item gera um estado pequeno e o programa C++ que o declara,
    mais o comando e a resposta canônica;
  - os níveis 1–3 controlam a faixa dos valores, o tamanho dos arrays e
    o aninhamento;
  - a pessoa marca os tipos, como no Comandos.
  - Testes: `src/gdb/out-drill.prop.test.ts`, que verifica para muitas seeds, cada tipo e cada nível: a resposta canônica é aceita; o item respeita os limites do nível e não tem comportamento indefinido nem ponto flutuante; a mesma seed gera o mesmo item.
- **AC-6**: **Oráculo:** `npm run gdb:oracle` passa a conferir também a
  Saída:
  - para uma amostra fixa de seeds de cada tipo e nível, compila o
    programa do item, para no ponto e compara o comando no gdb real com
    `format.ts`, com os endereços mascarados;
  - confere também cada caso de `format.test.ts` e cada exemplo das
    lições novas.
  - Testes: `npm run gdb:oracle`, com o resultado no *Log*.
- **AC-7**: **Treino Saída** (`src/ui/gdb/OutputDrill.tsx`):
  - mesmo layout e componentes do Comandos, com o código, o ponto de
    parada e as variáveis locais visíveis quando o tipo pede;
  - um erro mostra a saída real e uma linha explicando por quê;
  - eventos com drill `gdb.out`.
  - Testes: `src/ui/GdbScreenOutput.test.tsx` ("typing the gdb value counts as correct", "a wrong value shows the real output and the reason", "the round ends at 60 s on the fake clock"), `src/gdb/out-round.test.ts`, `src/stats/event.test.ts` (o drill `gdb.out` é aceito), `src/storage/gdb.test.ts` (configurações e histórico de Saída).
- **AC-8**: **Aprender:** unidades novas depois das da T25, com o mesmo
  formato de lição e de retirada. Nos exercícios, a pessoa digita a
  saída em vez do comando.

  | Unidade | Lições | Libera |
  |---|---|---|
  | 10 Formatos | `p/x /d /u /t /o`; complemento de dois; `p/c` e `char` | `formato`, `char` |
  | 11 Expressões | divisão e resto de C; casts e sem sinal | `expressao` |
  | 12 Arrays e strings | `p a`, `p a[i]@n`, `p *ptr@n`; `<repeats>`; arrays de `char` | `array`, `string` |
  | 13 Structs e ponteiros | `p s`, `p *p`, `p p->next->val`; `whatis` e `ptype`; ponteiro nulo | `struct`, `ponteiro` |
  | 14 Memória | `sizeof` e padding; `x/Nxb` e endianness; `x/Ndw`, `x/s` | `sizeof`, `memoria` |

  - Testes: `src/gdb/curriculum.test.ts` ("output lessons have examples checked by the oracle and exercises whose answers pass the output checker"), `src/ui/GdbScreenLearn.test.tsx` ("Treinar opens Saída with the lesson kinds selected").
- **AC-9**: **Árvore:** "Saída" entra na pasta GDB depois de
  "Comandos", visível no celular.
  - Testes: `src/ui/shell/sections.test.ts`, `tests/e2e/gdb.spec.ts` (uma rodada de Saída no desktop e no celular).

## Out of scope

- `float` e `double`, pretty printers da STL (`std::vector`), registros,
  `info frame` e o conteúdo da pilha.
- Execução passo a passo (T27).

## Files owned

- `src/gdb/memory.ts`, `expr.ts`, `format.ts`, `check-output.ts`,
  `out-drill.ts`, `out-round.ts`, `programs.ts`, `curriculum.ts`,
  `cases/` e os testes ao lado
- `src/storage/gdb.ts`, `src/storage/gdb.test.ts`, `src/stats/event.ts`,
  `src/stats/event.test.ts`
- `src/ui/gdb/OutputDrill.tsx`, `src/ui/gdb/LearnDrill.tsx`,
  `src/ui/GdbScreen.tsx`, `src/ui/App.tsx`, `src/ui/shell/sections.ts`,
  `src/ui/shell/sections.test.ts`, `src/ui/app.css`,
  `src/ui/GdbScreenOutput.test.tsx`, `src/ui/GdbScreenLearn.test.tsx`
- `scripts/gdb-oracle.mjs`, `tests/e2e/gdb.spec.ts`, `vite.config.ts`

## Subtasks (one commit each)

- [x] spec: ADR-T26-1 (modelo de memória, subconjunto de expressões, regras de formatação) e testes nomeados
- [x] tests: memória, expressões, formatação, verificador, gerador, telas
- [x] models: tipos C, estado, valor formatado
- [x] behaviour: modelo, formatação, gerador, lições, tela e oráculo
- [x] quality: `npm run check`, `gdb:oracle`, coverage, e2e e screenshots
- [x] docs: *Log* e status `review`

## Notas para o batch

- **Tamanho:** médio a grande. O risco está em `format.ts`. Grave os
  casos do gdb real cedo (`gdb:oracle --write`) e escreva o código
  contra eles.
- **Bloquear se:** o gdb formatar algum tipo de um jeito que dependa do
  ambiente (locale, versão). Nesse caso, tire o caso e registre no *Log*.

## Log

- 2026-11-22 — Escopo completo entregue (sem recorte): modelo de memória x86-64 SysV LP64 little-endian (`src/gdb/memory.ts`), avaliador de expressões com semântica de C (`src/gdb/expr.ts`), formatador fiel ao GNU gdb 18.1 com `print elements = 200` e `print repeats = 10` (`src/gdb/format.ts`), tabela de 99 casos gravados do gdb 18.1 (`src/gdb/cases/format-cases.ts`), verificador de saída com diagnóstico de quase-acertos (`src/gdb/check-output.ts`), gerador de 9 tipos × 3 níveis (`src/gdb/out-drill.ts`) e motor de rodada com eventos `gdb.out` (`src/gdb/out-round.ts`), tela Saída (`src/ui/gdb/OutputDrill.tsx`), item "Saída" (`gdb-output`, `touch: true`) na pasta GDB, unidades 10–14 (14 novas lições, total 14 unidades / 42 lições) no Aprender com transcrições reais do gdb 18.1, e oráculo ampliado (`scripts/gdb-oracle.mjs`).
- 2026-11-22 — UNATTENDED CHOICE e ampliação de *Files owned*:
  - Configurações e histórico de Saída ficam em chaves próprias `popis.gdb-output` e `popis.gdb-output-results` em `src/storage/gdb.ts`, preservando `popis.gdb` do Comandos intacto (ADR-T26-1).
  - Motor da rodada de Saída isolado em `src/gdb/out-round.ts` para manter `src/gdb/round.ts` intocado; adicionados 4 programas curtos (`formats-demo`, `arrays-demo`, `structs-demo`, `memory-demo`) em `src/gdb/programs.ts` para as unidades 10–14.
  - `src/ui/gdb/LearnDrill.tsx` e `src/ui/App.tsx` ampliados para suportar exercícios no modo `"output"` (com a mesma retirada adaptativa da T20, prefixo `$1 =` para `print` e `>` para `x/`/`whatis`, e botão "Treinar" abrindo `Saída` com os tipos da lição selecionados).
  - `vite.config.ts` atualizado com ratchet de cobertura em `src/gdb/**` (`99/99/100/96`, subindo `statements` de 98 para 99 e `branches` de 95 para 96).
- 2026-11-22 — Correção de testes antes do commit de comportamento (`2e07e5b`): ajustado o caminho do breadcrumb nos novos testes de `"popis/gdb/saida"` para `"popis/gdb/saída"` (pois `Shell.tsx` aplica `toLowerCase()` preservando acentos), e restringida a regex de endereços não mascarados em `src/gdb/curriculum.test.ts` a endereços de memória x86-64 (`0x7f…`, `0x55…`/`0x56…`, `0x40xxxx`, `0x0000…`) para permitir saídas hexadecimais legítimas como `$1 = 0xffffffff` na unidade 10.
- 2026-11-22 — Verificação visual: capturadas e inspecionadas 10 capturas Playwright (`.batch/visual/t26-gdb-output.spec.ts` em `desktop` e `phone` Pixel 7: unidades 10 e 14 no Aprender, tela ativa do Saída, feedback de erro com saída real e explicação, e tela de resultados). Nenhum overflow horizontal, corte ou erro de contraste encontrado; ajustado o prefixo do campo de exercício no `LearnDrill.tsx` para exibir `>` em exercícios de `x/` e `whatis` (em vez de `$1 =`), coberto em `src/ui/GdbScreenLearn.test.tsx`.
- 2026-11-22 — Gates verdes:
  - `npm run gdb:oracle`: `gdb oracle: prefixes 159/159, transcripts 42/42, equivalences 119/119, format 99/99, output 54/54`.
  - `npm run check`: verde (`tsc --noEmit`, `eslint . --max-warnings 0`, `prettier --check .`, `146/146` arquivos / `4146/4146` testes, `vite build`).
  - `npm run coverage`: verde (`99.79%` statements, `98.58%` branches, `100%` functions, `99.89%` lines; `src/gdb/**` `99.08/96.47/100/99.55`, `src/ui/gdb/**` `100/99.24/100/100`, `src/storage/**` e `src/stats/**` `100/100/100/100`; todos os limiares atendidos).
  - `npm run test:fuzz -- src/gdb/memory.prop.test.ts src/gdb/expr.prop.test.ts src/gdb/out-drill.prop.test.ts`: verde (`28/28` arquivos / `230/230` testes com `FC_NUM_RUNS=20000`).
  - `npm run test:e2e`: verde (`34/34` testes Playwright em `chromium` e `mobile` sob `/popis/`).
- 2026-11-22 — Verificação manual para o dono: jogar algumas rodadas de Saída em cada nível (1–3) e ler as explicações das unidades 10 e 14 no Aprender.
