---
id: T21
title: Vim - prévia do ótimo
status: todo
depends_on: [T20]
branch: task/T21-vim-optimal-preview
adrs: []
tags: [task]
---

# T21 Vim - prévia do ótimo

## Goal

No Movimento e na Edição, a pessoa só vê a solução ótima (`ótimo: 2
(f()`) **depois** do alvo. Quem não conhece os comandos não tem como
chegar ao ótimo e fica preso ao `h j k l`. Esta task adiciona uma opção
"Prévia do ótimo", que mostra a solução antes e destaca a próxima tecla
enquanto a pessoa digita. Assim dá para aprender praticando. A ajuda vai
sendo retirada conforme a pessoa acerta, e as rodadas com ajuda ficam
separadas no histórico.

## Base em pesquisa

- **Exemplo resolvido e retirada da ajuda** (Renkl e Atkinson; Salden et
  al., 2010): mostrar a solução ajuda o iniciante, e retirá-la conforme
  ele aprende evita a dependência (*expertise reversal*).
- **Regra dos 85%** (Wilson et al., 2019): o aprendizado é mais rápido
  com cerca de 15% de erro. O modo "automático" usa isso para decidir
  quando mostrar a prévia.

Fontes em [[Métricas e evolução]].

## Spec (rascunho; o passo de spec nomeia os testes)

- **AC-1**: **Opção "Prévia do ótimo"** nas opções do Movimento e da
  Edição, salva com as configurações de cada treino, com quatro
  valores:
  - **Desligada** (padrão para quem já tem rodadas): como hoje;
  - **Sempre:** a solução aparece desde o começo de cada alvo;
  - **Ao travar:** a solução aparece depois de 2 teclas a mais que o
    ótimo, ou de 5 s sem avançar;
  - **Automática** (padrão para quem nunca jogou): a prévia aparece
    sempre enquanto a eficiência das últimas 20 metas, contando cada
    comando separadamente, está abaixo de 85%. Acima disso, ela vira
    "Ao travar" para aquele comando.
- **AC-2**: **Como a prévia aparece:**
  - a sequência ótima fica acima do código, cada comando num bloco (`2w`
    `f(` `ci(`), com a descrição de uma linha do comando (de `levelHelp`
    ou `EDIT_HELP`) ao passar o foco ou o mouse;
  - o bloco da próxima tecla fica em `--accent`, e os já feitos em
    `--muted`;
  - se a pessoa sair do caminho ótimo, a prévia é **recalculada a partir
    da posição atual**, com a mesma busca de `optimal.ts`, e mostra o
    novo ótimo daquele ponto;
  - no Movimento, o caminho também aparece no código como pontos de
    passagem discretos (sublinhado em `--muted`), sem cobrir o alvo.

  Testes de componente cobrem os quatro valores e o recálculo.
- **AC-3**: **Desempenho:** recalcular depois de cada tecla leva menos de
  16 ms no nível 7 e nas edições maiores, no pior caso do corpus (mesma
  medição da T13, AC de desempenho). Se não couber, recalcule só quando
  a pessoa para por 150 ms e registre no *Log*.
- **AC-4**: **Histórico separado:**
  - cada alvo guarda se a prévia estava visível (`assisted: true`);
  - o resultado da rodada mostra "com prévia" e "sem prévia" em pares
    separados;
  - recordes e médias do histórico contam só rodadas sem prévia
    nenhuma, e o resumo diz quantas rodadas assistidas ficaram de fora.

  Os resultados antigos carregam como não assistidos. Um teste de
  migração cobre isso.
- **AC-5**: **Atalho:** dentro do treino, `Ctrl+P` mostra a prévia do
  alvo atual uma vez, mesmo com a opção desligada. O alvo conta como
  assistido.
- **AC-6**: **Ligação com o Aprender:** cada bloco de comando da prévia
  tem um link para a lição do comando (T20), que abre sem perder a
  rodada: a rodada pausa e o tempo para.

## Out of scope

- Explicar por que um caminho é ótimo além da linha de cada comando.
- Prévia no Aprender, que já mostra a referência.

## Files owned

- `src/vim/optimal.ts` (só o recálculo a partir de um estado),
  `src/vim/round.ts`, `src/vim/edit-round.ts`
- `src/storage/vim.ts`
- `src/ui/VimScreen.tsx`, `src/ui/vim/EditDrill.tsx`, `src/ui/vim/Preview.tsx`
  (novo)

## Notas para o batch

- **Dependência:** depende da T20 só pelos links para as lições. Sem a
  T20, faça a T21 sem o AC-6 e registre no *Log*.

## Log
