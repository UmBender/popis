---
id: T23
title: Painel de evolução
status: todo
depends_on: [T19, T22]
branch: task/T23-progress-panel
adrs: []
tags: [task]
---

# T23 Painel de evolução

## Goal

Hoje a pessoa vê só "melhor" e "média dos últimos 10". Esta task mostra se
ela está melhorando, em quê, e onde parou de melhorar. Para isso usa os
métodos de [[Métricas e evolução]] (seções 1–5 e 11): curva de
aprendizado com platô, taxa semanal, curva por habilidade, velocidade
junto com precisão, regularidade e pares de letras lentos.

## Spec (rascunho; o passo de spec nomeia os testes)

- **AC-1**: **Estatística pura** em `src/stats/`, com testes de tabela e
  de propriedade:
  - **ajuste da lei da prática** `a − b·n^(−c)`, só com 8 rodadas ou mais.
    Teste: dados gerados por uma potência conhecida, mais ruído com seed,
    recuperam `a` e `c` com erro abaixo de 10%;
  - **inclinação de Theil–Sen** das últimas 10 rodadas e **platô**
    (inclinação ≤ 0 com 10 rodadas). Teste: uma rodada muito ruim no meio
    não muda o veredito;
  - **taxa semanal**: inclinação por semana nas últimas 4 semanas;
  - **curva por KC**: taxa de erro e mediana do tempo na 1ª, 2ª, …,
    20ª oportunidade;
  - **BIS** por KC sobre o histórico da própria pessoa: z da mediana do
    tempo menos z da taxa de acerto;
  - **CV** dos tempos de acerto por KC, com pelo menos 10 acertos;
  - **digitação:** mediana do intervalo por par de letras (pelo menos 5
    ocorrências) e erro por caractere.
- **AC-2**: **Item "Evolução" na árvore** (T18), com uma seção por
  treino:
  - a linha principal ("Aritmética 120 s: 38 → 46 acertos/min em 6
    semanas, +1,3 por semana");
  - o gráfico das rodadas (pontos), com a curva ajustada, o teto estimado
    e a meta opcional;
  - o selo **platô** quando for o caso, com a data de início;
  - uma tabela dos KCs ordenados pelo BIS (os mais fracos primeiro), com
    acertos/min, precisão, mediana do tempo, CV ("estável"/"irregular")
    e oportunidades;
  - na Digitação e no Texto, os 10 pares de letras mais lentos e os 10
    caracteres com mais erro.
- **AC-3**: **Gráficos sem dependência nova:**
  - SVG desenhado em `src/ui/` com as cores do tema (pontos em `--muted`,
    curva em `--accent`, meta em `--warning`);
  - cada gráfico tem uma tabela equivalente para leitor de tela
    (`<details>` "ver como tabela");
  - eixo do tempo em datas, não em número da rodada.
- **AC-4**: **Comparação justa:** só entram na mesma curva rodadas com a
  mesma configuração (a chave de config que já existe em cada store).
  Rodadas com a prévia do ótimo (T21) aparecem com outro símbolo e ficam
  fora do ajuste. Mudar a configuração começa uma curva nova, e o painel
  mostra as configurações mais jogadas.
- **AC-5**: **Painel do item:** o histórico de cada item da árvore (T18,
  AC-4) ganha a taxa semanal e o selo de platô, ligando para a seção
  dele em "Evolução".
- **AC-6**: **Meta:** a pessoa define uma meta por item (valor e data).
  O gráfico mostra a linha da base até a meta, como no CBM, e o painel
  diz se ela está acima ou abaixo da linha.
- **AC-7**: **Celular:** os gráficos ocupam a largura toda, sem rolagem
  horizontal, e as tabelas viram listas rótulo/valor.

## Out of scope

- Escolher o próximo treino (T24).
- Comparar com outras pessoas ou com normas externas: as normas de
  matemática são fracas, e o app é local.

## Files owned

- `src/stats/**`
- `src/ui/progress/**` (novo) e o item da árvore
- `tests/e2e/progress.spec.ts`

## Notas para o batch

- **Visual:** capture o painel com dados simulados (gerador com seed e um
  ano de rodadas) e examine as capturas.

## Log
