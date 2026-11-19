---
id: T12
title: Digitação de texto
status: in-progress
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
  da tela nova)
- `vite.config.ts` (só limiares de cobertura)

## Subtasks (one commit each)

- [ ] spec — `docs(T12): specify text typing acceptance criteria`
- [ ] tests — `test(T12): add failing tests for text typing`
- [ ] models — `feat(T12): add text typing types and stubs`
- [ ] behaviour — `feat(T12): implement text typing`
- [ ] quality — `chore(T12): …`
- [ ] docs — `docs(T12): record text typing log`

## Log

- 2026-11-19 — **Escolhas de padrão** (o dono não decidiu e pode mudar):
  a tela "Texto" fica visível no celular, porque digitar texto comum num
  teclado de toque faz sentido, ao contrário de código. O padrão é
  português, lista de 200, modo tempo de 30 s, sem pontuação, sem números
  e com acentos exigidos. Tab recomeça o mesmo texto, como nos sites mais
  usados.
