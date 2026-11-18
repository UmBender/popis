---
id: T10
title: Digitação de código
status: in-progress
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

- [ ] spec — `docs(T10): specify code typing acceptance criteria`
- [ ] tests — `test(T10): add failing tests for code typing`
- [ ] models — `feat(T10): add typing types and stubs`
- [ ] behaviour — `feat(T10): implement code typing`
- [ ] quality — `chore(T10): …`
- [ ] docs — `docs(T10): record code typing log`

## Log

- 2026-11-18 — **Mudanças no rascunho:** um Enter conta como acerto e
  auto-indenta sempre que o próximo caractere do alvo é `\n`, mesmo com
  um erro antes; o rascunho exigia tudo certo até ali, mas a posição já
  decide se o `\n` está certo. As linguagens marcadas também ficam
  salvas. `tests/e2e/mobile.spec.ts` entrou em *Files owned*, porque só o
  projeto de celular prova o AC-8.
