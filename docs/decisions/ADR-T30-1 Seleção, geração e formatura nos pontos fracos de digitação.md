---
id: ADR-T30-1
title: Seleção, geração e formatura nos pontos fracos de digitação
status: accepted
kind: decision
date: 2026-11-22
task: T30
builds_on:
  - "[[ADR-0001 Kanagawa Dragon theme]]"
  - "[[ADR-0002 Static web app in Vite, TypeScript and React]]"
  - "[[ADR-T12-1 Text typing is judged word by word]]"
  - "[[ADR-T18-1 Janela de editor com menu recolhível]]"
  - "[[ADR-T19-1 Teclas e componentes comuns de treino]]"
  - "[[ADR-T22-1 Registro por item, retenção e exportação]]"
  - "[[ADR-T23-1 Painel de evolução com estatística pura e SVG próprio]]"
  - "[[ADR-T29-1 Ritmo-alvo adaptativo e cursor fantasma na digitação]]"
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T30-1 Seleção, geração e formatura nos pontos fracos de digitação

## Context

O painel de Evolução (T23) já identifica os pares de caracteres mais lentos e
os caracteres com mais erros na digitação, mas a pessoa não tinha um treino
focado nesses gargalos. Para fechar o ciclo medir → treinar sem criar outra
infraestrutura de registro, precisamos definir de forma pura e determinística:
como selecionar os n-gramas e caracteres mais fracos dos últimos 14 dias, como
gerar texto ou fragmentos curtos de código que os exercitem na frequência
certa, quando um n-grama se forma sob o ritmo-alvo da T29 e como os novos
eventos se integram à Evolução e à árvore de navegação.

## Decision

1. **Seleção pura em `src/stats/weak.ts`:**
   - Considera eventos dos últimos 14 dias (`at >= now - 14 * DAY_MS`) nos
     drills `typing.code`, `typing.text` e `typing.weak`.
   - Extrai todos os bigramas (2 caracteres) e trigramas (3 caracteres) sem
     espaço ou quebra de linha (`/\s/`).
   - Para manter bigramas e trigramas na mesma escala de intervalo por
     caractere (e comparáveis a `targetIntervalMs` da T29), cada ocorrência de
     bigrama usa o intervalo entre as duas teclas (`iv[offset + k]`), e cada
     ocorrência de trigrama usa a média dos dois intervalos internos
     (`(iv[offset + k] + iv[offset + k + 1]) / 2`).
   - Filtra n-gramas com pelo menos `MIN_BIGRAM_COUNT` (`5`) ocorrências,
     calcula a mediana com `quartiles(samples)[1]` e ordena por mediana
     decrescente com desempate estável por ordem lexicográfica de código de
     ponto (`a < b ? -1 : 1`), garantindo independência total da ordem dos
     eventos. Seleciona os 4 mais lentos.
   - Seleciona também os 2 caracteres sem espaço com maior taxa de erro (mesma
     definição e desempate estável de `errorChars`), calculando o intervalo
     mediano histórico de chegada ao caractere quando disponível.
   - A fila de treino da rodada (`targets`) junta os 4 n-gramas mais lentos e
     os 2 caracteres com mais erro (deduplicados, até 6 alvos).
2. **Gerador determinístico em `src/typing/weak-text.ts` e `src/typing/code-words.ts`:**
   - `CODE_WORDS` (`src/typing/code-words.ts`) traz uma lista própria de
     identificadores e palavras-chave de programação em ASCII imprimível, sem
     espaços nem duplicatas.
   - Para n-gramas sem símbolo de código (`!isCodeSymbol(ngram)`), sorteia
     palavras da união de `WORDS.en` (T12) com `CODE_WORDS` que contêm o
     n-grama. Quando nenhuma palavra da lista contém um n-grama raro, compõe
     identificadores curtos em ASCII imprimível que o contêm.
   - Para n-gramas com símbolo de código (`);`, `->`, `[i`, `+=`, etc.), sorteia
     de um conjunto de fragmentos curtos de código sem espaço interno que
     contêm o n-grama, com composição de reserva em ASCII imprimível para
     qualquer símbolo arbitrário.
   - Cada linha tem 6 tokens separados por espaço, contendo o n-grama em pelo
     menos 3 tokens (acima do mínimo de 2 ocorrências por linha), com semente
     derivada por linha (`deriveSeed`) para reprodutibilidade exata.
3. **Rodada de blocos e formatura em `src/typing/weak-round.ts`:**
   - A rodada consiste em até 5 blocos de 30 s, cada um focado no primeiro
     n-grama da fila.
   - Ao fim de um bloco, calcula-se a mediana dos intervalos nas ocorrências do
     n-grama em foco e a precisão do bloco (`correctKeystrokes / keystrokes`).
   - O n-grama **se forma** quando há pelo menos uma ocorrência medida no
     bloco, a mediana fica estritamente abaixo do intervalo do ritmo-alvo
     (`medianMs < targetIntervalMs(targetWpm)`, isto é `60_000 / (5 * target)`)
     e a precisão é `>= 0,95`.
   - Quando se forma, sai da fila e entra o próximo da seleção; caso contrário,
     permanece em foco no bloco seguinte. A rodada termina após 5 blocos ou se
     todos os alvos da fila se formarem antes.
4. **Tela, registro e árvore (`src/ui/WeakTypingScreen.tsx`, `src/stats/event.ts`,
   `src/stats/typing-stats.ts`, `src/stats/progress.ts`, `src/ui/shell/sections.ts`):**
   - Novo drill `typing.weak` em `DRILLS` (`src/stats/event.ts`), com
     `kc = "typing.ngram.<n-grama>"` e payload por token (`extra.w`, `extra.iv`,
     `extra.bad`, `extra.target`, `extra.onPace`), reutilizando `traceText` e
     `textEvents`.
   - `src/stats/typing-stats.ts` passa a extrair `extra.w` também de eventos
     `typing.weak`; `src/stats/progress.ts` incorpora os eventos `typing.weak`
     nas estatísticas de pares e erros de caractere da Evolução (n-gramas com
     símbolo em Código; demais em Texto), sem duplicação entre seções.
   - A tela `WeakTypingScreen` reutiliza `words-engine`, a aparência `.text-words`
     e o cursor fantasma da T29, destacando as ocorrências do n-grama em foco
     com `--selection` e `--selection-text` (sem cor nova). Sem dados
     suficientes, explica o motivo e oferece um botão direto para o Texto.
   - O item **"Pontos fracos"** (`id: "typing-weak"`, `touch: false`) entra na
     pasta **Digitação** logo após **Texto**, mantendo os atalhos 1–9
     inalterados e oculto em telas de toque, como o Código.

## Alternatives considered

- **Somar os dois intervalos de um trigrama sem dividir por 2** — inflaria os
  trigramas para o dobro do tempo dos bigramas, fazendo trigramas dominarem
  sempre o top 4 e impossibilitando a formatura sob `60000 / (5 * alvo)`.
- **Criar motor de digitação separado para Pontos fracos** — duplicaria a
  lógica de palavras, backspaces, cursor fantasma e rastreio de teclas que o
  Texto já testa e mantém; tokens sem espaço interno encaixam diretamente no
  `words-engine`.
- **Criar seção própria só para `typing.weak` na Evolução** — fragmentaria as
  estatísticas de pares lentos; incorporar `typing.weak` às estatísticas de
  pares já exibidas em Digitação mantém o histórico unificado.

## Consequences

- O ciclo medir → treinar fica fechado: eventos de `typing.weak` entram tanto
  na Evolução quanto na seleção das rodadas seguintes de Pontos fracos.
- A T33 (bloco no Treino do dia) poderá consumir `selectWeakSpots` e a tela
  `typing-weak` diretamente.
- O ritmo-alvo para a rodada é herdado dos alvos salvos em `popis.typing-pace`
  (ou do histórico recente de digitação / padrão de 30 WPM), sem criar uma
  nova chave de armazenamento.

## Rollback plan

Remover `src/stats/weak.ts`, `src/typing/code-words.ts`,
`src/typing/weak-text.ts`, `src/typing/weak-round.ts`,
`src/ui/WeakTypingScreen.tsx` e seus testes; remover `"typing.weak"` de
`src/stats/event.ts`, `src/stats/typing-stats.ts` e `src/stats/progress.ts`;
remover `"typing-weak"` de `src/ui/shell/sections.ts`, `src/ui/App.tsx` e
`src/ui/app.css`; e registrar um ADR de rollback.
