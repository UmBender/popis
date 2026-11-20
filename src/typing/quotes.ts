import { createRng } from "../core/rng";
import type { TextLanguage } from "./words";

/** A short text for the quote test, written for the app or a popular proverb. */
export type Quote = {
  readonly id: string;
  readonly language: TextLanguage;
  readonly text: string;
};

function quote(language: TextLanguage, name: string, text: string): Quote {
  return { id: `${language}-${name}`, language, text };
}

/** No author is named, so no one is misquoted (ADR-T12-1). */
export const QUOTES: readonly Quote[] = [
  quote(
    "pt",
    "cafe",
    "O café da manhã esfria rápido quando a conversa é boa, mas ninguém reclama, porque a companhia vale mais do que a temperatura da xícara.",
  ),
  quote(
    "pt",
    "chuva",
    "Choveu a tarde inteira, e as crianças ficaram na janela contando as gotas que escorriam pelo vidro, cada uma torcendo pela sua favorita.",
  ),
  quote(
    "pt",
    "mapa",
    "Um mapa mostra o caminho, mas não conta quantas vezes você vai parar para perguntar a direção a um desconhecido simpático.",
  ),
  quote(
    "pt",
    "agua-mole",
    "Água mole em pedra dura, tanto bate até que fura. A paciência resolve o que a pressa só complica.",
  ),
  quote(
    "pt",
    "feira",
    "Na feira de domingo, o vendedor de frutas grita os preços, a senhora escolhe os tomates um por um e o cachorro espera a sobra do pastel.",
  ),
  quote(
    "pt",
    "trem",
    "O trem saiu atrasado, chegou atrasado e mesmo assim todos desceram sorrindo, porque a viagem tinha uma vista linda da serra.",
  ),
  quote(
    "pt",
    "livro",
    "Quem lê um bom livro antes de dormir viaja para longe sem sair da cama e acorda com vontade de contar a história para alguém.",
  ),
  quote(
    "pt",
    "horta",
    "Plantamos alface, cebolinha e tomate no quintal. Metade virou salada, a outra metade virou almoço dos passarinhos da vizinhança.",
  ),
  quote(
    "pt",
    "quem-espera",
    "Quem espera sempre alcança, dizem os mais velhos, mas eles também lembram que é preciso levantar cedo para não perder o ônibus.",
  ),
  quote(
    "pt",
    "bicicleta",
    "Aprender a andar de bicicleta parece impossível no primeiro dia e óbvio no segundo; o segredo é olhar para frente e continuar pedalando.",
  ),
  quote(
    "pt",
    "receita",
    "A receita pedia duas xícaras de farinha, mas a cozinheira usou a medida do coração, e o bolo saiu torto, alto e perfeito.",
  ),
  quote(
    "pt",
    "praia",
    "No fim da tarde, a praia esvazia, o vento muda de lado e o mar parece conversar baixinho com quem ficou para ver o sol ir embora.",
  ),
  quote(
    "pt",
    "estrada",
    "Toda estrada longa começa com um passo curto. Não adianta olhar só para o fim; o caminho também merece atenção.",
  ),
  quote(
    "pt",
    "relogio",
    "O relógio da sala adianta cinco minutos desde que me lembro, e por isso a família inteira chega sempre na hora certa.",
  ),
  quote(
    "pt",
    "ferreiro",
    "Em casa de ferreiro, o espeto é de pau. O mecânico anda de carro velho e o sapateiro tem o sapato furado.",
  ),
  quote(
    "pt",
    "escola",
    "No primeiro dia de aula, a professora escreveu o próprio nome no quadro e pediu que cada aluno contasse um sonho em voz alta.",
  ),
  quote(
    "pt",
    "chave",
    "Procurei a chave pela casa toda, abri gavetas, levantei almofadas e virei a bolsa do avesso; ela estava na porta, do lado de fora.",
  ),
  quote(
    "pt",
    "amigo",
    "Um amigo de verdade lembra do seu aniversário, devolve o livro emprestado e ainda aparece com bolo quando você está triste.",
  ),
  quote(
    "pt",
    "inverno",
    "Quando o inverno chega, a sopa volta para a mesa, os cobertores saem do armário e todo mundo passa a falar baixo de manhã.",
  ),
  quote(
    "pt",
    "grao",
    "De grão em grão, a galinha enche o papo. Guardar um pouco todo mês parece pouco, até o dia em que faz diferença.",
  ),
  quote(
    "pt",
    "radio",
    "A música tocava no rádio da cozinha enquanto a louça secava, e a avó cantava junto, errando a letra com muita confiança.",
  ),
  quote(
    "pt",
    "pergunta",
    "Não existe pergunta boba, existe resposta apressada. Ouvir com calma economiza tempo, evita erros e faz amigos.",
  ),
  quote(
    "pt",
    "montanha",
    "Subimos a montanha devagar, parando para beber água e olhar para trás. Lá em cima, o silêncio era tão grande que dava para ouvir o vento.",
  ),
  quote(
    "en",
    "kettle",
    "The kettle always whistles at the worst moment, right when the phone rings and someone knocks at the door.",
  ),
  quote(
    "en",
    "library",
    "A small library on the corner lends books, board games and umbrellas, and nobody has ever forgotten to bring one back.",
  ),
  quote(
    "en",
    "garden",
    "We planted tomatoes, beans and a few sunflowers. The birds took the seeds, the sun took its time, and the beans took over the fence.",
  ),
  quote(
    "en",
    "bike",
    "Learning to ride a bike feels impossible on the first day and obvious on the second. Keep looking ahead and keep pedaling.",
  ),
  quote(
    "en",
    "early-bird",
    "The early bird catches the worm, but the second mouse gets the cheese. Timing matters more than speed.",
  ),
  quote(
    "en",
    "train",
    "The train left late and arrived late, yet everyone stepped off smiling, because the view of the valley was worth every minute.",
  ),
  quote(
    "en",
    "recipe",
    "The recipe asked for two cups of flour, but the cook measured by feel, and the cake came out tall, crooked and perfect.",
  ),
  quote(
    "en",
    "keys",
    "I searched the whole house for my keys, opened every drawer and emptied my bag twice. They were hanging in the front door.",
  ),
  quote(
    "en",
    "rain",
    "It rained all afternoon, so the children sat by the window and raced the drops down the glass, each one cheering for a favorite.",
  ),
  quote(
    "en",
    "map",
    "A map shows you the road, but it never tells you how many times you will stop to ask a friendly stranger for directions.",
  ),
  quote(
    "en",
    "rome",
    "Rome was not built in a day, and neither is a habit. Practice a little every morning and the progress will surprise you.",
  ),
  quote(
    "en",
    "beach",
    "At the end of the day the beach empties out, the wind changes direction and the sea seems to whisper to anyone who stayed for the sunset.",
  ),
  quote(
    "en",
    "clock",
    "The clock in the hall has run five minutes fast for as long as I can remember, which is why our family is never late.",
  ),
  quote(
    "en",
    "friend",
    "A good friend remembers your birthday, returns the book they borrowed and shows up with soup when you are sick.",
  ),
  quote(
    "en",
    "winter",
    "When winter arrives, the heavy blankets come out of the closet, the soup pot never leaves the stove and mornings get very quiet.",
  ),
  quote(
    "en",
    "question",
    "There are no silly questions, only hurried answers. Listening carefully saves time, prevents mistakes and makes friends.",
  ),
  quote(
    "en",
    "hill",
    "We climbed the hill slowly, stopping to drink water and look back. At the top it was so quiet that we could hear the wind in the grass.",
  ),
  quote(
    "en",
    "school",
    "On the first day of school, the teacher wrote her name on the board and asked each student to share one dream out loud.",
  ),
  quote(
    "en",
    "market",
    "At the Saturday market, the fruit seller shouts his prices, an old man tests every melon, and a patient dog waits for a dropped snack.",
  ),
  quote(
    "en",
    "radio",
    "The radio played in the kitchen while the dishes dried, and grandma sang along, getting half of the words wrong with total confidence.",
  ),
  quote(
    "en",
    "steady",
    "Slow and steady wins the race. Rushing through a task usually means doing it twice, and that is never faster.",
  ),
  quote(
    "en",
    "road",
    "Every long journey starts with a short step. Do not only stare at the finish line; the road itself deserves your attention.",
  ),
];

/** A quote of `language`, the same for the same seed. */
export function pickQuote(seed: number, language: TextLanguage): Quote {
  return createRng(seed).pick(QUOTES.filter((q) => q.language === language));
}
