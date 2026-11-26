---
id: T44
title: Guia da prova
status: done
depends_on: [T39]
branch: task/T44-contest-guide
adrs: [ADR-T44-1]
tags: [task]
---

# T44 Guia da prova

## Goal

Um item **Guia** na pasta Maratona: uma página de consulta, imprimível
para o caderno do time, com as listas de checagem que times experientes
usam, cada item ligado à lição ou ao treino do app que o exercita.

## Conteúdo

- **Primeiros 15 minutos:** digitar o template e o `.bashrc` (função de
  compilar, `ulimit -s`), compilar um "hello", testar a impressão e o
  envio de um problema; dois leitores começam por pontas opostas da
  prova, e um terceiro procura o problema mais fácil pelo placar.
- **Antes de submeter:** exemplo do enunciado, casos de borda (`n = 1`,
  máximo, todos iguais), `long long`, formato de saída, arquivo certo,
  depuração no papel enquanto outro usa o computador.
- **WA:** reler o enunciado, overflow, multitest sem zerar, borda,
  precisão, stress test contra força bruta.
- **TLE:** complexidade contra o limite (ligar a Estimativa), I/O rápido,
  `endl`, cópias, laço infinito, constante.
- **RTE:** índice, pilha da recursão, divisão por zero, sanitizers e
  `_GLIBCXX_DEBUG`.
- **MLE:** tamanho dos vetores, `map` contra vetor, recursão.
- **Time:** um computador para três pessoas; quem não está digitando lê,
  pensa ou depura no papel; não deixar dois no mesmo problema sem
  combinar.

## Spec

- **AC-1**: **Conteúdo estruturado** `src/guide/content.ts`: as 7 seções
  (Primeiros 15 minutos, Antes de submeter, WA, TLE, RTE, MLE e Time) e
  seus itens com ids únicos e texto sem crases literais; cada item pode
  ter `link` para um `ItemId` da árvore ou para uma lição do Aprender
  (`ADR-T44-1`). A menção ao `.bashrc` aponta para a lição `u8-bashrc`
  do Shell (T39).
  - Testes: `src/guide/content.test.ts` ("every link points to an existing item or lesson", "sections cover all seven contest checklists with unique ids and no raw backticks").
- **AC-2**: **Estado e tela** `src/storage/guide.ts` e
  `src/ui/GuideScreen.tsx`: as seções com caixas marcáveis que
  persistem em `popis.guide` e zeram com o botão "Nova prova", links
  clicáveis que abrem o treino ou a lição correspondente no app, botão
  "Imprimir" e uma folha de impressão (`@media print`) em preto e branco
  (caixas como quadrados vazios, sem barra/árvore/botões/links) que cabe
  em uma única página A4.
  - Testes: `src/storage/guide.test.ts` ("guide storage loads, saves, toggles and resets popis.guide"), `src/ui/GuideScreen.test.tsx` ("guide screen renders every section and persists checked items in popis.guide", "Nova prova clears all checked items and updates popis.guide", "clicking item and lesson links opens the target screen or lesson", "Imprimir calls window.print"), `tests/e2e/guide.spec.ts` (desktop e mobile: abrir pela árvore, marcar, recarregar, zerar com Nova prova, navegar por links, `@media print` sem shell/botões e `page.pdf` com exatamente 1 página A4).
- **AC-3**: **Árvore:** item **Guia** (`guide`) entra por último na
  pasta **Maratona** (depois de `STL`), visível no celular (`touch: true`),
  mantendo os atalhos 1–9 inalterados e respeitando a coerência da
  interface (`h1` igual ao rótulo, ordem dos blocos `data-panel`).
  - Testes: `src/ui/shell/sections.test.ts` ("Maratona folder follows Regex with Ler o erro, STL and Guia and keeps shortcuts 1-9", além das listas da árvore e telas), `src/ui/coherence.test.tsx`, `src/ui/shell/Shell.test.tsx`.

## Out of scope

- O caderno de algoritmos do time (ver T34 para os trechos).

## Files owned

- `src/guide/` (novo: `content.ts`, `content.test.ts`)
- `src/storage/guide.ts`, `src/storage/guide.test.ts`
- `src/ui/GuideScreen.tsx`, `src/ui/GuideScreen.test.tsx`, `src/ui/App.tsx`, `src/ui/shell/sections.ts`, `src/ui/shell/sections.test.ts`, `src/ui/app.css`
- `vite.config.ts`, `playwright.config.ts`, `tests/e2e/guide.spec.ts`

## Subtasks (one commit each)

- [x] spec
- [x] tests
- [x] models
- [x] behaviour
- [x] quality
- [x] docs

## Log

- 2026-11-26 — Spec e `ADR-T44-1` escritos. *Files owned* ampliado minimamente para testes e configurações de gate correspondentes (`src/storage/guide.test.ts`, `src/ui/GuideScreen.test.tsx`, `src/ui/shell/sections.test.ts`, `vite.config.ts`, `playwright.config.ts`). Itens de Caça ao WA (T41) e Placar (T43) permanecem sem `link` até a integração dessas tasks.
- 2026-11-26 — Implementado o item **Guia** por último na pasta **Maratona** (`Ler o erro → STL → Guia`, visível no celular, atalhos 1–9 inalterados):
  - `src/guide/content.ts`: 7 seções (*Primeiros 15 minutos*, *Antes de submeter*, *WA*, *TLE*, *RTE*, *MLE* e *Time*), 35 itens sem crases literais e links verificados para `ItemId` (`typing`, `stl`, `division`, `ref-cpp`, `estimation`, `sums`, `compile-read`) e lições do Aprender (`shell-learn`: `u8-bashrc`, `u2-judge`, `u4-diff`, `u1-nav`, `u5-loop`, `u3-time`, `u6-limits`, `u2-sanitizers`; `gdb-learn`: `u9-signals`, `u5-backtrace`, `u14-sizeof`). A menção ao `.bashrc` aponta para a lição `u8-bashrc` do Shell (T39).
  - `src/storage/guide.ts`: persistência de `{ checked }` em `popis.guide` em ordem canônica, filtrando entradas corrompidas/desconhecidas, com `toggleGuideItem` e `resetGuideState`.
  - `src/ui/GuideScreen.tsx` e `src/ui/app.css`: tela com contador de marcados, botões **Nova prova** e **Imprimir**, links clicáveis integrados em `src/ui/App.tsx` e folha `@media print` em duas colunas a `10pt` (preto em `var(--surface)` sobre papel branco, caixas sempre como quadrados vazios, sem shell/árvore/botões/links) cabendo em 1 página A4.
- 2026-11-26 — UNATTENDED CHOICE (`ADR-T44-1`): na tela, itens marcados ficam suavizados com risco (`--muted` + `line-through`), e o botão **Nova prova** fica sempre clicável; na impressão, o risco some e todas as caixas saem como quadrados vazios desenhados por borda para o caderno do time, em duas colunas a `10pt` (não foi preciso reduzir para `9pt`).
- 2026-11-26 — **Teste corrigido em commit próprio** (`test(T44): target open lesson heading in bashrc link tests`): `getByText(/Atalhos e funções no ~\/\.bashrc/)` em `GuideScreen.test.tsx` e `guide.spec.ts` casava tanto o botão da lista de unidades quanto o `<h2>` da lição aberta; a asserção foi restringida ao papel `heading` nível 2 (mais específica, sem afrouxamento).
- 2026-11-26 — **Verificação visual** (Playwright em desktop 1280×800, celular 390×844, prévia `@media print` e PDF A4 gerado via `page.pdf`): corrigido o alinhamento dos links curtos (`STL`) no celular empilhando todos os links alinhados sob o texto do item, ajustado `align-items: flex-start` no desktop e elevada a fonte de impressão de `9.5pt` para `10pt` mantendo folga confortável em 1 única página A4.
- 2026-11-26 — **Gates verdes:**
  - `npm run check`: `tsc --noEmit`, `eslint . --max-warnings 0`, `prettier --check .`, `vitest run` (211 arquivos, 4545 testes passando) e `vite build` verdes.
  - `npm run coverage`: 211 arquivos, 4545 testes passando; 99,72% statements, 98,22% branches, 100% functions, 99,86% lines; `src/guide/content.ts`, `src/storage/guide.ts` e `src/ui/GuideScreen.tsx` com 100% em todas as métricas; novo limiar `src/guide/**` em 100/100/100/100 no `vite.config.ts`.
  - `npm run test:e2e`: 63/63 passando (desktop + mobile), incluindo `tests/e2e/guide.spec.ts` (`page.pdf` A4 com exatamente 1 página) e `tests/e2e/coherence.spec.ts`.
  - `npm run test:fuzz`: pulado porque a T44 não cria geradores nem testes de propriedade.
- 2026-11-26 — **Checagens manuais para o dono:** conferir a prévia de impressão no navegador e revisar o texto de cada lista de checagem; ao integrar T41 (Caça ao WA) e T43 (Placar), ligar os itens correspondentes em `src/guide/content.ts` (`setup-scoreboard`, `submit-edges`, `wa-multitest`, `wa-edge`).
