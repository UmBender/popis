import type { LessonId } from "../learn/curriculum";
import { SHELL_COMMAND_TABLE, type CheckOptions, type ShellExpected } from "./check";
import type { ShellDrillKind } from "./drill";

export type ShellExampleStep = {
  readonly cmd: string;
  readonly note: string;
};

/** One line of an annotated script with its short explanation (T54 AC-3). */
export type ShellScriptLine = {
  readonly code: string;
  readonly note: string;
};

/** A `.sh` file shown line by line in the lesson and written to disk by the oracle. */
export type ShellScriptFile = {
  readonly file: string;
  readonly lines: readonly ShellScriptLine[];
};

export type ShellLessonExample = {
  readonly fixture: string;
  readonly setup?: readonly string[];
  /** Annotated scripts written to the fixture folder before the steps run (T54 AC-3). */
  readonly scripts?: readonly ShellScriptFile[];
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

/** One annotated script line (T54 AC-3). */
function ln(code: string, note: string): ShellScriptLine {
  return { code, note };
}

const SHEBANG = ln("#!/usr/bin/env bash", "Shebang: diz que o arquivo é lido pelo bash.");
const SCRIPT_FILES = ["a.cpp", "a", "in1", "in2", "out1", "out2"] as const;
const SCRIPT_LS = ["$ ls", "a  a.cpp  in1  in2  out1  out2"] as const;

/** 11-unit Shell curriculum: contest commands (ADR-T39-1) and bash scripts (ADR-T54-1). */
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
        commands: [
          "for i in $(seq 1 N); do ... || break; done",
          "while true; do ... || break; done",
        ],
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
            {
              cmd: "ulimit -s unlimited && ulimit -s",
              note: "Libera o limite da pilha na sessão.",
            },
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
            "Crie o alias c para g++ -O2 -std=gnu++20 -Wall -Wextra.",
            "alias c='g++ -O2 -std=gnu++20 -Wall -Wextra'",
          ),
          ex(
            "~/contest",
            ["a.cpp", "in1"],
            ["$ ls", "a.cpp  in1"],
            'Defina a função c que compila "$1.cpp" para "$1" com g++ -O2 -std=gnu++20.',
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
            { cmd: "echo ok in1", note: "Primeiro comando deixa in1 como último argumento." },
            { cmd: "cat !$", note: "!$ expande para o último argumento (in1)." },
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
  {
    id: "u10-scripts",
    number: 10,
    title: "Scripts",
    lessons: [
      {
        id: "u10-first",
        unitId: "u10-scripts",
        title: "Primeiro script",
        explanation:
          "Um script é um arquivo de texto com comandos do bash, um por linha, que rodam em ordem. A primeira linha, #!/usr/bin/env bash, diz ao sistema qual programa lê o arquivo. Depois de chmod +x ola.sh o arquivo vira executável e roda com ./ola.sh. Sem o chmod, bash ola.sh também funciona.",
        note: "A primeira linha também pode ser #!/bin/bash.",
        helpKeys: ["chmod", "bash"],
        commands: ["#!/usr/bin/env bash", "chmod +x ola.sh", "./ola.sh", "bash ola.sh"],
        example: {
          fixture: "scripts",
          scripts: [
            {
              file: "ola.sh",
              lines: [
                SHEBANG,
                ln("# Meu primeiro script", "Comentário: o bash ignora tudo depois do #."),
                ln('echo "Olá, prova"', "Imprime uma linha na tela."),
                ln("ls in*", "Lista as entradas de teste da pasta."),
              ],
            },
          ],
          steps: [
            { cmd: "chmod +x ola.sh", note: "Dá permissão de execução ao arquivo." },
            { cmd: "./ola.sh", note: "Roda o script; o ./ diz que ele está nesta pasta." },
            { cmd: "bash ola.sh", note: "Também roda, mesmo sem o chmod." },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            ["run.sh", ...SCRIPT_FILES],
            ["$ ls -l run.sh", "-rw-r--r--. 1 contest contest 80 Nov 25 00:00 run.sh"],
            "Dê permissão de execução ao arquivo run.sh.",
            "chmod +x run.sh",
          ),
          ex(
            "~/contest",
            ["run.sh", ...SCRIPT_FILES],
            ["$ chmod +x run.sh"],
            "Rode o script run.sh, que já é executável e está na pasta atual.",
            "./run.sh",
          ),
          ex(
            "~/contest",
            ["teste.sh", ...SCRIPT_FILES],
            ["$ ls", "teste.sh  a  a.cpp  in1  in2"],
            "Rode o script teste.sh com o bash, sem precisar de chmod.",
            "bash teste.sh",
          ),
        ],
        practiceKinds: [],
      },
      {
        id: "u10-vars",
        unitId: "u10-scripts",
        title: "Variáveis e aspas",
        explanation:
          "Crie uma variável com nome=valor, sem espaço antes nem depois do =. Use o valor com $nome, sempre entre aspas duplas. Aspas simples mostram o texto como está, sem trocar $nome pelo valor. Já $(comando) guarda a saída de um comando, como em n=$(wc -l < in1).",
        helpKeys: ["echo"],
        commands: ["nome=valor", '"$nome"', "'texto'", "n=$(comando)"],
        example: {
          fixture: "scripts",
          scripts: [
            {
              file: "vars.sh",
              lines: [
                SHEBANG,
                ln('nome="in1"', "Cria a variável nome; sem espaço em volta do =."),
                ln('echo "arquivo: $nome"', "Aspas duplas trocam $nome pelo valor."),
                ln("echo 'arquivo: $nome'", "Aspas simples mostram $nome como está."),
                ln('linhas=$(wc -l < "$nome")', "$( ) guarda a saída do comando na variável."),
                ln('echo "$nome tem $linhas linha"', "Junta texto e variáveis na mesma linha."),
              ],
            },
          ],
          steps: [{ cmd: "bash vars.sh", note: "Roda o script e mostra as três linhas." }],
        },
        exercises: [
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            [...SCRIPT_LS],
            "Crie a variável n com o valor 5.",
            "n=5",
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            ["$ arq=in1"],
            "Mostre com echo o valor da variável arq, entre aspas duplas.",
            'echo "$arq"',
            undefined,
            { strictQuotes: true },
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            [...SCRIPT_LS],
            "Guarde na variável linhas a saída de wc -l < in1.",
            "linhas=$(wc -l < in1)",
          ),
        ],
        practiceKinds: [],
      },
      {
        id: "u10-math",
        unitId: "u10-scripts",
        title: "Contas",
        explanation:
          "O bash faz contas com números inteiros dentro de $(( )), como em soma=$((a + b)). Dentro de (( )) não precisa de $ antes das variáveis, e (( i++ )) soma 1 em i. A divisão é inteira: $((7 / 2)) dá 3.",
        helpKeys: [],
        commands: ["$((a + b))", "(( i++ ))", "i=$((i + 1))", "$((a % b))"],
        example: {
          fixture: "scripts",
          scripts: [
            {
              file: "contas.sh",
              lines: [
                SHEBANG,
                ln("a=7", "Primeiro número das contas."),
                ln("b=2", "Segundo número."),
                ln('echo "soma: $((a + b))"', "$(( )) calcula e põe o resultado no texto."),
                ln('echo "divisão: $((a / b))"', "Divisão inteira: 7 / 2 dá 3."),
                ln('echo "resto: $((a % b))"', "% é o resto da divisão."),
                ln("i=0", "Contador começando em zero."),
                ln("(( i++ ))", "(( )) faz a conta sem imprimir; i passa a valer 1."),
                ln("i=$((i + 1))", "Outra forma de somar 1: i passa a valer 2."),
                ln('echo "i: $i"', "Mostra o contador."),
              ],
            },
          ],
          steps: [{ cmd: "bash contas.sh", note: "Mostra a soma, a divisão, o resto e o i." }],
        },
        exercises: [
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            ["$ a=3", "$ b=4"],
            "Guarde em soma o valor de a + b usando $(( )).",
            "soma=$((a + b))",
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            ["$ i=0"],
            "Some 1 à variável i usando (( )).",
            "(( i++ ))",
            ["(( i += 1 ))", "(( ++i ))", "i=$((i + 1))"],
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            ["$ n=7"],
            "Mostre com echo o resto de n dividido por 2.",
            "echo $((n % 2))",
          ),
        ],
        practiceKinds: [],
      },
      {
        id: "u10-args",
        unitId: "u10-scripts",
        title: "Argumentos",
        explanation:
          "Ao rodar ./soma.sh 2 3, o script recebe 2 em $1 e 3 em $2. A quantidade de argumentos fica em $# e todos eles juntos em $@. A forma ${3:-10} usa 10 quando o terceiro argumento não foi passado. O shift descarta o $1 e anda os outros uma casa para a esquerda.",
        helpKeys: [],
        commands: ['"$1"', "$#", '"$@"', "${1:-padrão}", "shift"],
        example: {
          fixture: "scripts",
          scripts: [
            {
              file: "soma.sh",
              lines: [
                SHEBANG,
                ln('echo "recebi $# argumentos"', "$# é a quantidade de argumentos."),
                ln('echo "primeiro: $1, segundo: $2"', "$1 e $2 são os dois primeiros."),
                ln('echo "todos: $@"', "$@ são todos os argumentos."),
                ln("n=${3:-10}", "Usa 10 se o terceiro argumento faltar."),
                ln('echo "n: $n"', "Mostra o n escolhido."),
                ln("shift", "Descarta o $1; o antigo $2 vira $1."),
                ln('echo "depois do shift: $1"', "Agora $1 é o antigo segundo argumento."),
              ],
            },
          ],
          steps: [
            { cmd: "chmod +x soma.sh", note: "Deixa o script executável." },
            { cmd: "./soma.sh 2 3", note: "Dois argumentos: n fica com o padrão 10." },
            { cmd: "./soma.sh 2 3 50", note: "Com o terceiro argumento, n vale 50." },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            ["$ cat mostra.sh", "#!/usr/bin/env bash"],
            "Mostre com echo o primeiro argumento do script, entre aspas.",
            'echo "$1"',
            undefined,
            { strictQuotes: true },
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            ["$ cat stress.sh", "#!/usr/bin/env bash"],
            "Guarde em n o primeiro argumento, ou 100 se ele não for passado.",
            "n=${1:-100}",
          ),
          ex(
            "~/contest",
            ["stress.sh", "sol", "brute", "gen"],
            ["$ ls", "brute  gen  sol  stress.sh"],
            "Rode o script stress.sh com os argumentos sol, brute e 50.",
            "./stress.sh sol brute 50",
          ),
        ],
        practiceKinds: [],
      },
      {
        id: "u10-exit",
        unitId: "u10-scripts",
        title: "Código de saída",
        explanation:
          "Todo comando termina com um código de saída: 0 quer dizer que deu certo, e qualquer outro número, que falhou. O código do último comando fica em $?, e o próximo comando já o troca. Num script, exit 1 para tudo e avisa que houve falha. Com && o próximo comando só roda se o anterior deu certo, e com || só se ele falhou.",
        helpKeys: ["exit"],
        commands: ["$?", "exit 0", "exit 1", "cmd && ok", "cmd || falha"],
        example: {
          fixture: "scripts",
          scripts: [
            {
              file: "confere.sh",
              lines: [
                SHEBANG,
                ln("cmp -s out1 ans1", "cmp -s termina com 0 se os arquivos são iguais."),
                ln('echo "código do cmp: $?"', "$? mostra o código do último comando."),
                ln('cmp -s out1 out1 && echo "iguais"', "&& roda só se o cmp deu certo."),
                ln('cmp -s out1 ans1 || echo "diferentes"', "|| roda só se o cmp falhou."),
                ln("exit 1", "Termina o script com código 1 (falha)."),
                ln('echo "nunca aparece"', "Não roda: o exit já parou o script."),
              ],
            },
          ],
          steps: [
            {
              cmd: 'bash confere.sh; echo "saída: $?"',
              note: "Depois do script, $? mostra o 1 do exit.",
            },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            ["$ cat confere.sh", "#!/usr/bin/env bash"],
            "Termine o script indicando falha, com código 1.",
            "exit 1",
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            ["$ cmp -s out1 ans1"],
            "Mostre com echo o código de saída do último comando.",
            "echo $?",
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES, "ans1"],
            [...SCRIPT_LS],
            "Rode cmp -s out1 ans1 e, se ele falhar, mostre WA com echo.",
            "cmp -s out1 ans1 || echo WA",
          ),
        ],
        practiceKinds: [],
      },
    ],
  },
  {
    id: "u11-controle",
    number: 11,
    title: "Controle",
    lessons: [
      {
        id: "u11-if",
        unitId: "u11-controle",
        title: "Testes e if",
        explanation:
          "O teste [[ -f in1 ]] dá certo se o arquivo existe, -d testa uma pasta e -z testa um texto vazio. Para números use -eq, -ne, -lt, -le, -gt e -ge, ou escreva a conta em (( n < 5 )). O if roda o bloco do then quando o teste dá certo, o elif testa outra condição e o else pega o resto. Deixe espaço depois de [[ e antes de ]], senão o bash não reconhece o teste.",
        helpKeys: ["if"],
        commands: ["[[ -f in1 ]]", "[[ $n -lt 5 ]]", "(( n < 5 ))", "if …; then …; fi"],
        example: {
          fixture: "scripts",
          scripts: [
            {
              file: "tipo.sh",
              lines: [
                SHEBANG,
                ln("n=${1:-0}", "Número vindo do primeiro argumento (0 se faltar)."),
                ln("if [[ -f in1 ]]; then", "-f: verdadeiro se in1 existe e é arquivo."),
                ln('  echo "in1 existe"', "Bloco do then: roda quando o teste deu certo."),
                ln("fi", "fi fecha o if (é if de trás para frente)."),
                ln("if (( n > 10 )); then", "(( )) compara números com < e >."),
                ln('  echo "grande"', "Roda quando n passa de 10."),
                ln("elif [[ $n -eq 0 ]]; then", "-eq compara números dentro de [[ ]]."),
                ln('  echo "zero"', "Roda quando n é 0."),
                ln("else", "Nenhum teste deu certo."),
                ln('  echo "pequeno"', "Roda nos outros casos."),
                ln("fi", "Fecha o segundo if."),
              ],
            },
          ],
          steps: [
            { cmd: "bash tipo.sh 42", note: "42 passa de 10: grande." },
            { cmd: "bash tipo.sh", note: "Sem argumento, n vale 0: zero." },
            { cmd: "bash tipo.sh 3", note: "Nenhum dos dois: cai no else." },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            [...SCRIPT_LS],
            "Se o arquivo in1 existir, mostre ok com echo (if numa linha).",
            "if [[ -f in1 ]]; then echo ok; fi",
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            ["$ n=3"],
            "Se n for menor que 5, mostre menor com echo (use -lt e if numa linha).",
            "if [[ $n -lt 5 ]]; then echo menor; fi",
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            [...SCRIPT_LS],
            "Se a pasta tests não existir, crie-a com mkdir (if numa linha).",
            "if [[ ! -d tests ]]; then mkdir tests; fi",
            ["[[ -d tests ]] || mkdir tests"],
          ),
        ],
        practiceKinds: ["scripts"],
      },
      {
        id: "u11-loops",
        unitId: "u11-controle",
        title: "Laços",
        explanation:
          "O laço for f in in* repete o bloco uma vez para cada arquivo que começa com in, com o nome em $f. Já for (( i = 1; i <= n; i++ )) conta de 1 até n, como em C. O while read -r linha lê um arquivo linha a linha. O bloco do laço fica entre do e done.",
        helpKeys: [],
        commands: [
          "for f in in*; do …; done",
          "for (( i = 1; i <= n; i++ ))",
          "while read -r linha; do …; done < in1",
        ],
        example: {
          fixture: "scripts",
          scripts: [
            {
              file: "lacos.sh",
              lines: [
                SHEBANG,
                ln("for f in in*; do", "Uma volta para cada arquivo: in1, depois in2."),
                ln('  echo "arquivo $f"', "$f guarda o nome do arquivo da volta."),
                ln("done", "done fecha o laço."),
                ln("for (( i = 1; i <= 3; i++ )); do", "Conta de 1 a 3, como o for do C."),
                ln('  echo "volta $i"', "Mostra o número da volta."),
                ln("done", "Fecha o segundo laço."),
                ln("while read -r linha; do", "Lê uma linha por volta; -r mantém as barras."),
                ln('  echo "lido: $linha"', "Mostra a linha lida."),
                ln("done < in1", "< in1 entrega o arquivo ao read do laço."),
              ],
            },
          ],
          steps: [{ cmd: "bash lacos.sh", note: "Os três laços, um depois do outro." }],
        },
        exercises: [
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            [...SCRIPT_LS],
            "Para cada arquivo in*, rode ./a com ele como entrada (laço numa linha).",
            'for f in in*; do ./a < "$f"; done',
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            [...SCRIPT_LS],
            "Mostre os números de 1 a 10 com for (( )) e a variável i.",
            "for (( i = 1; i <= 10; i++ )); do echo $i; done",
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            [...SCRIPT_LS],
            "Leia in1 linha a linha com while read -r linha e mostre cada linha.",
            'while read -r linha; do echo "$linha"; done < in1',
          ),
        ],
        practiceKinds: ["scripts"],
      },
      {
        id: "u11-case",
        unitId: "u11-controle",
        title: "Escolher com case",
        explanation:
          "O case escolhe um bloco pelo valor de uma palavra, quase sempre o primeiro argumento. Cada opção termina com ) e o bloco dela termina com ;;. O padrão * pega qualquer valor que não casou antes, e esac fecha o case.",
        helpKeys: ["case"],
        commands: ['case "$1" in', "run) …;;", "a | b) …;;", "*) …;;", "esac"],
        example: {
          fixture: "scripts",
          scripts: [
            {
              file: "modo.sh",
              lines: [
                SHEBANG,
                ln('case "$1" in', "Escolhe pelo primeiro argumento."),
                ln('  run) echo "rodando os testes" ;;', "Opção para quando $1 é run."),
                ln('  stress | s) echo "stress test" ;;', "| aceita mais de um nome: stress ou s."),
                ln('  *) echo "uso: ./modo.sh run ou stress" ;;', "* pega qualquer outro valor."),
                ln("esac", "esac fecha o case (é case de trás para frente)."),
              ],
            },
          ],
          steps: [
            { cmd: "bash modo.sh run", note: "Casa com a opção run." },
            { cmd: "bash modo.sh s", note: "s casa com stress | s." },
            { cmd: "bash modo.sh", note: "Sem argumento, cai no *." },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            [...SCRIPT_LS],
            'Com case em "$1", rode ./a < in1 quando o valor for run (case numa linha).',
            'case "$1" in run) ./a < in1;; esac',
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            [...SCRIPT_LS],
            'Com case em "$1", mostre ajuda com echo quando o valor for -h.',
            'case "$1" in -h) echo ajuda;; esac',
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            [...SCRIPT_LS],
            'Com case em "$1", mostre WA para wa e AC para qualquer outro valor.',
            'case "$1" in wa) echo WA;; *) echo AC;; esac',
          ),
        ],
        practiceKinds: ["scripts"],
      },
      {
        id: "u11-func",
        unitId: "u11-controle",
        title: "Funções",
        explanation:
          'Uma função é um pequeno comando com nome: t() { ./a < "$1"; } cria o comando t. Dentro dela, $1 e $@ são os argumentos da função, não os do script. Já local x=1 cria uma variável que só existe dentro da função. O return 1 sai da função com código 1, como o exit faz com o script.',
        helpKeys: ["local"],
        commands: ["nome() { …; }", "local x=1", "return 1", "nome in1"],
        example: {
          fixture: "scripts",
          scripts: [
            {
              file: "funcoes.sh",
              lines: [
                SHEBANG,
                ln("t() {", "Define a função t."),
                ln('  local entrada="$1"', "local: a variável só existe dentro de t."),
                ln('  echo "== $entrada =="', "Mostra qual teste vai rodar."),
                ln(
                  '  ./a < "$entrada" 2> /dev/null',
                  "Roda o programa; 2> /dev/null esconde o stderr.",
                ),
                ln("}", "Fecha o corpo da função."),
                ln("existe() {", "Uma função que só testa."),
                ln('  [[ -f "$1" ]] || return 1', "return 1 avisa que o arquivo não existe."),
                ln("}", "Fecha a segunda função."),
                ln("t in1", "Chama t como um comando, com in1 em $1."),
                ln('existe in9 || echo "in9 não existe"', "Usa o código da função com ||."),
              ],
            },
          ],
          steps: [{ cmd: "bash funcoes.sh", note: "Roda t com in1 e testa in9." }],
        },
        exercises: [
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            [...SCRIPT_LS],
            'Defina a função t que roda ./a com a entrada vinda do arquivo "$1".',
            't() { ./a < "$1"; }',
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            ["$ t() {"],
            "Dentro de uma função, crie a variável local n com valor 0.",
            "local n=0",
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            ["$ existe() {"],
            "Saia da função com código 1.",
            "return 1",
          ),
        ],
        practiceKinds: ["scripts"],
      },
      {
        id: "u11-strict",
        unitId: "u11-controle",
        title: "Modo estrito",
        explanation:
          "Com set -euo pipefail no começo do script, os erros ficam visíveis. O -e para o script no primeiro comando que falhar, o -u acusa variável não definida (um erro de digitação, por exemplo) e o pipefail faz o pipe falhar se qualquer parte dele falhar. Para um comando que pode falhar de propósito, use || true.",
        helpKeys: ["set"],
        commands: ["set -euo pipefail", "cmd || true"],
        example: {
          fixture: "scripts",
          scripts: [
            {
              file: "estrito.sh",
              lines: [
                SHEBANG,
                ln(
                  "set -euo pipefail",
                  "-e para no erro, -u acusa variável indefinida, pipefail vê erro no pipe.",
                ),
                ln(
                  "cmp -s out1 ans1 || true",
                  "|| true: aqui a falha é esperada e não para o script.",
                ),
                ln('echo "passo 1 ok"', "Esta linha roda."),
                ln(
                  "cat in9 | wc -l",
                  "in9 não existe: com pipefail o pipe falha e o -e para tudo.",
                ),
                ln('echo "nunca aparece"', "Não roda: o script parou na linha anterior."),
              ],
            },
          ],
          steps: [
            {
              cmd: 'bash estrito.sh; echo "saída: $?"',
              note: "O script para no cat e sai com código 1.",
            },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            ["$ cat run.sh", "#!/usr/bin/env bash"],
            "Ligue o modo estrito: parar no erro, variável indefinida e erro no pipe.",
            "set -euo pipefail",
            ["set -e -u -o pipefail", "set -eu -o pipefail"],
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES, "ans1"],
            ["$ set -e"],
            "Rode cmp -s out1 ans1 sem deixar a falha parar o script.",
            "cmp -s out1 ans1 || true",
          ),
          ex(
            "~/contest",
            [...SCRIPT_FILES],
            ["$ cat run.sh", "#!/usr/bin/env bash"],
            "Ligue só a parada no primeiro comando que falhar.",
            "set -e",
          ),
        ],
        practiceKinds: ["scripts"],
      },
      {
        id: "u11-prova",
        unitId: "u11-controle",
        title: "Scripts de prova",
        explanation:
          "O run.sh compila a solução, roda cada entrada inN e compara a saída com outN, imprimindo OK ou WA. O stress.sh sol brute 100 gera testes com ./gen, compara as duas soluções e para no primeiro teste que difere. Os dois juntam tudo destas duas unidades: argumentos, if, laços e modo estrito.",
        helpKeys: [],
        commands: ["./run.sh", "./stress.sh sol brute 100"],
        example: {
          fixture: "scripts",
          scripts: [
            {
              file: "run.sh",
              lines: [
                SHEBANG,
                ln("set -euo pipefail", "Para no primeiro erro (inclusive de compilação)."),
                ln("g++ -O2 -std=gnu++20 a.cpp -o a", "Compila com as flags do juiz."),
                ln("n=$(ls in* | wc -l)", "Conta quantos arquivos de entrada existem."),
                ln("for (( i = 1; i <= n; i++ )); do", "Testa in1, in2, … um por volta."),
                ln('  ./a < "in$i" > saida 2> /dev/null', "Roda a solução e guarda a saída."),
                ln(
                  '  if diff -Z saida "out$i" > /dev/null; then',
                  "diff -Z ignora espaço no fim da linha.",
                ),
                ln('    echo "teste $i: OK"', "Saída igual à esperada."),
                ln("  else", "Saída diferente."),
                ln('    echo "teste $i: WA"', "Avisa o teste que errou."),
                ln("  fi", "Fecha o if."),
                ln("done", "Fecha o laço."),
                ln("rm -f saida", "Apaga o arquivo temporário."),
              ],
            },
            {
              file: "stress.sh",
              lines: [
                SHEBANG,
                ln("set -euo pipefail", "Modo estrito, como no run.sh."),
                ln("sol=$1", "Primeiro argumento: a solução a testar."),
                ln("brute=$2", "Segundo: a solução lenta e certa."),
                ln("n=${3:-100}", "Terceiro, opcional: quantos testes (100 se faltar)."),
                ln("for (( i = 1; i <= n; i++ )); do", "Um teste por volta."),
                ln('  ./gen "$i" > entrada', "Gera o teste i; a seed é o próprio i."),
                ln('  "./$sol" < entrada > saida1', "Roda a solução no teste."),
                ln('  "./$brute" < entrada > saida2', "Roda a força bruta no mesmo teste."),
                ln(
                  '  cmp -s saida1 saida2 || { echo "WA no teste $i"; cat entrada; exit 1; }',
                  "Se diferem: mostra o teste e sai com código 1.",
                ),
                ln("done", "Fecha o laço."),
                ln('echo "$n testes OK"', "Chegou aqui: nenhum teste diferiu."),
              ],
            },
          ],
          steps: [
            { cmd: "chmod +x run.sh stress.sh", note: "Deixa os dois scripts executáveis." },
            { cmd: "./run.sh", note: "in1 passa e in2 dá WA." },
            {
              cmd: './stress.sh sol brute 10; echo "saída: $?"',
              note: "sol erra no teste 7: o stress para ali, com código 1.",
            },
            { cmd: "./stress.sh brute brute 5", note: "A mesma solução nunca difere de si." },
          ],
        },
        exercises: [
          ex(
            "~/contest",
            ["stress.sh", "sol", "brute", "gen"],
            ["$ ls", "brute  gen  sol  stress.sh"],
            "Rode o stress.sh com sol, brute e 200 testes.",
            "./stress.sh sol brute 200",
          ),
          ex(
            "~/contest",
            ["saida1", "saida2", "entrada"],
            ["$ ls", "entrada  saida1  saida2"],
            "Se saida1 e saida2 forem diferentes (cmp -s), mostre WA e saia com código 1.",
            "cmp -s saida1 saida2 || { echo WA; exit 1; }",
          ),
          ex(
            "~/contest",
            ["gen", "sol", "brute"],
            ["$ n=50"],
            'Para i de 1 a n com for (( )), rode ./gen "$i" > entrada.',
            'for (( i = 1; i <= n; i++ )); do ./gen "$i" > entrada; done',
          ),
        ],
        unlocksKind: "scripts",
        practiceKinds: ["scripts"],
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
