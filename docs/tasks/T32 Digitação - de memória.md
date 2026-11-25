---
id: T32
title: Digitação - de memória
status: ready
depends_on: [T24, T34]
branch: task/T32-typing-from-memory
adrs: []
tags: [task]
---

# T32 Digitação - de memória

## Goal

Um item **De memória** na pasta Digitação para treinar a digitação de
trechos que a pessoa precisa saber de cor: o template, DSU, segtree,
busca binária, Dijkstra. No ICPC, o time digita isso no começo da prova.
A ajuda é retirada aos poucos, como no Aprender do Vim:
1. o trecho inteiro à vista;
2. só a primeira palavra de cada linha;
3. tela em branco.

Cada trecho é um cartão do FSRS (T24). A biblioteca padrão são os trechos
do dono, e qualquer pessoa pode fazer o upload dos próprios. Ideia D6 de
[[Datilografia para programação]].

## Decisões do dono (2026-11-21)

- A biblioteca padrão é a do dono, e o upload da pessoa é obrigatório.
- É possível sem servidor:
  - o arquivo é lido no próprio navegador (`File` e `FileReader`);
  - fica no armazenamento local;
  - viaja na exportação e na importação da T22.

  Limites: os trechos enviados ficam só naquele navegador, e os trechos
  padrão do dono ficam públicos junto com o site.

## Spec

- **AC-1**: **Biblioteca padrão:**
  - os trechos do dono ficam em `src/typing/library/` como arquivos
    `.cpp` e `.py`, gerados a partir do repositório de programação
    competitiva dele pela [[T34 Digitação - trechos do repositório de CP]]
    (`profile.json` não é um trecho);
  - são importados como texto no build (`import.meta.glob` com
    `?raw`);
  - o nome do trecho vem do nome do arquivo.
  - Testes: `src/typing/library.test.ts` ("every bundled snippet passes the snippet rules", "bundled snippet names are unique").
- **AC-2**: **Regras de trecho** em `src/typing/snippet-rules.ts`,
  puras e aplicadas tanto aos trechos padrão quanto aos enviados:
  - CRLF vira LF, tab vira 4 espaços e o espaço no fim da linha é
    removido;
  - só ASCII imprimível; um caractere fora disso é rejeitado com a linha
    e a coluna na mensagem;
  - até 300 linhas e 16 KB por trecho, e até 100 trechos enviados;
  - a linguagem vem da extensão: `.cpp .cc .h .hpp` são C++, `.py` é
    Python, e `.txt` é escolhido pela pessoa;
  - um arquivo pode ter vários trechos, separados por linhas
    `// @snippet <nome>` (C++) ou `# @snippet <nome>` (Python).
  - Testes: `src/typing/snippet-rules.test.ts` (tabela de casos: normalização, rejeição com linha e coluna, limites, divisão por marcador).
- **AC-3**: **Upload e gestão** (`src/ui/typing/LibraryPanel.tsx`):
  - aceita arquivos por botão e por arrastar e soltar, vários de uma
    vez, e também texto colado;
  - os trechos enviados podem ser renomeados e apagados;
  - os trechos padrão podem ser escondidos, mas não apagados;
  - ficam em `popis.typing-library`, dentro do orçamento de tamanho da
    T22, e entram na exportação e na importação.
  - Testes: `src/storage/typing-library.test.ts` ("saves, renames and deletes uploaded snippets", "hides but keeps bundled snippets", "rejects an upload over the size budget"), `src/storage/backup.test.ts` ("backup carries the snippet library"), `src/ui/LibraryPanel.test.tsx` ("uploading two files adds two snippets", "a non-ASCII file shows the line and column").
- **AC-4**: **Correção por tokens** em `src/typing/tokens.ts`:
  - um tokenizador de C++ e Python ignora espaços, quebras de linha e
    comentários;
  - a resposta está certa quando a sequência de tokens é igual à da
    referência, com uma renomeação **bijetiva** dos identificadores;
  - palavras-chave e nomes da biblioteca padrão (`vector`, `sort`,
    `cin`, `range`, `len`, numa lista no mesmo arquivo) não podem ser
    trocados.
  - Precisa de uma tabela de casos com:
    - formas aceitas: `int lo = 0, hi = n;` por `int l=0,r=n;`; outra
      indentação; comentários a mais;
    - quase-acertos rejeitados: dois nomes da referência viraram um só
      (não bijetivo); `sort` trocado por outro nome; `<` no lugar de
      `<=`; uma linha faltando; tokens fora de ordem.
  - Testes: `src/typing/tokens.test.ts`, `src/typing/tokens.prop.test.ts` (renomear identificadores de forma bijetiva sempre é aceito; trocar um token da referência sempre é rejeitado).
- **AC-5**: **Retirada da ajuda:**
  - **passo 1:** digitação de cópia com o motor da T10 (exato, com
    auto-indent);
  - **passos 2 e 3:** editor livre com auto-indent (copia a indentação
    da linha de cima, e Tab insere 4 espaços); Ctrl+Enter envia;
  - um envio errado mostra o primeiro token divergente e deixa
    continuar;
  - acertar o passo 1 ou 2 sem erro e no primeiro envio pula o próximo
    passo (regra de ADR-T20-1);
  - o trecho conta como concluído no passo 3.
  - Testes: `src/typing/memory-round.test.ts` ("first-try success skips the next step", "a wrong submission reports the first divergent token"), `src/ui/MemoryTypingScreen.test.tsx` ("step 2 shows only the first word of each line", "step 3 shows a blank editor", "Ctrl+Enter submits").
- **AC-6**: **FSRS e métricas:**
  - cada trecho vira um cartão `kind: "typing-snippet"`;
  - a nota é: 1 desistiu; 2 precisou do passo 1 ou 2 ou de mais de um
    envio; 3 acertou o passo 3 no primeiro envio; 4 acertou também
    abaixo da sua mediana de tempo;
  - o resultado mostra o tempo, as teclas (contando Backspace) e os
    envios;
  - os eventos têm drill `typing.memory` e KC
    `typing.snippet.<nome>`.
  - Testes: `src/storage/review.test.ts` ("typing-snippet cards grade 1 to 4 from the result"), `src/stats/event.test.ts`.
- **AC-7**: **Árvore e E2E:**
  - "De memória" entra na pasta Digitação, fora do celular;
  - o E2E faz o upload de um arquivo e completa os 3 passos.
  - Testes: `src/ui/shell/sections.test.ts`, `tests/e2e/typing-memory.spec.ts`.

## Out of scope

- Sincronizar a biblioteca entre aparelhos (não há servidor).
- Executar o código ou aceitar outro algoritmo. A correção ainda exige a
  mesma estrutura de tokens.
- Outras linguagens além de C++ e Python.

## Files owned

- `src/typing/library/` (os trechos do dono), `src/typing/library.ts`, `snippet-rules.ts`, `tokens.ts`, `memory-round.ts` (novos) e os testes
- `src/storage/typing-library.ts` (novo), `src/storage/review.ts`, `src/storage/backup.ts`
- `src/stats/event.ts`
- `src/ui/MemoryTypingScreen.tsx`, `src/ui/typing/LibraryPanel.tsx` (novos), `src/ui/App.tsx`, `src/ui/shell/sections.ts`, `src/ui/app.css`
- `tests/e2e/typing-memory.spec.ts` (novo)

## Subtasks (one commit each)

- [ ] spec: ADR-T32-1 (biblioteca padrão e upload local, correção por tokens com renomeação bijetiva, notas FSRS) e testes nomeados
- [ ] tests
- [ ] models
- [ ] behaviour
- [ ] quality: `npm run check`, coverage, e2e e screenshots
- [ ] docs: *Log* e status `review`

## Notas para o batch

- **Antes:** a T34 gera os trechos em `src/typing/library/`, e o dono
  revisa a lista.
- **Bloquear se:** a pasta estiver vazia. Não invente trechos no lugar
  dos do dono.

## Log
