---
id: T43
title: Placar e penalidade do ICPC
status: ready
depends_on: []
branch: task/T43-icpc-scoreboard
adrs: []
tags: [task]
---

# T43 Placar e penalidade do ICPC

## Goal

Um item **Placar** na pasta Maratona, com questões geradas sobre as
regras de pontuação do ICPC e da Maratona SBC: quantos problemas e
quanta penalidade um time tem (minuto do AC + 20 por submissão rejeitada
antes dele, e as rejeições depois do AC ou em problema não resolvido não
contam); quem fica na frente; quanto tempo sobra para passar outro time;
e qual problema atacar olhando quantos times já resolveram cada um. Na
prova, ler o placar rápido ajuda a escolher o próximo problema.

## Spec

- **AC-1**: **Regras puras** `src/icpc/score.ts`: dado um log de
  submissões (`{ team, problem, minute, verdict }`), calcula o placar
  ordenado por problemas (decrescente), penalidade (crescente) e minuto
  do último AC (crescente). Erro de compilação não conta penalidade
  (regra da WF), e isso é configurável.
  - Testes: `src/icpc/score.test.ts` (tabela de casos: rejeição depois do AC, CE, empate desfeito pelo último AC), `src/icpc/score.prop.test.ts` (o placar é uma permutação dos times; adicionar um AC nunca piora a posição de quem o recebe; a ordem não depende da ordem do log).
- **AC-2**: **Gerador** `src/icpc/drill.ts` com os tipos (KC
  `icpc.<tipo>`):
  - `penalidade`: a linha de um time, para responder a penalidade total;
  - `posicao`: um placar pequeno com uma submissão nova, para responder
    a nova posição;
  - `ultrapassar`: o placar e o minuto atual, para responder até que
    minuto o time precisa de um AC para passar o outro;
  - `escolher`: as contagens de AC e de tentativas por problema, para
    responder qual problema tem a maior taxa de acerto.
  - Testes: `src/icpc/drill.prop.test.ts` (a resposta canônica é aceita; os minutos ficam em 0..300; a resposta é única; a mesma seed gera o mesmo item).
- **AC-3**: **Tela** `src/ui/IcpcScreen.tsx`, com o placar desenhado como
  no BOCA e no DOMjudge (balões nas cores de token existentes),
  resposta numérica ou letra do problema, rodada de 90 s e eventos com
  drill `icpc.score`.
  - Testes: `src/ui/IcpcScreen.test.tsx`, `src/ui/shell/sections.test.ts`, `tests/e2e/icpc.spec.ts`.

## Out of scope

- Placar congelado e o resolver.
- Placar ao vivo de contests reais.

## Files owned

- `src/icpc/` (novo), `src/storage/icpc.ts`, `src/stats/event.ts`
- `src/ui/IcpcScreen.tsx`, `src/ui/App.tsx`, `src/ui/shell/sections.ts`, `src/ui/app.css`
- `tests/e2e/icpc.spec.ts`

## Subtasks (one commit each)

- [ ] spec
- [ ] tests
- [ ] models
- [ ] behaviour
- [ ] quality
- [ ] docs

## Log
