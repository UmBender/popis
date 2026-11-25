import type { LessonId } from "../learn/curriculum";
import { SHELL_COMMAND_TABLE, type CheckOptions, type ShellExpected } from "./check";
import type { ShellDrillKind } from "./drill";

export type ShellExampleStep = {
  readonly cmd: string;
  readonly note: string;
};

export type ShellLessonExample = {
  readonly fixture: string;
  readonly setup?: readonly string[];
  readonly steps: readonly ShellExampleStep[];
};

export type ShellLessonExercise = {
  readonly cwd: string;
  readonly files: readonly string[];
  readonly terminalLines: readonly string[];
  readonly prompt: string;
  readonly canonical: string;
  readonly expected: ShellExpected;
};

export type ShellLesson = {
  readonly id: LessonId;
  readonly unitId: string;
  readonly title: string;
  readonly explanation: string;
  readonly note?: string;
  readonly helpKeys: readonly string[];
  readonly commands: readonly string[];
  readonly example: ShellLessonExample;
  readonly exercises: readonly [ShellLessonExercise, ShellLessonExercise, ShellLessonExercise];
  readonly unlocksKind?: ShellDrillKind;
  readonly practiceKinds: readonly ShellDrillKind[];
};

export type ShellUnit = {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly lessons: readonly ShellLesson[];
};

function ex(
  cwd: string,
  files: readonly string[],
  terminalLines: readonly string[],
  prompt: string,
  canonical: string,
  extraAccepted?: readonly string[],
  options?: CheckOptions,
): ShellLessonExercise {
  return {
    cwd,
    files,
    terminalLines,
    prompt,
    canonical,
    expected: {
      accepted: [canonical, ...(extraAccepted ?? [])],
      ...(options !== undefined ? { options } : {}),
    },
  };
}

/** 9-unit Shell curriculum for contest terminal workflows (AC-6, ADR-T39-1). */
export const SHELL_UNITS: readonly ShellUnit[] = [
  {
    id: "u1-arquivos",
    number: 1,
    title: "Arquivos",
    lessons: [
      {
        id: "u1-nav",
        unitId: "u1-arquivos",
        title: "Navegar pastas com ls e cd",
        explanation:
          "Use ls -la para enxergar todos os arquivos da pasta e ls -lh para tamanhos legíveis. Com cd você troca de diretório e cd - alterna rápido para a pasta onde estava antes.",
        helpKeys: ["ls", "cd"],
        commands: ["ls -la", "ls -lh", "cd pasta", "cd -"],
        example: {
          fixture: "files",
          steps: [
            { cmd: "ls -la", note: "Mostra permissões, tamanhos e arquivos ocultos." },
            { cmd: "cd sub", note: "Entra na subpasta do problema." },
            { cmd: "cd -", note: "Volta imediatamente para a pasta anterior." },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            ["a.cpp", "in1", "sub/", ".hidden"],
            ["$ pwd", "/home/contest"],
            "Liste todos os arquivos da pasta atual, incluindo ocultos, em formato longo.",
            "ls -la",
          ),
          ex(
            "~/contest/sub",
            ["a.cpp", "in1"],
            ["$ cd sub"],
            "Volte para a pasta anterior.",
            "cd -",
          ),
          ex(
            "~",
            ["contest/", "notes.txt"],
            ["$ ls", "contest  notes.txt"],
            "Entre na pasta contest.",
            "cd contest",
          ),
        ],
        practiceKinds: ["arquivos"],
      },
      {
        id: "u1-files",
        unitId: "u1-arquivos",
        title: "Criar, copiar, mover e limpar arquivos",
        explanation:
          "mkdir -p cria toda a árvore de pastas sem reclamar se ela já existir. cp copia, mv renomeia ou move, cat imprime um arquivo e rm -f apaga sem pedir confirmação.",
        helpKeys: ["mkdir", "cp", "mv", "cat", "rm"],
        commands: ["mkdir -p", "cp", "mv", "cat", "rm -f"],
        example: {
          fixture: "files",
          steps: [
            { cmd: "mkdir -p work/day1", note: "-p cria pastas intermediárias de uma vez." },
            { cmd: "cp a.cpp work/day1/sol.cpp", note: "Copia o código-fonte para a nova pasta." },
            { cmd: "cat in1", note: "Confere o conteúdo da entrada de teste." },
            { cmd: "rm -f tmp.out", note: "Remove o temporário sem falhar se já sumiu." },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            ["a.cpp", "in1"],
            ["$ ls", "a.cpp  in1"],
            "Crie a pasta a/b/c criando diretórios intermediários se preciso.",
            "mkdir -p a/b/c",
          ),
          ex(
            "~/contest",
            ["a.cpp", "in1"],
            ["$ ls", "a.cpp  in1"],
            "Copie a.cpp para backup.cpp.",
            "cp a.cpp backup.cpp",
          ),
          ex(
            "~/contest",
            ["a.cpp", "tmp.out"],
            ["$ ls", "a.cpp  tmp.out"],
            "Remova tmp.out sem pedir confirmação.",
            "rm -f tmp.out",
          ),
        ],
        unlocksKind: "arquivos",
        practiceKinds: ["arquivos"],
      },
    ],
  },
  {
    id: "u2-compilar",
    number: 2,
    title: "Compilar",
    lessons: [
      {
        id: "u2-judge",
        unitId: "u2-compilar",
        title: "Flags do juiz e avisos do g++",
        explanation:
          "Na prova, compile com -O2 -std=gnu++20 para espelhar o ambiente do ICPC e use -o para escolher o nome do executável. Ligue -Wall -Wextra -Wshadow para pegar variáveis sombreadas, comparações com sinal trocado e retornos esquecidos antes de submeter.",
        helpKeys: ["g++"],
        commands: ["g++ -O2 -std=gnu++20 a.cpp -o a", "-Wall -Wextra -Wshadow"],
        example: {
          fixture: "compile",
          steps: [
            {
              cmd: "g++ -O2 -std=gnu++20 -Wall -Wextra -Wshadow a.cpp -o a",
              note: "Compila com otimização do juiz e avisos ligados.",
            },
            { cmd: "./a < in1", note: "Executa o binário gerado na entrada de exemplo." },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            ["a.cpp", "in1"],
            ["$ ls", "a.cpp  in1"],
            "Compile a.cpp para o executável a com -O2 e -std=gnu++20.",
            "g++ -O2 -std=gnu++20 a.cpp -o a",
          ),
          ex(
            "~/contest",
            ["sol.cpp", "in1"],
            ["$ ls", "sol.cpp  in1"],
            "Compile sol.cpp para sol com os avisos -Wall, -Wextra e -Wshadow.",
            "g++ -Wall -Wextra -Wshadow sol.cpp -o sol",
          ),
          ex(
            "~/contest",
            ["b.cpp", "in1"],
            ["$ ls", "b.cpp  in1"],
            "Compile b.cpp para b com -O2, -std=gnu++20, -Wall e -Wextra.",
            "g++ -O2 -std=gnu++20 -Wall -Wextra b.cpp -o b",
          ),
        ],
        practiceKinds: ["compilar"],
      },
      {
        id: "u2-sanitizers",
        unitId: "u2-compilar",
        title: "Debug da STL e sanitizers",
        explanation:
          "-D_GLIBCXX_DEBUG verifica índices fora do vetor e iteradores inválidos dentro da STL, enquanto -fsanitize=address,undefined detecta estouros de memória e overflow de inteiros com sinal. Como essas checagens deixam o programa bem mais lento, desligue-as quando for medir tempo de execução.",
        helpKeys: [],
        commands: ["-D_GLIBCXX_DEBUG", "-g -fsanitize=address,undefined"],
        example: {
          fixture: "compile",
          steps: [
            {
              cmd: "g++ -g -fsanitize=address,undefined a.cpp -o a",
              note: "Instrumenta o binário para pegar acessos inválidos e UB.",
            },
            {
              cmd: "g++ -std=gnu++20 -D_GLIBCXX_DEBUG a.cpp -o a",
              note: "Ativa verificações internas nos contêineres da STL.",
            },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            ["a.cpp", "in1"],
            ["$ ls", "a.cpp  in1"],
            "Compile a.cpp para a com -std=gnu++20 e -D_GLIBCXX_DEBUG.",
            "g++ -std=gnu++20 -D_GLIBCXX_DEBUG a.cpp -o a",
          ),
          ex(
            "~/contest",
            ["sol.cpp", "in1"],
            ["$ ls", "sol.cpp  in1"],
            "Compile sol.cpp para sol com -g e -fsanitize=address,undefined.",
            "g++ -g -fsanitize=address,undefined sol.cpp -o sol",
          ),
          ex(
            "~/contest",
            ["b.cpp", "in1"],
            ["$ ls", "b.cpp  in1"],
            "Compile b.cpp para b com -g, -Wall e -fsanitize=address,undefined.",
            "g++ -g -Wall -fsanitize=address,undefined b.cpp -o b",
          ),
        ],
        unlocksKind: "compilar",
        practiceKinds: ["compilar"],
      },
    ],
  },
  {
    id: "u3-rodar",
    number: 3,
    title: "Rodar",
    lessons: [
      {
        id: "u3-redir",
        unitId: "u3-rodar",
        title: "Redirecionar entrada, saída, erro e tee",
        explanation:
          "< alimenta a entrada padrão a partir de um arquivo, > grava a saída padrão (>> acrescenta) e 2> captura apenas o stderr onde ficam seus cerr de depuração. Com | tee arquivo você vê a saída no terminal e ainda a salva para comparar depois.",
        helpKeys: ["tee"],
        commands: ["< in", "> out", "2> err", "| tee out"],
        example: {
          fixture: "run",
          steps: [
            { cmd: "./a < in1 > out1", note: "Lê in1 e grava a resposta em out1." },
            { cmd: "./a < in1 2> err.log", note: "Separa mensagens de cerr para err.log." },
            { cmd: "./a < in1 | tee out1", note: "Mostra na tela e grava out1 ao mesmo tempo." },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            ["a", "in1"],
            ["$ ls", "a  in1"],
            "Rode ./a lendo a entrada de in1 e salvando a saída em out1.",
            "./a < in1 > out1",
          ),
          ex(
            "~/contest",
            ["a", "in1"],
            ["$ ls", "a  in1"],
            "Rode ./a lendo de in1 e redirecionando apenas o stderr para err.log.",
            "./a < in1 2> err.log",
          ),
          ex(
            "~/contest",
            ["a", "in1"],
            ["$ ls", "a  in1"],
            "Rode ./a com in1 exibindo na tela e salvando em out1 com tee.",
            "./a < in1 | tee out1",
          ),
        ],
        practiceKinds: ["rodar"],
      },
      {
        id: "u3-time",
        unitId: "u3-rodar",
        title: "Medir e limitar tempo com time e timeout",
        explanation:
          "time mostra quanto tempo real e de CPU sua solução levou num caso grande. timeout N encerra o executável automaticamente se ele passar de N segundos, evitando que um laço infinito trave seu teste.",
        helpKeys: ["time", "timeout"],
        commands: ["time ./a < in1", "timeout 2 ./a < in1"],
        example: {
          fixture: "run",
          steps: [
            { cmd: "time ./a < in1", note: "Imprime o tempo real, de usuário e de sistema." },
            {
              cmd: "timeout 2 ./a < in1",
              note: "Aborta com código 124 se o programa passar de 2 s.",
            },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            ["a", "in1"],
            ["$ ls", "a  in1"],
            "Meça o tempo de execução de ./a lendo in1.",
            "time ./a < in1",
          ),
          ex(
            "~/contest",
            ["a", "in1"],
            ["$ ls", "a  in1"],
            "Rode ./a com in1 limitando o tempo a 2 segundos.",
            "timeout 2 ./a < in1",
          ),
          ex(
            "~/contest",
            ["sol", "in2"],
            ["$ ls", "sol  in2"],
            "Rode ./sol com in2 limitando o tempo a 3 segundos.",
            "timeout 3 ./sol < in2",
          ),
        ],
        unlocksKind: "rodar",
        practiceKinds: ["rodar"],
      },
    ],
  },
  {
    id: "u4-comparar",
    number: 4,
    title: "Comparar",
    lessons: [
      {
        id: "u4-diff",
        unitId: "u4-comparar",
        title: "Comparar saídas com diff e cmp",
        explanation:
          "diff mostra exatamente quais linhas diferem entre sua saída e o gabarito. Use -Z para ignorar apenas espaços no fim da linha, -w para ignorar qualquer espaço em branco e cmp -s quando só quiser saber pelo código de saída se os arquivos são idênticos.",
        helpKeys: ["diff", "cmp"],
        commands: ["diff out1 ans1", "diff -Z", "diff -w", "cmp -s"],
        example: {
          fixture: "compare",
          steps: [
            { cmd: "diff out1 ans1", note: "Detecta inclusive espaço sobrando no fim da linha." },
            { cmd: "diff -Z out1 ans1", note: "-Z ignora espaço no fim da linha e retorna 0." },
            { cmd: "cmp -s out1 out1", note: "Retorna 0 silenciosamente quando são idênticos." },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            ["out1", "ans1"],
            ["$ ls", "out1  ans1"],
            "Compare out1 e ans1 ignorando espaços no fim da linha.",
            "diff -Z out1 ans1",
          ),
          ex(
            "~/contest",
            ["out1", "ans1"],
            ["$ ls", "out1  ans1"],
            "Compare out1 e ans1 ignorando todos os espaços em branco.",
            "diff -w out1 ans1",
          ),
          ex(
            "~/contest",
            ["out1", "ans1"],
            ["$ ls", "out1  ans1"],
            "Verifique silenciosamente byte a byte se out1 e ans1 são iguais com cmp.",
            "cmp -s out1 ans1",
          ),
        ],
        practiceKinds: ["comparar"],
      },
      {
        id: "u4-procsub",
        unitId: "u4-comparar",
        title: "Substituição de processo com <(...)",
        explanation:
          "A substituição de processo <(...) entrega a saída de um comando ao diff como se fosse um arquivo temporário. Assim você compara ./sol e ./brute numa única linha sem sujar a pasta com arquivos intermediários.",
        helpKeys: [],
        commands: ["diff <(./sol < in1) <(./brute < in1)"],
        example: {
          fixture: "compare",
          steps: [
            {
              cmd: "diff <(./sol < in1) <(./brute < in1)",
              note: "Roda os dois binários e compara as saídas na hora.",
            },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            ["sol", "brute", "in1"],
            ["$ ls", "sol  brute  in1"],
            "Compare diretamente ./sol e ./brute em in1 usando substituição de processo.",
            "diff <(./sol < in1) <(./brute < in1)",
          ),
          ex(
            "~/contest",
            ["sol", "brute", "in2"],
            ["$ ls", "sol  brute  in2"],
            "Compare ./sol e ./brute em in2 ignorando espaços no fim da linha com <(...).",
            "diff -Z <(./sol < in2) <(./brute < in2)",
          ),
          ex(
            "~/contest",
            ["a", "b", "in1"],
            ["$ ls", "a  b  in1"],
            "Compare ./a e ./b em in1 sem arquivos temporários.",
            "diff <(./a < in1) <(./b < in1)",
          ),
        ],
        unlocksKind: "comparar",
        practiceKinds: ["comparar"],
      },
    ],
  },
  {
    id: "u5-stress",
    number: 5,
    title: "Stress test",
    lessons: [
      {
        id: "u5-gen",
        unitId: "u5-stress",
        title: "Gerador com seed e comparação",
        explanation:
          "Um gerador que recebe a seed na linha de comando (./gen $i) permite reproduzir qualquer contraexemplo exato. Use seq para gerar as seeds de 1 até N e encadeie os comandos com &&.",
        helpKeys: ["seq"],
        commands: ["seq 1 N", "./gen $i > in"],
        example: {
          fixture: "stress",
          steps: [
            { cmd: "seq 1 3", note: "Produz as seeds 1, 2 e 3." },
            { cmd: "./gen 7 > in && cat in", note: "Gera a entrada da seed 7 e mostra o caso." },
            {
              cmd: "./sol < in > out1 && ./brute < in > out2 && diff out1 out2",
              note: "Na seed 7 a solução diverge da força bruta.",
            },
          ],
        },
        exercises: [
          ex(
            "~/contest/stress",
            ["gen", "sol", "brute"],
            ["$ ls", "gen  sol  brute"],
            "Gere a entrada da seed 7 com ./gen salvando em in.",
            "./gen 7 > in",
          ),
          ex(
            "~/contest/stress",
            ["gen", "sol", "brute"],
            ["$ ls", "gen  sol  brute"],
            "Imprima a sequência de inteiros de 1 até 10 com seq.",
            "seq 1 10",
          ),
          ex(
            "~/contest/stress",
            ["gen", "sol", "brute", "in"],
            ["$ ./gen 7 > in"],
            "Rode ./sol em out1, ./brute em out2 usando in e compare com diff.",
            "./sol < in > out1 && ./brute < in > out2 && diff out1 out2",
            undefined,
            { allowSemicolon: true },
          ),
        ],
        practiceKinds: ["stress"],
      },
      {
        id: "u5-loop",
        unitId: "u5-stress",
        title: "Laço de stress com || break",
        explanation:
          "No laço for ou while, o || break interrompe a repetição assim que o diff devolve diferença, preservando exatamente o caso que falhou dentro de in. Depois é só inspecionar o contraexemplo com cat in.",
        helpKeys: ["for", "while"],
        commands: ["for i in $(seq 1 N); do ... || break; done", "while true; do ... || break; done"],
        example: {
          fixture: "stress",
          steps: [
            {
              cmd: "for i in $(seq 1 10); do ./gen $i > in && ./sol < in > out1 && ./brute < in > out2 && diff out1 out2 || break; done",
              note: "Para automaticamente no teste 7 onde sol difere de brute.",
            },
            { cmd: "cat in", note: "Exibe o contraexemplo mínimo que quebrou a solução." },
          ],
        },
        exercises: [
          ex(
            "~/contest/stress",
            ["gen", "sol", "brute"],
            ["$ ls", "gen  sol  brute"],
            "Rode um laço for com $i de 1 a 10 gerando in com ./gen $i, rodando ./sol (out1) e ./brute (out2), parando no diff || break.",
            "for i in $(seq 1 10); do ./gen $i > in && ./sol < in > out1 && ./brute < in > out2 && diff out1 out2 || break; done",
            undefined,
            { allowSemicolon: true },
          ),
          ex(
            "~/contest/stress",
            ["gen", "sol", "brute"],
            ["$ ls", "gen  sol  brute"],
            "Faça o mesmo laço for de 1 a 20 ignorando espaço no fim da linha no diff (-Z) e parando com || break.",
            "for i in $(seq 1 20); do ./gen $i > in && ./sol < in > out1 && ./brute < in > out2 && diff -Z out1 out2 || break; done",
            undefined,
            { allowSemicolon: true },
          ),
          ex(
            "~/contest/stress",
            ["gen", "sol", "brute"],
            ["$ ls", "gen  sol  brute"],
            "Escreva um laço while true gerando in com ./gen, rodando ./sol (out1) e ./brute (out2) e parando em diff out1 out2 || break.",
            "while true; do ./gen > in && ./sol < in > out1 && ./brute < in > out2 && diff out1 out2 || break; done",
            undefined,
            { allowSemicolon: true },
          ),
        ],
        unlocksKind: "stress",
        practiceKinds: ["stress"],
      },
    ],
  },
  {
    id: "u6-limites",
    number: 6,
    title: "Limites",
    lessons: [
      {
        id: "u6-limits",
        unitId: "u6-limites",
        title: "Pilha e memória com ulimit",
        explanation:
          "No Linux, a pilha padrão de 8 MB derruba uma DFS recursiva em árvores grandes com SIGSEGV mesmo quando o algoritmo está certo. Use ulimit -s unlimited (ou um valor em KB) para subir a pilha, ulimit -v para limitar a memória virtual e ulimit -a para conferir todos os limites.",
        helpKeys: ["ulimit"],
        commands: ["ulimit -s unlimited", "ulimit -v 524288", "ulimit -a"],
        example: {
          fixture: "limits",
          steps: [
            { cmd: "ulimit -s 65536 && ulimit -s", note: "Ajusta o limite da pilha para 64 MB." },
            { cmd: "ulimit -s unlimited && ulimit -s", note: "Libera o limite da pilha na sessão." },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            ["dfs.cpp", "dfs", "in1"],
            ["$ ./dfs < in1", "Segmentation fault"],
            "Libere o limite de pilha para unlimited.",
            "ulimit -s unlimited",
          ),
          ex(
            "~/contest",
            ["sol.cpp", "sol"],
            ["$ ulimit -v", "unlimited"],
            "Limite a memória virtual a 524288 KB.",
            "ulimit -v 524288",
          ),
          ex(
            "~/contest",
            ["sol.cpp", "sol"],
            ["$ pwd", "/home/contest"],
            "Liste todos os limites da sessão atual.",
            "ulimit -a",
          ),
        ],
        unlocksKind: "limites",
        practiceKinds: ["limites"],
      },
    ],
  },
  {
    id: "u7-texto",
    number: 7,
    title: "Texto",
    lessons: [
      {
        id: "u7-slice",
        unitId: "u7-texto",
        title: "Cortar e contar linhas com head, tail e wc",
        explanation:
          "Quando uma saída tem milhares de linhas, head -n N mostra só o começo e tail -n N mostra o final sem inundar o terminal. wc -l conta quantas linhas existem para conferir rapidamente o tamanho da resposta.",
        helpKeys: ["head", "tail", "wc"],
        commands: ["head -n N", "tail -n N", "wc -l"],
        example: {
          fixture: "text",
          steps: [
            { cmd: "head -n 3 out1", note: "Inspeciona apenas as 3 primeiras linhas." },
            { cmd: "tail -n 2 out1", note: "Confere as 2 últimas linhas do arquivo." },
            { cmd: "wc -l out1", note: "Conta o total de linhas da saída." },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            ["out1", "log.txt"],
            ["$ ls", "out1  log.txt"],
            "Mostre as primeiras 10 linhas de out1.",
            "head -n 10 out1",
          ),
          ex(
            "~/contest",
            ["out1", "log.txt"],
            ["$ ls", "out1  log.txt"],
            "Mostre as últimas 5 linhas de log.txt.",
            "tail -n 5 log.txt",
          ),
          ex(
            "~/contest",
            ["out1", "log.txt"],
            ["$ ls", "out1  log.txt"],
            "Conte quantas linhas tem out1.",
            "wc -l out1",
          ),
        ],
        practiceKinds: ["texto"],
      },
      {
        id: "u7-filter",
        unitId: "u7-texto",
        title: "Ordenar, contar e buscar com sort, uniq e grep",
        explanation:
          "sort -n ordena números pelo valor (evitando 10 antes de 2) e combinado com uniq -c conta a frequência de cada linha repetida. grep -n encontra ocorrências de um padrão já indicando o número da linha.",
        helpKeys: ["sort", "uniq", "grep"],
        commands: ["sort -n", "sort | uniq -c", "grep -n"],
        example: {
          fixture: "text",
          steps: [
            { cmd: "sort -n nums.txt", note: "Ordena numericamente em vez de ordem alfabética." },
            { cmd: "sort words.txt | uniq -c", note: "Agrupa iguais adjacentes e conta cada um." },
            { cmd: "grep -n ERR log.txt", note: "Mostra cada linha com ERR e seu número." },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            ["nums.txt", "words.txt"],
            ["$ cat nums.txt", "10", "2", "1"],
            "Ordene nums.txt em ordem numérica.",
            "sort -n nums.txt",
          ),
          ex(
            "~/contest",
            ["nums.txt", "words.txt"],
            ["$ ls", "nums.txt  words.txt"],
            "Ordene words.txt e conte as ocorrências de cada linha com uniq -c.",
            "sort words.txt | uniq -c",
          ),
          ex(
            "~/contest",
            ["log.txt", "nums.txt"],
            ["$ ls", "log.txt  nums.txt"],
            "Procure ERR em log.txt mostrando o número da linha.",
            "grep -n ERR log.txt",
          ),
        ],
        unlocksKind: "texto",
        practiceKinds: ["texto"],
      },
    ],
  },
  {
    id: "u8-setup",
    number: 8,
    title: "Setup da prova",
    lessons: [
      {
        id: "u8-bashrc",
        unitId: "u8-setup",
        title: "Atalhos e funções no ~/.bashrc",
        explanation:
          "Nos primeiros minutos da prova, guardar funções curtas no ~/.bashrc economiza centenas de teclas: c compila com flags do juiz, cs liga sanitizers, gen compila o gerador, rr roda todos os testes e chk faz o stress test. Depois de editar, rode source ~/.bashrc para ativar no terminal atual.",
        note: "Exemplo de funções c, cs, gen, rr e chk escrito para o popis (inspirado no .bashrc do GEMPRO Notebook).",
        helpKeys: ["alias", "source"],
        commands: [
          "alias c='g++ -O2 -std=gnu++20 -Wall -Wextra'",
          `c() { g++ -O2 -std=gnu++20 "$1.cpp" -o "$1"; }`,
          "source ~/.bashrc",
        ],
        example: {
          fixture: "setup",
          steps: [
            {
              cmd: "cat ~/.bashrc",
              note: "Funções c, cs, gen, rr e chk (inspirado no .bashrc do GEMPRO Notebook).",
            },
            { cmd: "source ~/.bashrc", note: "Carrega as funções na sessão atual do bash." },
            { cmd: "c a && ./a < in1", note: "Usa a função c para compilar e testar a.cpp." },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            ["a.cpp", ".bashrc"],
            ["$ ls -a", ".bashrc  a.cpp"],
            "Crie o alias c para `g++ -O2 -std=gnu++20 -Wall -Wextra`.",
            "alias c='g++ -O2 -std=gnu++20 -Wall -Wextra'",
          ),
          ex(
            "~/contest",
            ["a.cpp", "in1"],
            ["$ ls", "a.cpp  in1"],
            "Defina a função c que compila \"$1.cpp\" para \"$1\" com g++ -O2 -std=gnu++20.",
            `c() { g++ -O2 -std=gnu++20 "$1.cpp" -o "$1"; }`,
          ),
          ex(
            "~/contest",
            ["a.cpp"],
            ["$ vim ~/.bashrc"],
            "Recarregue ~/.bashrc no terminal atual.",
            "source ~/.bashrc",
          ),
        ],
        unlocksKind: "setup",
        practiceKinds: ["setup"],
      },
    ],
  },
  {
    id: "u9-atalhos",
    number: 9,
    title: "Atalhos",
    lessons: [
      {
        id: "u9-shortcuts",
        unitId: "u9-atalhos",
        title: "Atalhos de histórico e linha no bash",
        explanation:
          "Ctrl-R busca qualquer comando antigo digitando só um trecho, seta para cima volta no histórico e Tab completa nomes de arquivos. Ctrl-A e Ctrl-E saltam para o início e o fim da linha, !! repete o último comando e !$ reutiliza o último argumento.",
        helpKeys: [],
        commands: ["Ctrl-R", "!!", "!$", "Ctrl-A / Ctrl-E", "Tab", "↑"],
        example: {
          fixture: "shortcuts",
          steps: [
            { cmd: "echo ok in1", note: "Primeiro comando deixa `in1` como último argumento." },
            { cmd: "cat !$", note: "!$ expande para o último argumento (`in1`)." },
            { cmd: "time !!", note: "!! repete o comando anterior já medindo com time." },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            ["a", "in1"],
            ["$ ./a < in1", "42"],
            "Repita o último comando medindo o tempo com time e !!.",
            "time !!",
          ),
          ex(
            "~/contest",
            ["a.cpp", "in1"],
            ["$ ls in1", "in1"],
            "Mostre o conteúdo do último argumento da linha anterior usando cat e !$.",
            "cat !$",
          ),
          ex(
            "~/contest",
            ["out1", "ans1"],
            ["$ ./a < in1 > out1"],
            "Compare o último argumento anterior com ans1 usando diff -Z e !$.",
            "diff -Z !$ ans1",
          ),
        ],
        practiceKinds: [],
      },
    ],
  },
];

export const SHELL_LESSONS: readonly ShellLesson[] = SHELL_UNITS.flatMap((u) => u.lessons);

const LESSON_BY_ID = new Map<string, ShellLesson>(SHELL_LESSONS.map((l) => [l.id, l]));

const LESSON_BY_COMMAND = new Map<string, ShellLesson>();
for (const lesson of SHELL_LESSONS) {
  for (const key of lesson.helpKeys) {
    LESSON_BY_COMMAND.set(key, lesson);
  }
}

const DESC_BY_COMMAND = new Map<string, string>(
  SHELL_COMMAND_TABLE.map((entry) => [entry.key, entry.text]),
);

export function shellLessonById(id: string): ShellLesson | undefined {
  return LESSON_BY_ID.get(id);
}

export function shellLessonForCommand(command: string): ShellLesson | undefined {
  return LESSON_BY_COMMAND.get(command);
}

export function shellCommandDescription(command: string): string | undefined {
  return DESC_BY_COMMAND.get(command);
}
