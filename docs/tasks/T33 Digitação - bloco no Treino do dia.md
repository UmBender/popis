---
id: T33
title: Digitação - bloco no Treino do dia
status: todo
depends_on: [T30, T31, T32]
branch: task/T33-typing-daily-block
adrs: []
tags: [task]
---

# T33 Digitação - bloco no Treino do dia

## Goal

O Treino do dia (T24) ganha um **bloco curto de digitação**, de 5 min
por padrão, que alterna:
- pontos fracos (T30);
- rajada e código gerado (T31);
- os cartões vencidos do De memória (T32).

É o método com a melhor evidência da proposta: sessões curtas e
espaçadas, com prática intercalada. Ideia D5 de
[[Datilografia para programação]].

## Base em pesquisa

- Baddeley e Longman (1978): 1 h por dia superou 2 h por dia depois das
  mesmas 60 h, mesmo com quem treinava menos *sentindo* que progredia
  mais devagar.
- Shea e Morgan (1979): treinar intercalado é mais lento na hora e
  retém mais depois.

## Spec (rascunho; o passo de spec nomeia os testes)

- **AC-1**: **Montagem do bloco** em `src/stats/daily-typing.ts`, pura e
  por seed:
  - duração de 3 a 15 min, com 5 por padrão;
  - os itens se alternam, e o mesmo tipo nunca aparece duas vezes
    seguidas quando há outro disponível;
  - os cartões vencidos do De memória entram primeiro, no máximo 2;
  - sem dados para os pontos fracos, o tipo é pulado.
- **AC-2**: **Tela:** o bloco aparece no Treino do dia com um timer
  total e passa de um item ao outro sem voltar ao menu. No fim, mostra um
  resumo por tipo.
- **AC-3**: **Texto honesto:** uma linha explica que sessões curtas
  parecem render menos e rendem mais, sem citar número nem prometer
  resultado (método 10 de [[Métricas e evolução]]).
- **AC-4**: **Configuração:** a duração e a opção de ligar ou desligar
  o bloco ficam junto das outras opções do Treino do dia, em
  `popis.adaptive.v1`.

## Out of scope

- Mudar o algoritmo do Treino do dia ou o FSRS.

## Files owned

- `src/stats/daily-typing.ts` (novo), `src/storage/daily.ts`, `src/storage/adaptive.ts`
- a tela do Treino do dia em `src/ui/`

## Log
