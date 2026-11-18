# popis

Treino rápido de cálculo mental, álgebra básica, lógica e visualização. As
questões são geradas por código e respondidas contra o relógio, e a
dificuldade sobe com o tempo. Stack (ADR-0002): Vite +
TypeScript + React, com Vitest, fast-check, Testing Library e Playwright.

## Onde as coisas ficam

- `docs/`: vault do Obsidian com tasks, decisões (ADRs), arquitetura e
  modelos de nota. Comece por `docs/Home.md`.
  - `docs/tasks/`: uma nota por task. A nota é a fonte da verdade do status.
  - `docs/decisions/`: ADRs, append-only (ver *Decisões*).
  - `docs/templates/`: modelos de Task, ADR, Feature, Proposal e Tutorial.
- `src/core/`: RNG com seed, relógio e tipos base (`Problem`, `Generator`).
- `src/math/`: polinômios e parser de expressões.
- `src/gen/`: geradores de questões, um módulo por família de habilidade.
- `src/session/`: motor da partida (timer, placar, log de tentativas).
- `src/storage/`: persistência (`localStorage`).
- `src/ui/`: componentes React. **Só aqui** entram DOM e React.
- `tests/regressions/`: um arquivo por bug corrigido (ver *Testes de regressão*).
- `tests/e2e/`: testes Playwright do app rodando.

**Cores:** só as do tema Kanagawa Dragon do Alacritty do usuário
(`docs/architecture/Theme.md`, ADR-0001). Elas ficam como variáveis CSS em
`src/ui/theme.css`, e todo o resto usa `var(--token)`. Um literal de cor em
qualquer outro arquivo de `src/` faz `tests/colors.test.ts` falhar. Precisou
de uma cor nova? Crie um token a partir da paleta de origem e registre num
ADR novo.

Tudo fora de `src/ui/` é TypeScript puro. Não usa DOM, `Math.random` nem
`Date.now`, e por isso roda e é testado sem navegador.

## Idioma

- Código, identificadores, nomes de teste e mensagens de commit: inglês.
- Notas do vault (`docs/`): português.

## Fluxo de uma task (SDD + TDD)

O spec é escrito antes do código, e os testes são escritos e commitados
**antes** do código que os faz passar.

Status: `todo` → `ready` → `in-progress` → `review` → `done`
(ou `rolled-back`). Uma task fica `ready` quando todas as `depends_on`
estão `done`.

Cada passo é um commit:

1. **Branch**: `git switch -c task/<ID>-<slug> main`.
2. **Spec** (`docs`): cada critério `AC-n` da nota nomeia o(s) teste(s) que
   o provam. Decisões novas de arquitetura viram ADRs. O status vai para
   `in-progress`.
3. **Testes** (`test`): um ou mais testes para cada `AC-n`. Rode-os e
   confirme que falham **pelo motivo certo** (comportamento ausente, não
   erro de digitação). Este commit é vermelho de propósito.
4. **Modelos** (`feat`): tipos, interfaces e assinaturas. Os corpos podem
   lançar `new Error("todo")`. O typecheck passa; os testes de comportamento
   ainda falham.
5. **Comportamento** (`feat`): implemente até todos os testes passarem.
6. **Qualidade** (`refactor`/`chore`): `npm run check` verde. Refatore sem
   mudar comportamento e remova todo `todo` deixado no passo 4.
7. **Docs** (`docs`): marque os subtasks e preencha o *Log* da nota. O status
   vai para `review`, e os ADRs são atualizados.

Pule um passo só se ele não produzir nada (ex.: task sem modelos novos) e
diga o porquê no *Log* da nota.

Regras:

- `main` está sempre verde. Commits vermelhos só existem em branches de task
  (passos 3–4).
- Precisou de algo fora do spec? Pare e corrija a nota da task antes.
- Ao terminar, informe a branch, os commits (`git log --oneline main..`), o
  resultado de `npm run check` e qualquer desvio do spec.

## Testes

### Camadas

| Camada | Ferramenta | Onde | Para quê |
|--------|------------|------|----------|
| Unitário | Vitest | `src/**/*.test.ts`, ao lado do código | funções puras: aritmética de polinômios, parser, geradores, motor da sessão |
| Propriedade | fast-check | `src/**/*.prop.test.ts` | invariantes sobre muitas entradas aleatórias |
| Componente | Testing Library + Vitest | `src/ui/**/*.test.tsx` | comportamento da tela: digitar, aceitar automaticamente, fim do tempo |
| Regressão | Vitest (ou Playwright) | `tests/regressions/` | um arquivo por bug corrigido, para sempre |
| E2E | Playwright | `tests/e2e/` | o app de verdade no navegador, só fluxos críticos |

### Regras para escrever testes

- Nome no formato `<sujeito> <condição> <resultado esperado>`, por exemplo
  `it("checker accepts factors in any order")`. Estrutura
  Arrange–Act–Assert.
- **Determinismo.** Toda aleatoriedade vem do RNG com seed de `src/core/`, e
  todo tempo vem do relógio injetado. Nos testes, use uma seed fixa e um
  relógio falso (`vi.useFakeTimers()` nos componentes). Um teste que passa
  às vezes é um bug: corrija a causa, não tente de novo.
- **Pureza verificada.** Um teste (`tests/purity.test.ts`) falha se
  `Math.random`, `Date.now`, `performance.now` ou `new Date()` aparecerem
  em `src/` fora de `src/core/rng.ts` e `src/core/clock.ts`.
- **Todo gerador** tem um teste de propriedade. Para muitas seeds e cada
  nível, ele verifica três coisas:
  1. a resposta canônica é aceita;
  2. o problema respeita os limites do nível (faixas, raízes inteiras,
     divisão exata);
  3. a mesma seed gera o mesmo problema.
- **Todo verificador de resposta** tem uma tabela de casos que inclui:
  - formas equivalentes aceitas (ordem dos fatores, `^2` contra fator
    repetido, sinais);
  - quase-acertos rejeitados (sinal trocado, fator faltando, polinômio
    original sem fatorar).
- **Matemática** tem propriedades algébricas. Exemplos:
  - `parse(format(p))` é igual a `p`;
  - `expand` do produto dos fatores sorteados é igual ao polinômio exibido;
  - a soma e o produto de polinômios são comutativos.
- Teste pelo comportamento público, não por detalhes internos.
- **Nunca enfraqueça um teste para ele passar.** Isso inclui trocar o valor
  esperado, afrouxar uma asserção, apagar um caso, adicionar `.skip` ou
  reduzir o número de casos de propriedade. Se o teste estiver errado,
  explique no *Log* da task e corrija em commit próprio, antes da mudança
  de código.
- `.only` e `.skip` nunca são commitados: `npm run check` falha com eles.

### Testes de regressão

Todo bug corrigido ganha um teste de regressão escrito **antes** da
correção. Isso vale para bugs achados ao usar o app, por um teste de
propriedade, em revisão ou durante outra task. Um bug sem task ganha uma
nota nova em `docs/tasks/` (para ter um `<ID>`) e a branch `fix/<slug>`.

1. **Reproduza.** Todo problema carrega a `seed` e os parâmetros que o
   geraram, e a tela de resultado os mostra. Para bugs de sessão ou de
   tela, anote a sequência de teclas e o momento em que o bug aparece.
2. **Reduza ao mínimo.**
   - Falha de propriedade: use o contraexemplo reduzido que o fast-check
     imprime.
   - Bug em verificador ou parser: guarde o **problema literal** (os
     coeficientes, o texto digitado), não só a seed. Assim uma mudança
     futura no gerador não invalida o teste.
   - Use a seed sozinha só quando o bug estiver no próprio gerador.
3. **Escreva o teste.** Crie `tests/regressions/<ID>-<slug>.test.ts` com
   `describe("regression <ID> <slug>")`. O arquivo começa com um comentário
   que descreve o bug em uma frase e diz o que deveria acontecer. Os dados
   ficam inline no teste.
   - Bug que só aparece na tela: teste de componente com relógio falso.
   - Bug que só aparece no app rodando: caso Playwright em
     `tests/e2e/regression-<ID>-<slug>.spec.ts`.
4. **Confirme que falha** pelo motivo do bug e commite vermelho:
   `test(<ID>): add regression test for <bug>`.
5. **Corrija** no passo de comportamento: `fix(<ID>): <correção>`.
6. **Registre** no *Log* da task: o bug, a causa e o nome do teste.

Testes de regressão **nunca são apagados nem afrouxados**. Se uma mudança de
formato quebrar os dados de um deles, migre os dados e mantenha o teste.

### Quality gates

`npm run check` é o comando único. Ele é criado na T01 e roda, em ordem:

| Gate | Comando | Precisa |
|------|---------|---------|
| Tipos | `tsc --noEmit` | zero erros, `strict` ligado |
| Lint | `eslint .` | zero avisos |
| Formato | `prettier --check .` | sem diff |
| Testes | `vitest run` | tudo passa, incluindo propriedade e regressões; falha com `.only`/`.skip` |
| Build | `vite build` | compila |

Fora do `check`:

- `npm run test:e2e` roda o Playwright, antes de pedir review em tasks que
  mexem em `src/ui/`.
- `npm run test:fuzz` roda os testes de propriedade com muito mais casos
  (`FC_NUM_RUNS=20000`).
- `npm run coverage` usa limiares por pasta no `vite.config.ts` (bloco
  `test.coverage.thresholds`). A cobertura só sobe: quando subir, atualize o limiar; baixar exige um ADR.

### Definition of Done

- [ ] Todo `AC-n` tem pelo menos um teste passando.
- [ ] Todo bug corrigido tem um teste em `tests/regressions/`, commitado
      vermelho antes da correção.
- [ ] Todo gerador novo tem seu teste de propriedade.
- [ ] `npm run check` verde no último commit da branch.
- [ ] A cobertura não caiu.
- [ ] Decisões novas de arquitetura registradas como ADRs.
- [ ] Um commit por passo, seguindo *Commits*.
- [ ] Nota da task com status `review` e *Log* preenchido.

## Commits

Conventional Commits, com o id da task como escopo e um commit por passo do
fluxo:

```
<type>(<ID>): <resumo no imperativo, até 72 caracteres>

<opcional: o quê e por quê, quebrado em 72>

Refs: docs/tasks/<ID> <Título>.md
```

- Tipos: `docs` (spec, docs), `test` (testes, regressão), `feat` (modelos,
  comportamento), `fix` (correção de bug), `refactor`/`chore` (qualidade),
  `revert` (rollback).
- Branches: `task/<ID>-<slug>` e `fix/<slug>`. Integre na `main` com
  `git merge --no-ff`.
- **Autoria: os commits são só do usuário (o git user configurado).** Nunca
  adicione `Co-Authored-By`, "Generated with" ou qualquer menção a IA ou
  agente em commits, branches, PRs ou docs. Não use `--author` nem trailers.
- Nunca reescreva o histórico da `main`: sem force-push e sem squash.

## Decisões

Decisões de arquitetura são ADRs em `docs/decisions/`, feitos a partir de
`docs/templates/ADR.md`. O conjunto é um log **append-only**:

- Um ADR `accepted` nunca tem *Context*, *Decision* ou *Consequences*
  reescritos. Só mudam o `status` e os campos `superseded_by`/`reverted_by`.
- Mudar uma decisão é escrever um ADR novo com `amends`, `supersedes` ou
  `reverts` apontando para o antigo. Um rollback é um ADR `kind: rollback`
  junto com um commit `revert(...)`.
- Ids: `ADR-NNNN` para as decisões de fundação, `ADR-<task>-<n>` para as
  que nascem dentro de uma task.
- Status: `proposed` → `accepted` → (`superseded` | `reverted`).
