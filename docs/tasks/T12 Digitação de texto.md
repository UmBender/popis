---
id: T12
title: Digitação de texto
status: done
depends_on: [T10]
branch: task/T12-text-typing
adrs: [ADR-T12-1]
tags: [task]
---

# T12 Digitação de texto

## Goal

Uma tela "Texto" para treinar digitação de texto comum, no formato dos
typing tests mais usados: palavras comuns ou frases, contra o tempo ou
por número de palavras. Os erros são tratados por palavra, e no fim
aparecem WPM, WPM bruto, precisão e a contagem de caracteres.

## Spec

Decisões do dono (2026-11-19): palavras comuns e frases; modos por tempo
e por palavras; opções de pontuação, números e acentos opcionais; erros
por palavra. Decisões técnicas em
[[ADR-T12-1 Text typing is judged word by word]].

- **AC-1**: **Listas de palavras** (`src/typing/words.ts`): uma lista de
  1000 palavras por idioma (português e inglês), em ordem aproximada de
  frequência e escritas para o app (sem copiar listas de outros
  projetos). A opção "200" usa as 200 primeiras. As palavras são
  minúsculas, sem espaço, sem pontuação e únicas. O português tem acentos
  (`não`, `você`, `é`); o inglês é só ASCII.
  *Teste:* `src/typing/words.test.ts`.
- **AC-2**: **Frases** (`src/typing/quotes.ts`): pelo menos 20 por
  idioma, de 10 a 60 palavras, com pontuação natural. São textos curtos
  escritos para o app ou provérbios populares, sem atribuir autor.
  *Teste:* `src/typing/quotes.test.ts`.
- **AC-3**: **Geração por seed:** a palavra `i` de um teste vem de
  `deriveSeed(seed, i)`, então um teste por tempo gera quantas palavras
  precisar e a mesma seed sempre dá o mesmo texto.
  - Com **pontuação**, algumas palavras ganham `,` `.` `?` `!` `;` `:`
    no fim, e a palavra depois de `.` `?` `!` (e a primeira) começa com
    maiúscula.
  - Com **números**, cerca de 1 em 10 palavras vira um número de 1 a 4
    dígitos.
  - Nas frases, as opções de pontuação e números não se aplicam.

  *Testes:* `src/typing/text.test.ts`, `src/typing/text.prop.test.ts`.
- **AC-4**: **Modos:**
  - **tempo:** 15, 30, 60 ou 120 s. O relógio começa na primeira tecla e
    o teste termina quando o tempo acaba.
  - **palavras:** 10, 25, 50 ou 100. O teste termina quando a última
    palavra está certa ou quando o espaço é apertado depois dela.
  - **frase:** uma frase sorteada, que termina como no modo palavras.

  *Testes:* `src/typing/words-engine.test.ts` ("finish …", "tick …").
- **AC-5**: **Motor por palavra** (`src/typing/words-engine.ts`, puro):
  - letras entram na palavra atual, até 10 letras a mais que o alvo;
  - espaço passa para a próxima palavra, mesmo com erro, e com a palavra
    vazia não faz nada;
  - Backspace apaga uma letra; com a palavra vazia, volta para a anterior
    só se ela estiver errada;
  - Ctrl+Backspace apaga a palavra atual.

  *Teste:* `src/typing/words-engine.test.ts` ("words engine …").
- **AC-6**: **Acentos opcionais:** com a opção ligada, `nao` vale por
  `não` e `voce` por `você` (comparação sem diacríticos); com ela
  desligada, só a grafia exata conta.
  *Teste:* `src/typing/words-engine.test.ts` ("accents …").
- **AC-7**: **Métricas** (definições dos typing tests mais usados):
  - WPM = (caracteres das palavras certas + os espaços depois delas) / 5
    / minutos;
  - WPM bruto = todos os caracteres digitados, espaços incluídos, / 5 /
    minutos;
  - precisão = teclas certas / teclas que inserem caractere;
  - caracteres: certos, errados, a mais e faltando.

  Uma tabela de casos testa sequências de teclas conhecidas.
  *Teste:* `src/typing/words-engine.test.ts` ("wordsStats …").
- **AC-8**: **Tela** (`src/ui/TextTypingScreen.tsx`):
  - aberta pelo botão "Texto" da configuração, visível também no
    celular, com teclado de texto sem autocorreção;
  - opções: tipo (palavras / frase), idioma (português / inglês), lista
    (200 / 1000), modo (tempo / palavras) com os tamanhos, pontuação,
    números e acentos opcionais;
  - mostra as palavras em linhas, com a atual destacada e a palavra
    errada sublinhada em `--wrong`; letras certas em `--text`, erradas e
    a mais em `--wrong`, pendentes em `--muted`;
  - mostra o tempo restante (modo tempo) ou o progresso `12/50`;
  - Esc sorteia outro texto, e Tab recomeça o mesmo;
  - no fim aparecem WPM, WPM bruto, precisão, caracteres, tempo, a
    configuração e a seed, com os botões "Próximo" e "Voltar".

  *Testes:* `src/ui/TextTypingScreen.test.tsx`, `src/ui/App.test.tsx`
  ("config has a Texto button …").
- **AC-9**: **Persistência:** as opções ficam salvas
  (`popis.text-typing-settings`), e os resultados em `popis.text-typing`
  (até 200). A tela mostra o melhor WPM e a média dos últimos 10 da
  configuração atual. Dados corrompidos carregam como os padrões.
  *Testes:* `src/storage/text-typing.test.ts`,
  `src/ui/TextTypingScreen.test.tsx` ("… summary …").
- **AC-10**: **E2E:** no Chromium, um teste por palavras e um por tempo,
  digitados no navegador; no Pixel 7, a tela cabe sem rolagem
  horizontal.
  *Testes:* `tests/e2e/text-typing.spec.ts`, `tests/e2e/mobile.spec.ts`
  ("text typing fits a phone").

## Out of scope

- Outras línguas, listas do usuário e textos colados.
- Gráfico de WPM ao longo do teste e consistência.
- Modo zen e teclas que travam no erro.

## Files owned

- `src/typing/words*.ts`, `src/typing/quotes*.ts`,
  `src/typing/text*.ts`, `src/typing/words-engine*.ts`
- `src/storage/text-typing*.ts`
- `src/ui/TextTypingScreen*.tsx`, `src/ui/App.tsx`, `src/ui/App.test.tsx`,
  `src/ui/ConfigScreen.tsx`, `src/ui/app.css`
- `tests/e2e/text-typing.spec.ts`, `tests/e2e/mobile.spec.ts` (só o teste
  da tela nova), `tests/e2e/regression-T12-word-box-clip.spec.ts` (bug
  achado na verificação visual, ver *Log*)
- `vite.config.ts` (só limiares de cobertura)

## Subtasks (one commit each)

- [x] spec — `docs(T12): specify text typing acceptance criteria`
- [x] tests — `test(T12): add failing tests for text typing`
- [x] models — `feat(T12): add text typing types and stubs`
- [x] behaviour — `feat(T12): implement text typing`
- [x] quality — `chore(T12): pass lint, format and coverage ratchet`
- [x] regressão — `test(T12): add regression test for words showing
  through the padding`, `test(T12): measure the word box clip without
  rounding`, `fix(T12): clip the word box at three whole lines`
- [x] docs — `docs(T12): record text typing log`

## Log

- 2026-11-19 — **Escolhas de padrão** (o dono não decidiu e pode mudar):
  a tela "Texto" fica visível no celular, porque digitar texto comum num
  teclado de toque faz sentido, ao contrário de código. O padrão é
  português, lista de 200, modo tempo de 30 s, sem pontuação, sem números
  e com acentos exigidos. Tab recomeça o mesmo texto, como nos sites mais
  usados.
- 2026-11-19 — **Passagem de bastão** (só o spec foi feito; o próximo passo
  é `test(T12)`). Desenho combinado para os próximos passos:
  - `src/typing/words.ts`: `TextLanguage = "pt" | "en"`, `TEXT_LANGUAGES`,
    `ListSize = 200 | 1000`, `LIST_SIZES`, `WORDS: Record<TextLanguage,
    readonly string[]>` (1000 cada) e `wordList(language, size)`. Escreva
    as listas num script, deduplique e confira a contagem antes de emitir
    o TS.
  - `src/typing/quotes.ts`: `Quote = { id, language, text }` (ids
    `pt-…`/`en-…`), `QUOTES`, `pickQuote(seed, language)`.
  - `src/typing/text.ts`: `TextSettings = { source: "words" | "quote",
    language, listSize, mode: "time" | "words", seconds: 15 | 30 | 60 |
    120, wordCount: 10 | 25 | 50 | 100, punctuation, numbers,
    lenientAccents }`, `DEFAULT_TEXT_SETTINGS` (pt, 200, tempo 30 s, tudo
    desligado), `parseTextSettings(value)` e `wordAt(seed, settings, i)`.
    O RNG de `deriveSeed(seed, i)` sorteia sempre na mesma ordem (palavra,
    sorteio de número, dígitos, valor, sorteio de pontuação, sinal), e a
    maiúscula depende do final da palavra `i − 1`, recalculado pelo RNG
    dela. `textConfigKey(settings)` identifica a configuração no resumo.
  - `src/typing/words-engine.ts`: `WordsState = { words, inputs,
    current, lenient, timeLimitMs, startedAt, finishedAt, keystrokes,
    correctKeystrokes }`, com `startWords(words, { lenient, timeLimitMs
    })`, `typeWordsText(state, text, now)` (`" "` vale como espaço),
    `pressSpace`, `backspaceWord`, `clearWord`, `tick(state, now)` (fim
    em `startedAt + timeLimitMs`), `appendWords(state, more)`,
    `isWordsFinished`, `wordView(state)` (letras com `correct`,
    `incorrect`, `extra` ou `pending` e o estado de cada palavra) e
    `wordsStats(state)` (`wpm`, `raw`, `accuracy`, `correct`,
    `incorrect`, `extra`, `missed`, `timeMs`). No modo palavras, o espaço
    na última palavra leva `current` para `words.length`; no modo tempo,
    o espaço na última palavra gerada é ignorado, porque a tela mantém
    pelo menos 40 palavras à frente. Só palavras enviadas contam como
    `missed`.
  - `src/storage/text-typing.ts`: chaves `popis.text-typing` (até 200) e
    `popis.text-typing-settings`. O resultado é `{ version: 1, config,
    seed, wpm, raw, accuracy, chars: { correct, incorrect, extra, missed
    }, timeMs, finishedAt }`, e `textSummary(results, config)` devolve o
    melhor e a média dos últimos 10.
  - Tela: o botão da configuração se chama **"Texto"**, sem a palavra
    "Digitação", porque o `getByRole` do Playwright casa nomes por
    substring sem diferenciar maiúsculas, e "Digitação" já é o botão da
    T10. As teclas chegam por um `<textarea>` invisível, como na T10
    (composição para as teclas mortas), e o `keydown` trata Backspace,
    Ctrl+Backspace, Tab (recomeça), Esc (outro texto) e Enter (ignorado).
    O modo tempo usa `setInterval` de 100 ms chamando `tick`; nos testes,
    use `vi.useFakeTimers()` com o relógio manual, como o `advance` de
    `App.test.tsx`. Para não renderizar tudo a cada tecla, memoize por
    palavra, como a T10 faz por linha. Os testids são `text-wpm`,
    `text-raw`, `text-accuracy`, `text-chars`, `text-time`,
    `text-config`, `text-seed` e `text-summary`, e cada palavra tem
    `data-word` para o e2e.
- 2026-11-19 — **Complementos ao desenho** (sem mudar nenhum AC):
  - `parseTextSettings` nunca devolve null: cada campo inválido vira o
    padrão, e assim um campo novo no futuro não apaga os outros.
  - `text.ts` ganhou `wordsFrom`, `initialWords`, `timeLimitMs`,
    `textConfigLabel` (o texto de `text-config`), `TEXT_SOURCES` e
    `TEXT_MODES`. `words.ts` ganhou `TEXT_LANGUAGE_LABELS`, e o motor
    ganhou `wordLetters` e `MAX_EXTRA`.
  - A tela tem um testid a mais, `text-progress`, com o tempo restante
    ou o `12/50`.
  - Taxas: 1 palavra em 10 vira número, e 1 em 4 ganha pontuação; a
    vírgula e o ponto pesam o dobro dos outros sinais. O RNG de cada
    palavra sorteia tudo sempre, então ligar uma opção só decora a
    palavra que a seed já escolheu (teste de propriedade "options only
    decorate the word the seed picks").
- 2026-11-19 — **Métricas, casos de borda:** o WPM bruto conta o que
  ficou digitado no fim (letras apagadas saem), como nos sites mais
  usados. Quando o tempo acaba no meio de uma palavra, ela conta nos
  caracteres e no bruto, mas não em "faltando", que só vale para palavras
  enviadas. Espaço numa palavra vazia não conta como tecla. Um teste de
  uma letra só, com tempo 0, dá WPM 0.
- 2026-11-19 — **Dados:** as listas de 1000 palavras foram escritas num
  script, deduplicadas e cortadas em 1000; ficam em `words.ts` como texto
  quebrado por espaços, para o prettier não pôr uma palavra por linha.
  São 23 frases em português e 22 em inglês, todas próprias ou provérbios
  populares.
- 2026-11-19 — **Tela:** as opções ficam abaixo do texto. Na primeira
  versão ficavam acima, e o e2e do Pixel 7 mostrou as palavras abaixo da
  metade da tela, onde o teclado as cobriria. Teclados de toque podem
  apagar sem mandar `keydown` de Backspace, então a tela também ouve o
  `beforeinput` nativo (`deleteContentBackward` e `deleteWordBackward`).
  Isso foi testado no jsdom, mas **não num celular de verdade**.
- 2026-11-19 — **Bug (verificação visual):** a caixa de palavras cortava
  o conteúdo na borda do padding, e o padding de baixo mostrava o topo de
  uma quarta linha. O teste
  `tests/e2e/regression-T12-word-box-clip.spec.ts` foi commitado vermelho
  (10 palavras parcialmente visíveis). A primeira versão do teste usava
  `clientTop` e `clientHeight`, que arredondam para pixel inteiro, e
  continuava acusando 0,08 px de sobreposição mesmo com a correção. Ele
  foi corrigido em commit `test(T12)` próprio: lê as bordas do estilo
  computado e tolera 1 px. Continua vermelho sem a correção. A correção
  troca o padding vertical por bordas na cor `--surface`.
- 2026-11-19 — **Cobertura:** os `?? ""` inalcançáveis do motor saíram,
  e `src/typing/**` segue em 100%. O limiar de branches de `src/ui/**`
  subiu de 96 para 97 (medido: 97,38%).
- 2026-11-19 — **Gates no último commit:** `npm run check` verde (730
  testes), `npm run coverage` sem `ERROR`, `npm run test:fuzz` verde e
  `npm run test:e2e` verde (12 testes: palavras e tempo no Chromium, a
  tela no Pixel 7 e a regressão).
- 2026-11-19 — **Verificação manual para o dono:** fazer um teste num
  celular de verdade, para confirmar o Backspace do teclado de toque, e
  conferir se as taxas de pontuação e números parecem boas.
