---
id: T22
title: Registro detalhado do treino
status: ready
depends_on: []
branch: task/T22-training-log
adrs: []
tags: [task]
---

# T22 Registro detalhado do treino

## Goal

Para medir a evolução ([[Métricas e evolução]]), o app precisa de dados
por item e de um histórico longo. Hoje:
- o Vim guarda só o total da rodada;
- as digitações não guardam nada por tecla;
- todo histórico perde as sessões antigas depois de 200.

Esta task guarda o que falta, sem perder o começo da curva, e permite
exportar e importar tudo, porque `localStorage` some ao limpar o
navegador. Não muda nenhuma tela de treino.

## Spec (rascunho; o passo de spec nomeia os testes)

- **AC-1**: **Evento por item**, num formato comum
  (`src/storage/events.ts`):
  `{ at, drill, config, kc, ok, timeMs, extra }`, com `kc` (componente de
  conhecimento) igual a:
  - **cálculo e CP:** o `skill` do problema (já existe; o evento é
    derivado do `log` da sessão, sem gravar duas vezes);
  - **Vim Movimento:** um evento por alvo, com as teclas usadas, a
    solução ótima, o mínimo, o tempo, se pulou e, quando a T21 existir,
    se foi assistido. O `kc` é o comando principal da solução ótima (`f`,
    `w`, `/`…);
  - **Vim Edição:** um evento por edição, com `kc` = tipo de edição;
  - **Digitação e Texto:** um evento por palavra (Texto) ou linha
    (Código), com os intervalos entre teclas e os caracteres errados.
    Os pares de letras (`kc`) saem desses dados na hora da análise.

  Teste de propriedade: os eventos de uma rodada somam o mesmo placar
  que o resultado da rodada.
- **AC-2**: **Sem perder o começo:**
  - as rodadas acima do limite atual não são descartadas, e sim
    **resumidas por dia, treino, configuração e KC** (contagem, acertos,
    mediana e quartis do tempo) em `popis.daily.v1`;
  - os eventos brutos ficam só nos últimos 90 dias.

  Um teste confere que, depois de resumir, as curvas por dia são iguais
  às calculadas dos eventos brutos.
- **AC-3**: **Tamanho:**
  - o uso total do `localStorage` fica abaixo de 3 MB com um ano de uso
    diário de 30 min. Um teste de simulação com o gerador de seed confere
    isso;
  - se `setItem` falhar por cota, o app resume mais cedo e avisa uma vez,
    sem perder a rodada atual.
- **AC-4**: **Migração:** os dados atuais (`popis.history.v1`,
  `popis.vim`, `popis.typing`, `popis.text-typing`) são lidos e viram
  eventos ou resumos diários, uma vez, sem apagar as chaves antigas até
  a migração dar certo. Há um teste com dados reais de cada formato.
- **AC-5**: **Exportar e importar:**
  - um botão gera um arquivo `popis-<data>.json` com tudo: histórico,
    eventos, resumos e configurações;
  - importar junta os dados sem duplicar (chave: `at` + `drill` + `seed`)
    e valida a versão;
  - teste de ida e volta: exportar → apagar → importar dá os mesmos dados.
- **AC-6**: **Pureza:** a agregação e os resumos são TypeScript puro em
  `src/stats/` (pasta nova), testados sem navegador, com cobertura de
  100%.
- **AC-7**: **ADR-T22-1** registra o formato do evento, a retenção (90
  dias brutos e resumo diário para sempre) e a exportação.

## Out of scope

- Telas de análise (T23) e recomendações (T24).
- Sincronizar entre dispositivos ou com um servidor.

## Files owned

- `src/storage/**`, `src/stats/**` (novo)
- Os pontos de gravação em `src/ui/**` (só a chamada que grava o evento)
- O botão de exportar e importar: um item "Dados" na árvore da T18, ou
  um botão na configuração se a T18 ainda não estiver integrada

## Notas para o batch

- **Ordem:** roda antes da T18 (decisão do dono, 2026-11-20), partindo
  da `main`. O botão de exportar e importar fica na configuração, e a
  T18 o move para o item "Dados" da árvore.

## Log
