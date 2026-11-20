---
id: T24
title: Treino adaptativo
status: todo
depends_on: [T23]
branch: task/T24-adaptive-training
adrs: []
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

## Spec (rascunho; o passo de spec nomeia os testes)

- **AC-1**: **Elo por KC** em `src/stats/elo.ts`:
  - a pessoa tem uma nota por KC, e cada nível de dificuldade do gerador
    tem a sua;
  - uma resposta conta como vitória se for certa e dentro do tempo-alvo
    do KC (a mediana dos acertos dela nas últimas 2 semanas);
  - K decresce com o número de respostas (Pelánek, 2016).

  Testes de propriedade:
  - acertos seguidos sobem a nota;
  - a soma das variações da pessoa e do item é zero;
  - em dados simulados com habilidade conhecida, a ordem das notas
    recupera a ordem real.
- **AC-2**: **Dificuldade automática:** uma opção "Nível automático" nos
  treinos que têm níveis (Movimento do Vim, Estimativa, Somatórios, as
  faixas da Aritmética):
  - mantém a chance prevista de acerto perto da meta, 85% por padrão,
    ajustável entre 70% e 95%;
  - sobe ou desce no máximo um nível entre rodadas.

  Um teste de simulação confere que a taxa de acerto converge para a
  meta ± 5 pontos.
- **AC-3**: **Revisar com FSRS:**
  - cada problema errado ou lento vira um cartão com estabilidade,
    dificuldade e data da próxima revisão;
  - a nota sai do resultado: 1 errou, 2 acertou devagar, 3 acertou, 4
    acertou abaixo da mediana;
  - a contagem do Revisar na árvore mostra só os cartões vencidos;
  - os comandos de Vim que falham entram como cartões ("chegar ao `(`
    com 2 teclas").

  Testes com os valores de referência de uma implementação conhecida do
  FSRS (parâmetros padrão), tirados de exemplos documentados. O *Log*
  diz a versão e a fonte. Os itens atuais do Revisar viram cartões novos.
- **AC-4**: **"Treino do dia"** no topo da árvore:
  - uma sessão de 5–10 min que intercala os cartões vencidos do Revisar
    com os 3 KCs de pior BIS, cada um no nível dado pelo Elo;
  - a pessoa vê o motivo de cada bloco ("`f` está irregular: CV 0,6").
- **AC-5**: **Recomendações**, no painel do item e na Evolução, com
  regras simples e testadas em tabela:
  - **platô** há 2 semanas → sugere subir o nível ou intercalar;
  - **precisão acima de 97%** com velocidade estável → sugere subir o
    nível;
  - **precisão abaixo de 70%** → sugere descer o nível ou usar a prévia
    (Vim);
  - **KC sem melhora** depois de 20 oportunidades → sugere a lição do
    Aprender (Vim) ou um treino só dele.

  Os textos falam em "deve ajudar", sem prometer número (seção 10 da
  pesquisa).
- **AC-6**: **Experimento pessoal:** a pessoa pode alternar o Treino do
  dia entre "intercalado" e "em bloco" por semana, e a Evolução mostra o
  ganho de cada modo. A evidência de intercalar em matemática é mista,
  então o app deixa a pessoa medir.
- **AC-7**: **ADR-T24-1** registra o Elo, a meta de 85% como padrão
  ajustável, o FSRS no Revisar (e como ele substitui o `SLOW_FACTOR` da
  T06, com `amends` no ADR-T06-1) e as regras das recomendações.

## Out of scope

- Aprendizado de máquina além do Elo e do FSRS com parâmetros padrão
  (otimizar os pesos do FSRS fica para depois, quando houver dados).
- Notificações e lembretes.

## Files owned

- `src/stats/elo.ts`, `src/stats/fsrs.ts`, `src/stats/recommend.ts`
- `src/storage/review.ts`
- `src/ui/**` (Treino do dia, nível automático, textos de recomendação)

## Log
