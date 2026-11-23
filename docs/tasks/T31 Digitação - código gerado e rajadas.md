---
id: T31
title: Digitação - código gerado e rajadas
status: done
depends_on: [T29, T34]
branch: task/T31-typing-generated-code
adrs: [ADR-T31-1]
tags: [task]
---

# T31 Digitação - código gerado e rajadas

## Goal

O Código deixa de sortear um dos 26 trechos fixos e passa a gerar
**código novo a cada rodada**, a partir de uma gramática de idiomas de
programação competitiva, com nomes e números sorteados. A pessoa treina
a mão, não a memória do trecho. Também ganha o modo **Rajada**: um
idioma curto repetido 5 vezes, até virar um pedaço automático. Ideia D3
de [[Datilografia para programação]].

Decisão do dono (2026-11-21): o gerado **substitui** o corpus fixo na
tela Código. O corpus (`src/typing/corpus.ts`) continua no repositório,
porque é o texto dos treinos de Vim (T13–T16).

## Base em pesquisa

- Pedaços (*chunks*): Logan e Crump (2011), Yamaguchi e Logan (2016).
- Código contra prosa: Edwards, Leinonen et al. (2020).

## Spec

- **AC-1**: **Gramática** em `src/typing/codegen/`, pura e por seed:
  - **C++**: `for` com limites variados, leitura com `cin`, `vector`
    com tamanho, prefix sum, `sort` com lambda, `lower_bound`,
    `pair` e `struct`, `while` de busca binária, constantes
    (`1e9 + 7`, `998244353`, `LLONG_MAX`), `auto [a, b]`;
  - **Python**: `for` com `range`, leitura com `input().split()`, list
    comprehension, `defaultdict`, `sorted` com `key`, `bisect`, `heapq`;
  - os identificadores, as constantes e o peso de cada idioma vêm de
    `src/typing/library/profile.json`
    ([[T34 Digitação - trechos do repositório de CP]]): o código gerado
    se parece com o do dono (`#define int ll`, `vi`, `pii`, `MAXN`). Os
    números são sorteados de faixas plausíveis;
  - um teste confere que os 20 identificadores mais frequentes do
    perfil aparecem numa amostra fixa de seeds.
  - Testes: `src/typing/codegen/codegen.test.ts` ("every C++ rule appears in a fixed seed sample", "every Python rule appears in a fixed seed sample", "top 20 profile identifiers appear in a fixed seed sample", "profile constants and owner style appear in generated C++", "idiom weights from profile.json affect rule selection").
- **AC-2**: **Formato:** o código gerado obedece às mesmas regras do
  corpus (T10, AC-1): ASCII imprimível, sem tab, sem linha em branco,
  linhas de até 60 caracteres, indentação em múltiplos de 4 e de 3 a 12
  linhas.
  - Testes: `src/typing/codegen/codegen.prop.test.ts`, que verifica para muitas seeds e cada linguagem: o formato acima; a mesma seed gera o mesmo código; colchetes e parênteses balanceados. Também `src/typing/codegen/codegen.test.ts` (cada regra da gramática aparece em pelo menos uma seed de uma amostra fixa).
- **AC-3**: **Oráculo** `npm run typing:oracle`
  (`scripts/typing-oracle.mjs`), fora do `check`:
  - para 500 seeds de cada linguagem, embrulha o código num esqueleto
    (includes e `main`; ou uma `def`) e confere com
    `g++ -std=c++20 -fsyntax-only` e `python3 -m py_compile`;
  - o resultado vai para o *Log*.
- **AC-4**: **Tela Código:**
  - usa o gerador no lugar de `pickSnippet`; mantém as teclas uniformes
    da [[ADR-T19-1 Teclas e componentes comuns de treino]] (`Ctrl+Enter`
    gera outro trecho, `Ctrl+Shift+Enter` recomeça com nova seed e `Esc`
    sai da rodada reiniciando o trecho atual, como antes após a T19);
  - o resultado mostra a seed;
  - o histórico antigo (`popis.typing`, com `snippetId`) continua
    carregando e aparecendo, e os resultados novos gravam
    `snippetId: "gen:<linguagem>:<seed>"`;
  - os testes da T10 que fixam um trecho do corpus passam a fixar uma
    seed do gerador. Isso é uma mudança de spec, feita no commit de
    testes e registrada no *Log*, sem afrouxar nenhuma asserção.
  - Testes: `src/ui/TypingScreen.test.tsx` ("Código types generated code from the seed", "Ctrl+Enter generates another snippet", "Escape exits the round and resets the generated snippet", "old corpus results still load"), `src/ui/TrainingLog.test.tsx` ("a finished code run records one event per line"), `src/storage/typing.test.ts` ("typing results keep old corpus and new generated results together"), `tests/e2e/typing.spec.ts`.
- **AC-5**: **Rajada:**
  - uma opção (`Rajada (5×)`) na tela Código troca o trecho por um idioma
    de uma linha, repetido 5 vezes (por exemplo,
    `for (int i = 0; i < n; i++) {`);
  - o resultado mostra o tempo de cada repetição e a razão entre a
    última e a primeira;
  - os eventos levam KC `typing.idiom.<regra>`.
  - Testes: `src/typing/codegen/burst.test.ts` ("a burst repeats one idiom 5 times", "burstSummary computes repetition times and last-to-first ratio"), `src/stats/keytrace.test.ts` ("codeEvents accepts a custom kc for burst idioms"), `src/ui/TypingScreen.test.tsx` ("burst result shows the time of each repetition"), `tests/e2e/typing.spec.ts`.
- **AC-6**: **Ritmo-alvo:** o cursor fantasma e o ajuste da T29 valem
  para o código gerado e para a Rajada, com alvos separados.
  - Testes: `src/storage/typing-pace.test.ts` ("burstPaceKey separates burst pace targets from code pace targets"), `src/ui/TypingScreen.test.tsx` ("burst keeps its own pace target").

## Out of scope

- Mudar o texto dos treinos de Vim.
- Trechos enviados pela pessoa (T32).
- Fechamento automático de parênteses.

## Files owned

- `src/typing/codegen/` (novo) e os testes
- `scripts/typing-oracle.mjs` (novo), `package.json` (script `typing:oracle`)
- `src/stats/keytrace.ts`, `src/stats/keytrace.test.ts` (KC `typing.idiom.<regra>` na Rajada, AC-5)
- `src/storage/typing.ts`, `src/storage/typing.test.ts`, `src/storage/typing-pace.ts`, `src/storage/typing-pace.test.ts`
- `src/ui/TypingScreen.tsx`, `src/ui/TypingScreen.test.tsx`, `src/ui/TrainingLog.test.tsx`, `src/ui/app.css`
- `tests/e2e/typing.spec.ts`

## Subtasks (one commit each)

- [x] spec: ADR-T31-1 (gramática no lugar do corpus no Código, oráculo de sintaxe, Rajada) e testes nomeados
- [x] tests
- [x] models
- [x] behaviour
- [x] quality: `npm run check`, `typing:oracle`, coverage e e2e
- [x] docs: *Log* e status `review`

## Notas para o batch

- **Bloquear se:** o `typing:oracle` não conseguir rodar o `g++` ou o
  `python3` no ambiente do batch.

## Log


- 2026-11-22 — **Mudança de spec (AC-4, teclas):** a nota pedia "Esc gera
  outro trecho e Ctrl+Enter recomeça o mesmo", mas isso contradiz a
  [[ADR-T19-1 Teclas e componentes comuns de treino]] e quebraria
  `src/ui/coherence.test.tsx` e `tests/e2e/coherence.spec.ts`. O spec
  foi corrigido no commit `docs` para manter as teclas uniformes
  (`Ctrl+Enter` gera outro trecho, `Ctrl+Shift+Enter` recomeça com seed
  nova, `Esc` sai e reinicia o trecho atual). **UNATTENDED CHOICE:**
  decisão registrada em ADR-T31-1 para o dono revisar.
- 2026-11-22 — **Testes da T10 migrados (AC-4):** os testes de
  `src/ui/TypingScreen.test.tsx` e o de `src/ui/TrainingLog.test.tsx`
  que fixavam `pickSnippet(SEED, …)` passaram a fixar
  `generateCodeSnippet(SEED, …)`, no commit `test`, sem afrouxar
  nenhuma asserção. "Esc generates another snippet" virou "Ctrl+Enter
  generates another snippet" e "Escape exits the round and resets the
  generated snippet" pela mudança de teclas acima.
- 2026-11-22 — **Files owned ampliados (política do batch):**
  `src/stats/keytrace.ts` e o teste (campo opcional `kc` em `CodeMeta`
  para o KC `typing.idiom.<regra>` da Rajada, AC-5),
  `src/storage/typing.test.ts`, `src/storage/typing-pace.test.ts` e
  `src/ui/TrainingLog.test.tsx` (testes que fixavam o corpus).
- 2026-11-22 — **Corpus mantido:** `src/typing/corpus.ts` não mudou;
  Vim e `src/stats/typing-stats.ts` continuam usando o corpus. Eventos
  `gen:*` e `burst:*` não aparecem nos bigramas/erros por caractere de
  Evolução, porque `typing-stats.ts` resolve linhas só pelo corpus
  (fora dos Files owned). Fica como melhoria futura.
- 2026-11-22 — **Gramática:** C++ com 10 regras (`for-loop`, `cin-read`,
  `vector-sized`, `prefix-sum`, `sort-lambda`, `lower-bound`,
  `pair-struct`, `binary-search`, `constants`, `structured-binding`) e
  Python com 7. Identificadores, constantes e pesos vêm de
  `src/typing/library/profile.json`; os 20 identificadores mais
  frequentes do perfil aparecem em 400 seeds.
- 2026-11-22 — **Gates:** `npm run check` verde (137 arquivos, 4105
  testes, build OK); `npm run coverage` verde (`src/typing/**` em 100%,
  limiares sem mudança); `npm run test:e2e` verde (32 testes em chromium
  e mobile); `npm run typing:oracle`:
  `typing:oracle: cpp 500/500 ok, python 500/500 ok`.
- 2026-11-22 — **Capturas visuais:** `.batch/visual/t31.spec.ts` (config
  própria na porta 4177, porque a 4175 estava ocupada) gerou 5 capturas
  no desktop: Código parado, em andamento com cursor fantasma, resultado,
  Rajada parada e resultado da Rajada (5 tempos e razão `0,58×`). Nada
  errado à vista. No celular o Código fica escondido (tela de toque),
  então não há captura de phone. O resultado do Código mostra 3677 WPM
  só porque o relógio falso não avançou na captura.
- 2026-11-22 — **Verificação manual para o dono:** os trechos gerados
  parecem com o seu código? A Rajada vale a pena manter? Os nomes de
  tipo do perfil (`T`, `TRest`) às vezes aparecem como nome de `struct`.
