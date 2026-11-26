---
id: T38
title: Agenda de contests
status: done
depends_on: []
branch: task/T38-contest-calendar
adrs: ["[[ADR-T38-1 Dados de contests buscados no build a cada 6 h]]"]
tags: [task]
---

# T38 Agenda de contests

## Goal

Um item **Contests**, numa pasta nova **Agenda**, lista os próximos
contests de **Codeforces, AtCoder, CodeChef e LeetCode** com data e hora
no fuso de quem usa. Cada contest mostra quanto falta para começar, a
duração e o link, e pode ir para o Google Agenda ou para um arquivo
`.ics`. O site continua estático: um workflow agendado busca os dados do
lado do servidor e publica um `contests.json` junto com o app.

## Decisões do dono (2026-11-23)

- Sites: Codeforces, AtCoder, CodeChef e LeetCode. O clist.by fica de
  fora, porque exige chave de API.

## O que as fontes devolvem (testado em 2026-11-23)

| Fonte | Como | Navegador (CORS) | Formato |
|---|---|---|---|
| Codeforces | `GET https://codeforces.com/api/contest.list?gym=false` (oficial) | liberado | `result[]` com `phase: "BEFORE"`, `startTimeSeconds`, `durationSeconds`, `id`, `name` |
| CodeChef | `GET https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all` (não oficial) | bloqueado | `future_contests[]` e `present_contests[]` com `contest_code`, `contest_name`, `contest_start_date_iso`, `contest_end_date_iso` (`+05:30`) |
| AtCoder | `GET https://atcoder.jp/contests/` (HTML, sem API) | bloqueado | tabela `#contest-table-upcoming`: `<time class="fixtime ...">2026-11-28 21:00:00+0900</time>`, link `/contests/abc486`, nome e duração `01:40` |
| LeetCode | `POST https://leetcode.com/graphql` com `{ upcomingContests { title titleSlug startTime duration } }` e o cabeçalho `Referer: https://leetcode.com/contest/` (não oficial) | bloqueado | `data.upcomingContests[]` com `startTime` em segundos e `duration` em segundos |

Só o Codeforces aceita o navegador, por isso a busca acontece no build.

## Spec

- **AC-1**: **Modelo e parsers puros** em `src/contests/`, sem `fetch`,
  sem DOM e sem `Date.now`:
  - `Contest = { site, id, name, url, startMs, durationMs }`, com `site`
    em `codeforces | atcoder | codechef | leetcode`;
  - um parser por fonte transforma a resposta crua (JSON ou HTML) numa
    lista de `Contest`, e uma resposta inesperada vira um erro com o
    nome da fonte, nunca um contest pela metade;
  - as URLs ficam em `https://codeforces.com/contests/<id>`,
    `https://atcoder.jp/contests/<slug>`,
    `https://www.codechef.com/<code>` e
    `https://leetcode.com/contest/<slug>`.
  - Testes: `src/contests/parse.test.ts`, com respostas reais gravadas em `src/contests/fixtures/` (reduzidas a poucos contests). Cada parser tem casos de sucesso, campo faltando, data inválida e HTML sem a tabela.
- **AC-2**: **Agenda pura** (`src/contests/agenda.ts`):
  - junta as fontes, remove duplicatas (`site` + `id`) e ordena por
    início;
  - dado um `now`, separa "acontecendo agora" e "próximos 14 dias";
  - formata "começa em 2 d 3 h" ou "termina em 1 h 20 min";
  - agrupa por dia local a partir de uma função de dia recebida como
    parâmetro, para o fuso ficar na UI.
  - Testes: `src/contests/agenda.test.ts`, mais `src/contests/agenda.prop.test.ts` (a saída está sempre ordenada; nenhum contest acabado aparece; juntar é idempotente).
- **AC-3**: **Exportar:**
  - um link do Google Agenda
    (`https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=<início>/<fim>&details=<url>`,
    com datas em UTC no formato `YYYYMMDDTHHMMSSZ`);
  - um `.ics` (RFC 5545) de um contest ou de todos os filtrados, com
    `UID` estável (`<site>-<id>@popis`), escape de `,` `;` `\` e quebra
    de linha, e linhas dobradas em 75 octetos.
  - Testes: `src/contests/export.test.ts` (tabela de casos, incluindo nomes com vírgula, ponto e vírgula e acento).
- **AC-4**: **Busca no build** (`scripts/contests-fetch.mjs`,
  `npm run contests:fetch`):
  - busca as 4 fontes em paralelo, com timeout de 20 s cada, carrega os
    parsers de `src/` com `runnerImport` do `vite` (como os outros
    scripts) e grava `public/contests.json`
    (`{ generatedAt, contests, errors }`, git-ignored);
  - **uma fonte que falha não derruba as outras:** o script baixa o
    `contests.json` publicado no site e mantém dele os contests futuros
    daquela fonte, registrando o erro em `errors`;
  - o script nunca sai com erro por causa de uma fonte; só falha se não
    conseguir gravar o arquivo.
  - Testes: `src/contests/merge-snapshot.test.ts` (função pura que junta o resultado novo com o snapshot anterior, por fonte); o script roda no passo de qualidade e o resumo vai para o *Log*.
- **AC-5**: **Workflow:** `.github/workflows/pages.yml` ganha
  `schedule` (a cada 6 h) e `workflow_dispatch`, e roda
  `npm run contests:fetch` antes do `build:pages`. O deploy por push
  continua igual.
  - Testes: `tests/workflow.test.ts` (o arquivo tem o `cron`, o `workflow_dispatch` e o passo de fetch antes do build) e `tests/pages.test.ts` (atualizado conforme ADR-T38-1).
- **AC-6**: **Tela Contests** (`src/ui/ContestsScreen.tsx`):
  - lê `contests.json` do próprio site (`import.meta.env.BASE_URL`);
  - mostra "Acontecendo agora" e os próximos 14 dias agrupados por dia,
    em hora local, com o site, o nome (link), o início, a duração e
    quanto falta, atualizando a cada minuto pelo relógio injetado;
  - filtro por site (caixas marcáveis, salvas em `popis.contests`);
  - botões "Google Agenda" por contest e "Baixar .ics" para os
    filtrados;
  - mostra "atualizado há X" e avisa quando os dados têm mais de 24 h,
    ou quando uma fonte falhou na última busca ("AtCoder indisponível na
    última atualização");
  - sem o arquivo (por exemplo, em `npm run dev` antes do fetch), a
    tela diz como gerá-lo;
  - funciona no celular. Os sites aparecem como texto, nas cores de token
    que já existem, sem token novo.
  - Testes: `src/ui/ContestsScreen.test.tsx` (com relógio falso e `fetch` falso: agrupamento, contagem regressiva que avança, filtro salvo, aviso de dados velhos e de fonte com erro, estado sem arquivo) e `src/contests/prefs.test.ts` (persistência de `popis.contests`).
- **AC-7**: **Árvore:** a pasta "Agenda", com o item "Contests", entra
  no fim da árvore, visível no celular. Os atalhos 1–9 não mudam.
  - Testes: `src/ui/shell/sections.test.ts`, `tests/e2e/contests.spec.ts` (com `contests.json` interceptado por `page.route`, no desktop e no celular).

## Out of scope

- clist.by e outros sites (TopCoder, HackerRank, Kattis).
- Notificações do navegador e lembretes.
- Inscrição automática nos contests.

## Files owned

- `src/contests/` (novo) e os testes, `src/contests/fixtures/`
- `scripts/contests-fetch.mjs` (novo), `package.json` (script `contests:fetch`), `.gitignore` (`public/contests.json`), `.prettierignore` (`public/contests.json`, para o arquivo gerado no passo de qualidade não quebrar `format:check`)
- `.github/workflows/pages.yml`, `tests/workflow.test.ts` (novo), `tests/pages.test.ts` (atualizado para incluir `npm run contests:fetch` na sequência do workflow, conforme ADR-T38-1)
- `src/ui/ContestsScreen.tsx` (novo), `src/ui/ContestsScreen.test.tsx` (novo), `src/ui/App.tsx`, `src/ui/shell/sections.ts`, `src/ui/shell/sections.test.ts`, `src/ui/app.css`
- `tests/e2e/contests.spec.ts` (novo), `playwright.config.ts` (incluir `contests.spec.ts` no projeto `mobile` para AC-7)
- `vite.config.ts` (limiar de cobertura de `src/contests/**`)

## Subtasks (one commit each)

- [x] spec: ADR-T38-1 (dados buscados no build a cada 6 h, sem chave, com reaproveitamento por fonte) e testes nomeados
- [x] tests
- [x] models
- [x] behaviour
- [x] quality: `npm run check`, coverage, e2e, `npm run contests:fetch` e screenshots
- [x] docs: *Log* e status `review`

## Notas para o batch

- **Rede:** o passo de qualidade precisa rodar `npm run contests:fetch`.
  O plano do batch libera esse comando; o script faz as requisições, não
  a sessão.
- **Bloquear se:** uma fonte mudar de formato e não houver como
  reconhecer o novo de forma segura. Nesse caso, entregue as outras três
  e registre no *Log*.

## Log

- 2026-11-26 — Spec e ADR-T38-1 escritos (emendando ADR-T11-1). Adicionados a *Files owned*: `src/ui/ContestsScreen.test.tsx`, `src/ui/shell/sections.test.ts` (já nomeados nos ACs), `tests/pages.test.ts` (sequência do workflow atualizada por ADR-T38-1), `playwright.config.ts` (incluir `contests.spec.ts` no projeto `mobile`), `vite.config.ts` (limiar de cobertura de `src/contests/**`) e `.prettierignore` (ignorar `public/contests.json` gerado no fetch).
- 2026-11-26 — Fixtures reais gravadas das 4 fontes (Codeforces, AtCoder, CodeChef e LeetCode) e reduzidas em `src/contests/fixtures/`. No momento da captura, o CodeChef retornou `present_contests: []` e `future_contests: []` (janela entre Starters 266 e o próximo); a fixture de sucesso usa registros reais do mesmo retorno no esquema de `present_contests`/`future_contests`, e há teste dedicado para o retorno vazio.
- 2026-11-26 — Correções de teste em commits `test(T38)` separados antes da implementação: `177f75c` trocou matchers inexistentes de jest-dom/Playwright em `ContestsScreen.test.tsx` por asserções padrão de Vitest/Testing Library; `627de73` trocou `page.clock.install({ time })` por `page.clock.setFixedTime(NOW)` em `tests/e2e/contests.spec.ts` para evitar avanço real de milissegundos durante a navegação.
- 2026-11-26 — UNATTENDED CHOICE: o parser do Codeforces inclui `phase: "CODING"` além de `"BEFORE"` e o do AtCoder lê `#contest-table-action` e `#contest-table-daily` quando presentes (além da tabela obrigatória `#contest-table-upcoming`), para contests em andamento e Weekday Contests aparecerem na agenda.
- 2026-11-26 — UNATTENDED CHOICE: cada contest oferece botão `.ics` individual ao lado de "Google Agenda", além do botão "Baixar .ics" para todos os filtrados; cores dos rótulos dos sites usam tokens existentes (`--accent`, `--correct`, `--warning`, `--selection-text`) e o filtro no celular usa grade 2×2 sem borda de `<fieldset>` (coerência T19).
- 2026-11-26 — Busca ao vivo (`npm run contests:fetch`): `16 contests (codeforces: 5, atcoder: 10, codechef: 0, leetcode: 1)`, `errors: []`, gravado em `public/contests.json` (git-ignored) e copiado para `dist/contests.json` no build.
- 2026-11-26 — Gates verdes: `npm run check` (216 arquivos, 4635 testes, `tsc`, `eslint`, `prettier`, `vite build`), `npm run coverage` (`src/contests/**` com limiar 100/99/100/98 e todos os limiares do repo mantidos), `npm run test:e2e` (61/61 desktop e mobile), `npm run test:fuzz -- -t "agenda properties"` (20 000 casos × 3 propriedades) e conferência visual por screenshots (1280×800 e 390×844). Verificação manual pendente ao dono após merge: primeiro deploy agendado, horários no fuso local e abertura do link no Google Agenda.
