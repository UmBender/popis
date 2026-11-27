---
title: Treinos de digitação com idiomas medidos
date: 2026-11-26
status: awaiting-verdicts   # awaiting-verdicts | decided
tags: [proposal]
---

# Treinos de digitação com idiomas medidos

O que se pede ao dono: decidir quais treinos de digitação o popis ganha a
partir das frequências medidas no código dos melhores programadores
competitivos.

## Origem

Esta proposta nasceu como *Estudo dos programadores mais rápidos*. A
sondagem dos dados (P0, 2026-11-26) mostrou que o estudo é viável, mas
grande demais para o popis. Por decisão do dono, o **estudo** foi para um
projeto próprio, o **bonaparte** (`~/repos/bonaparte`). Lá ficaram:

- o corpus (dataset `open-r1/codeforces-submissions` com a API do
  Codeforces, até 2022-03) e o relatório da P0;
- o corpus estratificado, a frequência de palavras e orações, a
  velocidade e os estudos de caso (antigas P1 a P4, hoje as tasks T04,
  T07, T08 e T11 de lá).

Aqui ficam só os **treinos** que consomem o resultado.

## Contrato com o bonaparte

- O popis consome o produto `products/typing-idioms/v1/` do bonaparte
  (ADR-0005 de lá): palavras, orações normalizadas e idiomas de várias
  linhas, com frequência por faixa de rating do autor e do problema,
  `schema.json` e `manifest.json`.
- **A integração é por arquivo.** O popis copia o JSON para
  `src/typing/cp-dict/`, junto com o manifesto, e valida com testes de
  propriedade próprios: tokens imprimíveis, frequências positivas, sem
  duplicatas. Nada importa código do bonaparte.
- Uma versão publicada é imutável. Formato novo é `v2` e uma migração
  explícita aqui.

## Limites que toda ideia respeita

- **App estático, sem rede em tempo de execução.** Como orçamento inicial
  a confirmar, até 300 KB somando todos os dicionários.
- **Nenhuma solução inteira de terceiros vai para o app.** Só idiomas
  curtos e normalizados, com a atribuição ODC-By ao dataset na tela
  "Sobre" (o bonaparte já garante isso no produto).
- `src/` só lê o JSON; nenhuma dependência nova.

## Como as ideias são pontuadas

- **Value** de 1 a 5, para quem usa o popis.
- **Cost** = tamanho (S 1, M 2, L 4) + risco ao objetivo do projeto
  (low 0, medium 1, high 2).
- **Score** = value ÷ cost.

## Ranking

O dono preenche *Verdict* com `accepted`, `later` ou `rejected`.

| # | Ideia | Value | Size | Risk | Cost | Score | Verdict |
|---|-------|-------|------|------|------|-------|---------|
| 1 | P5 Texto CP: dicionário de palavras medidas | 4 | S | low | 1 | 4.00 | pending |
| 2 | P6 Orações de CP com pesos medidos | 5 | M | low | 2 | 2.50 | pending |
| 3 | P7 Seu estilo contra o dos melhores | 4 | M | medium | 3 | 1.33 | pending |

Todas esperam o `typing-idioms/v1`. Ordem recomendada: P5 → P6 → P7.

## O que já existe

- **Texto** ([[T12 Digitação de texto]]) sorteia palavras comuns ou
  frases, no estilo Monkeytype.
- **Código gerado e Rajada** ([[T31 Digitação - código gerado e rajadas]])
  usam uma gramática de idiomas de CP com pesos escritos à mão.
- **Mineração do repositório do dono**
  ([[T34 Digitação - trechos do repositório de CP]], `src/typing/mine/`)
  dá o perfil de estilo do dono, usado em P7.
- **Palavras de código dos pontos fracos** (`src/typing/code-words.ts`)
  formam uma lista escrita à mão, que P5 substitui.

## Ideias

### P5 Texto CP: dicionário de palavras medidas

- **Value** 4. É o pedido direto: digitar as palavras que mais aparecem
  em CP.
- **In use**: no Texto aparece uma opção "CP" ao lado de palavras comuns
  e frases. As palavras são sorteadas pela frequência medida no produto `typing-idioms`, e
  há um filtro por faixa de problema (fácil ou difícil).
- **Size**: S, porque o motor do Texto já existe.
- **Risk**: low.
- **Extends**: [[T12 Digitação de texto]]. Também substitui a lista à
  mão de `code-words.ts` nos pontos fracos (T30).
- **Dependency**: `typing-idioms/v1` do bonaparte (T07 de lá).

### P6 Orações de CP com pesos medidos

- **Value** 5. Treina os pedaços que mais custam teclas: o `for` rápido,
  a DP com `max`, `min`, produto e `% MOD`, a leitura de grafo, a busca
  binária.
- **In use**:
  - frases de uma linha (ou blocos curtos) sorteadas por frequência ×
    teclas, com nomes concretos sorteados pelos pesos medidos;
  - a Rajada (T31) passa a usar os idiomas do topo do ranking.
- **Size**: M. Os pesos da gramática de `src/typing/codegen/` passam a
  vir das orações do `typing-idioms`. Hoje esses pesos são escritos à mão.
- **Risk**: low.
- **Extends**: [[T31 Digitação - código gerado e rajadas]].
- **Dependency**: `typing-idioms/v1` do bonaparte (T07 de lá).

### P7 Seu estilo contra o dos melhores

- **Value** 4. É a pergunta "o jeito que eu escrevo é o ótimo?".
- **In use**:
  - um relatório com pares do tipo "você escreve X, o topo escreve Y",
    com quantas teclas cada forma custa. Exemplo: `for (int i = 0; i < n; i++)`
    contra `rep(i, n)`, ou `#define int long long` contra `ll`;
  - para cada par que o dono adotar, uma Rajada da forma nova.
- **Size**: M. Compara o perfil do T34 com o do `typing-idioms`.
- **Risk**: medium. Escrever mais curto não é sempre melhor: macros
  podem esconder bugs, e o dono decide par a par.
- **Dependency**: `typing-idioms/v1` e T34.
