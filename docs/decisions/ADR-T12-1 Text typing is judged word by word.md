---
id: ADR-T12-1
title: Text typing is judged word by word
status: accepted
kind: decision
date: 2026-11-19
task: T12
builds_on: [ADR-T10-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T12-1 Text typing is judged word by word

## Context

O dono quer um typing test de texto comum ([[T12 Digitação de texto]])
parecido com os mais usados na internet. Neles, o texto é uma sequência
de palavras; o espaço avança mesmo com erro; o WPM conta só as palavras
certas, e o resultado mostra também o WPM bruto, a precisão e os
caracteres certos, errados, a mais e faltando. O motor da Digitação de
código (ADR-T10-1) compara caractere por caractere e só termina quando
tudo está certo, o que não serve aqui.

## Decision

- Um motor novo e puro, `src/typing/words-engine.ts`, guarda uma entrada
  por palavra. Ele segue as regras dos sites mais usados:
  - o espaço avança, mesmo com erro;
  - Backspace volta para a palavra anterior só se ela estiver errada;
  - aceita até 10 letras a mais por palavra;
  - Ctrl+Backspace apaga a palavra atual.
- Métricas:
  - WPM = (caracteres das palavras certas + um espaço depois de cada uma
    que foi enviada) / 5 / minutos;
  - WPM bruto = (todos os caracteres digitados + os espaços) / 5 /
    minutos;
  - precisão = teclas certas / teclas que inserem caractere, e o espaço
    conta como certo quando a palavra está certa.
- No modo tempo, o texto não tem fim. A palavra `i` vem de
  `deriveSeed(seed, i)`, e a tela pede mais palavras ao motor quando a
  atual chega perto do fim. A pontuação de uma palavra depende só do seu
  próprio RNG, e a maiúscula só do final da palavra anterior, então
  qualquer palavra é gerada sem gerar as de antes.
- Acentos opcionais comparam letra a letra sem diacríticos (NFD sem as
  marcas combinantes).
- As listas de palavras e as frases são escritas para o app. As listas
  de projetos conhecidos têm licenças como GPL e não são copiadas. As
  frases são textos próprios ou provérbios populares, sem atribuição de
  autor, para não citar ninguém errado.
- A tela é `src/ui/TextTypingScreen.tsx`, aberta pelo botão "Texto",
  com chaves próprias no `localStorage`, como a Digitação de código.

## Alternatives considered

- **Reaproveitar o motor da T10** — ele exige corrigir cada erro antes
  de terminar e não tem as métricas por palavra que o dono pediu.
- **Gerar o texto inteiro do modo tempo de antemão** — um limite fixo de
  palavras seria arbitrário e poderia acabar antes do tempo.
- **Citações atribuídas a autores** — exige conferir cada texto e cada
  autor; um erro seria publicado.

## Consequences

- Há dois motores de digitação, um por caractere e outro por palavra.
- O bundle cresce com cerca de 2000 palavras e 40 frases (dezenas de KB).
- As regras e métricas ficam documentadas aqui, e mudar alguma exige um
  ADR novo.

## Rollback plan

Remover a tela "Texto", `src/typing/words*.ts`, `src/typing/quotes.ts`,
`src/typing/text.ts`, `src/storage/text-typing.ts`, e registrar um ADR
`kind: rollback`.
