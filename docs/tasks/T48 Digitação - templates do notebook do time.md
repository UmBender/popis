---
id: T48
title: Digitação - templates do notebook do time
status: todo
depends_on: [T32]
branch: task/T48-notebook-typing
adrs: []
tags: [task]
---

# T48 Digitação - templates do notebook do time

## Goal

Um item **Notebook** na pasta Digitação para treinar o que o time faz na
prova: copiar do notebook impresso para o editor, rápido e sem erro. A
fonte é o notebook que o time usa na maratona, o **gempro-notebook**
(`~/gempro-notebook`). Os templates entram com o título, a descrição e a
edição de origem, e o treino mede a velocidade e os erros por template.
Os mesmos templates também passam a ser uma biblioteca do **De memória**
(T32), para quem quiser decorar os principais.

## O que o notebook tem (levantado em 2026-11-24)

- `content/<categoria>/<nome>.cpp`, com 132 `.cpp` nas categorias
  `contest`, `dsa`, `geometry`, `graph`, `math`, `strings`, `problems` e
  outras. O código do template fica entre `// begin template //` e
  `// end template //` (130 arquivos); fora disso há includes e testes.
- `content/<categoria>/main.tex` lista cada template com
  `\templateentry{título}{descrição curta}{descrição}{caminho}`. O que
  está dentro de `\ifextended … \fi` só aparece no `gempro-extended.pdf`,
  e o resto é a **edição core** (`gempro.pdf`, "os templates mais
  importantes").
- `content/contest/` tem o `template.cpp`, o `.bashrc` (funções `c`,
  `cs`, `gen`, `rr`, `chk`), o `.vimrc` e o `gen.py`, que o time digita
  no começo da prova.
- Os arquivos usam tab para indentar, e há linhas com mais de 80
  colunas.
- O repositório é `GEMPRO-CODE/gempro-notebook`, **público e sem
  licença**. A maior parte dos commits é de um colega de time.

## Decisão do dono (2026-11-24)

**Opção 1: publicar no site**, com o crédito e o link do repositório.
Assim:

- `npm run notebook:import -- <pasta>` gera os dados em
  `src/typing/notebook/data/` e eles são commitados, como a biblioteca da
  T34. O site do Pages é construído com eles, sem acessar o notebook.
- A tela e o relatório mostram "Templates do GEMPRO Notebook" com o link
  para `https://github.com/GEMPRO-CODE/gempro-notebook` e o commit de
  origem.
- **Condição para o merge na `main`:** o time concorda com a publicação,
  de preferência com uma licença no notebook. O dono confirma isso no
  *Log* antes de a task ir para `done`. Sem a confirmação, a branch fica
  em `review`.

## Opções que foram consideradas

O popis é publicado no GitHub Pages. Se os templates entrarem no build,
o código do colega fica público dentro do site, sem licença que permita
isso. Para a T34, o dono já deixou de fora o `icpc_prep/` por esse
motivo. Opções:

1. **Publicar no site**, com o crédito e o link do repositório, depois de
   o time concordar (de preferência com uma licença no notebook).
2. **Só local:** o script gera os dados numa pasta ignorada pelo git, e
   o item só aparece no `npm run dev` e nos builds locais.
3. **Importar no navegador:** a pessoa escolhe a pasta do notebook (ou o
   `.zip`), e os templates ficam no armazenamento local, como no upload
   da T32.

## Spec (rascunho; o passo de spec nomeia os testes que faltam)

- **AC-1**: **Extrator puro** `src/typing/notebook/extract.ts`:
  - a partir dos arquivos (`{ path, content }`), devolve
    `{ id, category, title, summary, edition: "core" | "extended",
    code }`;
  - lê os `\templateentry` e o `\ifextended` dos `main.tex`, e o código
    entre os marcadores;
  - um arquivo sem marcadores entra inteiro (os de `contest/`); um
    `\templateentry` cujo arquivo não existe vira um aviso no relatório,
    não um erro.
  - Testes: `src/typing/notebook/extract.test.ts`, com fixtures reduzidas (um `main.tex` com `\ifextended`, um `.cpp` com marcadores, um sem, um caminho que falta).
- **AC-2**: **Normalização para digitação:** tab vira a indentação do
  motor da T10 (auto-indent), espaços no fim da linha saem, e as linhas
  em branco seguem a regra do corpus. Templates com mais de 60 linhas
  são divididos em partes por bloco de nível zero (struct, função), e
  cada parte é treinada sozinha.
  - Testes: `src/typing/notebook/normalize.test.ts`, mais `src/typing/notebook/normalize.prop.test.ts` (juntar as partes reconstrói o código normalizado; nenhuma parte passa de 60 linhas, a não ser um bloco único maior; a normalização é idempotente).
- **AC-3**: **Treino Notebook** (`src/ui/NotebookTypingScreen.tsx`):
  - a pessoa escolhe a edição (core, padrão, ou extended), a categoria ou
    um template pela busca;
  - o código aparece como no PDF, e a pessoa digita com o motor da T10;
  - o resultado mostra o CPM, a precisão, o tempo total e as linhas com
    mais erro;
  - o histórico por template mostra o melhor tempo e a tendência, e o
    "Treinar os mais lentos" sorteia entre os 5 piores;
  - um atalho "Início de prova" monta a sequência `template.cpp`,
    `.bashrc` e `.vimrc` e mede o tempo total, porque é o que se digita
    nos primeiros minutos.
  - Eventos da T22 com drill `typing.notebook` e KC
    `typing.notebook.<id>`.
  - Testes: `src/ui/NotebookTypingScreen.test.tsx` (relógio falso: filtro por edição, parte por parte, sequência de início de prova, histórico salvo).
- **AC-4**: **Ligação com o De memória:** os templates do notebook
  aparecem como uma biblioteca escolhível no De memória da T32, com o
  mesmo id, e cada um vira um cartão do FSRS.
  - Testes: `src/ui/` (teste do De memória com a biblioteca do notebook).
- **AC-5**: **Importação** `npm run notebook:import -- <pasta>`
  (`scripts/notebook-import.mjs`), no molde do `library:mine` da T34:
  - lê os arquivos rastreados pelo git na pasta e grava os dados em
    `src/typing/notebook/data/` com o commit de origem;
  - grava o relatório em `docs/architecture/Templates do notebook.md`
    (quantos templates por edição e categoria, os avisos do AC-1 e o
    crédito);
  - rodar duas vezes no mesmo commit não muda nada.
  - Testes: `src/typing/notebook/data.test.ts` ("data carries the source commit and repository link", "every core template of the data has code"), `src/ui/NotebookTypingScreen.test.tsx` ("credit line links to the notebook repository").

## Out of scope

- Mudar o notebook. O popis só lê.
- O `.tex` dos tópicos teóricos (`extra/`): não é código para digitar.
  Pode entrar na Referência (T46) num passo futuro.

## Files owned

- `src/typing/notebook/` (novo) e os testes
- `src/ui/NotebookTypingScreen.tsx`, `src/ui/App.tsx`, `src/ui/shell/sections.ts`
- tela do De memória da T32 (só a escolha de biblioteca)
- `src/typing/notebook/data/` (gerado e commitado), `docs/architecture/Templates do notebook.md` (gerado)
- `scripts/notebook-import.mjs`, `package.json`
- `src/stats/event.ts`, `tests/e2e/notebook-typing.spec.ts`

## Subtasks (one commit each)

- [ ] spec: ADR-T48-1 (templates do notebook publicados com crédito, gerados por script e commitados) e testes nomeados
- [ ] tests
- [ ] models
- [ ] behaviour
- [ ] quality: `npm run check`, coverage, e2e, import real do `~/gempro-notebook` com o relatório no *Log*
- [ ] docs

## Log
