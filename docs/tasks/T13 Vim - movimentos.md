---
id: T13
title: Vim - movimentos
status: ready
depends_on: [T10]
branch: task/T13-vim-motions
adrs: []
tags: [task]
---

# T13 Vim - movimentos

## Goal

Uma tela "Vim" para treinar os movimentos do modo normal. Um trecho de
código aparece com o cursor num ponto e um alvo destacado, e o jogador
leva o cursor até o alvo com movimentos do Vim. O app sabe o **mínimo de
teclas** que chegava lá e mostra a solução ótima depois de cada alvo,
então o treino ensina o movimento certo, não só a velocidade. O motor de
Vim é próprio, em TypeScript puro, e as próximas tasks (T14–T16) crescem
sobre ele.

## Spec (rascunho; o passo de spec nomeia os testes)

Decisões do dono (2026-11-20): tela nova dentro do popis; motor próprio
(sem dependência nova); começar direto pelo treino de movimento; o dono
roda as tasks Vim pelo batch.

Escolhas de padrão (o dono não decidiu e pode mudar): a referência de
comportamento é o **Neovim com `--clean`** (0.12), porque é o que está
instalado; a rodada dura 60 s; o texto vem do corpus de código da T10.

- **AC-1**: **Buffer e teclas** (`src/vim/`, puro): o buffer é uma lista
  de linhas mais o cursor `(linha, coluna)` e a coluna desejada
  (`curswant`) que `j`/`k` preservam. As teclas são tokens no formato do
  Vim (`w`, `<Esc>`, `<CR>`, `<C-v>`), com um parser
  `parseKeys("3fx<CR>")` e o inverso `formatKeys`.
- **AC-2**: **Movimentos**, com o comportamento do Neovim, incluindo os
  casos de borda (fim de linha, linha vazia, início e fim do buffer,
  palavra contra PALAVRA, pontuação, `$` com contagem):
  - `h j k l`, `w b e`, `W B E`, `ge`;
  - `0 ^ $`;
  - `f F t T` com `;` e `,`;
  - contagem antes de qualquer movimento (`3w`, `2f,`);
  - `gg`, `G`, `{n}G`, `{`, `}`, `%`;
  - `/padrão<CR>`, `?padrão<CR>`, `n`, `N`, `*`, `#` (padrão literal;
    `*` e `#` usam a palavra inteira, como `\<palavra\>`).
- **AC-3**: **Fidelidade ao Neovim:** as tabelas de casos
  (`src/vim/cases/*.ts`: buffer, cursor, teclas, cursor esperado) são
  dados compartilhados por dois consumidores:
  - o Vitest roda o motor sobre elas (entra no `npm run check`);
  - `npm run vim:oracle` (`scripts/vim-oracle.mjs`) roda cada caso no
    `nvim --clean --headless` e falha se o Neovim discordar. Ele fica
    fora do `check`, porque exige o `nvim` instalado.

  Cada movimento do AC-2 tem pelo menos 5 casos, e os casos de borda
  estão entre eles.
- **AC-4**: **Níveis** (cada um soma os movimentos dos anteriores):
  1. `h j k l`
  2. `w b e W B E ge`
  3. `0 ^ $`
  4. `f F t T ; ,`
  5. contagens
  6. `gg G {n}G { } %`
  7. `/ ? n N * #`

  No nível escolhido, só os movimentos liberados funcionam. Uma tecla
  bloqueada não move o cursor e aparece numa linha "bloqueado neste
  nível: `f`".
- **AC-5**: **Mínimo de teclas** (`src/vim/optimal.ts`): uma busca em
  largura sobre o estado (cursor, `curswant`, último `f/t`, última
  busca), com os movimentos do nível, devolve o número mínimo de teclas
  e uma sequência ótima.
  - Cada tecla vale 1: `3w` vale 2 teclas e `/ab<CR>` vale 4.
  - As contagens vão de 1 a 9.
  - Na busca, os padrões são os trechos de 1 a 3 caracteres que existem
    no texto.

  Um teste de propriedade confere que a sequência devolvida leva ao alvo
  e que, em textos pequenos, uma busca exaustiva não acha nada mais
  curto. O cálculo de um alvo leva menos de 50 ms num trecho do corpus.
- **AC-6**: **Alvos gerados por seed** (`src/vim/drills/target.ts`): o
  alvo `i` de uma rodada vem de `deriveSeed(seed, i)`. Ele escolhe um
  trecho da T10 (até 15 linhas), a posição inicial e o alvo.
  - O alvo fica a pelo menos 2 teclas ótimas do início e a no máximo 6
    no nível 1, e a no máximo 4 nos outros. O máximo menor força o
    movimento novo, em vez de muitos `l`.
  - O alvo de um nível acima de 1 só é sorteado se a solução ótima usar
    pelo menos um movimento do próprio nível.
  - O teste de propriedade cobre as três regras de sempre: o alvo é
    alcançável, os limites do nível são respeitados e a mesma seed gera
    o mesmo alvo.
- **AC-7**: **Rodada:** a rodada dura 30, 60 ou 120 s, e o relógio começa
  na primeira tecla. Ao chegar no alvo, o próximo aparece na hora.
  - Cada alvo guarda as teclas usadas, o mínimo e o tempo.
  - A eficiência é mínimo ÷ teclas usadas.
  - Ctrl+Enter pula o alvo, que conta como pulado.
- **AC-8**: **Tela** (`src/ui/VimScreen.tsx`):
  - aberta pelo botão "Vim" da configuração e escondida em telas de
    toque, como a Digitação;
  - o trecho aparece em fonte monoespaçada, com o cursor em bloco, o
    alvo destacado em `--accent` e o modo atual ("NORMAL") e as teclas
    pendentes (`2f`) numa linha de status;
  - as teclas chegam por um `<textarea>` invisível, como na T10. Teclas
    mortas do ABNT2 (`^`, `~`, `` ` ``, `'`, `"`) entram pela composição
    e funcionam como a tecla em si. Ctrl+V, Ctrl+A e Ctrl+R não chegam
    ao navegador;
  - depois de cada alvo, uma linha mostra "você: 7 teclas · ótimo: 2
    (`f(`)";
  - um painel "Comandos deste nível" lista cada movimento liberado com
    uma frase em português (ex.: "`t,` — vai até antes da próxima
    vírgula");
  - no fim aparecem os alvos alcançados, os pulados, a eficiência média,
    os 3 alvos com pior eficiência (com a solução ótima), o nível e a
    seed, com os botões "Próximo" e "Voltar".
- **AC-9**: **Persistência:** as opções (nível e duração) ficam em
  `popis.vim-settings`, e os resultados em `popis.vim` (até 200). A tela
  mostra o melhor número de alvos e a média dos últimos 10 do nível e da
  duração atuais. Dados corrompidos carregam como os padrões.
- **AC-10**: **E2E:**
  - no Chromium, uma rodada de nível 4 em que o teste lê a solução ótima
    exposta num `data-` do alvo e a digita, alcançando 3 alvos com
    eficiência 100%;
  - no Pixel 7, o botão "Vim" fica escondido.

## Out of scope

- Operadores, modo de inserção e edição (T14).
- Modo visual, `:s`, indentação e `J` (T15).
- Registradores e macros (T16).
- `H M L`, `Ctrl-d/u/f/b` e movimentos que dependem da janela; `ge` com
  contagem acima de 9; busca com expressão regular.
- Mapeamentos do usuário e `.vimrc`.

## Files owned

- `src/vim/**` (motor, casos, ótimo, geradores)
- `scripts/vim-oracle.mjs`, `package.json` (só o script `vim:oracle`)
- `src/storage/vim*.ts`
- `src/ui/VimScreen*.tsx`, `src/ui/App.tsx`, `src/ui/App.test.tsx`,
  `src/ui/ConfigScreen.tsx`, `src/ui/app.css`
- `tests/e2e/vim.spec.ts`, `tests/e2e/mobile.spec.ts` (só o teste do botão
  escondido)
- `vite.config.ts` (só limiares de cobertura; `src/vim/**` entra com 100%)

## Notas para o batch

- Comandos extras: `nvim --clean --headless …` e `npm run vim:oracle`.
- Risco: a fidelidade de `w`/`e`/`b` em pontuação e de `%` é a parte mais
  difícil. O oráculo existe para isso, e uma discordância é bug do motor,
  não do caso.

## Log
