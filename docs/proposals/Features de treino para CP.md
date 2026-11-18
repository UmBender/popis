---
title: Features de treino para CP
date: 2026-11-18
status: decided
tags: [proposal]
---

# Features de treino para CP

Questões geradas na hora e conferidas automaticamente, sem banco de
questões. Aprovadas pelo usuário em 2026-11-18. As cinco primeiras viraram
tasks; o resto fica aqui até ganhar uma.

## Viraram tasks

| Task | Feature |
|------|---------|
| [[T04 Divisão inteira e resto em C++]] | `/` e `%` do C++ com negativos, piso, teto, mod matemático, desigualdades |
| [[T05 Manipulação algébrica]] | expandir, simplificar, completar o quadrado, dividir por (x − a) |
| [[T06 Revisar erros]] | refazer questões puladas, corrigidas ou lentas a partir das seeds |
| [[T07 Estimativa e complexidade]] | restrição → complexidade, ordem de grandeza, overflow |
| [[T08 Somatórios e contagem de laços]] | forma fechada de Σ e de quantas vezes um laço executa |

## Ainda sem task

- **Aritmética de CP:** potências de 2 e logaritmos, `popcount`, `x & -x`,
  XOR; `a·b mod m`, `aᵏ mod p`, inverso modular; contagens fechadas (pares,
  subarrays, inclusão-exclusão, estrelas e barras); gcd, lcm, divisores,
  fatoração prima.
- **Lógica e visualização:** sequências (PA, PG, quadrática, intercalada);
  coordenadas (rotação de 90°, Manhattan, Chebyshev, (x+y, x−y)); índices de
  matriz girada; caminhos e retângulos em grade; grafo desenhado em SVG
  (componentes, graus, distância, bipartição); prefix sum 2D.
- **Formato:** modo com penalidade (−1 por erro, estilo Optiver 80 em 8);
  mapa das contas lentas (tabuada colorida pelo tempo médio).
- **Dificuldade adaptativa** a partir do tempo e das correções guardados.

## Referências

- Optiver 80 em 8: https://www.tradinginterview.com/courses/mental-arithmetic/quizzes/optiver-80-in-8-test/
- Tabela de complexidade (~10⁸ operações/s): https://www.dcc.fc.up.pt/~pribeiro/aulas/pc2526/material/bigo_table.html
