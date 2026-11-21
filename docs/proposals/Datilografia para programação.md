---
title: Datilografia para programação
date: 2026-11-21
status: awaiting-verdicts   # só falta a D1
tags: [proposal]
---

# Datilografia para programação

O que se pede ao dono: decidir quais ideias viram tasks para **aprender a
digitar** e **digitar mais rápido**, com foco em código. Cada ideia parte
de um método com base em pesquisa e se apoia no que o app já tem.
O minijudge foi descartado (2026-11-21) e fica para outro projeto. A
ideia D6 cobre parte do mesmo desejo, digitar rápido uma solução
conhecida, sem executar código.

## O que já existe

- **Código** ([[T10 Digitação de código]]): 26 trechos fixos de C++ e
  Python, com auto-indent. Com tão poucos trechos, a pessoa acaba
  decorando o texto.
- **Texto** ([[T12 Digitação de texto]]): palavras comuns ou frases, no
  estilo Monkeytype, com erros por palavra.
- **Registro por tecla** ([[T22 Registro detalhado do treino]],
  `src/stats/keytrace.ts`): guarda o instante, o caractere esperado, o
  digitado e se acertou. Mas guarda só as teclas que **inserem**
  caractere: Backspace, keydown e keyup ficam de fora.
- **Evolução** ([[T23 Painel de evolução]]): mostra os pares de letras
  mais lentos e os caracteres com mais erro, separando os símbolos de
  código. **Nenhum treino usa esses dados ainda**, embora o método 11 de
  [[Métricas e evolução]] já preveja isso.
- **Treino adaptativo** ([[T24 Treino adaptativo]]): Elo e a regra dos
  85%, FSRS e Treino do dia.
- **Aprender com retirada da ajuda** ([[T20 Vim - Aprender do básico ao avançado]]).

## Base em pesquisa

O que cada fonte mostra, e quão forte é a evidência.

1. **Mapeamento fixo vale mais que dez dedos.** Feit, Weir e Oulasvirta
   (CHI 2016) filmaram 30 pessoas digitando. As autodidatas, com cerca
   de 6 dedos, chegaram à mesma velocidade e precisão de quem fez curso.
   O que prediz velocidade é cada tecla ser sempre apertada pelo mesmo
   dedo, preparar as próximas teclas antes da hora e mexer pouco a mão.
   *Evidência:* estudo com captura de movimento, amostra pequena.
2. **Os mais rápidos sobrepõem teclas e erram menos.** Dhakal et al.
   (CHI 2018) analisaram 136 milhões de teclas de 168 mil pessoas:
   - os mais rápidos usam *rollover* (apertam a próxima tecla antes
     de soltar a anterior) em 40–70% das teclas;
   - os pares de letras com alternância de mão ou de dedo predizem a
     velocidade;
   - quem é rápido erra menos.

   *Evidência:* correlacional, sem treino controlado.
3. **Dois laços: palavra e tecla.** Logan e Crump (2011) descrevem a
   digitação em dois níveis. O laço externo entrega palavras, e o
   interno dispara as teclas da palavra em paralelo. O laço externo não
   sabe onde ficam as teclas, e por isso quem digita bem não sabe dizer
   onde fica cada tecla (Liu, Crump e Logan, 2010). Ganhar velocidade é
   transformar sequências de teclas em **pedaços** (*chunks*)
   (Yamaguchi e Logan, 2016). *Evidência:* experimental e consistente.
4. **Ler adiante.** Os olhos ficam alguns caracteres à frente dos dedos,
   cerca de 5. Limitar o texto visível adiante derruba a velocidade
   (Salthouse, 1986). *Evidência:* clássica e replicada.
5. **Sessões curtas e espaçadas.** Baddeley e Longman (1978) treinaram
   carteiros para digitar e compararam sessões de 1 h e de 2 h, uma ou
   duas por dia. Depois das mesmas 60 h, quem fez **1 h por dia** digitava
   melhor, mesmo **sentindo** que progredia mais devagar. O sono
   consolida sequências motoras (Walker et al., 2002), embora
   Nettersheim et al. (2015) argumentem que ele estabiliza o desempenho
   em vez de melhorá-lo. *Evidência:* forte para o espaçamento; o efeito
   do sono é discutido.
6. **Misturar retém mais que repetir em bloco.** No efeito de
   interferência contextual (Shea e Morgan, 1979), treinar tarefas
   intercaladas é mais lento na hora e retém mais depois de 10 dias. O
   efeito não aparece em todas as tarefas. *Evidência:* forte em
   laboratório, variável no campo.
7. **Por que quem aprende a digitar sem olhar desiste.** Na transição do
   curso para o uso diário, o método novo é mais lento no começo, e a
   pessoa volta ao jeito antigo porque ele rende mais na hora
   (*melioration*). Mudar o reforço durante a transição ajudou a manter
   o método novo (Yechiam, Erev, Yehene e Gopher, 2003). *Evidência:*
   experimento com 22 pessoas.
8. **Código não é prosa.** Alunos de CS1 digitam os mesmos pares de
   letras mais devagar em código do que em texto, e corrigem os próprios
   erros mais devagar também. Os pares frequentes em código ficam mais
   rápidos com a prática de código (Edwards, Leinonen et al., ICER 2020).
   *Evidência:* observacional, com duas turmas.
9. **Regras de prática sem estudo controlado:** "precisão de 95% antes
   de acelerar", "empurrar 10% acima do ritmo" e liberar letras por
   confiança (keybr). São usadas pelos sites de treino, mas não achei
   estudo controlado. Aqui elas entram só como **padrão ajustável**,
   nunca como promessa.

## Limites que toda ideia respeita

- Tudo fora de `src/ui/` é TypeScript puro, com seed e relógio injetado.
- As cores vêm dos tokens do tema (ADR-0001). Um teclado na tela com
  cores por dedo precisa de tokens novos e de um ADR.
- Os treinos de digitação de código não aparecem no celular (T10, AC-8).
- As recomendações nunca prometem resultado
  ([[Métricas e evolução]], método 10).
- O teclado do dono é ABNT2 (T10, AC-6). Nele, os símbolos de código
  ficam em lugares diferentes do layout US, e `'` `"` `~` `^` são teclas
  mortas.

## How the ideas are scored

- **Value** 1–5 for the person using the feature.
- **Cost** = size (S 1, M 2, L 4) + risk to the project's goal (low 0,
  medium 1, high 2).
- **Score** = value ÷ cost.

## Ranking

The owner fills *Verdict* with `accepted`, `later` or `rejected`.

| #   | Idea                                   | Value | Size | Risk   | Cost | Score | Verdict |
| --- | -------------------------------------- | ----- | ---- | ------ | ---- | ----- | ------- |
| 1   | D5 Bloco curto e intercalado no dia    | 4     | S    | low    | 1    | 4.00  | accepted |
| 2   | D4 Ritmo-alvo adaptativo               | 3     | S    | low    | 1    | 3.00  | accepted |
| 3   | D2 Treino dos pontos fracos (n-gramas) | 5     | M    | low    | 2    | 2.50  | accepted |
| 4   | D6 Digitar de memória (template e lib) | 5     | M    | low    | 2    | 2.50  | accepted |
| 5   | D3 Código gerado e rajadas de idiomas  | 4     | M    | low    | 2    | 2.00  | accepted |
| 6   | D8 Prévia restrita (ler adiante)       | 2     | S    | low    | 1    | 2.00  | later   |
| 7   | D7 Métricas finas de teclado           | 3     | M    | medium | 3    | 1.00  | later   |
| 8   | D1 Aprender a digitar sem olhar        | 4     | L    | medium | 5    | 0.80  | pending |

## Recommended short list

**D2, D6, D3, D5 e D4.**
- **D2** fecha o ciclo medir → treinar: a Evolução já aponta os pares
  lentos, mas nada treina com eles.
- **D6** é a mais ligada a programação competitiva: no ICPC, o time
  digita o template e a biblioteca no começo da prova.
- **D3** acaba com a decoreba dos 26 trechos.
- **D5** e **D4** são baratas e usam o que a T24 já tem.

As tasks:

| Ideia | Task |
| ----- | ---- |
| D4 | [[T29 Digitação - ritmo-alvo]] |
| D2 | [[T30 Digitação - pontos fracos]] |
| D3 | [[T31 Digitação - código gerado e rajadas]] |
| D6 | [[T32 Digitação - de memória]] |
| D5 | [[T33 Digitação - bloco no Treino do dia]] |
| D6 e D3 (dados) | [[T34 Digitação - trechos do repositório de CP]] |

## Respostas do dono (2026-11-21)

1. **Digita sem olhar, mas às vezes troca o dedo de uma tecla.** Isso é
   justamente o que Feit et al. (2016) apontam como freio: o mapeamento
   ambíguo. Por isso a D1 continua `pending`, reduzida (ver D1).
2. **Layout: US.** Nada de ABNT2 nos treinos de símbolos nem no teclado
   na tela.
3. **D6:** a biblioteca padrão são os trechos do dono, e qualquer
   pessoa pode fazer o upload dos próprios. É possível: o arquivo é
   lido no próprio navegador (`<input type="file">` ou arrastar e
   soltar), sem servidor, e fica no armazenamento local, com
   exportação e importação (T22). Duas limitações: os trechos enviados
   ficam só naquele navegador, e os trechos padrão do dono ficam
   públicos, porque o site e o repositório são públicos.
4. **D4:** mantém a regra dos 85% que o app já usa (ADR-T24-1).
5. **D3:** o código gerado substitui o corpus fixo **na tela Código**.
   O corpus continua no repositório, porque é o texto dos treinos de Vim
   (T13–T16).

## Pergunta em aberto

- **D1 reduzida:** a D1 vira um mapa de dedos do layout US na tela, mais
  um treino das teclas de fronteira entre dedos (`t g b y h n 5 6`, os
  símbolos da direita) e da camada de números e símbolos. **Limite
  honesto:** o navegador não vê qual dedo apertou a tecla. O app só
  mostra o dedo certo e treina a tecla de propósito, e a variação do
  tempo por tecla é, no máximo, um indício de dedo trocado. Vira task?

## Ideas

## Aprender

### D1 Aprender a digitar sem olhar

- **Value** 4. Para quem ainda olha para o teclado, é a base de tudo.
  Para quem já digita sem olhar, só a camada de símbolos importa.
- **Problem** Ninguém aprende a posição dos símbolos de código de
  propósito. Eles são a parte lenta do código (Edwards et al., 2020).
- **In use** Um item "Aprender" na pasta Digitação, no formato da T20:
  - **unidades:**
    1. linha de base;
    2. linha de cima;
    3. linha de baixo;
    4. números;
    5. símbolos de código, por frequência em C++ (`( ) ; { } = [ ] < > & | _ " ' + - * / ! % # : , .`);
    6. Shift, `camelCase` e `snake_case`;
  - **liberação por domínio:** uma tecla nova entra quando as atuais
    atingem a velocidade-alvo com ≥ 95% de precisão, padrão ajustável
    (regra do keybr, sem estudo controlado);
  - **texto:** pseudo-palavras e trechos gerados só com as teclas
    liberadas;
  - **teclado na tela** com o dedo de cada tecla, para olhar para a
    tela e não para as mãos;
  - **comparação com a própria linha de base**, não com o WPM antigo,
    para atravessar a fase mais lenta sem desistir (Yechiam et al.,
    2003).
- **Size** L: tabelas de layout (ABNT2 e US), gerador de pseudo-palavras
  por seed, regra de liberação, tela com teclado e lições.
- **Cost** Start-up: nenhum; frame time: o teclado na tela é SVG
  estático; binary: as tabelas de layout, poucos KB.
- **Risk** medium: as teclas mortas do ABNT2 e o layout que a pessoa usa
  não aparecem de forma confiável no navegador
  (`navigator.keyboard.getLayoutMap` só existe no Chrome), então o
  layout é escolhido à mão.
- **Extends** O Aprender da T20 e o método 11 de [[Métricas e evolução]].
- **Dependency** Nenhuma. Precisa de um ADR para os tokens de cor por
  dedo.
- **Budgets** Nenhum em risco.

## Velocidade

### D2 Treino dos pontos fracos (n-gramas)

- **Value** 5. A Evolução já mostra os pares de letras lentos e os
  caracteres com erro, mas nada treina com eles.
- **Problem** Treinar texto aleatório gasta a maior parte do tempo no
  que já é rápido.
- **In use** Um modo "Pontos fracos" no Texto e no Código:
  - pega os 3–5 bigramas ou trigramas mais lentos e os caracteres com
    mais erro do registro (T22 e T23);
  - gera palavras, identificadores e trechos curtos que os contêm, por
    seed;
  - repete até cada n-grama chegar ao ritmo-alvo, e então troca;
  - o resultado mostra o tempo de cada n-grama antes e depois.
  Os pares com alternância de mão ou de dedo são os que mais predizem
  velocidade (Dhakal et al., 2018).
- **Size** M: seleção dos n-gramas a partir dos eventos, gerador de
  texto com garantia de conter o n-grama e tela, que reaproveita o
  motor do Texto.
- **Cost** Start-up: ler os eventos, como a Evolução já faz; frame
  time: nenhum; binary: um dicionário de palavras de código.
- **Risk** low.
- **Extends** O método 11 de [[Métricas e evolução]] ("o treino sugerido
  monta trechos com esses pares").
- **Dependency** Nenhuma.
- **Budgets** Nenhum.

### D3 Código gerado e rajadas de idiomas

- **Value** 4. Com 26 trechos, a pessoa decora o texto em vez de treinar
  a mão. Os idiomas frequentes viram pedaços automáticos (Logan e Crump;
  Yamaguchi e Logan).
- **Problem** O Código mede a memória do trecho tanto quanto a
  digitação.
- **In use**
  - **Código gerado:** uma gramática de idiomas de programação
    competitiva (`for`, leitura, `vector<long long> pre(n + 1);`, `sort`
    com lambda, `lower_bound`, constantes como `1e9 + 7` e `998244353`)
    com identificadores e números sorteados, gerada por seed e com a
    mesma garantia de formato do corpus da T10;
  - **Rajada:** um idioma curto repetido 5 vezes seguidas, por exemplo
    `for (int i = 0; i < n; i++)`, até virar um pedaço; o tempo da
    primeira e da última repetição aparecem lado a lado.
- **Size** M: gramática, propriedades (o código compila de verdade,
  conferido por um oráculo com `g++ -fsyntax-only` fora do `check`, no
  molde do `vim:oracle`) e opções na tela do Código.
- **Cost** Start-up: nenhum; frame time: nenhum; binary: a gramática,
  poucos KB.
- **Risk** low.
- **Extends** T10 (o *Out of scope* "trechos gerados por templates").
- **Dependency** Nenhuma.
- **Budgets** Nenhum.

### D4 Ritmo-alvo adaptativo

- **Value** 3. Dá um alvo concreto para cada rodada. A evidência a favor
  de empurrar o ritmo é só de prática (fonte 9).
- **Problem** Sem alvo, a pessoa digita no ritmo confortável e estaciona.
- **In use**
  - um cursor fantasma anda na velocidade-alvo;
  - o alvo se ajusta entre as rodadas pela regra dos 85% (Elo da T24)
    ou por "+10% sobre a mediana", conforme a decisão 4;
  - abaixo de 95% de precisão, o alvo não sobe.
- **Size** S: o cursor fantasma e a regra de ajuste; o resto vem da T24.
- **Cost** Frame time: um elemento animado por CSS.
- **Risk** low.
- **Extends** O AC-2 da T24 (nível automático).
- **Dependency** Nenhuma.
- **Budgets** Nenhum.

### D5 Bloco curto e intercalado no dia

- **Value** 4. É o método com a melhor evidência: sessões curtas e
  espaçadas (Baddeley e Longman, 1978) e prática intercalada (Shea e
  Morgan, 1979).
- **Problem** A tendência é treinar digitação em blocos longos e
  esporádicos, que rendem menos do que parecem.
- **In use**
  - o Treino do dia ganha um bloco de digitação de 5 min, ajustável,
    que alterna pontos fracos (D2), rajadas (D3) e texto;
  - o texto da tela avisa que sessão curta parece render menos, mas
    rende mais, sem prometer número.
- **Size** S: um tipo novo de item no Treino do dia.
- **Cost** Nenhum.
- **Risk** low.
- **Extends** O AC-4 da T24 (Treino do dia).
- **Dependency** Rende mais com a D2 e a D3, mas funciona só com o Texto
  e o Código atuais.
- **Budgets** Nenhum.

### D6 Digitar de memória (template e biblioteca)

- **Value** 5. No ICPC, o time digita o template e a biblioteca (DSU,
  segtree, Dijkstra) no começo da prova. Fora dela, escrever rápido uma
  busca binária conhecida é exatamente o que o minijudge queria treinar.
- **Problem** Saber o algoritmo não é o mesmo que digitá-lo de memória,
  sem erro e rápido.
- **In use** Um item "De memória" na pasta Digitação:
  - os trechos vêm da decisão 3 (colados pela pessoa ou curados);
  - **retirada da ajuda**, como na T20: (1) o trecho inteiro à vista;
    (2) só a primeira palavra de cada linha; (3) tela em branco;
  - **correção por tokens:** espaços, quebras de linha e o nome dos
    identificadores não importam. `int lo = 0, hi = n;` vale por
    `int l=0,r=n;`, desde que a troca de nomes seja consistente (uma
    renomeação bijetiva);
  - cada trecho é um cartão do FSRS (T24) e volta no dia certo;
  - a métrica é o tempo até o texto ficar certo e as teclas gastas,
    contando Backspace.

  **Limite honesto:** a correção ainda prevê uma estrutura (a ordem dos
  tokens). Não é um juiz. Ela aceita nomes e espaços diferentes, mas não
  um algoritmo diferente.
- **Size** M: tokenizador de C++ e Python, comparação com renomeação,
  armazenamento dos trechos com exportação (T22), tela e cartões.
- **Cost** Start-up: nenhum; binary: o tokenizador, pequeno.
- **Risk** low.
- **Extends** O formato de retirada da T20 e o FSRS da T24.
- **Dependency** Nenhuma.
- **Budgets** O `localStorage`: trechos colados contam no orçamento de
  armazenamento da T22.

### D7 Métricas finas de teclado

- **Value** 3. Mede o que os estudos ligam à velocidade, mas medir não é
  treinar.
- **Problem** Hoje não se vê o custo de um erro nem a sobreposição de
  teclas.
- **In use** Novas medidas na Evolução:
  - a taxa de *rollover* (keydown da próxima tecla antes do keyup da
    anterior; Dhakal et al., 2018);
  - o **custo do erro**: o tempo do erro até ele estar corrigido;
  - a consistência (CV do intervalo entre teclas por par);
  - o WPM separado por classe: letras, números e símbolos.
- **Size** M: estender o `keytrace` com Backspace, keydown e keyup, e as
  estatísticas puras.
- **Cost** Frame time: dois listeners a mais por tecla.
- **Risk** medium: com as teclas mortas do ABNT2 e a composição de
  acentos, a ordem e o número dos eventos keydown/keyup mudam de
  navegador para navegador.
- **Extends** T22 e T23.
- **Dependency** Nenhuma.
- **Budgets** O tamanho do registro por tecla (o limite de 90 dias da
  T22).

### D8 Prévia restrita (ler adiante)

- **Value** 2. Treina o olho a ficar à frente dos dedos (Salthouse,
  1986). Não achei estudo que mostre que *treinar* com a prévia
  restrita acelera; ela só mede o quanto a pessoa lê adiante.
- **Problem** Quem lê tecla por tecla não prepara as próximas.
- **In use**
  - uma opção que mostra só as próximas N letras, com N ajustável;
  - um teste que acha o menor N em que a velocidade não cai: o "alcance
    de leitura" da pessoa.
- **Size** S.
- **Cost** Nenhum.
- **Risk** low.
- **Extends** T12.
- **Dependency** Nenhuma.
- **Budgets** Nenhum.

## Fontes

- Feit, Weir e Oulasvirta (CHI 2016), *How We Type*:
  <https://userinterfaces.aalto.fi/how-we-type/resources/HowWeType_CHI16.pdf>;
  resumo: <https://www.aalto.fi/en/news/ten-fingers-not-needed-for-fast-typing>
- Dhakal, Feit, Kristensson e Oulasvirta (CHI 2018), 136 milhões de
  teclas: <https://userinterfaces.aalto.fi/136Mkeystrokes/>,
  <https://www.pokristensson.com/pubs/DhakalEtAlCHI2018.pdf>
- Logan e Crump (2011), controle hierárquico:
  <https://www.crumplab.com/publications/Crump/files/3898/Logan%20and%20Crump%20-%202011%20-%20Hierarchical%20control%20of%20cognitive%20processes%20The%20c.pdf>
- Liu, Crump e Logan (2010), onde ficam as teclas:
  <https://pubmed.ncbi.nlm.nih.gov/20516227/>
- Yamaguchi e Logan, pedaços na digitação:
  <https://repository.essex.ac.uk/26184/1/Yamaguchi_Logan_JEPLMC_AcceptedDraft.pdf>
- Salthouse (1986), aspectos da digitação e prévia:
  <https://uva.theopenscholar.com/vcap/publications/perceptual-cognitive-and-motoric-aspects-transcription-typing>
- Baddeley e Longman (1978), duração e frequência das sessões:
  <https://www.gwern.net/doc/psychology/spaced-repetition/1978-baddeley.pdf>
- Walker et al. (2002), sono e sequência motora:
  <https://pubmed.ncbi.nlm.nih.gov/12123620/>; contraponto de Nettersheim
  et al. (2015): <https://pmc.ncbi.nlm.nih.gov/articles/PMC4412892>
- Shea e Morgan (1979), interferência contextual:
  <https://www.gwern.net/doc/psychology/spaced-repetition/1979-shea.pdf>
- Yechiam, Erev, Yehene e Gopher (2003), *melioration* e digitação sem
  olhar: <https://yeldad.net.technion.ac.il/files/2016/12/type.pdf>
- Edwards, Leinonen et al. (ICER 2020), código contra texto:
  <https://icer2020.acm.org/details/icer-2020-papers/20/Programming-versus-natural-language-on-the-effect-of-context-on-typing-in-CS1>
- keybr, estatística por tecla e liberação de letras:
  <https://www.keybr.com/help>, <https://cdn.jsdelivr.net/gh/aradzie/keybr.com@master/README.md>
