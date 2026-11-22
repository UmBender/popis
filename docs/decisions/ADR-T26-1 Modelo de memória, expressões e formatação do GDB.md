---
id: ADR-T26-1
title: Modelo de memória, expressões e formatação do GDB em TypeScript puro
status: accepted
kind: decision
date: 2026-11-22
task: T26
builds_on: [ADR-0002, ADR-T18-1, ADR-T19-1, ADR-T20-1, ADR-T22-1, ADR-T25-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T26-1 Modelo de memória, expressões e formatação do GDB em TypeScript puro

## Context

O item **Saída** na pasta GDB (T26) e as unidades 10–14 do Aprender exigem prever exatamente o que o GNU gdb 18.1 imprime para `print` (com `/x /d /u /o /t /c`), expressões C/C++ (divisão truncada para zero, casts, promoções, `@`, `sizeof`, ponteiros), `whatis`, `ptype` e `x/Nfu` sobre a ABI x86-64 SysV LP64 little-endian — tudo sem executar o gdb no navegador (ADR-0002) e conferido automaticamente contra o gdb real instalado pelo oráculo da T25 (ADR-T25-1).

## Decision

1. **Modelo de memória x86-64 SysV LP64 (`src/gdb/memory.ts`):** representamos os tipos inteiros (`char` com sinal de 1 byte, `signed char`, `unsigned char`, `short`, `unsigned short`, `int` de 4 bytes, `unsigned int`, `long` e `long long` de 8 bytes, `unsigned long`, `unsigned long long`), `bool` (1 byte), arrays fixos, structs com alinhamento e padding da ABI (`sizeof` múltiplo do alinhamento, `offsetof` alinhado ao campo) e ponteiros de 8 bytes. Um estado de memória armazena as variáveis num buffer `Uint8Array` em ordem little-endian a partir de um endereço base não nulo (`0x10000`), reservando `0x0` como ponteiro nulo. Ponto flutuante fica fora de escopo.
2. **Subconjunto de expressões com semântica de C (`src/gdb/expr.ts`):** avaliamos literais, variáveis, `+ - * / %`, `-`/`+` unários, casts para tipos inteiros e ponteiros, `[]`, `.`, `->`, `*`, `&`, `@` (fatias artificiais `a[i]@n` e `*p@n`) e `sizeof` usando `BigInt` com promoções inteiras de C (`bool`/`char`/`short` → `int`), conversões aritméticas usuais da LP64, divisão e resto truncados em direção a zero e aritmética modular sem sinal. Desreferenciar `0x0` produz o erro exato `Cannot access memory at address 0x0`.
3. **Formatação idêntica ao GNU gdb 18.1 (`src/gdb/format.ts`):** mantemos os padrões `print elements = 200` e `print repeats = 10` (comprimindo sequências com estritamente mais de 10 elementos iguais como `<repeats N times>`). Reproduzimos o descarte do `\0` final em arrays de `char`, os escapes de caractere (`\n`, `\t`, `\000`, `\'`, `\"`, `\\`, octais de 3 dígitos), a ausência de zeros à esquerda em `p/x` e `p/t` versus o preenchimento fixo por unidade (`b`/`h`/`w`/`g`) em `x/Nfu`, os prefixos `(T *)` em ponteiros de topo e `whatis`/`ptype`. Endereços não nulos são mascarados como `ADDR` e nunca perguntados diretamente; `0x0` é preservado.
4. **Verificador de saída e respostas equivalentes (`src/gdb/check-output.ts`):** o usuário digita apenas o que segue `$N = ` (prefixo opcional) ou, no `x/`, os valores separados por espaço. Espaços extras fora de aspas são ignorados e `ADDR` (ou qualquer endereço hexadecimal não nulo de 4+ dígitos) é aceito no lugar de endereços mascarados. Quase-acertos comuns (decimal em vez de hex, largura errada em complemento de dois, big-endian, divisão com piso, `<repeats>` expandido, struct sem nomes de campos) são rejeitados com explicação específica em português.
5. **Oráculo ampliado (`scripts/gdb-oracle.mjs`):** `npm run gdb:oracle` passa a conferir contra o GNU gdb 18.1 real, além dos testes da T25: (a) a tabela de casos de `src/gdb/cases/format-cases.ts`; (b) uma amostra fixa de seeds de cada um dos 9 tipos × 3 níveis do gerador `src/gdb/out-drill.ts` (compilando cada programa gerado com `g++ -g -O0`); (c) as transcrições de exemplo das unidades 10–14 em `src/gdb/cases/transcripts.ts`.
6. **Treino Saída, currículo e registro T22:** a árvore ganha o item `Saída` (`gdb-output`, `touch: true`) logo após `Comandos` na pasta GDB. O treino usa `OutputDrill.tsx` com configurações em `popis.gdb-output`, histórico em `popis.gdb-output-results` e eventos no registro T22 com drill `gdb.out` (`DRILLS` em `src/stats/event.ts`) e KC `gdb.out.<tipo>`. As unidades 10–14 entram em `src/gdb/curriculum.ts` com exercícios de modo `"output"` (verificados por `checkOutput`, mesma retirada adaptativa de ADR-T20-1), cujo botão "Treinar" abre `Saída` com os tipos da lição selecionados.

## Alternatives considered

- **Usar `Number` de 64 bits (IEEE-754) nas expressões inteiras** — perderia precisão acima de $2^{53}$ em `long long` e `unsigned long long` (64 bits); `BigInt` com `BigInt.asIntN`/`BigInt.asUintN` dá semântica exata de 8, 16, 32 e 64 bits.
- **Usar regex simples para comparar respostas de saída** — colapsaria espaços dentro de literais de string/char (`"a  b"`, `' '`) e não explicaria quase-acertos como inversão de endianness ou largura errada em complemento de dois.
- **Armazenar resultados e configurações de Saída dentro da chave `popis.gdb` do Comandos** — misturaria conjuntos de tipos distintos e quebraria o contrato de `parseGdbSettings` da T25; chaves dedicadas (`popis.gdb-output` e `popis.gdb-output-results`) mantêm os dois treinos independentes.

## Consequences

- Cada regra sutil do gdb 18.1 (truncamento em 200 elementos, limiar `> 10` em `<repeats>`, descarte do `\0` final em `char[N]`, preenchimento zero em `x/Nxb` vs `p/x`) fica coberta tanto por testes unitários determinísticos quanto por verificação ao vivo no oráculo.
- Os programas gerados em `src/gdb/out-drill.ts` precisam ser C++17 válido, sem comportamento indefinido, sem ponto flutuante e sem leitura de bytes de padding não inicializados para garantir determinismo no oráculo.
- A T27 (sessão simulada) e a T28 (revisão e treino do dia com `gdb.out.*`) já encontram o modelo de memória, o avaliador de expressões, o formatador e o drill `gdb.out` prontos.

## Rollback plan

Reverter os commits da branch `task/T26-gdb-output`, remover `"gdb.out"` de `DRILLS` (`src/stats/event.ts`), remover `"gdb-output"` de `SECTIONS` (`src/ui/shell/sections.ts`) e restaurar `src/gdb/curriculum.ts` às unidades 1–9 da T25.
