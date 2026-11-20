---
id: T18
title: Reformulação gráfica
status: in-progress
depends_on: [T16, T17, T22]
branch: task/T18-redesign
adrs: [ADR-0001, ADR-T22-1, ADR-T18-1]
tags: [task]
---

# T18 Reformulação gráfica

## Goal

O app cresceu de um clone do Zetamac para muitas telas: os modos de
cálculo e de CP, Revisar, duas digitações e o Vim. Mas a tela inicial
ainda é um formulário único, com os modos em botões de rádio e as outras
telas em botões pequenos no rodapé. Esta task reorganiza o app num
layout de **terminal/IDE**, coerente com o público que usa Vim:
- uma barra de título com a marca;
- uma barra lateral com as seções;
- um painel com as opções e o histórico do item escolhido;
- uma barra de status com os atalhos.

Tudo é navegável pelo teclado. As cores continuam as do Kanagawa Dragon.

**Revisão do dono (2026-11-20, depois da T13–T17):** a tela ficou poluída e
os seletores principais estão no pé da página (os botões "Digitação",
"Texto" e "Vim" embaixo do formulário; o "Treino" do Vim embaixo de tudo,
inclusive no Aprender). Esta task passa a exigir:
- um **menu lateral recolhível** que também funcione no celular (gaveta);
- as **opções sempre em cima**, logo abaixo da descrição do item;
- nenhum seletor de tela no pé da página.

A auditoria completa de incoerências está na [[T19 Coerência da
interface]]. A T18 resolve o layout, e a T19 resolve o resto da lista.

## Spec (rascunho; o passo de spec nomeia os testes)

Decisões do dono (2026-11-20): estilo terminal/IDE; manter a paleta
Kanagawa Dragon (ADR-0001) e a fonte mono; fazer depois das tasks de Vim
(T13–T16) e do acrônimo (T17). A direção de design foi refinada com a
skill de frontend e está em [[Shell]], com um protótipo estático e
capturas em `docs/architecture/shell/`. **O protótipo é a referência
visual**: o app deve ficar igual às capturas, salvo o que este spec
muda.

- **AC-1**: **Janela de editor** (`src/ui/shell/`), com quatro áreas
  em todas as telas:
  - **barra de caminho:** `popis/<seção>/<item>` (`…/resultado` no fim
    da rodada). À direita fica a marca da T17 no menu, e o estado da
    rodada nas outras telas;
  - **árvore:** as seções como pastas `▾`/`▸`, com só a inicial
    maiúscula e o atalho numérico à direita de cada item. O item ativo
    fica em `--selection` com `--selection-text`, e o Revisar mostra a
    contagem em `--warning`;
  - **painel principal;**
  - **linha de status** no estilo do Neovim: o modo à esquerda num bloco
    de cor (NORMAL em `--accent`, JOGANDO em `--correct`, RESULTADO em
    `--accent`), seguido dos atalhos válidos, em segmentos separados por
    espaço, sem `·`.

  Durante uma partida ou digitação, a árvore some.
- **AC-2**: **Árvore** (`src/ui/shell/sections.ts`, tabela única; a ordem
  é o padrão, e o dono pode mudar):

  | Pasta | Itens |
  |---|---|
  | Cálculo | Aritmética, Álgebra, Fatoração, Somatórios |
  | CP | Divisão inteira, Estimativa, Primos |
  | Treino | Revisar (com a contagem) |
  | Digitação | Código, Texto |
  | Vim | Aprender, Movimento, Edição |

  Um teste garante que todo modo de `MODES` e toda tela aparecem uma vez.
  Pastas abertas e fechadas ficam salvas.

  O seletor "Treino" do Vim (`src/ui/vim/DrillSelect.tsx`) some: cada
  treino é um item da árvore. O mesmo vale para os botões "Digitação",
  "Texto" e "Vim" do rodapé da configuração.
- **AC-3**: **Teclado em primeiro lugar:**
  - fora de um campo de texto: `j`/`k` e as setas movem na árvore,
    `h`/`l` fecham e abrem pastas, `1`–`9` pulam para o item com esse
    atalho, Enter começa, `Tab` vai para as opções do painel e
    `Shift+Tab` volta;
  - `?` abre uma ajuda com todos os atalhos, e Esc fecha a ajuda ou volta
    ao menu;
  - no resultado, Enter joga de novo, Esc volta ao menu e `r` abre o
    Revisar;
  - dentro de um campo de texto ou de uma partida, essas teclas não são
    capturadas;
  - o foco é sempre visível (contorno em `--accent`), e a ordem de Tab
    segue a ordem visual.
- **AC-4**: **Painel do item**, sempre nesta ordem, de cima para baixo,
  em todas as telas (inclusive Digitação, Texto e os três treinos de
  Vim):
  1. o título em `--text-xl` e a descrição de uma linha em `--muted`;
  2. as opções;
  3. a área do treino (caixa de código, texto ou exercício);
  4. o histórico;
  5. os painéis de referência ("Comandos", "Registradores", "Tipos de
     edição"), fechados por padrão (`<details>`), com o estado salvo.

  Um teste de componente confere essa ordem no DOM para cada item da
  árvore. Detalhes do painel:
  - as opções numa grade rótulo/valor (as caixas de seleção aparecem como
    `[x]`/`[ ]`, mas continuam `input type="checkbox"`);
  - "Últimas 10 rodadas", com uma minibarra de caracteres de bloco e o
    melhor e a média, do histórico já salvo;
  - o botão "Começar" com a tecla `Enter` ao lado.

  Sem rodadas, o painel diz "Nenhuma rodada nesta configuração. Enter
  começa a primeira."
- **AC-5**: **Vereditos na partida** (o ponto ousado do design):
  - cada resposta aceita, cada tentativa errada e cada pulo acrescenta
    `AC`, `WA` ou `SK` a uma fila de submissões, nas cores de [[Shell]];
  - a fila fica no pé da tela no desktop, e logo abaixo do campo de
    resposta no celular;
  - a marca mais nova ganha um contorno que some em 300 ms (nada com
    `prefers-reduced-motion`);
  - a fila tem `aria-label="Submissões"` e não rouba o foco.

  A pergunta fica no terço de cima, em `--text-xxl`.
- **AC-6**: **Placar no resultado:**
  - "N resolvidas em T s" em `--text-xl`;
  - os pares tentativas erradas, puladas e seu recorde;
  - uma tabela (`aria-label="Placar da rodada"`) com uma linha por tipo
    de questão e uma célula por questão, na convenção do ICPC (`+`,
    `+n`, `?`, `−n`), com o tempo ou "pulada";
  - a seed, o botão "Jogar de novo" (`Enter`) e o atalho `r` para
    revisar os erros.

  O cálculo das células é uma função pura testada com uma tabela de logs
  de tentativas.
- **AC-7**: **Tokens que não são cor**, em `src/ui/app.css`, com os
  valores de [[Shell]]: `--text-sm…xxl`, `--space-1…5` e `--rail`. Todas
  as telas os usam.
  - Nenhum literal de cor fora de `theme.css` (guarda de
    `tests/colors.test.ts`).
  - Nenhuma fonte ou dependência nova.
  - Sem sombras, gradientes nem cartões arredondados.
- **AC-8**: **Acessibilidade e compatibilidade dos testes:**
  - os itens da árvore são um grupo de rádio (`role="radio"`) com os
    mesmos nomes acessíveis de hoje;
  - os botões "Começar", "Voltar", "Próximo" e "Configurar" mantêm os
    nomes, ou ganham equivalentes registrados. "Digitação", "Texto" e
    "Vim" deixam de ser botões e viram itens da árvore; os testes que os
    clicavam passam a escolher o item (commit `test(T18)` próprio);
  - os testes existentes passam sem mudança. Se um seletor precisar
    mudar, a mudança vai num commit `test(T18)` próprio, explicada no
    *Log*, sem tirar nenhuma asserção.
- **AC-9**: **Menu lateral recolhível:**
  - no desktop, um botão `☰` na barra de caminho e a tecla `m` (fora de
    um campo) recolhem e abrem a árvore. Recolhida, a árvore some e o
    painel ocupa a largura toda. O estado fica salvo;
  - abaixo de 48rem de largura, a árvore vira uma **gaveta** que entra
    pela esquerda por cima do painel, com um fundo que escurece o resto
    (`--bg` com opacidade, sem cor nova). Ela abre pelo `☰` (alvo de
    44px) e fecha ao escolher um item, com Esc, com um toque fora dela ou
    com o `☰` de novo;
  - enquanto aberta, a gaveta prende o foco (`role="dialog"`,
    `aria-modal="true"`), e ao fechar o foco volta para o `☰`;
  - o botão tem `aria-expanded` e `aria-controls`;
  - a animação de entrada some com `prefers-reduced-motion`.

  *Testes:* componente (abrir, fechar, foco, estado salvo) e
  `tests/e2e/mobile.spec.ts` (gaveta no Pixel 7).
- **AC-10**: **Celular** (Pixel 7):
  - a barra de caminho mostra o `☰` e o item atual; não há seletor de
    tela em nenhum outro lugar;
  - continuam valendo: nenhuma rolagem horizontal, alvos de toque de pelo
    menos 44px, e a pergunta, o campo de resposta e a fila de vereditos
    na metade de cima (`tests/e2e/mobile.spec.ts`);
  - Digitação de código e Vim continuam escondidos no toque.
- **AC-11**: **Verificação visual:** capturas de menu, partida e
  resultado, no desktop (1280×800) e no Pixel 7, comparadas com as de
  `docs/architecture/shell/`. As diferenças são corrigidas ou explicadas
  no *Log*.
  Um e2e (`tests/e2e/shell.spec.ts`) percorre o menu só com o teclado:
  - `j`, `j` e Enter começam o terceiro item;
  - Esc volta;
  - `?` abre a ajuda.
  As capturas também cobrem a árvore recolhida no desktop e a gaveta
  aberta no celular, e o protótipo em `docs/architecture/shell/` é
  atualizado com esses dois estados antes do código (passo de spec).
- **AC-12**: **ADR-T18-1** registra o layout de janela de editor, o menu
  recolhível e a gaveta, a ordem fixa do painel, a navegação por teclado
  e os vereditos, citando o ADR-0001 (cores mantidas), e [[Shell]] passa
  para `status: accepted`.

- **AC-13**: **Dados:** o botão de exportar e importar da [[T22 Registro
  detalhado do treino]], que fica na configuração, vira o item "Dados" da
  árvore (pasta Treino). Os testes da T22 continuam passando.

## Testes de cada critério

| AC | Teste(s) |
|----|----------|
| AC-1 | `src/ui/shell/Shell.test.tsx` → `describe("shell window")`: barra de caminho, árvore, linha de status e árvore escondida na partida e na digitação |
| AC-2 | `src/ui/shell/sections.test.ts` (ordem da tabela, todo modo e toda tela uma vez, atalhos 1–9); `Shell.test.tsx` → `"closed folders are saved"`; `App.test.tsx` e `VimScreen*.test.tsx` escolhem o item da árvore |
| AC-3 | `Shell.test.tsx` → `describe("shell keyboard")`; `tests/e2e/shell.spec.ts` |
| AC-4 | `Shell.test.tsx` → `describe("panel order")` (um caso por item da árvore); `"the mode panel shows the last 10 rounds"` e `"an empty history invites the first round"` |
| AC-5 | `src/ui/verdicts.test.ts` → `describe("verdicts")`; `Shell.test.tsx` → `"the game shows a submissions queue"` |
| AC-6 | `verdicts.test.ts` → `describe("scoreboard")` (tabela de logs); `Shell.test.tsx` → `describe("results scoreboard")` |
| AC-7 | `tests/colors.test.ts` (já existe); `Shell.test.tsx` → `"app.css defines the text, space and rail tokens"` |
| AC-8 | os testes existentes, com os seletores trocados num commit `test(T18)` próprio |
| AC-9 | `Shell.test.tsx` → `describe("collapsible menu")`; `tests/e2e/mobile.spec.ts` → `"the drawer opens and closes on a phone"` |
| AC-10 | `tests/e2e/mobile.spec.ts` (já existe, com a gaveta aberta antes de escolher o modo) |
| AC-11 | `tests/e2e/shell.spec.ts`; capturas em `.batch/visual/` (Log) |
| AC-12 | ADR-T18-1; [[Shell]] em `accepted` |
| AC-13 | `Shell.test.tsx` → `"the Dados item holds the export and import"`; `src/ui/DataPanel.test.tsx` e `src/ui/TrainingLog.test.tsx` continuam passando |

Detalhes decididos no spec (ADR-T18-1):
- os itens da árvore são `input type="radio"` com `aria-label`, e o
  atalho e a contagem do Revisar ficam fora do nome acessível;
- os atalhos `1`–`9` vão para os nove primeiros itens da tabela
  (Aritmética … Revisar);
- `WA` é uma correção (a resposta encurtada), o mesmo `n` do placar;
- o painel do item vem em blocos com `data-panel` = `title`, `options`,
  `area`, `history` e `reference`; o teste de ordem usa esses blocos;
- preferências da janela na chave `popis.shell.v1`;
- a largura de gaveta vem de `matchMedia("(max-width: 48rem)")`, e o
  `App` aceita `narrow` para os testes.

## Out of scope

- Cores ou fontes novas (exigiriam um ADR que substitui o ADR-0001).
- Tema claro.
- Gráficos de evolução (task futura).
- Mudanças de comportamento dos modos, do motor de sessão ou dos
  geradores.

## Files owned

- `src/ui/**`, menos `src/ui/theme.css`
- `docs/architecture/Shell.md` (só o status e ajustes registrados no
  *Log*)
- `src/modes.ts` (só se um campo de apresentação, como a seção, entrar no
  registro; registre no *Log*)
- `tests/e2e/shell.spec.ts`, `tests/e2e/mobile.spec.ts` e os outros e2e
  (só seletores, em commit `test(T18)` próprio, conforme o AC-5)
- `vite.config.ts` (só limiares de cobertura)
- `docs/architecture/shell/prototype.html` (estados recolhido e gaveta,
  conforme o AC-11)

## Subtasks

- [ ] Spec: testes por AC, ADR-T18-1, protótipo com árvore recolhida e
      gaveta
- [ ] Testes vermelhos (Shell, sections, verdicts, shell.spec) e troca de
      seletores dos testes existentes
- [ ] Modelos: `sections.ts`, `verdicts.ts`, preferências e props novas
- [ ] Comportamento: janela, árvore, teclado, gaveta, painéis, vereditos
      e placar
- [ ] Qualidade: check, coverage, e2e e capturas
- [ ] Docs: Log, [[Shell]] e ADR aceitos

## Notas para o batch

- Base: `main` depois da integração de T13–T17, ou `after:T16` se rodar
  no mesmo lote (com a T17 integrada antes).
- Risco alto de conflito com qualquer task de tela em paralelo: rode
  sozinha.
- Visual: siga a política do plano (capturas em `.batch/visual/`,
  examinar, corrigir e listar o restante como verificação manual).

## Log
