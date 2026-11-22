---
id: ADR-T29-1
title: Ritmo-alvo adaptativo e cursor fantasma na digitação
status: accepted
kind: decision
date: 2026-11-21
task: T29
builds_on:
  - "[[ADR-0001 Kanagawa Dragon theme]]"
  - "[[ADR-0002 Static web app in Vite, TypeScript and React]]"
  - "[[ADR-T10-1 Code typing has its own engine, screen and store]]"
  - "[[ADR-T12-1 Text typing is judged word by word]]"
  - "[[ADR-T19-1 Teclas e componentes comuns de treino]]"
  - "[[ADR-T22-1 Registro por item, retenção e exportação]]"
  - "[[ADR-T24-1 Treino adaptativo com Elo, FSRS e recomendações]]"
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T29-1 Ritmo-alvo adaptativo e cursor fantasma na digitação

## Context

Nas telas de digitação (Texto e Código), a pessoa via apenas o próprio WPM ao
final da rodada, sem uma referência concreta durante a digitação. Sem um alvo
visível que acompanhe a evolução, é fácil estacionar num ritmo confortável.
Precisávamos definir de forma pura e determinística: o que conta como unidade
no ritmo, como o alvo se ajusta entre rodadas mantendo a regra dos 85% da
ADR-T24-1, como o cursor fantasma avança pulando indentação automática e como
o estado é persistido e registrado nos eventos da T22.

## Decision

1. **Unidade no ritmo (`src/typing/pace.ts`):**
   - No Texto, cada unidade é uma palavra (`chars` = letras da palavra + 1 se
     enviada com espaço). No Código, cada unidade é uma linha (`chars` =
     caracteres digitáveis da linha, excluindo os espaços de indentação
     automática nas linhas 2 em diante, mais 1 pelo Enter quando há próxima
     linha — a soma coincide com `typeableLength` de `src/typing/engine.ts`).
   - Uma unidade está **no ritmo** quando saiu certa (`ok === true`), tem
     `chars > 0` e sua velocidade é maior ou igual ao alvo:
     `chars * 12_000 >= targetWpm * timeMs` (equivalente a
     `(chars / 5) / (timeMs / 60_000) >= targetWpm`, evitando erros de
     arredondamento em fronteira).
2. **Ajuste do alvo entre rodadas (`src/typing/pace.ts`):**
   - Mantém a regra dos 85% (Wilson et al., 2019; ADR-T24-1): a meta padrão é
     `0,85`, ajustável entre `0,70` e `0,95` em passos de `0,05`.
   - Banda morta de ±5 pontos percentuais em torno da meta:
     - fração no ritmo `>= meta + 0,05` **e** precisão da rodada `>= 0,95`:
       sobe `2` WPM;
     - fração no ritmo `<= meta - 0,05`: desce `2` WPM (com piso de `4` WPM
       para nunca chegar a zero);
     - fora disso (inclusive se a fração passar da meta mas a precisão ficar
       abaixo de `95%`, ou se a rodada não tiver unidades): o alvo fica igual.
   - Sem alvo salvo para a configuração, o alvo inicial é a mediana arredondada
     do WPM das últimas 10 rodadas daquela configuração, ou `30` WPM sem
     histórico.
3. **Cursor fantasma (`src/typing/pace.ts`, `src/ui/TypingScreen.tsx`,
   `src/ui/TextTypingScreen.tsx`, `src/ui/app.css`):**
   - Parte no instante da primeira tecla (`startedAt`) e avança
     `alvo × 5 / 60` caracteres por segundo
     (`Math.floor((elapsedMs * targetWpm) / 12_000)` passos).
   - No Código, os passos percorrem apenas as posições digitáveis, pulando os
     espaços de indentação automática logo após cada `\n`.
   - É desenhado como uma barra vertical de 2px na cor do token existente
     `--muted` (distinta de `--accent` do cursor real, sem cor nova). Quando
     ambos os cursores estão no mesmo caractere, a regra do cursor real
     prevalece sem deslocar o texto.
   - Controlado pela opção **"Ritmo-alvo"**, ligada por padrão, acompanhada do
     seletor de meta (`70%`–`95%`). O resultado exibe a fração no ritmo, o alvo
     da rodada e o alvo da próxima com seta (`→`), sem prometer ganhos.
4. **Persistência e eventos (`src/storage/typing-pace.ts`,
   `src/stats/keytrace.ts`):**
   - Chave `popis.typing-pace` guarda `{ version: 1, enabled, goal, targets }`.
   - Chave por configuração: `text:<textConfigKey>` no Texto (tipo, idioma,
     modo, tamanho e demais opções que identificam a configuração da tela) e
     `code:<linguagens ordenadas separadas por +>` no Código.
   - Qualquer dado ausente ou corrompido carrega com os padrões (`enabled: true`,
     `goal: 0.85`, `targets: {}`), como sem histórico.
   - `codeEvents` e `textEvents` aceitam `target` (e `text` em `CodeMeta`) e
     gravam `extra.target` e `extra.onPace` em cada unidade quando `target` é
     informado, mantendo compatibilidade total com chamadas antigas sem `target`.

## Alternatives considered

- **Usar Elo para ajustar o ritmo-alvo** — a velocidade-alvo já é uma grandeza
  direta em WPM; passos fixos de 2 WPM com banda de ±5 pontos convergem de
  forma simples, previsível e legível para a pessoa na tela de resultado.
- **Criar um token de cor novo para o cursor fantasma** — violaria o mínimo de
  tokens da ADR-0001 sem necessidade; `--muted` já existe no tema Kanagawa
  Dragon e contrasta com `--surface` sem competir com `--accent` ou `--wrong`.
- **Animação contínua por pixel em `requestAnimationFrame`** — dependeria de
  medição de layout em cada quadro e quebraria o determinismo em testes com
  relógio falso; posicionar por caractere sobre o mesmo relógio injetado já
  usado nas telas mantém a lógica pura e testável.

## Consequences

- Toda a matemática do ritmo-alvo e da posição do cursor fantasma fica pura em
  `src/typing/pace.ts`, pronta para ser reutilizada pelas tasks T30–T32
  (incluindo o intervalo-alvo `60_000 / (5 * targetWpm)`).
- Os eventos de digitação da T22 passam a registrar o alvo vigente e se cada
  unidade acompanhou o ritmo, permitindo análises futuras na Evolução.
- Na tela Texto, o intervalo de atualização do relógio passa a rodar também nos
  modos Palavras e Frase enquanto o ritmo-alvo estiver ativo, para mover o
  cursor fantasma.

## Rollback plan

Remover `src/typing/pace.ts`, `src/storage/typing-pace.ts` e seus testes,
reverter as adições opcionais em `src/stats/keytrace.ts` e os controles/cursor
fantasma em `src/ui/TypingScreen.tsx`, `src/ui/TextTypingScreen.tsx` e
`src/ui/app.css`, e registrar um ADR de rollback.
