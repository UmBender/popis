/** Languages of the text typing test (T12). */
export type TextLanguage = "pt" | "en";

export const TEXT_LANGUAGES: readonly TextLanguage[] = ["pt", "en"];

export const TEXT_LANGUAGE_LABELS: Readonly<Record<TextLanguage, string>> = {
  pt: "Português",
  en: "Inglês",
};

/** How many of the most frequent words a test draws from. */
export type ListSize = 200 | 1000;

export const LIST_SIZES: readonly ListSize[] = [200, 1000];

/**
 * Common words written for the app (ADR-T12-1), roughly by frequency:
 * lowercase, unique, no spaces and no punctuation.
 */
const PT = `
de a o que e do da em um para é com não uma os no se na por mais as dos como
mas foi ao ele das tem à seu sua ou ser quando muito há nos já está eu
também só pelo pela até isso ela entre era depois sem mesmo aos ter seus
quem nas me esse eles estão você tinha foram essa num nem suas meu às minha
têm numa pelos elas havia seja qual será nós tenho lhe deles essas esses
pelas este fosse dele tu te vocês vos lhes meus minhas teu tua teus tuas
nosso nossa nossos nossas dela delas esta estes estas aquele aquela aqueles
aquelas isto aquilo estou estava estamos estavam estive esteve estivemos
estiveram hei houve houvemos houveram sou somos são fui fomos tenha tive
teve tivemos tiveram ano anos dia dias vez vezes casa tempo vida coisa
coisas homem mulher gente pessoa pessoas mundo país cidade trabalho parte
lugar caso grupo forma governo água problema serviço empresa sistema questão
história família lado ponto filho filha mãe pai nome hora horas mês semana
noite manhã tarde momento maneira mão olho olhos cabeça corpo rua escola
livro palavra porta amigo amiga conta lei poder guerra fim começo final
razão verdade ideia força presidente estado projeto área processo número
programa dinheiro mercado valor preço jogo time carro terra mar sol lua céu
fogo ar luz cor som voz música arte filme festa amor medo paz sorte saúde
morte fome sede frio calor chuva vento árvore flor rio campo praia ilha
porto estrada viagem caminho ponte praça loja banco hospital igreja janela
parede mesa cadeira cama quarto sala cozinha banho roupa sapato comida café
leite pão carne peixe fruta arroz feijão ovo açúcar sal chá vinho cerveja
copo prato garfo faca colher bolso papel caneta lápis carta jornal revista
notícia rádio televisão telefone celular computador internet site página
texto frase letra senha tela teclado bom boa bons boas grande grandes
pequeno pequena novo nova novos novas velho velha primeiro primeira último
última outro outra outros outras mesma mesmos certo certa melhor pior maior
menor alto alta baixo baixa longo longa curto curta forte fraco rico pobre
feliz triste fácil difícil possível importante simples claro escuro quente
cheio vazio livre aberto fechado rápido lento junto sozinho bonito feio
limpo sujo verde azul vermelho amarelo branco preto cinza público social
nacional geral próprio próximo real único inteiro estar fazer dizer ir ver
dar saber querer ficar vir passar dever falar deixar chegar levar começar
achar conhecer pensar viver sair parecer tomar entrar trazer conseguir
sentir encontrar ouvir esperar voltar olhar ganhar perder pagar comer beber
dormir correr andar abrir fechar escrever ler cantar jogar ajudar mudar usar
pedir mostrar acabar continuar contar lembrar entender aprender ensinar
estudar trabalhar comprar vender morar perguntar responder chamar ligar
gostar amar criar cair subir descer nascer morrer crescer partir sorrir
chorar rir ganhou perdeu disse fez veio viu deu quis pôde soube ficou passou
chegou levou começou achou pensou viveu saiu tomou entrou trouxe sentiu
ouviu voltou olhou faz diz vai vem vê dá sabe quer fica passa deve fala
deixa chega leva acha pensa vive sai parece toma entra traz sente ouve
espera volta olha gosta precisa precisar sempre nunca hoje ontem amanhã
agora ainda logo cedo antes aqui ali lá onde aonde longe perto bem mal pouco
tanto quanto quase talvez sim apenas assim então porque porém contudo
entanto embora enquanto durante desde contra sobre sob após perante através
dentro fora acima abaixo cada todo toda todos todas tudo nada algo alguém
ninguém algum alguma alguns algumas nenhum nenhuma vários várias pouca
poucos poucas muita muitos muitas tanta tantos tantas qualquer quais quantos
quantas zero dois duas três quatro cinco seis sete oito nove dez cem mil
milhão metade dobro senhor senhora menino menina criança jovem irmão irmã
avô avó tio tia primo prima marido esposa namorado vizinho professor aluno
médico juiz rei rainha povo exército polícia soldado artista autor leitor
cliente chefe dono equipe clube animal cachorro gato cavalo pássaro boi vaca
porco galinha rato leão aula prova nota exame curso ciência teoria prática
método regra exemplo resultado pesquisa estudo dado dados fato tipo nível
meio centro norte sul leste oeste fundo frente costas topo base linha
círculo quadro lista ordem fila passo salto vista visão sentido sinal marca
imagem foto desenho mapa plano idade sonho desejo vontade esperança alegria
raiva culpa dor prazer gosto cheiro sabor grito silêncio barulho conversa
pergunta resposta dúvida erro acerto sucesso fracasso vitória derrota prêmio
custo lucro troca compra venda dívida taxa imposto salário renda emprego
tarefa reunião encontro acordo contrato decisão escolha opção chance risco
perigo segurança cuidado atenção memória mente alma espírito coração sangue
pele osso dente boca nariz orelha braço perna pé dedo cabelo rosto joelho
ombro peito barriga camisa calça saia vestido chapéu bolsa mala chave caixa
garrafa saco cesta pedra areia barro madeira ferro ouro prata vidro plástico
pano fio corda tinta óleo gás carvão lixo poeira fumaça neve gelo nuvem
estrela planeta espaço natureza floresta mato montanha vale lago fonte onda
costa deserto clima estação verão inverno outono primavera janeiro fevereiro
março abril maio junho julho agosto setembro outubro novembro dezembro
domingo segunda terça quarta quinta sexta sábado feriado férias aniversário
natal madrugada relógio minuto segundo século época passado presente futuro
mensagem aviso recado meta objetivo motivo causa efeito mudança diferença
relação ligação conexão rede entrada saída subida descida ida chegada
partida início direção rumo destino jornada corrida pressa calma paciência
coragem respeito confiança amizade união vizinhança comunidade sociedade
cultura língua idioma sotaque sílaba vogal verbo título capítulo parágrafo
margem coluna canto ponta borda beira medida peso altura largura tamanho
distância velocidade quantidade qualidade soma total média pedaço resto
terço triplo jamais bastante demais menos tão comigo contigo conosco consigo
nela nele neles nelas dessa desse deste desta daquele daquela naquele
naquela nesse nessa neste nesta disso disto daquilo nisso nisto naquilo
direito economia política ação mulheres homens crianças cidades países
lugares partes momentos
`;

const EN = `
the be to of and a in that have i it for not on with he as you do at this
but his by from they we say her she or an will my one all would there their
what so up out if about who get which go me when make can like time no just
him know take people into year your good some could them see other than then
now look only come its over think also back after use two how our work first
well way even new want because any these give day most us is was are were
been has had did said made went got took came saw knew thought told found
gave left felt kept let put seemed asked turned showed tried called brought
began meant set ran held heard stood lost paid sent sat fell met led read
spoke wrote grew built spent won sold drove chose woke wore hit cut shut
hurt cost quit man woman child world life hand part place case week company
system program question government number night point home water room mother
area money story fact month lot right study book eye job word business issue
side kind head house service friend father power hour game line end member
law car city community name president team minute idea kid body information
school face others level office door health person art war history party
result change morning reason research girl guy moment air teacher force
education foot boy age policy process music market sense nation plan college
interest death experience effect class control care field development role
effort rate heart drug show leader light voice wife police mind price report
decision son view relationship town road arm difference value building
action model season society tax director position player record paper space
ground form event official matter center couple site project activity star
table need court oil situation industry figure street image phone data
picture practice piece land product doctor wall patient worker news test
movie north love support technology step baby computer type attention film
tree source organization hair window evidence population truth song return
check fire sister brother bed garden letter river sea sun moon rain snow
wind cloud sky island beach forest mountain hill lake farm animal dog cat
horse bird fish cow pig chicken mouse food bread milk coffee tea egg rice
meat fruit apple orange sugar salt cake dinner lunch breakfast plate cup
glass bottle box bag key coat shirt shoe hat dress pocket clock watch train
bus plane ship boat bike engine wheel bridge station airport hotel shop
store bank church hospital library museum park kitchen bathroom bedroom
floor roof stair corner chair desk lamp mirror paint pen pencil card gift
dance band stage ticket seat crowd fan sport ball goal score race match
coach winner prize bill coin pay sale deal trade loan debt profit budget
task rule wrong lie secret answer problem cause chance risk danger safety
fear hope dream wish joy anger pain pleasure taste smell touch sound noise
silence speech talk call message note sign mark map path trip journey travel
visit move run walk jump climb swim fly drive ride sit stand sleep wake eat
drink cook wash clean build break fix open close start stop begin finish win
lose play rest learn teach write speak listen hear find keep hold carry pull
push throw catch drop pick choose decide agree argue explain describe
remember forget understand believe hate enjoy help ask tell send bring buy
sell spend save owe borrow lend grow happen appear seem become remain stay
leave arrive enter follow lead meet join share offer allow add include
continue serve die kill pass live fall raise reach produce provide create
consider expect accept reduce develop protect prepare improve compare
imagine notice suggest wonder worry laugh smile cry shout sing count measure
cover fill mix try miss wait hurry happy sad angry tired hungry busy free
ready sure true false real full empty dirty hot cold warm cool wet dry soft
hard heavy dark bright quiet loud fast slow quick easy simple clear strange
different same similar special important possible likely certain whole main
major minor local public private social national natural human political
economic large small big little long short high low tall old young early
late recent final next last own great best better worse worst able strong
weak rich poor safe deep wide narrow thick thin round flat sharp sweet sour
bitter fresh red blue green yellow black white brown gray pink purple gold
silver always never often sometimes usually rarely again already still yet
soon later today tonight tomorrow yesterday here everywhere somewhere
nowhere away ahead behind above below under inside outside around through
across along toward against between among within without during before since
until while though although unless whether either neither both each every
few many much more less least enough several such very really quite almost
perhaps maybe probably actually certainly simply finally exactly nearly
together alone instead indeed rather else ever once twice none nothing
something anything everything someone anyone everyone nobody somebody
anybody everybody myself yourself himself herself itself ourselves
themselves mine yours hers ours theirs whose whom where why whatever
whenever wherever however three four five six seven eight nine ten twenty
thirty hundred thousand million half third second dozen monday tuesday
wednesday thursday friday saturday sunday january february march april june
july august september october november december spring summer autumn winter
weekend holiday birthday future past present century decade evening
afternoon midnight noon dawn sunset act ago aid aim amount anyway apart
approach army arrange article artist aside assume attack attempt audience
author available avoid award aware basic battle bear beat beautiful beauty
behavior benefit beyond billion bit blood board born boss bottom brain
branch brief broad camera campaign cancer candidate capital career central
challenge character charge choice citizen civil claim clearly collect color
common complete concern condition conference congress contain content
contract cross
`;

function split(text: string): readonly string[] {
  return text.trim().split(/\s+/);
}

export const WORDS: Readonly<Record<TextLanguage, readonly string[]>> = {
  pt: split(PT),
  en: split(EN),
};

/** The `size` most frequent words of `language`. */
export function wordList(language: TextLanguage, size: ListSize): readonly string[] {
  return WORDS[language].slice(0, size);
}
