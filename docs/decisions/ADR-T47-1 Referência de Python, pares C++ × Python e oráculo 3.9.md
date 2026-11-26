---
id: ADR-T47-1
title: Referência de Python, pares C++ × Python e oráculo 3.9
status: accepted
kind: decision
date: 2026-11-25
task: T47
builds_on: [ADR-T46-1]
amends: [ADR-T46-1]
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T47-1 Referência de Python, pares C++ × Python e oráculo 3.9

## Context

A T47 acrescenta a referência de Python para programação competitiva usando a
infraestrutura da T46 (ADR-T46-1). Três pontos precisam de decisão explícita:

1. O identificador da linguagem: as consequências do ADR-T46-1 mencionavam
   `"python"` e `src/ref/python/`, enquanto o spec da T47 exige `src/ref/py/` e
   `npm run ref:oracle -- py`.
2. A comparação C++ × Python: o leitor precisa navegar entre verbetes equivalentes
   das duas linguagens e exibir o alvo e a documentação específicos de cada
   linguagem (antes fixos para C++ em `RefScreen.tsx`).
3. O alvo do juiz da ICPC World Finals 2026 é PyPy3 7.3.15 (Python 3.9), mas a
   máquina local roda Python 3.14 e PyPy 8.0 (Python 3.11). Rodar o exemplo nos
   dois interpretadores confirma a saída, mas não impede o uso acidental de
   recursos do 3.10+.

## Decision

1. **Identificador `py`.** `Lang` passa a `"cpp" | "py"`, em simetria exata com
   `src/ref/py/`, o item `ref-py` na árvore, os hashes `#py/<id>` e
   `npm run ref:oracle -- py`.
2. **Metadados por linguagem em `src/ref/langs.ts`.** `LANG_LABEL`,
   `LANG_TARGET` e `LANG_DOCS` tiram os textos fixos de C++ do `RefScreen.tsx`
   (`PyPy3 7.3.15 / Python 3.9 (WF 2026)` e `docs.python.org` para Python).
3. **Pares bidirecionais (`pair?`).** `Entry` ganha `readonly pair?: string` no
   formato `"<lang>/<id>"` (ex.: `"cpp/priority_queue"` e
   `"py/heapq_max_tuples"`). `src/ref/pairs.test.ts` garante que todo par aponta
   para outra linguagem, resolve por `refLink` e é simétrico nos dois sentidos.
   O leitor mostra o link `"em C++"` / `"em Python"` apontando para `#<lang>/<id>`,
   e o `App` passa `key={lang}` ao `RefScreen` para reiniciar busca e foco ao
   trocar de linguagem.
4. **Oráculo Python em `scripts/ref-oracle.mjs`.** Estendemos o mesmo script com
   o modo `py`:
   - roda cada exemplo diretamente (sem embrulho de `main`) com `pypy3` e com
     `python3`, passando `input` na entrada padrão, e exige código de saída 0,
     `stderr` vazio, saída não vazia e idêntica nos dois interpretadores (e igual
     ao gravado em `src/ref/py/outputs.ts`);
   - confere compatibilidade com Python 3.9 combinando: (a) `ast.parse(src,
     feature_version=(3, 9))` para sintaxe (ex.: `match`/`case`), (b) uma lista
     pura em `src/ref/py/compat.ts` (`findPost39Apis`) para APIs da biblioteca
     padrão criadas após 3.9 (ex.: `itertools.pairwise`, `bisect(..., key=...)`,
     `int.bit_count`, `zip(..., strict=...)`), testada no Vitest, e (c) o campo
     `since` (`isAfter39`);
   - verbetes com `judge: true` precisam ter `since` acima de 3.9 e falhar no
     verificador 3.9 (sintaxe ou lista de APIs); os demais precisam passar em
     ambos.
5. **Links de documentação.** Todo verbete Python aponta para
   `https://docs.python.org/3.9/...`.

## Alternatives considered

- **Usar `Lang = "python"` com pasta `src/ref/py/`** — cria assimetria entre
  pasta, CLI do oráculo, hash e tipo; `"py"` mantém tudo alinhado com `"cpp"`.
- **Manter a lista de APIs pós-3.9 só dentro de `scripts/ref-oracle.mjs`** —
  dificulta testar no Vitest sem depender de subprocesso Python; colocar a lógica
  pura em `src/ref/py/compat.ts` permite 100% de cobertura no `check` e reuso
  direto no oráculo via `runnerImport`.
- **Rodar Python 3.9 em contêiner** — fora do alcance do ambiente de treino e
  do batch; `ast.parse(feature_version=(3, 9))` + lista testada + `since` cobre
  sintaxe e biblioteca padrão de forma determinística.

## Consequences

- O `RefScreen` continua único para todas as linguagens e sem texto fixo de C++.
- Adicionar uma terceira linguagem no futuro só pede entradas em `langs.ts`,
  uma pasta `src/ref/<lang>/`, um item na árvore e um ramo no oráculo.
- Novas APIs pós-3.9 usadas em verbetes futuros precisam constar em
  `POST_39_APIS` caso não sejam erro de sintaxe no 3.9.

## Rollback plan

Remover `src/ref/py/`, `src/ref/pairs.test.ts`, o campo `pair` dos verbetes de
`src/ref/cpp/` e de `Entry`, o item `ref-py` da árvore e do `App`, os metadados
de Python em `langs.ts` e o ramo `py` de `scripts/ref-oracle.mjs`, num
`revert(T47)` acompanhado de um ADR `kind: rollback`.
