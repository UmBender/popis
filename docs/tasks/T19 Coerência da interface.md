---
id: T19
title: Coerência da interface
status: todo
depends_on: [T18]
branch: task/T19-ui-coherence
adrs: []
tags: [task]
---

# T19 Coerência da interface

## Goal

As telas foram feitas uma por task, e cada uma resolveu do seu jeito o
título, o tempo, as dicas de teclas, o resultado e o vazio. Depois da
[[T18 Reformulação gráfica]], que muda o layout, esta task passa a
régua no resto. Cada item abaixo foi achado numa auditoria de
2026-11-20, feita com capturas de todas as telas no desktop e no Pixel 7
e com uma leitura de `src/ui/`. Ao final, as mesmas coisas têm o mesmo
nome, o mesmo lugar e a mesma tecla em todas as telas.

## Auditoria (2026-11-20, `main` em `97d8594`)

### Navegação e layout (resolvidos pela T18; aqui só se confere)

1. Os modos de cálculo são botões de rádio, mas Digitação, Texto e Vim
   são botões no pé da configuração. No celular só aparece "Texto",
   abaixo de 3500px de formulário.
2. A posição das opções muda de tela para tela:
   - na configuração ficam acima de "Começar";
   - na Digitação, "Linguagens" fica acima da caixa;
   - no Texto e no Vim, "Opções" fica abaixo da área do treino;
   - no Aprender, o seletor "Treino" é o último item da página.
3. O Vim Edição tem 5766px de altura no desktop:
   - duas caixas de código empilhadas;
   - 36 caixas de "Tipos de edição";
   - cerca de 80 entradas de "Comandos", todas abertas.

### Teclas

4. **Esc** faz quatro coisas diferentes:
   - no cálculo, volta para a configuração;
   - na Digitação, troca o trecho;
   - no Texto, troca o texto;
   - no Vim, cancela o comando (que é o Esc do Vim, e precisa ficar).
5. **Recomeçar** usa uma tecla em cada tela:
   - Ctrl+Enter na Digitação;
   - Tab no Texto;
   - no Vim, Ctrl+Enter pula o alvo.

### Textos e números

6. **O título da tela não segue uma regra:**
   - a configuração mostra a marca;
   - as outras telas mostram o nome ("Digitação", "Texto", "Vim");
   - o Aprender mostra "Aprender", sem dizer que é do Vim;
   - a partida de cálculo não tem título;
   - os dois treinos de Vim usam o mesmo `<h1>Vim</h1>`.
7. **O tempo aparece de três jeitos:**
   - "Tempo: 120", com rótulo, no cálculo;
   - o número sozinho ("60", "30") no Texto e no Vim;
   - nenhum tempo na Digitação.
8. **O placar não tem padrão:**
   - "Pontos: N" no cálculo;
   - "N alvos · pulados · eficiência média" no Vim Movimento;
   - "wpm" e "precisão" nas digitações.

   A unidade às vezes vem antes do número e às vezes depois.
9. **As dicas de teclas fogem do resto da tela:**
   - são centralizadas, menores e unidas por `·`, enquanto todo o resto é
     alinhado à esquerda;
   - o [[Shell]] proíbe as listas com `·`;
   - as dicas aparecem em seis lugares (`GameScreen`, `TypingScreen`,
     `TextTypingScreen`, `VimScreen`, `EditDrill`), cada uma com texto
     próprio.
10. **O resumo do histórico tem três formatos:**
    - "melhor N · média dos últimos 10: N" (Vim e Texto);
    - "C++: sem resultados" (Digitação);
    - nada no cálculo, que só mostra histórico no Revisar.
11. **O resultado do cálculo é o mais pobre do app.** Com 0 acertos ele
    mostra só "Pontos: 0" e dois botões. O resultado do Vim, em
    comparação, mostra os piores alvos e a seed.
12. **O resultado chama o botão de avançar de dois nomes:** "Jogar de
    novo" no cálculo e "Próximo" no Vim.
13. **Os painéis com borda e legenda (`fieldset`) se misturam com rótulos
    soltos:**
    - "Opções", "Comandos deste nível", "Registradores" e "Tipos de
      edição" usam `fieldset`;
    - a configuração usa rótulos soltos;
    - os `select` do Texto e do Vim ocupam a largura toda, mas o de
      "Duração" na configuração é compacto.
14. **No celular, os intervalos da Aritmética quebram no meio:** a linha
    "( 2 a 100 ) + ( 2 a 100 )" se parte em duas, e o parêntese fica sozinho
    na linha de baixo.
15. **A partida no celular deixa vazios os dois terços de baixo da
    tela**, e a pergunta fica espremida ao lado do campo.
16. **Os tipos de edição bloqueados trazem "(libere em Aprender)" em
    cada caixa**: são oito repetições do mesmo aviso.
17. **"Comandos deste nível" mostra só o nível atual**, mas os níveis
    são cumulativos (o nível 4 aceita `w` e `h`). Isso dá a impressão de
    que os comandos anteriores não valem.

## Spec (rascunho; o passo de spec nomeia os testes)

- **AC-1**: **Teclas iguais em toda tela de treino**, numa tabela única
  em `src/ui/keys.ts` (a fonte da ajuda `?` da T18 e da linha de
  status):
  - **Esc** sai do treino e volta ao painel do item. A exceção é o Vim,
    onde Esc é do Vim; lá, sair é Ctrl+Esc;
  - **Ctrl+Enter** pula o item atual (questão, trecho, alvo, edição);
  - **Ctrl+R** recomeça a rodada com uma seed nova.

  Um teste percorre todas as telas de treino e confere as três ações.
  As dicas soltas (item 9) somem: as teclas aparecem só na linha de
  status da T18.
- **AC-2**: **Título:** o caminho da T18 é a única indicação de onde a
  pessoa está, e o `<h1>` de cada painel é o nome do item ("Movimento",
  "Edição", "Aprender"), nunca repetido entre itens. Um teste confere
  que não há dois itens com o mesmo `<h1>`.
- **AC-3**: **Partida:** todas as telas de treino mostram o tempo (ou o
  progresso, nos modos por quantidade) e o placar no mesmo componente,
  `src/ui/shell/RoundBar.tsx`. Cada um vem como par rótulo/valor ("tempo
  60 s", "acertos 12", "alvos 7"), na mesma posição.
- **AC-4**: **Resultado:** um componente só, `src/ui/shell/Result.tsx`,
  usado por cálculo, Digitação, Texto e os dois treinos de Vim:
  - a linha principal;
  - os pares rótulo/valor;
  - a lista dos piores itens (questões, palavras, alvos ou edições);
  - a seed;
  - o botão "Jogar de novo" (Enter).

  Com 0 acertos, a tela continua completa: mostra o que foi pulado e o
  recorde.
- **AC-5**: **Histórico:** um componente só para "Últimas 10 rodadas"
  (o da T18, AC-4), usado por todos os itens, cálculo inclusive. O vazio
  é sempre "Nenhuma rodada nesta configuração. Enter começa a primeira."
- **AC-6**: **Controles:** um único estilo para as opções, a grade
  rótulo/valor da T18:
  - os `select` têm a largura do conteúdo;
  - os intervalos ("2 a 100") nunca quebram no meio: no celular, cada
    intervalo vai para uma linha inteira (item 14);
  - nenhum `fieldset` com borda fora dos painéis de referência.
- **AC-7**: **Vim Edição enxuta:**
  - a caixa do "depois" fica ao lado da atual quando há largura, e abaixo
    dela no celular;
  - "Tipos de edição" fica agrupado por família (edição, visual,
    registradores) e fechado por padrão;
  - os tipos bloqueados mostram um só aviso no topo do grupo, com um
    link para a lição.

  O treino cabe em uma tela de 1280×800 sem rolar até "Começar".
- **AC-8**: **"Comandos deste nível"** mostra também os níveis
  anteriores, num grupo "já valem" fechado por padrão (item 17).
- **AC-9**: **Partida no celular:** a pergunta fica acima do campo, em
  `--text-xxl`, e a fila de vereditos da T18 ocupa o espaço logo abaixo
  (item 15).
- **AC-10**: **Verificação:**
  - as capturas de todas as telas (desktop e Pixel 7) são refeitas;
  - cada item da *Auditoria* ganha, no *Log*, a linha "resolvido em
    <commit>" ou "mantido porque …";
  - um e2e `tests/e2e/coherence.spec.ts` confere as teclas do AC-1 e a
    ordem do painel em todas as telas.

## Out of scope

- Cores, fontes e o layout da janela (T18).
- Conteúdo novo de Vim (T20, T21) e métricas (T22–T24).

## Files owned

- `src/ui/**`, menos `src/ui/theme.css`
- `tests/e2e/coherence.spec.ts` e seletores de outros e2e (em commit
  `test(T19)` próprio)

## Notas para o batch

- Depende do layout da T18; rode logo depois dela e sozinha, porque toca
  todas as telas.
- A mudança de teclas (AC-1) altera o hábito do usuário: registre no
  ADR-T19-1 e mostre na ajuda `?`.

## Log
