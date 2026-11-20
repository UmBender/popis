/** One line of the "Comandos" panel of the edit drill. */
export type EditHelp = {
  /** The keys as shown, such as "d", "r{c}" or "i(". */
  readonly keys: string;
  /** A sentence in Portuguese. */
  readonly text: string;
  /** A use in competitive programming, for the commands of the visual drill (T15). */
  readonly example?: string;
};

/** Every command the edit drill accepts, besides the movements of the motion drill. */
export const EDIT_HELP: readonly EditHelp[] = [
  { keys: "i", text: "insere antes do cursor, até o Esc" },
  { keys: "a", text: "insere depois do cursor" },
  { keys: "I", text: "insere no começo da linha, depois do recuo" },
  { keys: "A", text: "insere no fim da linha" },
  { keys: "o", text: "abre uma linha abaixo e insere nela" },
  { keys: "O", text: "abre uma linha acima e insere nela" },
  { keys: "d", text: "apaga o texto de um movimento: dw apaga uma palavra, d2w duas" },
  { keys: "c", text: "apaga o texto de um movimento e insere no lugar: cw troca uma palavra" },
  { keys: "y", text: "copia o texto de um movimento: yw copia uma palavra" },
  { keys: "dd", text: "apaga a linha (cc troca a linha, yy copia a linha)" },
  { keys: "D", text: "apaga até o fim da linha (C troca até o fim)" },
  { keys: "x", text: "apaga o caractere sob o cursor (X apaga o anterior)" },
  { keys: "r{c}", text: "troca o caractere sob o cursor por {c}" },
  { keys: "s", text: "troca o caractere sob o cursor (S troca a linha)" },
  { keys: "~", text: "inverte maiúscula e minúscula do caractere" },
  { keys: "p", text: "cola depois do cursor (P cola antes)" },
  { keys: "Y", text: "copia a linha inteira, como yy" },
  {
    keys: "iw",
    text: "objeto: a palavra sob o cursor (aw inclui o espaço, iW e aW usam PALAVRAS)",
  },
  { keys: "aw", text: "objeto: a palavra e o espaço que a separa da vizinha: daw" },
  {
    keys: "i(",
    text: "objeto: o conteúdo dos parênteses, ci( troca o que está dentro (ib é igual)",
  },
  { keys: "a(", text: "objeto: os parênteses e o que está dentro (ab é igual)" },
  { keys: "i[", text: "objeto: o conteúdo dos colchetes (a[ inclui os colchetes)" },
  { keys: "i{", text: "objeto: o conteúdo das chaves (a{ inclui as chaves, iB e aB também)" },
  { keys: "i<", text: "objeto: o conteúdo de < > (a< inclui os sinais)" },
  { keys: 'i"', text: 'objeto: o conteúdo das aspas (a" inclui as aspas e um espaço)' },
  { keys: "i'", text: "objeto: o conteúdo das aspas simples (a' inclui as aspas)" },
  { keys: "i`", text: "objeto: o conteúdo das crases (a` inclui as crases)" },
  { keys: "u", text: "desfaz a última mudança (uma inserção inteira é uma mudança)" },
  { keys: "<C-r>", text: "refaz o que o u desfez" },
  { keys: ".", text: "repete a última mudança, com o texto inserido" },
];
