---
id: T10
title: Digitação de código
status: review
depends_on: [T01]
branch: task/T10-typing
adrs: [ADR-T10-1]
tags: [task]
---

# T10 Digitação de código

## Goal

Uma tela "Digitação", separada do motor de partida e no estilo Monkeytype,
para treinar a digitação de código C++ e Python. Aparece um trecho real,
o jogador o digita do começo ao fim e, no final, vê WPM, precisão e tempo.

## Spec

Decisões do dono (2026-11-18): corpus curado, tela separada, auto-indent e
erros marcados em vermelho; a Digitação some em telas de toque (T11).
Decisões técnicas em
[[ADR-T10-1 Code typing has its own engine, screen and store]].

- **AC-1**: **Corpus:** `src/typing/corpus.ts` tem trechos curados, cada
  um com `id` e linguagem (`cpp` ou `python`) e com o texto. As regras:
  - pelo menos 12 trechos por linguagem, de 3 a 12 linhas;
  - só ASCII imprimível, sem tab e sem linha em branco;
  - linhas de até 60 caracteres, para caber no celular, e sem espaço no
    fim;
  - a primeira linha sem indentação, e as outras indentadas com múltiplos
    de 4 espaços;
  - `id`s únicos, com o prefixo da linguagem (`cpp-`, `py-`).

  Os trechos são idiomáticos: busca binária, BFS, leitura rápida, `sort`
  com lambda, `defaultdict`, list comprehension, `with open`, etc.
  *Teste:* `src/typing/corpus.test.ts`.
- **AC-2**: **Sorteio:** `pickSnippet(seed, languages)` escolhe um trecho
  das linguagens marcadas usando o RNG com seed, e lança `RangeError` sem
  nenhuma linguagem. A mesma seed escolhe o mesmo trecho, e o trecho
  escolhido é sempre de uma linguagem marcada.
  *Testes:* `src/typing/corpus.test.ts` ("pickSnippet …"),
  `src/typing/corpus.prop.test.ts`.
- **AC-3**: **Motor puro** (`src/typing/engine.ts`, sem DOM): o estado
  guarda o texto alvo, o texto digitado e os instantes de início e de
  fim, que vêm do relógio injetado. As funções devolvem o próximo estado:
  `typeText(state, text, now)` (um `\n` dentro do texto vale como Enter),
  `pressEnter(state, now)` e `backspace(state)`.
  - `marks(state)` diz, para cada posição do alvo, se ela está `correct`,
    `wrong` ou `pending`, comparando posição a posição.
  - Um caractere errado fica no texto, e o jogador pode continuar
    digitando depois dele.
  - Teclas além do tamanho do alvo são ignoradas.
  - O trecho termina quando o texto digitado é igual ao alvo; depois
    disso, toda tecla é ignorada.

  *Teste:* `src/typing/engine.test.ts` ("engine …").
- **AC-4**: **Auto-indent:**
  - Quando o próximo caractere do alvo é `\n`, Enter insere o `\n` e a
    indentação inicial da linha seguinte, e conta como acerto.
  - Fora disso, Enter insere só um `\n`, que conta como erro.
  - Um Backspace logo depois de uma indentação automática apaga a
    indentação e o `\n` juntos.
  - Tab não faz nada.

  *Testes:* `src/typing/engine.test.ts` ("auto-indent …"),
  `src/ui/TypingScreen.test.tsx` ("Tab …").
- **AC-5**: **Métricas** (`typingStats`):
  - o tempo vai da primeira tecla até o fim do trecho;
  - WPM = (caracteres digitáveis do trecho / 5) / minutos, em que a
    indentação automática não conta;
  - precisão = teclas certas / teclas que inserem caractere (Enter
    incluído);
  - erros = teclas erradas.

  Uma tabela de casos testa trechos curtos com sequências de teclas
  conhecidas.
  *Teste:* `src/typing/engine.test.ts` ("typingStats …").
- **AC-6**: **Tela** (`src/ui/TypingScreen.tsx`):
  - a configuração ganha o botão "Digitação", que abre a tela nova, com as
    linguagens marcáveis C++ e Python (padrão: as duas);
  - o trecho aparece em fonte monoespaçada, com o texto pendente em
    `--muted`, o certo em `--text` e o errado em `--wrong` (um espaço ou
    um `\n` errado aparece marcado), e o cursor é visível;
  - as teclas são lidas por um `<textarea>` invisível com foco, para que
    as teclas mortas do teclado ABNT2 (`'`, `"`, `~`, `^`) funcionem;
  - Esc sorteia outro trecho e Ctrl+Enter recomeça o mesmo;
  - no fim aparecem WPM, precisão, erros, tempo, o `id` do trecho e a
    seed, com os botões "Próximo" e "Voltar".

  *Testes:* `src/ui/TypingScreen.test.tsx`, com relógio manual.
- **AC-7**: **Persistência** (`src/storage/typing.ts`):
  - cada resultado é salvo numa chave própria do `localStorage`
    (`popis.typing`), sem tocar no histórico das partidas;
  - são guardados até 200 resultados, com `id`, linguagem, seed, WPM,
    precisão, erros, tempo e data;
  - as linguagens marcadas também ficam salvas (`popis.typing-settings`);
  - a tela mostra, por linguagem, o melhor WPM e a média dos últimos 10;
  - um dado corrompido carrega como lista vazia (ou como as duas
    linguagens).

  *Testes:* `src/storage/typing.test.ts`, `src/ui/TypingScreen.test.tsx`
  ("… summary …").
- **AC-8**: **Toque:** em aparelhos sem teclado físico
  (`(hover: none) and (pointer: coarse)`), o botão "Digitação" não
  aparece, porque não dá para treinar digitação de código no celular
  (decisão do dono em T11).
  *Teste:* `tests/e2e/mobile.spec.ts` ("typing is hidden on touch
  screens").
- **AC-9**: **E2E:** um teste Playwright digita um trecho Python e um C++
  no navegador e confere que o auto-indent funciona e que o resultado
  aparece.
  *Teste:* `tests/e2e/typing.spec.ts`.

## Out of scope

- Trechos gerados por templates, outras linguagens e trechos do usuário.
- Modo por tempo (30 s / 60 s); aqui o teste é sempre um trecho completo.
- Ctrl+Backspace (apagar uma palavra) e o fechamento automático de
  parênteses.
- Revisar trechos (`T06`) e o histórico de partidas.

## Files owned

- `src/typing/**` (corpus, sorteio, motor, métricas)
- `src/storage/typing*.ts`
- `src/ui/TypingScreen*.tsx`, `src/ui/App.tsx`, `src/ui/App.test.tsx`,
  `src/ui/ConfigScreen.tsx`, `src/ui/app.css`
- `tests/e2e/typing.spec.ts`, `tests/e2e/mobile.spec.ts` (só o teste do
  AC-8)
- `vite.config.ts` (limiar de cobertura de `src/typing/**` e ratchet)

## Subtasks (one commit each)

- [x] spec — `docs(T10): specify code typing acceptance criteria`
- [x] tests — `test(T10): add failing tests for code typing`
- [x] models — `feat(T10): add typing types and stubs`
- [x] behaviour — `feat(T10): implement code typing`
- [x] quality — `test(T10): cover composition, refocus and re-checking a
  language`, `chore(T10): drop unreachable fallbacks and ratchet
  coverage`, `test(T10): give the whole-snippet typing tests a 20 s
  timeout`, `refactor(T10): render the typing code one memoized line at a
  time`
- [x] docs — `docs(T10): record code typing log`

## Log

- 2026-11-18 — **Mudanças no rascunho:** um Enter conta como acerto e
  auto-indenta sempre que o próximo caractere do alvo é `\n`, mesmo com
  um erro antes; o rascunho exigia tudo certo até ali, mas a posição já
  decide se o `\n` está certo. As linguagens marcadas também ficam
  salvas. `tests/e2e/mobile.spec.ts` entrou em *Files owned*, porque só o
  projeto de celular prova o AC-8.
- 2026-11-18 — **Corpus:** 13 trechos de C++ (busca binária, BFS, leitura
  rápida, `sort` com lambda, gcd, DSU, somas de prefixo, dois ponteiros,
  `map`, potência modular, Dijkstra, crivo e LIS) e 13 de Python (busca
  binária, BFS, leitura rápida, `defaultdict`, comprehensions,
  `with open`, classe, `sort` com `key`, `lru_cache`, `Counter`,
  Dijkstra com `heapq`, `try/except` e `dataclass`).
- 2026-11-18 — **Teclado:** o texto vem do `input` de um `<textarea>`
  invisível, e as composições (teclas mortas do ABNT2) só entram no
  `compositionend`. Enter, Backspace, Tab e Esc são tratados no
  `keydown`, e Cmd+Enter também recomeça, como o Ctrl+Enter.
- 2026-11-18 — **Visual:** o texto pendente usa `--muted` com opacidade
  0,55, porque `--muted` e `--text` ficam próximos demais para separar o
  digitado do pendente. Opacidade não é cor, então nenhum token novo foi
  preciso. Conferi uma captura da tela no meio de uma digitação com erro.
- 2026-11-18 — **Cobertura:** a primeira rodada derrubou `src/ui/**`.
  Faltavam testes para a composição, para o clique que devolve o foco,
  para re-marcar uma linguagem, para o Backspace no começo e para o
  Cmd+Enter (commit `test(T10)` próprio). Os `?? ""` inalcançáveis do
  motor saíram. `src/typing/**` ganhou limiar de 100%, e o de branches de
  `src/ui/**` subiu de 95 para 96.
- 2026-11-18 — **Teste lento** (commit `test(T10)` próprio): os dois
  testes que digitam um trecho inteiro (cerca de 300 teclas) levavam 3 s
  sozinhos e passaram dos 5 s na suíte completa, com a máquina carregada
  por outro processo. Cada tecla é um render React no jsdom (≥ 5 ms).
  Eles ganharam um timeout explícito de 20 s, sem mudar nenhuma asserção.
  A tela passou a memoizar por linha, então uma tecla renderiza só a
  linha que muda, e não os ~300 spans.
- 2026-11-18 — **Gates no último commit:** `npm run check` verde (569
  testes), `npm run coverage` sem `ERROR`, `npm run test:fuzz` verde e
  `npm run test:e2e` verde (8 testes, com a digitação de um trecho Python
  e um C++ no Chromium e o botão escondido no Pixel 7).
- 2026-11-18 — **Verificação manual para o dono:** digitar no teclado
  ABNT2 um trecho com aspas (`py-defaultdict` ou `cpp-map-count`), para
  confirmar as teclas mortas no navegador real.
