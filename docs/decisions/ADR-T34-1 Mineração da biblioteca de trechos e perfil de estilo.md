---
id: ADR-T34-1
title: Mineração da biblioteca de trechos e perfil de estilo
status: proposed
kind: decision
date: 2026-11-21
task: T34
builds_on:
  - "[[ADR-0002 Static web app in Vite, TypeScript and React]]"
  - "[[ADR-T10-1 Code typing has its own engine, screen and store]]"
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T34-1 Mineração da biblioteca de trechos e perfil de estilo

## Context

As tasks T31 (código gerado a partir do estilo real do dono) e T32 (digitação de
memória de trechos padrão) dependem de dados extraídos do repositório de
programação competitiva do dono (`UmBender/comp`, em `~/comp`), sem copiar
código de terceiros, sem congelar trechos obsoletos de 2024 e com saída
reproduzível para o mesmo commit do repositório de origem.

Precisávamos definir de forma pura, determinística e auditável:
1. o que conta como código do dono, o que sai como código de terceiros ou
   artefato, e o que fica marcado para revisão manual;
2. como detectar o template atual (últimos 6 meses) e escolher a variante mais
   recente de cada trecho sem depender da data de modificação do arquivo;
3. como agrupar variantes equivalentes de forma invariante à ordem dos arquivos
   e à renomeação de identificadores;
4. como gerar e atualizar `src/typing/library/` e o relatório sem adicionar
   dependências npm e respeitando as regras de trecho da T32.

## Decision

1. **Inventário e filtragem (`src/typing/mine/inventory.ts`):**
   - Apenas arquivos `.cpp`, `.cc`, `.h`, `.hpp` e `.py` são considerados
     código-fonte; outros arquivos e artefatos de build (`combined.cpp`,
     `Makefile`, `build.sh`, binários) entram como excluídos.
   - Ficam sempre de fora como terceiros:
     - diretórios de topo `refs/`, `icpc_prep/`, `kotlin/` e
       `advent_of_code/`;
     - qualquer pasta `atcoder/` em qualquer nível do caminho;
     - qualquer arquivo cujo conteúdo normalizado coincida com algum arquivo
       encontrado sob `atcoder/` (incluindo cabeçalhos `.hpp` e cópias de
       `expander.py`) ou que contenha `namespace atcoder`.
   - `gempro/` (inclusive `gempro/refs/`), `dp_study/`, `tem_que_saber/` e
     `algols/100-days-of-code/` entram normalmente como pastas do dono.
   - Arquivos com cabeçalho de licença (`MIT License`, `Apache License`,
     `Copyright`, `SPDX-License-Identifier`, `BSD`, `GNU General Public
     License`, `Boost Software License`) ou marcador/URL de origem
     (`cp-algorithms`, `kactl`, `github.com/`, `Source:`) não entram no acervo:
     são listados em `flagged` para conferência do dono. Linhas `// Verify:`
     de juízes online (como `judge.yosupo.jp`) nos trechos próprios do dono não
     acionam essa marcação.
   - Deduplicação por conteúdo normalizado (CRLF→LF, espaços externos por linha
     removidos, linhas vazias ignoradas): entre cópias idênticas, mantém-se a
     mais recente e as demais vão para `duplicates`.
2. **Recência e template (`src/typing/mine/recency.ts`, `template.ts`):**
   - A data de referência de cada arquivo é exclusivamente a data do commit que
     o **adicionou** (`git log --diff-filter=A --name-only`), nunca a de última
     modificação.
   - Em `contest/<n>`, um número `<n>` maior conta como mais recente em caso de
     empate de data de criação. Desempates finais usam comparação lexicográfica
     por ponto de código (independente de locale).
   - A janela de 6 meses (180 dias) do template é ancorada na maior data de
     criação presente no conjunto de entrada — nunca no relógio do sistema —
     garantindo pureza (`tests/purity.test.ts`) e reprodutibilidade no tempo.
   - O bloco inicial de cada `.cpp` recente (diretivas `#include`/`#define`/
     `#ifdef`..`#endif`, `using`, `typedef` e helpers de debug `_dbg`/`__dbg`
     antes de definições de problema ou `main`) é agrupado por prefixo de
     linhas normalizadas; escolhe-se a variante mais frequente nessa janela e
     emite-se o cabeçalho da ocorrência mais recente combinado ao esqueleto do
     `main` vazio.
3. **Extração e agrupamento (`tokenize.ts`, `extract.ts`, `cluster.ts`):**
   - Extraem-se definições de topo (`struct`/`class` com eventual
     `template<...>`, funções livres não triviais excluindo drivers como `main`,
     `solve` e `solution`), lambdas nomeadas (`auto f = [...]`), laços `while`
     de busca binária e laços `while` de BFS com fila (além de `class`/`def` e
     laços equivalentes em Python).
   - O tokenizador normaliza identificadores do usuário em `$0`, `$1`, … pela
     ordem de primeira aparição, preservando palavras-chave, nomes da
     biblioteca padrão, operadores e literais.
   - O agrupamento usa componentes conexos (Union-Find) sobre a similaridade de
     Dice em 3-gramas de tokens normalizados (limiar `0.58`), dentro da mesma
     linguagem. Por depender apenas do grafo não direcionado de pares de
     sequências normalizadas, o agrupamento é matematicamente invariante à
     ordem dos arquivos de entrada e à renomeação bijetiva de identificadores.
   - Grupos são ordenados por número de arquivos distintos (decrescente) e
     depois pela recência da variante canônica (mais recente primeiro). O nome
     curto vem do identificador da variante canônica mapeado por tabela de
     apelidos (`FenwickTree`/`BIT`→`fenwick`, `DSU`→`dsu`, `Segtree`→`segtree`,
     etc.) com fallback em `snake_case`.
4. **Saída reproduzível, perfil e script (`normalize.ts`, `profile.ts`,
   `report.ts`, `output.ts`, `scripts/library-mine.mjs`):**
   - Todo trecho gravado em `src/typing/library/` (`template.cpp` e até 30
     trechos `<nome>.cpp`/`.py`) tem comentários removidos e passa pelas regras
     da T32 (LF, tab→4 espaços, sem espaço no fim de linha, apenas ASCII
     imprimível, até 300 linhas e 16 KB). O caminho de origem aparece apenas em
     `docs/architecture/Biblioteca de trechos.md`.
   - `src/typing/library/profile.json` guarda `{ identifiers, idioms,
     constants }`, cada lista ordenada por contagem decrescente e valor
     crescente: até 200 identificadores de usuário (excluindo palavras-chave,
     nomes de biblioteca padrão e linhas `#include`), até 100 idiomas de uma
     linha com identificadores normalizados e as constantes mais usadas
     (`MAXN`, `MOD`, `1e9 + 7`, etc.).
   - O CLI `scripts/library-mine.mjs` (`npm run library:mine -- <caminho>`)
     carrega os módulos TypeScript puros de `src/typing/mine/` via
     `runnerImport` do `vite` (já instalado, sem novas dependências), lê o
     histórico em uma única passada de `git log --diff-filter=A --name-only`,
     ignora arquivos acima de 200 KB ou binários, limpa arquivos gerados
     anteriores e grava as saídas de forma idêntica byte a byte para o mesmo
     commit.

## Alternatives considered

- **Script `scripts/library-mine.ts` executado direto pelo Node 22** — o Node
  22 com strip-types não resolve importações sem extensão usadas em `src/`
  (`ERR_MODULE_NOT_FOUND`); usar `.mjs` com `runnerImport` do Vite reaproveita
  a resolução do projeto sem tocar no `tsconfig.json` nem adicionar `tsx`.
- **Agrupamento guloso em passagem única** — depende da ordem em que os
  arquivos chegam quando a similaridade não é transitiva, violando a
  propriedade de independência de ordem; componentes conexos sobre 3-gramas
  normalizados eliminam essa dependência.
- **Usar `Date.now()` para a janela de 6 meses** — violaria
  `tests/purity.test.ts` e faria rodar o mesmo commit em datas futuras produzir
  saídas diferentes; ancorar na maior data de criação do repositório preserva a
  reprodutibilidade byte a byte.

## Consequences

- Toda a lógica de mineração vive em TypeScript puro sob `src/typing/mine/`,
  testável com Vitest e fast-check sem git ou disco, mantendo 100% de
  cobertura em `src/typing/**`.
- O dono recebe um relatório em português com checkboxes `manter` e lista de
  arquivos marcados para revisar antes de publicar os trechos no site e liberar
  a T32.
- `profile.json` fica pronto para consumo direto pela gramática da T31.

## Rollback plan

Remover `src/typing/mine/`, `src/typing/library/`, `scripts/library-mine.mjs`,
o script `library:mine` em `package.json` e
`docs/architecture/Biblioteca de trechos.md`, e registrar um ADR de rollback.
