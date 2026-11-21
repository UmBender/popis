---
id: T34
title: Digitação - trechos do repositório de CP
status: ready
depends_on: []
branch: task/T34-typing-library-mining
adrs: []
tags: [task]
---

# T34 Digitação - trechos do repositório de CP

## Goal

Construir a biblioteca padrão do De memória (T32) e o perfil de estilo do
código gerado (T31) a partir do **código que o dono realmente escreve**.
A fonte é o repositório de programação competitiva dele (`UmBender/comp`,
clonado em `~/comp`, com contests de 2024-01 a 2026-11).

Um script lê o repositório e o histórico do git e entrega três coisas:
- os trechos mais repetidos (template, Fenwick, DSU, segtree, busca
  binária, BFS e outros), cada um na versão mais recente do dono;
- um perfil de frequência de identificadores e idiomas;
- um relatório para o dono revisar.

Ninguém escreve trecho à mão. Tudo sai do repositório e pode ser gerado
de novo.

## O que o repositório tem (levantado em 2026-11-21)

- 1404 `.cpp`, 294 `.hpp` e 48 `.py`.
- **Do dono:** a maior parte dos cerca de 1366 `.cpp` fora de `atcoder/` e
  `refs/`, em:
  - `contest/<n>/<letra>/main.cpp` (193 contests, cada um com um
    `README.md` que traz o link). A numeração acompanha o tempo
    (`contest/1` é de 2024-07 e `contest/186` é de 2026-11), e os números
    mais altos são os contests mais recentes;
  - `questions/<nome>/main.cpp`;
  - `algols/` (a biblioteca dele: BIT, DSU, Segment_Tree, KMP,
    sparse_table, treap, trie, sieve, ternary_search e outros);
  - `gempro/` (inclusive `gempro/refs/`), `dp_study/`, `tem_que_saber/` e
    `algols/100-days-of-code/`.
- **De terceiros, sempre fora:** as cópias da AtCoder Library (pastas
  `atcoder/` com `dsu.hpp`, `segtree.hpp`, `modint.hpp` e outros), `refs/`
  (livros em PDF e código de referência), `icpc_prep/` (pode ter código
  dos colegas de time; decisão do dono em 2026-11-21), `kotlin/`,
  `advent_of_code/` (não é programação competitiva) e os artefatos de
  build (`.o`, binários, `build.sh`, `Makefile`).
- O estilo mudou com o tempo: o template de 2024 (`#define int ll`,
  `#define endl (char)10`, tab) virou o de 2026 (aliases `vi`, `vvi`,
  `pii`, `vii`, `constexpr int MAXN`, 4 espaços). A versão escolhida
  tem de ser a **atual**.

## Spec

- **AC-1**: **Inventário** em `src/typing/mine/inventory.ts`, puro: a
  partir de uma lista de arquivos (caminho, conteúdo e **data de
  criação**, ou seja, a do commit que adicionou o arquivo), separa o que
  é do dono do que fica fora:
  - pelas pastas da seção acima;
  - por conteúdo igual ao de algum `.hpp` de `atcoder/`;
  - por cabeçalho de licença ou URL de origem (`cp-algorithms`,
    `kactl`, `github.com/`, `Source:`). Esses arquivos ficam
    **marcados para o dono**, não incluídos.

  Arquivos com o mesmo conteúdo normalizado contam uma vez só.
  - Testes: `src/typing/mine/inventory.test.ts` ("excludes vendored atcoder headers by folder and by content", "flags files with an origin URL instead of including them", "deduplicates by normalized content").
- **AC-2**: **Template:** o bloco inicial comum (includes, `using`,
  `#define`, aliases e o `main` vazio) é detectado por prefixo de linhas
  normalizadas. O escolhido é a variante mais frequente entre os
  arquivos criados nos últimos 6 meses, e não a mais frequente de todos
  os tempos.
  - Testes: `src/typing/mine/template.test.ts` ("picks the most frequent header of the last 6 months, not of all time").
- **AC-3**: **Trechos:**
  - extrai as definições de topo (`struct`, funções livres e lambdas
    nomeadas `auto f = [&]`) e os laços com papel conhecido (o `while`
    de busca binária, o BFS com fila);
  - agrupa as definições quase iguais por similaridade de tokens, com
    os identificadores normalizados;
  - ordena os grupos pelo número de arquivos e pelo uso recente;
  - de cada grupo, escolhe a **variante mais recente**, pela data de
    criação. A data de modificação não conta, porque um commit de
    formatação em massa a mudaria. Em `contest/<n>`, o número maior
    desempata e conta como mais recente;
  - o nome vem do `struct` ou da função, mapeado para um nome curto
    (`FenwickTree` vira `fenwick`, `DSU` vira `dsu`).
  - Testes: `src/typing/mine/cluster.test.ts` ("near-identical Fenwick trees with renamed identifiers fall in one cluster", "the canonical variant is the most recently created one, higher contest number breaking ties", "clusters rank by file count then recency"), `src/typing/mine/cluster.prop.test.ts` (renomear identificadores não muda o grupo; o resultado não depende da ordem dos arquivos).
- **AC-4**: **Saída** do script `npm run library:mine -- <caminho>`
  (`scripts/library-mine.ts`, que roda com o Node 22 sem build):
  - lê os arquivos e a data de criação de cada um numa única passada
    de `git log --diff-filter=A --name-only`, e chama os módulos puros;
  - escreve em `src/typing/library/`:
    - `template.cpp` e até 30 trechos `<nome>.cpp` ou `<nome>.py`,
      normalizados pelas regras de trecho da T32 (CRLF para LF, tab para
      4 espaços, sem espaço no fim, só ASCII), sem comentários e com o
      caminho de origem só no relatório;
    - `profile.json` com os 200 identificadores mais usados, os 100
      idiomas de uma linha mais usados (com identificadores
      normalizados) e as constantes mais usadas (`MAXN`, `MOD`,
      `1e9 + 7`), cada um com a contagem;
  - rodar duas vezes sobre o mesmo commit do repositório dá saídas
    idênticas byte a byte.
  - Testes: `src/typing/mine/output.test.ts` ("output is byte-identical for the same input", "every written snippet passes the T32 snippet rules", "profile lists identifiers, idioms and constants with counts").
- **AC-5**: **Relatório para o dono:** a nota
  `docs/architecture/Biblioteca de trechos.md` (gerada pelo script e
  depois revisada) tem:
  - o commit do `comp` analisado;
  - a contagem do inventário: do dono, de terceiros, duplicados e
    marcados;
  - por trecho, o nome, o número de arquivos, a primeira e a última
    vez que apareceu, o caminho da variante escolhida e um checkbox
    "manter";
  - a lista dos arquivos marcados no AC-1.

  O dono confere tudo na revisão (`review`) e apaga os trechos que não
  quer antes do merge.

## Out of scope

- Usar código de terceiros: AtCoder Library, livros e código com origem
  marcada.
- Mudar o repositório `comp`. O script só lê.
- O treino em si (T32) e a gramática (T31). Esta task só entrega os
  dados.

## Files owned

- `src/typing/mine/` (novo) e os testes
- `scripts/library-mine.ts` (novo), `package.json` (script `library:mine`)
- `src/typing/library/` (os arquivos gerados)
- `docs/architecture/Biblioteca de trechos.md` (novo)

## Subtasks (one commit each)

- [ ] spec: ADR-T34-1 (o que conta como código do dono, critério da variante mais recente, saída reproduzível) e testes nomeados
- [ ] tests
- [ ] models
- [ ] behaviour: módulos puros e script
- [ ] data: rodar `npm run library:mine -- ~/comp` e commitar `src/typing/library/` e o relatório, num commit próprio `feat(T34): mine snippet library from comp@<sha>`
- [ ] quality: `npm run check` e coverage
- [ ] docs: *Log* e status `review`

## Notas para o batch

- **Permissões:** o plano do batch precisa liberar a leitura de `~/comp`
  e `git -C ~/comp log`. A escrita fica restrita ao popis.
- **Bloquear se:** `~/comp` não existir ou não for um repositório git.
- **Privacidade:** tudo o que for para `src/typing/library/` fica
  público com o site. O relatório deixa isso claro para o dono decidir
  na revisão.

## Log
