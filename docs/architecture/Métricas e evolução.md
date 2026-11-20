---
tags: [architecture]
status: proposed
tasks: ["[[T22 Registro detalhado do treino]]", "[[T23 Painel de evolução]]", "[[T24 Treino adaptativo]]"]
---

# Métricas e evolução

Pesquisa de 2026-11-20 sobre como medir a evolução de quem treina no popis
e como transformar a medida em uma sugestão do que treinar. Cada método
abaixo vem com a fonte, o que ele diz, o limite dele e como entra no app.

## O que o app guarda hoje

| Treino | Guardado | Falta |
|---|---|---|
| Cálculo e CP (`popis.history.v1`) | cada tentativa: `skill`, resultado, tempo, correções | as sessões antigas são descartadas depois de 200 |
| Revisar | derivado do histórico (erros e lentos, `SLOW_FACTOR`) | quando revisar de novo |
| Digitação de código | por rodada: wpm, precisão, erros | tempo por tecla, quais teclas erram |
| Texto | por rodada: wpm, raw, precisão, caracteres | tempo por tecla, palavras lentas |
| Vim Movimento | por rodada: alvos, pulados, eficiência média | cada alvo: comandos usados, comandos ótimos, tempo |
| Vim Edição | por rodada | cada edição e o tipo dela |

Com isso dá para fazer a curva por habilidade só no cálculo. Nos outros
treinos falta dado por item, e o limite de 200 apaga o começo da curva.

## Métodos

### 1. Curva de aprendizado (lei da prática)

O tempo e o erro caem rápido no começo e devagar depois. Uma função
potência (Newell e Rosenbloom, 1981) ou uma exponencial (Heathcote et
al., 2000) descreve bem essa queda. Uma análise de 2015 com os dados do
Lumosity achou que as médias seguem uma potência suave. Quando a
pessoa usa estratégias diferentes (por exemplo, contar nos dedos ou
lembrar o resultado), uma curva por estratégia descreve melhor que uma
só (Delaney et al., 1998).

**No app:**
- ajustar, por item e configuração, `desempenho = a − b·n^(−c)` (n = rodada)
  por mínimos quadrados em escala log;
- mostrar o ritmo de melhora e o teto estimado (`a`);
- marcar **platô** quando a inclinação das últimas 10 rodadas não é
  positiva (inclinação de Theil–Sen, robusta a uma rodada ruim);
- com menos de 8 rodadas, mostrar só os pontos, sem ajuste.

### 2. Curva por habilidade (componentes de conhecimento)

O DataShop da CMU mede a taxa de erro por **oportunidade** de praticar
cada componente de conhecimento (KC). O modelo de fatores aditivos (AFM)
prevê essa curva. Uma curva que não desce indica um KC mal definido ou
uma habilidade que não está sendo aprendida. O PFA, que conta acertos e
erros separadamente, prevê melhor que o AFM.

**No app:**
- o KC é o `skill` do problema (`arithmetic.mul`, `cp.floor-div`…), o
  comando do Vim (`f`, `ci(`, `.`) e o par de letras na digitação;
- para cada KC, mostrar a taxa de erro e a mediana do tempo por
  oportunidade (1ª, 2ª, … vez);
- um KC cuja curva não cai depois de 20 oportunidades vira sugestão de
  treino.

### 3. Velocidade e precisão juntas

Medir só a velocidade premia quem chuta, e medir só a precisão premia
quem vai devagar. Quatro medidas combinam as duas:
- **IES** (tempo médio dos acertos ÷ taxa de acerto) só vale com pouco
  erro;
- **RCS** (acertos por segundo) tem os mesmos limites;
- **LISAS** se mostrou válida;
- **BIS** (diferença das notas z de tempo e de acerto) é a única pouco
  sensível à troca entre velocidade e precisão (Liesefeld e Janczyk,
  2019; Dang e Janczyk).

**No app:**
- a medida principal de cada rodada continua sendo **acertos por minuto**
  (como no Zetamac e na medição de fluência em matemática), sempre ao
  lado da **precisão**;
- para comparar KCs entre si e ordenar os mais fracos, usar o **BIS**
  calculado sobre o histórico da própria pessoa;
- não mostrar o IES.

### 4. Taxa de melhora semanal (medição de progresso)

A medição baseada no currículo (CBM) usa provas curtas cronometradas, o
mesmo formato do popis. Ela acompanha a **inclinação** semanal (a taxa
de melhora) e fixa a meta como `base + taxa × semanas`. Uma metanálise
de fluência em fatos matemáticos achou ganho médio de cerca de 1,6
dígitos corretos por minuto a cada sessão de intervenção. As normas de
matemática ainda são fracas.

**No app:**
- inclinação das últimas 4 semanas por item ("+1,2 acertos/min por
  semana");
- meta opcional definida pela pessoa;
- a linha da meta aparece no gráfico.

Não use normas externas como régua.

### 5. Automatização (coeficiente de variação)

Segalowitz separa dois efeitos: só acelerar baixa a média e o desvio
juntos, e o CV (desvio ÷ média do tempo) fica igual; **automatizar**
baixa o desvio mais que a média, e o CV cai. O índice é discutido: o
desvio e a média andam juntos (Wagenmakers e Brown, 2007), e houve
replicação parcial.

**No app:** mostrar o CV dos tempos de acerto por KC como sinal
secundário ("estável" ou "irregular"). Ele nunca é a medida principal.

### 6. Dificuldade adaptativa (Elo)

Pelánek (2016) trata cada resposta como uma partida entre a pessoa e o
item, o que estima a habilidade e a dificuldade ao mesmo tempo. Esse
modelo já roda em sistemas grandes de prática (fatos de geografia,
matemática com o Math Garden, de Klinkenberg et al., 2011). Ele é
simples e robusto. Um estudo de 2025 mostra que, em simulação, as
estimativas têm viés e variância que dependem do contexto. Por isso,
use o Elo para escolher a dificuldade, não como nota absoluta.

**No app:**
- um Elo por KC e por nível de dificuldade do gerador;
- a resposta conta como vitória se for certa e dentro do tempo-alvo do
  KC;
- o treino adaptativo sobe ou desce o nível para manter a chance prevista
  de acerto perto de 85%.

### 7. Regra dos 85%

Wilson et al. (2019, *Nature Communications*) mostram que, para
aprendizes por gradiente em classificação binária, o aprendizado mais
rápido acontece com cerca de 15,87% de erro, e há sinal em estudos com
animais. Os próprios autores avisam que a regra vale para tarefas
simples de certo ou errado, como a aprendizagem perceptual, e não para
notas escolares.

**No app:** é o alvo do treino adaptativo e da prévia automática da
T21. É um padrão ajustável, não uma lei: a pessoa pode escolher outro
alvo.

### 8. Repetição espaçada (FSRS)

O FSRS (Ye, 2022; padrão no Anki desde a versão 23.10) modela cada
cartão com três números:
- **estabilidade:** quanto tempo até a chance de lembrar cair para 90%;
- **dificuldade;**
- **chance de lembrar agora:** `R(t) = (1 + 19/81 · t/S)^−0,5`.

Ele agenda a próxima revisão para quando `R` chega à retenção desejada.

**No app:**
- o Revisar (T06) passa a agendar cada problema errado ou lento com o
  FSRS, com nota 1–4 derivada do resultado (errou, acertou devagar,
  acertou, acertou rápido);
- os cartões são os problemas literais, como já é hoje (ADR-T06-1);
- o mesmo vale para os comandos de Vim que a pessoa erra.

### 9. Intercalar ou treinar em bloco

Na metanálise de Brunmair e Richter (2019), intercalar teve efeito médio
moderado (g ≈ 0,42). O efeito foi forte em material visual e duvidoso
em matemática, e intercalar pode atrapalhar com texto e palavras.

**No app:** o "Treino do dia" intercala os KCs fracos do mesmo treino,
mas o modo em bloco continua sendo o padrão de cada item. O painel compara
os dois pelo ganho real da própria pessoa, sem prometer o efeito.

### 10. Prática deliberada: um limite honesto

A prática deliberada (Ericsson) pede meta específica, feedback imediato e
foco nas fraquezas. Nas metanálises de Macnamara (2014, 2016), ela explica
uma parte real, mas modesta, do desempenho (26% em jogos, 18% em
esportes), e a definição é discutida.

**No app:** as recomendações apontam a fraqueza e dão feedback imediato,
mas o texto não promete resultado ("treinar X deve ajudar", nunca
"vai melhorar Y%").

### 11. Digitação por tecla

O estudo de 136 milhões de teclas (Dhakal et al., CHI 2018) mostrou três
coisas:
- quem digita rápido erra menos;
- os pares de letras feitos com mãos ou dedos diferentes predizem a
  velocidade melhor que as repetições de letra;
- os mais rápidos usam *rollover* (apertam a próxima tecla antes de soltar
  a anterior) em 40–70% das teclas.

O intervalo entre teclas é a diferença entre os tempos de duas teclas
apertadas.

**No app:**
- guardar o intervalo entre teclas e o erro por caractere;
- mostrar os pares de letras mais lentos e os caracteres com mais erro,
  separando os símbolos de código (`{`, `;`, `->`);
- o treino sugerido monta trechos com esses pares.

## Como isso vira cards

- [[T22 Registro detalhado do treino]]: guarda os dados que faltam (por
  alvo, por tecla), sem o limite de 200, com exportação.
- [[T23 Painel de evolução]]: curvas, platô, taxa semanal, KCs fracos
  (métodos 1–5 e 11).
- [[T24 Treino adaptativo]]: Elo e 85%, FSRS no Revisar, "Treino do dia"
  e as recomendações (métodos 6–10).

## Fontes

- Newell e Rosenbloom (1981), lei da prática:
  <https://en.wikipedia.org/wiki/Power_law_of_practice>
- Delaney, Reder et al. (1998), curvas por estratégia:
  <https://www.cmu.edu/dietrich/psychology/memorylab/publications/98_pd_lmr_js_fr.pdf>
- Curvas de aprendizado em dados do Lumosity (Psychonomic Bulletin &
  Review): <https://link.springer.com/article/10.3758/s13423-015-0811-x>
- DataShop, curvas por KC e AFM: <https://pslcdatashop.web.cmu.edu/about/>;
  comparação de AFM e PFA:
  <https://jedm.educationaldatamining.org/index.php/JEDM/article/download/316/95>
- Medidas de velocidade e precisão (BIS, LISAS, IES, RCS):
  <https://link.springer.com/10.3758/s13428-018-1076-x>,
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC7977027>
- CBM de matemática e taxa de melhora:
  <https://cdn.vanderbilt.edu/vu-my/wp-content/uploads/sites/270/2011/09/14093115/IA.Math-CBM.pdf>,
  <https://www.readingrockets.org/article/what-scientifically-based-research-progress-monitoring>
- Coeficiente de variação e automatização:
  <https://www.cambridge.org/core/journals/applied-psycholinguistics/article/automatization-in-second-language-acquisition-what-does-the-coefficient-of-variation-tell-us/554D00B8D979BD1CFF17774087D14326>
- Elo em sistemas educacionais (Pelánek, 2016):
  <https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf>; prática
  adaptativa de fatos: <https://www.fi.muni.cz/~xpelanek/publications/umuai-adaptive-practice.pdf>
- Regra dos 85% (Wilson et al., 2019):
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC6831579>
- FSRS: <https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm>,
  <https://borretti.me/article/implementing-fsrs-in-100-lines>
- Intercalar (Brunmair e Richter, 2019):
  <https://pubmed.ncbi.nlm.nih.gov/31556629/>
- Exemplos resolvidos e retirada da ajuda (Salden et al., 2010):
  <https://link.springer.com/doi/10.1007/s11251-009-9107-8>;
  <https://en.wikipedia.org/wiki/Worked-example_effect>
- Prática deliberada (Macnamara et al.):
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC6824411>
- 136 milhões de teclas (Dhakal et al., 2018):
  <https://userinterfaces.aalto.fi/136Mkeystrokes/>
