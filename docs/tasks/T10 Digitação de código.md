---
id: T10
title: Digitação de código
status: ready
depends_on: [T01]
branch: task/T10-typing
adrs: []
tags: [task]
---

# T10 Digitação de código

## Goal

Uma tela "Digitação", separada do motor de partida e no estilo Monkeytype,
para treinar a digitação de código C++ e Python. Aparece um trecho real,
o jogador o digita do começo ao fim e, no final, vê WPM, precisão e tempo.

## Spec (rascunho; o passo de spec nomeia os testes)

Decisões do dono (2026-11-18): corpus curado, tela separada, auto-indent e
erros marcados em vermelho.

- **AC-1**: **Corpus:** `src/typing/corpus.ts` tem trechos curados, cada
  um com `id`, linguagem (`cpp` ou `python`) e texto: pelo menos 12 por
  linguagem, de 3 a 12 linhas, só ASCII, sem tab, indentados com 4
  espaços, sem espaço no fim das linhas, com linhas de até 60 caracteres
  (para caber no celular) e `id`s únicos. Os trechos são idiomáticos:
  busca binária, BFS, leitura rápida, `sort` com lambda,
  `defaultdict`, list comprehension, `with open`, etc. Um teste confere
  todas essas regras.
- **AC-2**: **Sorteio:** `pickSnippet(seed, languages)` escolhe um trecho
  das linguagens marcadas usando o RNG com seed. A mesma seed escolhe o
  mesmo trecho, e o trecho escolhido é sempre de uma linguagem marcada
  (teste de propriedade).
- **AC-3**: **Motor puro** (`src/typing/engine.ts`, sem DOM, com o tempo
  vindo do relógio injetado): um estado guarda o trecho e o texto
  digitado, e as funções `type(char)`, `enter()` e `backspace()` devolvem
  o próximo estado.
  - Cada posição é `correct`, `wrong` ou `pending`, comparada posição a
    posição com o trecho.
  - Um caractere errado fica no texto, e o jogador pode continuar
    digitando depois dele.
  - O trecho termina quando o texto digitado é igual a ele.
- **AC-4**: **Auto-indent:** quando tudo o que foi digitado até ali está
  certo e o próximo caractere do trecho é `\n`, Enter insere o `\n` e a
  indentação inicial da linha seguinte. Fora disso, Enter insere só um
  `\n`, que conta como erro. Um Backspace logo depois de uma indentação
  automática apaga a indentação e o `\n` juntos. Tab não faz nada.
- **AC-5**: **Métricas:**
  - o tempo começa na primeira tecla e para quando o trecho termina;
  - WPM = (caracteres do trecho / 5) / minutos, e a indentação automática
    não conta como digitada;
  - precisão = teclas certas / teclas que inserem caractere;
  - erros = teclas erradas.

  Uma tabela de casos testa trechos curtos com sequências de teclas
  conhecidas e um relógio falso.
- **AC-6**: **Tela:**
  - a configuração ganha um botão "Digitação" que abre a tela nova, com
    as linguagens marcáveis (padrão: as duas);
  - o trecho aparece em fonte monoespaçada, com o texto pendente em
    `--muted`, o certo em `--text`, o errado em `--wrong` (um espaço
    errado aparece marcado) e o cursor visível;
  - Esc sorteia outro trecho e Ctrl+Enter recomeça o mesmo;
  - no fim aparecem WPM, precisão, erros, tempo, o `id` do trecho e a
    seed, com botões "Próximo" e "Voltar";
  - os testes de componente usam `vi.useFakeTimers()`.
- **AC-7**: **Persistência:** cada resultado é salvo numa chave própria do
  `localStorage` (`popis.typing`), sem tocar no histórico das partidas.
  São guardados até 200 resultados, com `id`, linguagem, seed, WPM,
  precisão, erros, tempo e data. A tela mostra o melhor WPM e a média dos
  últimos 10 por linguagem. Um dado corrompido carrega como lista vazia.
- **AC-8**: **Toque:** em aparelhos sem teclado físico
  (`(hover: none) and (pointer: coarse)`), o botão "Digitação" não
  aparece, porque não dá para treinar digitação de código no celular
  (decisão do dono em T11).
- **AC-9**: **E2E:** um teste Playwright digita um trecho Python e um C++
  no navegador e confere que o auto-indent funciona e que o resultado
  aparece.

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
- `tests/e2e/typing.spec.ts`
- `vite.config.ts` (só o limiar de cobertura de `src/typing/**`)

## Log
