---
tags: [architecture]
status: accepted
task: "[[T18 Reformulação gráfica]]"
---

# Shell

Direção de design da [[T18 Reformulação gráfica]]. O protótipo estático
está em `shell/prototype.html`, e as capturas (desktop 1280×800 e Pixel 7)
estão ao lado dele. O protótipo repete os tokens de `src/ui/theme.css`
porque é só uma referência; o app usa os tokens.

## Assunto e público

Treino de velocidade para quem faz programação competitiva e usa Neovim
no Alacritty. O trabalho principal de cada tela é começar um treino com
uma tecla e mostrar se a pessoa está melhorando.

## Ideia

O app parece uma janela de editor: uma barra de caminho em cima, uma
árvore de treinos à esquerda, o painel no meio e uma linha de status
embaixo, como a do Neovim. O resto fica quieto. A ousadia está num lugar
só, o **veredito do juiz**: cada resposta vira uma marca `AC`, `WA` ou
`SK` numa fila de submissões, e o resultado é uma linha de placar no
estilo ICPC.

## Tokens

- **Cores:** só as de [[Theme]] (ADR-0001), sem token novo.
  - Fundo `--bg`; árvore, campos e linha de status em `--surface`.
  - Item ativo em `--selection` com `--selection-text`.
  - `--accent` para foco, tempo, modo NORMAL e botão principal.
  - `--correct`, `--wrong` e `--warning` só nos vereditos e no placar.
- **Fonte:** a mono que já existe (JetBrains Mono), sem fonte nova.
- **Escala de texto:** `--text-sm` 0,8125rem; `--text-md` 1rem;
  `--text-lg` 1,25rem; `--text-xl` 2rem; `--text-xxl` 4,5rem (a pergunta
  da partida). Pesos 400 e 700; números com `tabular-nums`.
- **Espaço:** `--space-1…5` = 0,25 · 0,5 · 1 · 1,5 · 3rem; a largura da
  árvore é `--rail: 26ch`. O texto corrido vai até 80ch.
- **Bordas:** linhas de 1px em `--selection` separam as áreas; não há
  sombras, gradientes nem cartões arredondados.

## Layout

```
┌ popis/cálculo/aritmética ────── Practice Of Problem-solving In Sprints ┐
│ ▾ Cálculo        │ Aritmética                                          │
│   Aritmética   1 │ Responda o máximo de contas antes do tempo acabar.  │
│   Álgebra      2 │                                                     │
│ ▾ CP             │ [x] Adição         (2 a 100) + (2 a 100)            │
│   Divisão int. 5 │ [ ] Divisão                                         │
│ ▾ Treino         │ Duração            120 s                            │
│   Revisar     12 │ Últimas 10 rodadas ▁▃▄▃▆▅▅▇▆█  melhor 52  média 46  │
│ ▸ Digitação      │ [Começar  Enter]                                    │
│ ▸ Vim            │                                                     │
└ NORMAL  j/k mover  1–9 ir para  Enter começar  Tab opções  ? atalhos ──┘
```

- Tudo alinhado à esquerda, como num terminal.
- **Barra de caminho:** onde a pessoa está (`popis/cálculo/aritmética`,
  `…/resultado`). À direita fica a marca da T17 no menu, e o estado da
  rodada nas outras telas.
- **Árvore:** pastas com `▾`/`▸` e nomes com só a inicial maiúscula. O
  atalho numérico do item aparece à direita, e o Revisar mostra a
  contagem em `--warning`.
- **Partida:**
  - o tempo fica à esquerda e os acertos à direita, ambos em
    `--text-xl`;
  - a pergunta, em `--text-xxl`, fica no terço de cima, e o campo de
    resposta logo abaixo;
  - a fila de vereditos fica no pé, no desktop.
- **Resultado:**
  - "12 resolvidas em 120 s" em `--text-xl`;
  - três números com rótulo embaixo: tentativas erradas, puladas e seu
    recorde;
  - o placar tem uma linha por tipo de questão e uma célula por questão.
- **Menu recolhível** (revisão de 2026-11-20): um `☰` na barra de caminho
  (e a tecla `m`) recolhe a árvore no desktop; o painel ocupa a largura
  toda.
- **Ordem do painel**, igual em todas as telas: título e descrição,
  opções, área do treino, histórico, e só então os painéis de referência,
  fechados por padrão. Nada de seletor no pé da página.
- **Celular:**
  - a árvore vira uma gaveta que entra pela esquerda, aberta pelo `☰`
    (44px) na barra de caminho, e fecha ao escolher um item, com Esc ou
    com um toque fora;
  - na partida, a fila de vereditos fica logo abaixo do campo de
    resposta, porque o teclado cobre a metade de baixo.

## Vereditos e placar

| Marca | Cor | Significado |
|---|---|---|
| `AC` | `--correct` | resposta aceita |
| `WA` | `--wrong` | tentativa errada (a questão continua) |
| `SK` | `--warning` | questão pulada |

As células do placar seguem a convenção do ICPC. Cada célula traz o tempo
da questão, ou "pulada", em `--text-sm`.

| Célula | Cor | Significado |
|---|---|---|
| `+` | `--correct` | certa na primeira tentativa |
| `+n` | `--correct` | certa depois de `n` erros |
| `?` | `--warning` | pulada sem erro |
| `−n` | `--wrong` | pulada depois de `n` erros |

## Movimento

Só como resposta a uma ação:
- o veredito novo entra na fila com um contorno que some em 300 ms;
- a pergunta seguinte troca sem animação.

Com `prefers-reduced-motion`, nada se move.

## Texto

- Verbos diretos e só a inicial maiúscula ("Começar", "Jogar de novo",
  "Revisar erros").
- Em toda a interface, a tecla aparece ao lado da ação ("Começar
  Enter").
- Nada de rótulos em MAIÚSCULAS, exceto o modo na linha de status
  (NORMAL, JOGANDO, RESULTADO), que vem do Neovim.
- Nada de listas unidas por `·`: estatísticas são pares rótulo/valor.
- Vazio é convite: "Nenhuma rodada nesta configuração. Enter começa a
  primeira."
