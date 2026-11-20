---
id: T18
title: Reformulação gráfica
status: todo
depends_on: [T16, T17]
branch: task/T18-redesign
adrs: []
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

## Spec (rascunho; o passo de spec nomeia os testes)

Decisões do dono (2026-11-20): estilo terminal/IDE; manter a paleta
Kanagawa Dragon (ADR-0001) e a fonte mono; fazer depois das tasks de Vim
(T13–T16) e do acrônimo (T17).

- **AC-1**: **Layout em quatro áreas** (`src/ui/shell/`):
  - **barra de título:** a marca da T17
    ("POPIS · Practice Of Problem-solving In Sprints") e, à direita, a
    tela atual;
  - **barra lateral:** as seções, com títulos em maiúsculas e `--muted`,
    e o item ativo em `--selection` com o texto em `--selection-text`;
  - **painel principal:** a tela do item escolhido;
  - **barra de status:** fixa embaixo, com o modo da tela ("NORMAL",
    "JOGANDO", "DIGITANDO"), os atalhos válidos ali e, à direita, a seed
    ou o tempo.

  A partida, os resultados, as digitações e o Vim também usam esse
  layout. Durante uma partida ou digitação, a barra lateral fica
  recolhida, para não distrair.
- **AC-2**: **Seções e itens** (a ordem é o padrão, e o dono pode mudar):

  | Seção | Itens |
  |---|---|
  | CÁLCULO | Aritmética, Álgebra, Fatoração, Somatórios |
  | CP | Divisão inteira, Estimativa, Primos |
  | TREINO | Revisar (com a contagem de itens) |
  | DIGITAÇÃO | Código, Texto |
  | VIM | os treinos das T13–T16 |

  A lista vem de uma tabela única (`src/ui/shell/sections.ts`), e um
  teste garante que todo modo de `MODES` e toda tela aparecem uma vez.
- **AC-3**: **Teclado em primeiro lugar:**
  - fora de um campo de texto: `j`/`k` e as setas movem na barra
    lateral, `1`–`9` pulam para o item `n` da lista visível, Enter
    começa, `Tab` vai do menu para o painel e `Shift+Tab` volta;
  - `?` abre uma ajuda com todos os atalhos, e Esc fecha a ajuda ou volta
    ao menu;
  - dentro de um campo de texto ou de uma partida, essas teclas não são
    capturadas;
  - o foco é sempre visível (contorno em `--accent`);
  - a ordem de Tab segue a ordem visual.
- **AC-4**: **Painel do item:** mostra a descrição de uma linha do modo,
  as opções (os mesmos campos de hoje, alinhados numa grade de
  rótulo/valor), o melhor resultado e a média dos últimos 10 daquele
  modo e daquela configuração (do histórico já salvo), e o botão
  principal "Começar (Enter)".
- **AC-5**: **Acessibilidade e compatibilidade dos testes:** os itens da
  barra lateral são um grupo de rádio (`role="radio"`) com os mesmos
  nomes acessíveis de hoje ("Aritmética", "Fatoração"…). Os botões
  "Começar", "Digitação", "Texto", "Vim", "Voltar", "Próximo" e
  "Configurar" mantêm os nomes, ou ganham equivalentes registrados.
  - Os testes existentes passam sem mudança.
  - Se um seletor precisar mudar, a mudança vai em commit `test(T18)`
    próprio, explicada no *Log*, sem tirar nenhuma asserção.
- **AC-6**: **Tipografia e espaçamento:** uma escala única de tamanhos e
  espaçamentos como variáveis CSS que não são cor (`--space-1…5`,
  `--text-sm/md/lg/xl`, `--radius`) em `src/ui/app.css`, usada por todas
  as telas. Nenhum literal de cor fora de `theme.css` (guarda de
  `tests/colors.test.ts`). Nenhuma fonte ou dependência nova.
- **AC-7**: **Celular** (Pixel 7):
  - a barra lateral vira uma lista de seções no topo, que se recolhe ao
    escolher um item;
  - a barra de status vira uma linha curta;
  - continuam valendo: nenhuma rolagem horizontal, alvos de toque de pelo
    menos 44 px e a pergunta e o campo de resposta na metade de cima
    (testes de `tests/e2e/mobile.spec.ts`);
  - as telas só de desktop (Digitação de código, Vim) continuam
    escondidas no toque.
- **AC-8**: **Verificação visual:** capturas de cada tela, no desktop
  (1280×800) e no Pixel 7, examinadas e anexadas ao *Log* por nome de
  arquivo (antes e depois). Um e2e (`tests/e2e/shell.spec.ts`) percorre
  o menu só com o teclado: `j`, `j`, Enter começa o terceiro item, Esc
  volta, e `?` abre a ajuda.
- **AC-9**: **ADR** novo para o layout e a navegação por teclado
  (`ADR-T18-1`), citando o ADR-0001 (cores mantidas).

## Out of scope

- Cores ou fontes novas (exigiriam um ADR que substitui o ADR-0001).
- Tema claro.
- Gráficos de evolução (task futura).
- Mudanças de comportamento dos modos, do motor de sessão ou dos
  geradores.

## Files owned

- `src/ui/**`, menos `src/ui/theme.css`
- `src/modes.ts` (só se um campo de apresentação, como a seção, entrar no
  registro; registre no *Log*)
- `tests/e2e/shell.spec.ts`, `tests/e2e/mobile.spec.ts` e os outros e2e
  (só seletores, em commit `test(T18)` próprio, conforme o AC-5)
- `vite.config.ts` (só limiares de cobertura)

## Notas para o batch

- Base: `main` depois da integração de T13–T17, ou `after:T16` se rodar
  no mesmo lote (com a T17 integrada antes).
- Risco alto de conflito com qualquer task de tela em paralelo: rode
  sozinha.
- Visual: siga a política do plano (capturas em `.batch/visual/`,
  examinar, corrigir e listar o restante como verificação manual).

## Log
