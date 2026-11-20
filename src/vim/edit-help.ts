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
  {
    keys: "v",
    text: "seleciona caracteres; qualquer movimento ou objeto estende, d c y > < ~ r agem",
    example: "vi(y copia o conteúdo dos parênteses de uma chamada",
  },
  {
    keys: "V",
    text: "seleciona linhas inteiras",
    example: "V3j> indenta quatro linhas de um bloco colado",
  },
  {
    keys: "<C-v>",
    text: "seleciona um bloco retangular de colunas",
    example: "<C-v>jjjld apaga duas colunas de quatro linhas",
  },
  {
    keys: "vo",
    text: "no modo visual, o troca a ponta da seleção (O troca o canto do bloco)",
    example: "vllohh amplia a seleção para o outro lado sem recomeçar",
  },
  {
    keys: "gv",
    text: "seleciona de novo a última seleção visual",
    example: "gv> indenta outra vez as linhas que você acabou de indentar",
  },
  {
    keys: "<C-v>I",
    text: "no bloco, I insere o texto digitado em todas as linhas ao dar Esc",
    example: "<C-v>jjI// <Esc> comenta os prints de debug antes de enviar",
  },
  {
    keys: "<C-v>A",
    text: "no bloco, A acrescenta o texto depois da coluna direita do bloco",
    example: "<C-v>jjlA, <Esc> põe uma vírgula depois de duas colunas",
  },
  {
    keys: "<C-v>$A",
    text: "com $, o A acrescenta no fim de cada linha, mesmo de tamanhos diferentes",
    example: "<C-v>jjj$A;<Esc> põe o ; que faltou no fim de quatro linhas",
  },
  {
    keys: ">>",
    text: "indenta a linha com 4 espaços (3>> indenta três linhas, >i{ o conteúdo das chaves)",
    example: ">i{ indenta o corpo de um laço colado sem recuo",
  },
  {
    keys: "<<",
    text: "tira até 4 espaços de recuo da linha (<i{ faz o mesmo no conteúdo das chaves)",
    example: "<i{ desindenta o corpo de uma função copiada de dentro de uma classe",
  },
  {
    keys: ">",
    text: "operador de indentação: > com movimento, objeto ou seleção visual (< tira)",
    example: "V3j> indenta quatro linhas selecionadas",
  },
  {
    keys: "J",
    text: "junta a linha com a próxima (3J junta três), com um espaço no lugar da quebra",
    example: "J junta um if e o corpo que ficou na linha de baixo",
  },
  {
    keys: ":s",
    text: "troca texto: :s/velho/novo/ na linha, com g troca todos; no visual já vem com '<,'>",
    example: "vi{ e depois :s/\\<i\\>/j/g troca i por j só dentro da função",
  },
  {
    keys: ":%s",
    text: "troca no arquivo todo; \\< e \\> marcam palavras inteiras, & é o trecho achado",
    example: ":%s/endl/'\\\\n'/g<CR> troca endl por '\\n' no código todo",
  },
  {
    keys: ":noh",
    text: ":noh, :w e :q são aceitos e não fazem nada, para não atrapalhar o hábito",
    example: ":noh<CR> apaga o destaque de uma busca no Vim de verdade",
  },
  {
    keys: '"a',
    text: 'registrador nomeado: "ayy copia para o a e "ap cola de lá (a a z; vale para y d c p P x e no visual)',
    example: '"a2yy guarda um caso de teste de duas linhas e 3"ap cola três cópias',
  },
  {
    keys: '"A',
    text: 'letra maiúscula acrescenta ao registrador em vez de trocar o que ele tinha: "Ayy',
    example: '"Ayy em linhas espalhadas junta tudo no a para colar de uma vez',
  },
  {
    keys: '"0',
    text: 'guarda a última cópia (y): um apagar não o troca, então "0p cola o que você copiou',
    example: 'yy, depois dd numa linha de debug e "0p cola a linha que foi copiada',
  },
  {
    keys: '"1',
    text: 'guarda a última linha apagada; "2 a "9 guardam as anteriores (o "1p seguido de . cola a "2)',
    example: '"1pu.u. passa pelas linhas apagadas até achar a que você queria de volta',
  },
  {
    keys: '"-',
    text: "guarda o último apagado dentro de uma linha (dw, x, D); o p comum cola o último apagado",
    example: 'dw e depois "-p traz de volta a palavra apagada mesmo depois de um dd',
  },
  {
    keys: '"_',
    text: "buraco negro: apaga ou troca sem mexer em nenhum registrador, nem no sem nome",
    example: 'yy e depois "_dd apaga a linha de debug sem perder a cópia; o p cola a cópia',
  },
  {
    keys: '""',
    text: "o registrador sem nome: o que y, d, c e x guardam por padrão e o p cola",
    example: '""p é o mesmo que p; serve para lembrar de onde vem o que você cola',
  },
  {
    keys: "q",
    text: "qa começa a gravar uma macro no registrador a; o próximo q para a gravação",
    example: "qayyp<C-a>q grava copiar a linha e somar 1: gera uma entrada numerada",
  },
  {
    keys: "@a",
    text: "executa a macro do registrador a; a macro para no primeiro comando que falha",
    example: "@a repete a troca que você gravou numa linha, na linha seguinte",
  },
  {
    keys: "@@",
    text: "executa de novo a última macro executada (aceita contagem)",
    example: "@a e depois @@ aplica a macro nas próximas linhas sem digitar o nome",
  },
  {
    keys: "9@a",
    text: "com contagem, a macro corre várias vezes e para sozinha no primeiro erro",
    example: "99@a aplica a macro até o fim do arquivo, sem contar as linhas",
  },
  {
    keys: "<C-a>",
    text: "soma 1 ao próximo número da linha (5<C-a> soma 5; vale para hex e binário)",
    example: "<C-a>j.j. soma 1 ao índice de três linhas seguidas",
  },
  {
    keys: "<C-x>",
    text: "subtrai 1 do próximo número da linha (aceita contagem e passa de zero para negativo)",
    example: "<C-x> passa um índice de 1-base para 0-base",
  },
  {
    keys: "i_<C-r>",
    text: "no modo de inserção, <C-r> e o nome de um registrador cola o texto dele",
    example: 'dw, A <C-r>"<Esc> põe no fim da linha a coluna que você apagou',
  },
];
