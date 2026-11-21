---
id: T19
title: Coerência da interface
status: done
depends_on: [T18]
branch: task/T19-ui-coherence
adrs: [ADR-T19-1]
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

## Spec

- **AC-1**: **Teclas iguais em toda tela de treino**, numa tabela única
  em `src/ui/keys.ts` (a fonte da ajuda `?` da T18 e da linha de
  status), conforme [[ADR-T19-1 Teclas e componentes comuns de treino]]:
  - **Esc** sai do treino e volta ao painel do item. A exceção é o Vim,
    onde Esc é do Vim; lá, sair é `:q` (Enter), como no Neovim, nos três
    treinos (no Movimento, `:` passa a abrir só a linha de comando de
    `:q`). Decisão do dono (2026-11-20): Ctrl+Esc não, porque o KDE e o
    Windows o capturam;
  - **Ctrl+Enter** pula o item atual (questão, trecho, alvo, edição);
  - **Ctrl+Shift+Enter** recomeça a rodada com uma seed nova (usado no
    lugar de Ctrl+R porque `<C-r>` é comando do Vim na Edição e pode ser
    capturado pelo navegador).
  - As dicas soltas (item 9) somem: as teclas aparecem só na linha de
    status da T18 e na ajuda `?`.
  - **Testes:** `src/ui/coherence.test.tsx` (`training keys are uniform across screens`,
    `vim drills exit with :q and keep Esc for vim`, `status line and help use the shared keys table without loose hints`),
    `tests/e2e/coherence.spec.ts`.
- **AC-2**: **Título:** o caminho da T18 é a única indicação de onde a
  pessoa está, e o `<h1>` de cada painel é o nome do item ("Movimento",
  "Edição", "Aprender", "Código", etc.), nunca repetido entre itens.
  - **Testes:** `src/ui/coherence.test.tsx` (`every tree item renders a unique h1 matching its label`).
- **AC-3**: **Partida:** todas as telas de treino mostram o tempo (ou o
  progresso, nos modos por quantidade) e o placar no mesmo componente,
  `src/ui/shell/RoundBar.tsx`. Cada um vem como par rótulo/valor ("tempo
  60 s", "acertos 12", "alvos 7"), na mesma posição.
  - **Testes:** `src/ui/coherence.test.tsx` (`every training screen renders time or progress and score in RoundBar`).
- **AC-4**: **Resultado:** um componente só, `src/ui/shell/Result.tsx`,
  usado por cálculo, Digitação, Texto e os dois treinos de Vim:
  - a linha principal;
  - os pares rótulo/valor;
  - a lista dos piores itens (questões, palavras, alvos ou edições);
  - a seed;
  - o botão "Jogar de novo" (Enter).
  Com 0 acertos, a tela continua completa: mostra o que foi pulado e o
  recorde.
  - **Testes:** `src/ui/coherence.test.tsx` (`every training screen uses Result with Jogar de novo and seed`,
    `calculation results with zero hits still show skipped items and record`).
- **AC-5**: **Histórico:** um componente só (`src/ui/shell/History.tsx`)
  para "Últimas 10 rodadas" (o da T18, AC-4), usado por todos os itens,
  cálculo inclusive. O vazio é sempre "Nenhuma rodada nesta
  configuração. Enter começa a primeira."
  - **Testes:** `src/ui/coherence.test.tsx` (`every training item uses the shared History component and empty message`).
- **AC-6**: **Controles:** um único estilo para as opções, a grade
  rótulo/valor da T18:
  - os `select` têm a largura do conteúdo;
  - os intervalos ("2 a 100") nunca quebram no meio: no celular, cada
    intervalo vai para uma linha inteira (item 14);
  - nenhum `fieldset` com borda fora dos painéis de referência.
  - **Testes:** `src/ui/coherence.test.tsx` (`no bordered fieldset appears outside reference panels`,
    `arithmetic ranges keep each parenthesized interval together`),
    `tests/e2e/coherence.spec.ts`.
- **AC-7**: **Vim Edição enxuta:**
  - a caixa do "depois" fica ao lado da atual quando há largura, e abaixo
    dela no celular;
  - "Tipos de edição" fica agrupado por família (edição, visual,
    registradores) e fechado por padrão;
  - os tipos bloqueados mostram um só aviso no topo do grupo, com um
    link para a lição.
  O treino cabe em uma tela de 1280×800 sem rolar até a área de edição.
  - **Testes:** `src/ui/coherence.test.tsx` (`vim edit groups kinds by family, collapsed by default, with one locked notice`),
    `tests/e2e/coherence.spec.ts`.
- **AC-8**: **"Comandos deste nível"** mostra também os níveis
  anteriores, num grupo "já valem" fechado por padrão (item 17).
  - **Testes:** `src/ui/coherence.test.tsx` (`vim motion commands show current level and earlier levels collapsed under já valem`).
- **AC-9**: **Partida no celular:** a pergunta fica acima do campo, em
  `--text-xxl`, e a fila de vereditos da T18 ocupa o espaço logo abaixo
  (item 15).
  - **Testes:** `src/ui/coherence.test.tsx` (`mobile game CSS stacks prompt above answer in --text-xxl`),
    `tests/e2e/coherence.spec.ts`.
- **AC-10**: **Verificação:**
  - as capturas de todas as telas (desktop e Pixel 7) são refeitas;
  - cada item da *Auditoria* ganha, no *Log*, a linha "resolvido em
    <commit>" ou "mantido porque …";
  - um e2e `tests/e2e/coherence.spec.ts` confere as teclas do AC-1 e a
    ordem do painel em todas as telas.

## Subtasks

- [x] Criar ADR-T19-1 e especificar os testes de AC-1 a AC-10
- [x] Escrever testes falhando em `src/ui/coherence.test.tsx` e `tests/e2e/coherence.spec.ts`
- [x] Adicionar modelos/assinaturas de `src/ui/keys.ts`, `RoundBar.tsx`, `Result.tsx`, `History.tsx`
- [x] Implementar AC-1 a AC-9 nas telas de `src/ui/` e em `src/ui/app.css`
- [x] Atualizar testes unitários/e2e antigos cujos rótulos/teclas mudaram pelo spec
- [x] Rodar `npm run check`, `npm run coverage`, `npm run test:e2e` e registrar estado das capturas visuais
- [x] Preencher o *Log* com todos os 17 itens da auditoria e mover para `review`

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

- 2026-11-20 — **UNATTENDED CHOICE:** usado `Ctrl+Shift+Enter` (e `Cmd+Shift+Enter`)
  para recomeçar a rodada com seed nova em todas as telas de treino em vez de `Ctrl+R`,
  conforme alternativa prevista no spec e em [[ADR-T19-1 Teclas e componentes comuns de treino]],
  porque `<C-r>` já é comando do Vim na Edição (refazer e `i_<C-r>` para registradores) e
  pode ser interceptado pelo navegador.
- 2026-11-21 — **Capturas visuais (AC-10 / política do batch):** passo pulado porque o
  comando `npx playwright test --config .batch/visual/playwright.config.ts` foi negado pela
  verificação de permissão do ambiente; verificação visual manual no desktop e celular
  fica registrada para revisão do dono.
- 2026-11-21 — **Gates:** `npm run check` verde (106 arquivos, 3870 testes, build OK),
  `npm run coverage` verde (`src/ui/**`: 100% linhas/statements/funções, 98.5% branches),
  `npm run test:e2e` verde (26 testes em chromium e mobile, incluindo `tests/e2e/coherence.spec.ts`).
- 2026-11-21 — **Resolução da Auditoria (17 itens):**
  1. Navegação e modos no menu lateral/drawer: resolvido em `d2e41a8` (T18) e conferido em `tests/e2e/coherence.spec.ts`.
  2. Ordem fixa das opções acima da área de treino: resolvido em `d2e41a8` (T18) e conferido em `tests/e2e/coherence.spec.ts`.
  3. Altura excessiva do Vim Edição (caixas empilhadas, 36 tipos e comandos abertos): resolvido em `477ce08` (buffers lado a lado em `.vim-buffers`, tipos agrupados por família e fechados por padrão em `<details>`, comandos já fechados por T18).
  4. `Esc` com quatro comportamentos diferentes: resolvido em `477ce08` (`Esc` sai do treino em cálculo, Código e Texto; no Vim, `Esc` continua do Vim e `:q` + `Enter` sai nos três treinos).
  5. Recomeçar com tecla diferente por tela: resolvido em `477ce08` (`Ctrl+Enter` pula e `Ctrl+Shift+Enter` recomeça com seed nova em todas as telas, via `src/ui/keys.ts`).
  6. Título `<h1>` sem regra / repetido entre itens: resolvido em `477ce08` (`PanelTitle` usa `<h1>` único igual ao nome do item na árvore; `Brand` deixou de usar `<h1>`).
  7. Tempo exibido de três jeitos / ausente em Código: resolvido em `477ce08` (`RoundBar` em `src/ui/shell/RoundBar.tsx` usado em todas as telas de treino, com tempo em segundos).
  8. Placar sem padrão de rótulo/valor: resolvido em `477ce08` (`RoundBar` padroniza rótulo antes do valor em todas as telas).
  9. Dicas soltas (`.hint`) com `·` em várias telas: resolvido em `477ce08` (removidas; atalhos vêm de `src/ui/keys.ts` na linha de status e na ajuda `?`).
  10. Resumo do histórico com três formatos: resolvido em `477ce08` (`RoundHistory` em `src/ui/shell/History.tsx` usado em todos os itens de treino com mensagem única de vazio).
  11. Resultado do cálculo pobre com 0 acertos: resolvido em `477ce08` (`Result` em `src/ui/shell/Result.tsx` mostra pares de erradas/puladas/recorde, seed e tabela de puladas mesmo com 0 acertos).
  12. Botão de avançar chamado "Jogar de novo" ou "Próximo": resolvido em `477ce08` (`Result` usa sempre "Jogar de novo" com `<kbd>Enter</kbd>`).
  13. `fieldset` com borda misturado com opções soltas e `select` esticado: resolvido em `477ce08` e `a0da8dd` (nenhum `fieldset` fora de painéis de referência; `select` com largura do conteúdo).
  14. Intervalos da Aritmética quebrando no meio no celular: resolvido em `477ce08` (`.range-group` com `white-space: nowrap` e empilhamento por linha abaixo de `48rem`).
  15. Partida no celular com pergunta espremida ao lado do campo: resolvido em `477ce08` e `a0da8dd` (`.problem` em coluna com pergunta em `--text-xxl` acima do campo, ajustando expressões longas com `.prompt.long` para manter pergunta e campo na metade superior).
  16. Aviso "(libere em Aprender)" repetido em cada caixa bloqueada do Vim Edição: resolvido em `477ce08` (aviso único `vim-locked-notice` no topo do grupo de registradores, com botão para abrir `Aprender`).
  17. "Comandos deste nível" sem distinguir níveis anteriores: resolvido em `477ce08` (comandos do nível atual listados diretamente e níveis anteriores em `<details>` fechado por padrão "já valem").
