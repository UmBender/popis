---
id: T24
title: Treino adaptativo
status: in-progress
depends_on: [T23]
branch: task/T24-adaptive-training
adrs:
  - "[[ADR-T24-1 Treino adaptativo com Elo, FSRS e recomendações]]"
tags: [task]
---

# T24 Treino adaptativo

## Goal

Medir mostra onde a pessoa está. Esta task diz **o que treinar agora**,
com os métodos 6–10 de [[Métricas e evolução]]:
- dificuldade ajustada para cerca de 85% de acerto (Elo e regra dos
  85%);
- Revisar com repetição espaçada (FSRS);
- um "Treino do dia" que intercala as habilidades mais fracas;
- recomendações em texto que nunca prometem resultado.

## Spec

- **AC-1**: **Elo por KC** em `src/stats/elo.ts`:
  - a pessoa tem uma nota por KC, e cada nível de dificuldade do gerador
    tem a sua;
  - uma resposta conta como vitória se for certa e dentro do tempo-alvo
    do KC (a mediana dos acertos dela nas últimas 2 semanas);
  - `K` decresce com o número de respostas (Pelánek, 2016).
  - **Testes**: `src/stats/elo.test.ts` (tempo-alvo de 2 semanas, vitória
    vs. derrota lenta, `K` decrescente, simulação recuperando a ordem real
    das habilidades) e `src/stats/elo.prop.test.ts` (acertos seguidos sobem
    a nota; soma das variações da pessoa e do item é zero; probabilidade
    prevista em `(0, 1)`).
- **AC-2**: **Dificuldade automática:** uma opção "Nível automático" nos
  treinos que têm níveis (Movimento do Vim, Estimativa, Somatórios, as
  faixas da Aritmética):
  - mantém a chance prevista de acerto perto da meta, 85% por padrão,
    ajustável entre 70% e 95%;
  - sobe ou desce no máximo um nível entre rodadas.
  - **Testes**: `src/stats/elo.test.ts` (simulação determinística de
    convergência para a meta ± 5 pontos em 70%, 85% e 95%; passo máximo
    de 1 nível), `src/storage/adaptive.test.ts` (persistência de
    `autoLevel` e `targetAccuracy`), `src/ui/Adaptive.test.tsx` (opção
    "Nível automático" e meta ajustável em Aritmética, Estimativa,
    Somatórios e Movimento do Vim).
- **AC-3**: **Revisar com FSRS** em `src/stats/fsrs.ts` e
  `src/storage/review.ts`:
  - cada problema errado ou lento vira um cartão com estabilidade,
    dificuldade e data da próxima revisão;
  - a nota sai do resultado: 1 errou, 2 acertou devagar, 3 acertou, 4
    acertou abaixo da mediana;
  - a contagem do Revisar na árvore mostra só os cartões vencidos;
  - os comandos de Vim que falham entram como cartões (ex.:
    ``chegar ao `(` com 2 teclas``);
  - os itens atuais do Revisar viram cartões novos.
  - **Testes**: `src/stats/fsrs.test.ts` (valores de referência exatos do
    FSRS-4.5 com os 17 pesos padrão, notas 1–4, `isDue`),
    `src/stats/fsrs.prop.test.ts` (estabilidade cresce após acerto,
    recuperabilidade decresce com o tempo, lapso reduz estabilidade,
    dificuldade em `[1, 10]`), `src/storage/review.test.ts` (migração de
    itens legados para cartões novos, contagem só de vencidos, cartões de
    comandos de Vim que falham) e `src/ui/Adaptive.test.tsx` (badge da
    árvore conta só vencidos e Revisar exibe cartões de Vim).
- **AC-4**: **"Treino do dia"** no topo da árvore:
  - uma sessão de 5–10 min que intercala os cartões vencidos do Revisar
    com os 3 KCs de pior BIS, cada um no nível dado pelo Elo;
  - a pessoa vê o motivo de cada bloco (ex.: `` `f` está irregular: CV 0,6 ``).
  - **Testes**: `src/stats/recommend.test.ts` (`buildDailyPlan`: 5–10 min,
    combina cartões vencidos e 3 piores KCs por BIS com nível Elo e motivo
    de cada bloco), `src/ui/shell/sections.test.ts` (`Treino do dia` no
    topo da árvore preservando atalhos `1`–`9`), `src/ui/Adaptive.test.tsx`
    e `tests/e2e/adaptive.spec.ts`.
- **AC-5**: **Recomendações**, no painel do item e na Evolução, com regras
  simples e testadas em tabela:
  - **platô** há 2 semanas → sugere subir o nível ou intercalar;
  - **precisão acima de 97%** com velocidade estável → sugere subir o
    nível;
  - **precisão abaixo de 70%** → sugere descer o nível ou usar a prévia
    (Vim);
  - **KC sem melhora** depois de 20 oportunidades → sugere a lição do
    Aprender (Vim) ou um treino só dele;
  - os textos falam em "deve ajudar", sem prometer número.
  - **Testes**: `src/stats/recommend.test.ts` (tabela das 4 regras +
    invariante de texto honesto `"deve ajudar"` sem promessa numérica),
    `src/ui/Adaptive.test.tsx` (exibição no painel do item e na Evolução).
- **AC-6**: **Experimento pessoal:** a pessoa pode alternar o Treino do
  dia entre "intercalado" e "em bloco" por semana, e a Evolução mostra o
  ganho de cada modo.
  - **Testes**: `src/stats/recommend.test.ts` (`compareDailyModes`),
    `src/storage/adaptive.test.ts` (persistência do modo da semana e log
    de sessões diárias), `src/ui/Adaptive.test.tsx` e
    `tests/e2e/adaptive.spec.ts`.
- **AC-7**: **ADR-T24-1** registra o Elo, a meta de 85% como padrão
  ajustável, o FSRS no Revisar (emendando ADR-T06-1) e as regras das
  recomendações.
  - **Verificação**: `docs/decisions/ADR-T24-1 Treino adaptativo com Elo, FSRS e recomendações.md`.

## Out of scope

- Aprendizado de máquina além do Elo e do FSRS com parâmetros padrão
  (otimizar os pesos do FSRS fica para depois, quando houver dados).
- Notificações e lembretes.

## Files owned

- `src/stats/elo.ts`, `src/stats/elo.test.ts`, `src/stats/elo.prop.test.ts`
- `src/stats/fsrs.ts`, `src/stats/fsrs.test.ts`, `src/stats/fsrs.prop.test.ts`
- `src/stats/recommend.ts`, `src/stats/recommend.test.ts`
- `src/storage/review.ts`, `src/storage/review.test.ts`
- `src/storage/adaptive.ts`, `src/storage/adaptive.test.ts` *(adicionado: persistência das opções de nível automático, meta de acerto, modo semanal do Treino do dia e histórico do experimento)*
- `src/storage/backup.ts`, `src/storage/backup.test.ts` *(adicionado: incluir `popis.review-cards.v1` e `popis.adaptive.v1` na exportação/importação)*
- `src/ui/**` (Treino do dia, nível automático, textos de recomendação, experimento na Evolução, cartões Vim no Revisar)
- `tests/e2e/adaptive.spec.ts` *(adicionado: fluxo real de Treino do dia, nível automático, recomendações e viewport mobile)*

## Subtasks

- [ ] Escrever `ADR-T24-1` e especificar ACs e testes na nota
- [ ] Escrever testes falhando para Elo, FSRS, recomendações, storage adaptativo, revisão FSRS e UI
- [ ] Criar modelos, tipos e assinaturas (`tsc --noEmit` verde)
- [ ] Implementar Elo, FSRS-4.5, recomendações, revisão FSRS, Treino do dia, nível automático e experimento pessoal
- [ ] Passar todos os quality gates (`npm run check`, `npm run coverage`, `npm run test:e2e`, `npm run test:fuzz`) e verificação visual
- [ ] Atualizar Log e marcar `status: review`

## Log

- 2026-11-21 — Spec definida na nota e `ADR-T24-1` criado. Adicionados a *Files owned*: `src/storage/adaptive.ts` (persistência de nível automático, meta e experimento), `src/storage/backup.ts` (backup de cartões FSRS e dados adaptativos) e `tests/e2e/adaptive.spec.ts`.
- 2026-11-21 — UNATTENDED CHOICE: WebFetch não estava disponível no ambiente do batch; implementado **FSRS-4.5** com os 17 parâmetros padrão publicados (`[0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755]`) e fórmula `R(t, S) = (1 + 19/81 · t/S)^(-0,5)` já citada em `docs/architecture/Métricas e evolução.md`, validado por valores exatos de referência e testes de propriedade (estabilidade cresce no acerto, recuperabilidade cai no tempo, lapso reduz estabilidade).
- 2026-11-21 — UNATTENDED CHOICE: `"Treino do dia"` entra no topo da árvore na pasta `"Hoje"` sem deslocar os atalhos numéricos `1`–`9` dos itens seguintes, preservando a memória muscular e os testes de atalho de T18.
