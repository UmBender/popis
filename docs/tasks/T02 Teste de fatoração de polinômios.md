---
id: T02
title: Teste de fatoração de polinômios
status: ready
depends_on: [T01]
adrs: []
tags: [task]
---

# T02 Teste de fatoração de polinômios

## Goal

Um modo cronometrado em que aparece um polinômio e a pessoa digita a forma
fatorada, por exemplo `x² − 2x − 15` → `(x-5)(x+3)`. A resposta é aceita
sozinha, como em [[T01 Clone do Zetamac]].

## Spec

- **AC-1**: Um parser lê a resposta digitada: `+ - * ^`, parênteses,
  multiplicação implícita, inteiros e variáveis.
- **AC-2**: A resposta é aceita se a expansão dela for igual ao polinômio
  alvo **e** ela tiver o número esperado de fatores não constantes
  (`^2` conta como dois). Qualquer ordem e forma equivalente servem.
- **AC-3**: Os problemas são gerados de trás para frente: sorteia os
  fatores e depois expande.
- **AC-4**: Níveis:
  1. quadrática mônica, raízes de −9 a 9;
  2. quadrática não mônica;
  3. fator comum + quadrática;
  4. produtos notáveis (diferença de quadrados, quadrado perfeito, soma
     ou diferença de cubos);
  5. cúbica mônica com 3 raízes inteiras;
  6. duas variáveis (`x² − 5xy + 6y²`).
- **AC-5**: Tem uma tecla para pular, e os pulos aparecem no resultado.
- **AC-6**: Para muitas seeds, cada problema gerado aceita a resposta canônica.

## Decisions

Decididas pelo usuário em 2026-11-17:

- A resposta é a forma fatorada completa, não só as raízes.
- `(2x-2)(x+3)` é aceito para `2x² + 4x − 6`. Um modo estrito, que exige
  tirar o fator comum, fica para depois.

## Log
