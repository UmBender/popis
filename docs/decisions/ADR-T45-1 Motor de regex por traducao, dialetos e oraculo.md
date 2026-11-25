---
id: ADR-T45-1
title: Motor de regex por tradução, dialetos Python e ERE e oráculo com ferramentas reais
status: accepted
kind: decision
date: 2026-11-25
task: T45
builds_on: [ADR-0001, ADR-0002, ADR-T18-1, ADR-T19-1, ADR-T20-1, ADR-T22-1, ADR-T25-1]
amends: []
supersedes: []
reverts: []
superseded_by:
reverted_by:
tags: [adr]
---

# ADR-T45-1 Motor de regex por tradução, dialetos Python e ERE e oráculo com ferramentas reais

## Context

O treino de expressões regulares (T45) precisa ensinar e exercitar os usos reais de prova e terminal (`re` do Python, `grep -E` e `sed -E`) com destaque ao vivo a cada tecla, mensagens de erro legíveis por dialeto e execução 100% no navegador sem dependências externas (ADR-0002). O `RegExp` do JavaScript difere tanto do `re` do Python quanto do ERE do POSIX em detalhes como classes POSIX (`[[:digit:]]`), `]` literal no início de `[...]`, `\` dentro de classes no ERE, quantificadores `{,m}`, sintaxe de substituição (`\1`, `\g<1>`, `&`) e recursos fora do dialeto (`\d`, `\b`, `(?:...)`, `(?=...)`, quantificadores preguiçosos no `grep -E`).

## Decision

1. **Motor por validação de subconjunto e tradução para `RegExp` (`src/regex/compile.ts`):**
   - `compile(pattern, dialect, mode)` aceita `dialect: "python" | "ere"` (padrão `"python"`) e `mode: "search" | "fullmatch"` (padrão `"search"`).
   - Um analisador próprio em TypeScript puro valida o padrão antes de instanciar `new RegExp(jsSource)` (sem flag `u`), garantindo que apenas o subconjunto ensinado seja aceito e devolvendo erros em português específicos do dialeto (por exemplo, `` `\d` não existe no `grep -E`; use `[0-9]` ``).
   - No dialeto `"ere"`, classes POSIX (`[:digit:]`, `[:alpha:]`, `[:alnum:]`, `[:space:]`, `[:lower:]`, `[:upper:]`, `[:xdigit:]`, `[:blank:]`, `[:punct:]`) dentro de `[...]` são traduzidas para faixas ASCII equivalentes, `\` dentro de `[...]` é tratado como literal (rejeitando `\d`/`\w`/`\s` com dica), e `]` na primeira posição da classe é escapado para `\]` no JS. Recursos exclusivos do Python (`\d`, `\w`, `\s`, `\b`, `(?:...)`, `(?=...)`, `(?!...)`, `*?`/`+?`/`??`/`{n,m}?`) são rejeitados no `"ere"`; classes POSIX são rejeitadas no `"python"`.
   - Fora do escopo nos dois dialetos (rejeitados com mensagem clara): lookbehind (`(?<=`, `(?<!`), retro-referência no padrão (`\1`–`\9`), flags inline (`(?i)` etc.), grupos nomeados e escapes Unicode/hex (`\u`, `\p`, `\x`).
   - Substituições (`applyReplace` / `validateReplacement`) traduzem `\1`–`\9` e `\g<0>`–`\g<9>` no `"python"` (`re.sub`) e `\1`–`\9`, `&`, `\&` no `"ere"` (`sed -E 's/.../.../g'`), escapando `$` literal antes de chamar `String.prototype.replace` e validando índices de grupo existentes.

2. **Tipos de item, gerador e rodada sem tempo limite por item (`src/regex/`):**
   - Quatro tipos (`REGEX_ITEM_KINDS`): `casar`, `extrair`, `trocar` e `ler`, com KC `regex.<tipo>`.
   - A rodada da Prática (`src/regex/round.ts`) tem 5 itens fixos com cronômetro crescente visível, contando tentativas e tempo por item. Pular (`Pular` ou `Ctrl+Enter`) revela a resposta canônica no item atual para estudo antes de avançar ao próximo.
   - Eventos da T22 usam o drill `regex.practice` em `DRILLS` (`src/stats/event.ts`).

3. **Destaque ao vivo por quadro de animação (`src/ui/regex/`):**
   - O cálculo de destaque ao vivo e validação sintática é adiado para o próximo `requestAnimationFrame` (`useFrameValue`), nunca por `setTimeout`, preservando determinismo com o relógio falso nos testes e responsividade ao digitar. A submissão por `Enter` valida sempre o texto atual do campo.
   - Cada linha mostra `✓`/`✗` em texto além da cor (tokens do tema Kanagawa Dragon, ADR-0001) e sublinha os trechos casados.

4. **Oráculo com ferramentas reais (`scripts/regex-oracle.mjs`, `npm run regex:oracle`):**
   - Fica fora de `npm run check` e roda em diretório temporário `mkdtemp(join(tmpdir(), "popis-"))`, removido ao final.
   - Invoca `python3 -c` (via `execFile`, sem shell), `/usr/bin/grep -E` (e `-Ex` para `fullmatch`, com `LC_ALL=C`) e `/usr/bin/sed -E` (com `LC_ALL=C`) por caminhos absolutos para evitar aliases locais como `ugrep`.
   - Confere todos os exemplos e exercícios do Aprender (unidades 1–9) e uma amostra fixa de seeds do gerador em ambos os dialetos.

5. **Currículo, árvore e armazenamento:**
   - O Aprender (`src/regex/curriculum.ts`) tem 9 unidades (Literais, Classes, Repetição, Âncoras, Grupos, Trocar, No terminal, Dialetos, Lookahead), reutilizando `src/learn/curriculum.ts` (ADR-T20-1, ADR-T25-1), com explicação de até 3 frases, exemplo com destaque animado e 3 exercícios com retirada adaptativa da ajuda.
   - A pasta `Regex` entra na árvore após `GDB` (última pasta de ferramenta presente na `main`), com `Aprender` (`ariaLabel: "Aprender (Regex)"`) e `Prática`, ambos com `touch: true`, preservando os atalhos `1–9`.
   - Progresso do Aprender em `popis.regex-learn` (`{ version: 2, completed }`), configurações (dialeto e tipos) em `popis.regex` e histórico de rodadas em `popis.regex-results`.

## Alternatives considered

- **Usar uma biblioteca externa de parser/engine de regex** — viola a regra de zero dependências novas sem necessidade real e aumenta o bundle; o subconjunto ensinado é pequeno e um tradutor próprio dá mensagens de erro didáticas em português por dialeto.
- **Rodar `new RegExp(pattern)` diretamente sem validação** — aceitaria `\d`, `(?:...)` e `(?=...)` no dialeto `grep -E`, rejeitaria `[[:digit:]]` e quebraria em `[]a]` e `{,3}`, divergindo das ferramentas reais.
- **Debouncing por `setTimeout` para o destaque ao vivo** — acoplaria a interface a atrasos arbitrários de relógio; `requestAnimationFrame` acompanha o ritmo de pintura do navegador e funciona de forma limpa com o relógio falso dos testes.

## Consequences

- Todo recurso aceito pelo motor é verificado contra `python3`, `/usr/bin/grep -E` e `/usr/bin/sed -E` pelo oráculo.
- Os textos de exemplo e gerador mantêm entradas ASCII nos casos onde `\w` ou classes POSIX possam diferir por locale, garantindo paridade exata entre JS, Python e GNU ERE.
- A inserção da pasta `Regex` após `GDB` na `main` exige apenas ajuste de posição quando combinada com a pasta `Shell` (T39) na integração.

## Rollback plan

Reverter os commits da branch `task/T45-regex`, remover `regex.practice` de `DRILLS`, remover a pasta `Regex` de `SECTIONS`, remover os limiares de `src/regex/**` em `vite.config.ts` e remover o script `regex:oracle` de `package.json`.
