import type { LessonId } from "../learn/curriculum";
import type { CheckContext } from "./check";
import type { OutputCheckKind } from "./check-output";
import type { GdbCmdKind, StopState } from "./cmd-drill";
import { COMMAND_TABLE, parseCommand, type GdbAction } from "./commands";
import type { GdbOutKind } from "./out-drill";
import { programById } from "./programs";

export type GdbExampleStep = {
  readonly cmd: string;
  readonly note: string;
};

export type GdbLessonExample = {
  readonly programId: string;
  readonly setup?: readonly string[];
  readonly steps: readonly GdbExampleStep[];
};

export type GdbCommandExercise = {
  readonly mode?: "command";
  readonly programId: string;
  readonly stop: StopState;
  readonly prompt: string;
  readonly canonical: string;
  readonly expected: GdbAction;
  readonly context: CheckContext;
};

export type GdbOutputExercise = {
  readonly mode: "output";
  readonly programId: string;
  readonly stop: StopState;
  readonly prompt: string;
  readonly command: string;
  readonly commandKind: OutputCheckKind;
  readonly canonical: string;
  readonly reason: string;
};

export type GdbLessonExercise = GdbCommandExercise | GdbOutputExercise;

export type GdbLesson = {
  readonly id: LessonId;
  readonly unitId: string;
  readonly title: string;
  readonly explanation: string;
  readonly helpKeys: readonly string[];
  readonly outputHelpKeys?: readonly string[];
  readonly commands: readonly string[];
  readonly example: GdbLessonExample;
  readonly exercises: readonly [GdbLessonExercise, GdbLessonExercise, GdbLessonExercise];
  readonly practiceKinds: readonly GdbCmdKind[];
  readonly practiceOutputKinds?: readonly GdbOutKind[];
};

export type OutputRefEntry = {
  readonly key: string;
  readonly syntax: string;
  readonly text: string;
};

export type GdbUnit = {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly lessons: readonly GdbLesson[];
};

function actionOf(cmd: string): GdbAction {
  const res = parseCommand(cmd);
  if (!res.ok) throw new Error("invalid lesson command: " + cmd + " (" + res.error + ")");
  return res.action;
}

function emptyStop(sessionLines: readonly string[]): StopState {
  return {
    line: null,
    running: false,
    breakpoints: [],
    displays: [],
    frames: [],
    currentFrame: 0,
    sessionLines,
  };
}

function stopAt(
  programId: string,
  line: number,
  sessionLines: readonly string[],
  extra?: Partial<StopState>,
): StopState {
  const prog = programById(programId);
  return {
    line,
    running: true,
    breakpoints: extra?.breakpoints ?? [{ id: 1, line, enabled: true }],
    displays: extra?.displays ?? [],
    frames: extra?.frames ?? [{ index: 0, func: "main", file: prog.file, line, isUser: true }],
    currentFrame: extra?.currentFrame ?? 0,
    ...(extra?.signal !== undefined ? { signal: extra.signal } : {}),
    sessionLines,
  };
}

function ex(
  programId: string,
  stop: StopState,
  prompt: string,
  canonical: string,
): GdbLessonExercise {
  const prog = programById(programId);
  return {
    programId,
    stop,
    prompt,
    canonical,
    expected: actionOf(canonical),
    context: {
      file: prog.file,
      currentFrame: stop.currentFrame,
      frameCount: Math.max(1, stop.frames.length),
    },
  };
}

function outEx(
  programId: string,
  line: number,
  sessionLines: readonly string[],
  command: string,
  commandKind: OutputCheckKind,
  canonical: string,
  reason: string,
): GdbOutputExercise {
  return {
    mode: "output",
    programId,
    stop: stopAt(programId, line, sessionLines),
    prompt: `O que o gdb imprime ao executar: ${command}`,
    command,
    commandKind,
    canonical,
    reason,
  };
}

export const GDB_UNITS: readonly GdbUnit[] = [
  // Unit 1: Preparar
  {
    id: "u1-preparar",
    number: 1,
    title: "Preparar",
    lessons: [
      {
        id: "u1-compile",
        unitId: "u1-preparar",
        title: "Compilar com -g -O0 e abrir no gdb",
        explanation:
          "Compile com g++ -g -O0 sol.cpp -o sol: -g grava linhas e variáveis no binário, e -O0 impede otimizações que escondem variáveis ou embaralham linhas. Depois abra o executável no depurador com gdb ./sol.",
        helpKeys: ["gdb"],
        commands: ["g++ -g -O0 sol.cpp -o sol", "gdb ./sol", "run < in.txt"],
        example: {
          programId: "sum-loop",
          steps: [
            { cmd: "start", note: "abre e para na primeira linha de main com símbolos de -g" },
            { cmd: "list", note: "mostra as linhas do código gravadas no binário" },
          ],
        },
        exercises: [
          ex(
            "sum-loop",
            emptyStop(["$ g++ -g -O0 sol.cpp -o sol"]),
            "Abra o executável ./sol no gdb.",
            "gdb ./sol",
          ),
          ex(
            "stdin-sum",
            emptyStop(["Reading symbols from ./stdin_sum..."]),
            "Execute o programa lendo a entrada do arquivo in.txt.",
            "run < in.txt",
          ),
          ex(
            "prefix-sum",
            emptyStop(["$ g++ -g -O0 prefix.cpp -o prefix"]),
            "Abra o executável ./prefix no gdb.",
            "gdb ./prefix",
          ),
        ],
        practiceKinds: ["iniciar"],
      },
      {
        id: "u1-run",
        unitId: "u1-preparar",
        title: "Iniciar com run e start",
        explanation:
          "run (ou r) executa o programa do início até um breakpoint, erro ou término, e aceita redirecionamento < in.txt. start cria uma parada temporária em main e já começa a execução.",
        helpKeys: ["run", "start"],
        commands: ["run", "run < in.txt", "start"],
        example: {
          programId: "stdin-sum",
          steps: [
            { cmd: "start", note: "para automaticamente na entrada de main" },
            { cmd: "break 8", note: "marca a linha de leitura de x" },
            { cmd: "run < in.txt", note: "reinicia lendo os dados de in.txt" },
          ],
        },
        exercises: [
          ex(
            "prefix-sum",
            emptyStop(["Reading symbols from ./prefix..."]),
            "Inicie o programa parando automaticamente na entrada de main.",
            "start",
          ),
          ex(
            "sum-loop",
            {
              ...emptyStop(["Breakpoint 1 at ADDR: file sol.cpp, line 7."]),
              breakpoints: [{ id: 1, line: 7, enabled: true }],
            },
            "Execute o programa desde o início até bater no breakpoint.",
            "run",
          ),
          ex(
            "stdin-sum",
            {
              ...emptyStop(["Breakpoint 1 at ADDR: file stdin_sum.cpp, line 8."]),
              breakpoints: [{ id: 1, line: 8, enabled: true }],
            },
            "Execute o programa redirecionando a entrada de in.txt.",
            "run < in.txt",
          ),
        ],
        practiceKinds: ["iniciar"],
      },
      {
        id: "u1-stop",
        unitId: "u1-preparar",
        title: "Encerrar com kill e quit",
        explanation:
          "kill (ou k) encerra o processo em depuração mantendo o gdb e seus breakpoints abertos. quit (ou q) fecha o gdb por completo.",
        helpKeys: ["kill", "quit"],
        commands: ["kill", "quit"],
        example: {
          programId: "sum-loop",
          setup: ["break 7", "run"],
          steps: [
            { cmd: "kill", note: "mata o processo em execução sem perder o breakpoint 1" },
            { cmd: "info breakpoints", note: "confirma que o breakpoint 1 continua lá" },
          ],
        },
        exercises: [
          ex(
            "sum-loop",
            stopAt("sum-loop", 7, ["Breakpoint 1, main () at sol.cpp:7"]),
            "Encerre o processo atual sem sair do gdb.",
            "kill",
          ),
          ex("sum-loop", emptyStop(["[Inferior 1 (process N) killed]"]), "Saia do gdb.", "quit"),
          ex(
            "prefix-sum",
            stopAt("prefix-sum", 11, ["Breakpoint 1, main () at prefix.cpp:11"]),
            "Interrompa a execução atual mantendo a sessão do gdb aberta.",
            "kill",
          ),
        ],
        practiceKinds: ["iniciar"],
      },
    ],
  },

  // Unit 2: Pontos de parada
  {
    id: "u2-breakpoints",
    number: 2,
    title: "Pontos de parada",
    lessons: [
      {
        id: "u2-break",
        unitId: "u2-breakpoints",
        title: "Parar com break",
        explanation:
          "break (ou b) cria um ponto de parada permanente em uma linha (b 7), em uma função (b range_sum) ou em arquivo:linha (b sol.cpp:7). Quando o programa chega ali, o gdb pausa antes de executar aquela linha.",
        helpKeys: ["break"],
        commands: ["break <linha>", "break <função>", "break <arquivo:linha>"],
        example: {
          programId: "prefix-sum",
          steps: [
            { cmd: "break 11", note: "marca parada na linha 11 de prefix.cpp" },
            { cmd: "break range_sum", note: "marca parada na entrada da função range_sum" },
            { cmd: "run", note: "executa até o primeiro breakpoint (linha 11)" },
          ],
        },
        exercises: [
          ex(
            "sum-loop",
            emptyStop(["Reading symbols from ./sol..."]),
            "Crie um breakpoint na linha 7.",
            "break 7",
          ),
          ex(
            "prefix-sum",
            emptyStop(["Reading symbols from ./prefix..."]),
            "Crie um breakpoint na função range_sum.",
            "break range_sum",
          ),
          ex(
            "binary-search",
            emptyStop(["Reading symbols from ./bsearch..."]),
            "Crie um breakpoint na linha 6 de bsearch.cpp.",
            "break bsearch.cpp:6",
          ),
        ],
        practiceKinds: ["break-linha", "break-funcao"],
      },
      {
        id: "u2-tbreak",
        unitId: "u2-breakpoints",
        title: "Parada única com tbreak",
        explanation:
          "tbreak (ou tb) cria um ponto de parada temporário que se apaga sozinho assim que é atingido. É ideal para pular até uma linha uma única vez sem precisar limpar breakpoints depois.",
        helpKeys: ["tbreak"],
        commands: ["tbreak <linha>", "tbreak <função>"],
        example: {
          programId: "sum-loop",
          steps: [
            { cmd: "tbreak 7", note: "cria breakpoint temporário (Disp = del)" },
            { cmd: "run", note: "para uma vez na linha 7 e remove o breakpoint" },
            { cmd: "info breakpoints", note: "não resta nenhum breakpoint ativo" },
          ],
        },
        exercises: [
          ex(
            "sum-loop",
            emptyStop(["Reading symbols from ./sol..."]),
            "Crie um breakpoint temporário na linha 7.",
            "tbreak 7",
          ),
          ex(
            "gcd-rec",
            emptyStop(["Reading symbols from ./gcd..."]),
            "Crie um breakpoint temporário na função lcm.",
            "tbreak lcm",
          ),
          ex(
            "two-pointers",
            emptyStop(["Reading symbols from ./twoptr..."]),
            "Crie um breakpoint temporário na linha 12.",
            "tbreak 12",
          ),
        ],
        practiceKinds: ["tbreak"],
      },
      {
        id: "u2-info-bp",
        unitId: "u2-breakpoints",
        title: "Listar paradas com info breakpoints",
        explanation:
          "info breakpoints (ou i b) lista todos os breakpoints e watchpoints com seus números, estado (y/n), condições e quantidade de acertos. Você precisa desses números para editar ou apagar pontos específicos.",
        helpKeys: ["info breakpoints"],
        commands: ["info breakpoints", "i b"],
        example: {
          programId: "sum-loop",
          steps: [
            { cmd: "break 6", note: "cria breakpoint 1" },
            { cmd: "break 9", note: "cria breakpoint 2" },
            { cmd: "info breakpoints", note: "mostra tabela com os dois pontos e seus IDs" },
          ],
        },
        exercises: [
          ex(
            "sum-loop",
            stopAt("sum-loop", 6, ["Breakpoint 1, main () at sol.cpp:6"]),
            "Liste todos os pontos de parada criados.",
            "info breakpoints",
          ),
          ex(
            "prefix-sum",
            stopAt("prefix-sum", 11, ["Breakpoint 1, main () at prefix.cpp:11"]),
            "Consulte o número e o estado dos breakpoints atuais.",
            "info breakpoints",
          ),
          ex(
            "two-pointers",
            stopAt("two-pointers", 7, ["Breakpoint 1, main () at twoptr.cpp:7"]),
            "Exiba a tabela de breakpoints usando o comando completo ou i b.",
            "info breakpoints",
          ),
        ],
        practiceKinds: ["gerir"],
      },
      {
        id: "u2-manage-bp",
        unitId: "u2-breakpoints",
        title: "Gerir com delete, disable e enable",
        explanation:
          "delete N (ou d N) remove o breakpoint N para sempre; sem número, apaga todos. disable N pausa o breakpoint N sem perdê-lo, e enable N volta a ativá-lo.",
        helpKeys: ["delete", "disable", "enable"],
        commands: ["delete <N>", "disable <N>", "enable <N>"],
        example: {
          programId: "sum-loop",
          setup: ["break 7", "break 9"],
          steps: [
            { cmd: "disable 1", note: "desativa o breakpoint 1 (Enb = n)" },
            { cmd: "enable 1", note: "reativa o breakpoint 1 (Enb = y)" },
            { cmd: "delete 2", note: "remove definitivamente o breakpoint 2" },
            { cmd: "info breakpoints", note: "confirma que restou apenas o breakpoint 1 ativo" },
          ],
        },
        exercises: [
          ex(
            "sum-loop",
            stopAt("sum-loop", 7, ["Breakpoint 1, main () at sol.cpp:7"], {
              breakpoints: [
                { id: 1, line: 7, enabled: true },
                { id: 2, line: 9, enabled: true },
              ],
            }),
            "Desative o breakpoint 1 sem apagá-lo.",
            "disable 1",
          ),
          ex(
            "sum-loop",
            stopAt("sum-loop", 7, ["Breakpoint 1, main () at sol.cpp:7"], {
              breakpoints: [
                { id: 1, line: 7, enabled: true },
                { id: 2, line: 9, enabled: false },
              ],
            }),
            "Reative o breakpoint 2 que está desativado.",
            "enable 2",
          ),
          ex(
            "sum-loop",
            stopAt("sum-loop", 7, ["Breakpoint 1, main () at sol.cpp:7"], {
              breakpoints: [
                { id: 1, line: 7, enabled: true },
                { id: 2, line: 9, enabled: true },
              ],
            }),
            "Apague apenas o breakpoint 2.",
            "delete 2",
          ),
        ],
        practiceKinds: ["gerir"],
      },
    ],
  },

  // Unit 3: Andar
  {
    id: "u3-andar",
    number: 3,
    title: "Andar",
    lessons: [
      {
        id: "u3-next-step",
        unitId: "u3-andar",
        title: "Avançar com next e entrar com step",
        explanation:
          "next (ou n) executa a linha inteira de uma vez, pulando por cima de chamadas de função. step (ou s) entra na função chamada para inspecioná-la linha a linha.",
        helpKeys: ["next", "step"],
        commands: ["next", "step"],
        example: {
          programId: "prefix-sum",
          setup: ["break 13", "run"],
          steps: [
            { cmd: "step", note: "entra em range_sum na linha 4" },
            { cmd: "next", note: "avança uma linha dentro de range_sum" },
          ],
        },
        exercises: [
          ex(
            "prefix-sum",
            stopAt("prefix-sum", 13, ["Breakpoint 1, main () at prefix.cpp:13"]),
            "Execute a linha 13 pulando a chamada de range_sum.",
            "next",
          ),
          ex(
            "prefix-sum",
            stopAt("prefix-sum", 13, ["Breakpoint 1, main () at prefix.cpp:13"]),
            "Entre na chamada da função range_sum.",
            "step",
          ),
          ex(
            "struct-point",
            stopAt("struct-point", 17, ["Breakpoint 1, main () at point.cpp:17"]),
            "Avance para a linha 18 sem entrar em dist2.",
            "next",
          ),
        ],
        practiceKinds: ["andar"],
      },
      {
        id: "u3-continue-finish",
        unitId: "u3-andar",
        title: "Seguir com continue e sair com finish",
        explanation:
          "continue (ou c) retoma a execução normal até o próximo breakpoint ou fim do programa. finish (ou fin) roda o resto da função atual e para logo ao voltar ao chamador, imprimindo o valor retornado.",
        helpKeys: ["continue", "finish"],
        commands: ["continue", "finish"],
        example: {
          programId: "binary-search",
          setup: ["break 5", "run", "delete 1"],
          steps: [
            { cmd: "finish", note: "termina lower_idx e mostra o valor retornado em main" },
            { cmd: "continue", note: "segue até o fim do programa" },
          ],
        },
        exercises: [
          ex(
            "binary-search",
            stopAt("binary-search", 5, ["Breakpoint 1, lower_idx (...) at bsearch.cpp:5"], {
              frames: [
                { index: 0, func: "lower_idx", file: "bsearch.cpp", line: 5, isUser: true },
                { index: 1, func: "main", file: "bsearch.cpp", line: 16, isUser: true },
              ],
            }),
            "Execute até a função lower_idx retornar para main.",
            "finish",
          ),
          ex(
            "sum-loop",
            stopAt("sum-loop", 7, ["Breakpoint 1, main () at sol.cpp:7"]),
            "Retome a execução até a próxima parada.",
            "continue",
          ),
          ex(
            "gcd-rec",
            stopAt("gcd-rec", 3, ["Breakpoint 1, gcd (a=18, b=12) at gcd.cpp:3"], {
              frames: [
                { index: 0, func: "gcd", file: "gcd.cpp", line: 3, isUser: true },
                { index: 1, func: "lcm", file: "gcd.cpp", line: 7, isUser: true },
              ],
            }),
            "Rode até a chamada atual de gcd retornar.",
            "finish",
          ),
        ],
        practiceKinds: ["andar"],
      },
      {
        id: "u3-until-advance",
        unitId: "u3-andar",
        title: "Saltar com until e advance",
        explanation:
          "until (ou u) sai do laço atual ou avança até uma linha adiante no mesmo frame. advance <alvo> corre até qualquer linha ou função sem criar breakpoint permanente, parando também se sair do frame atual.",
        helpKeys: ["until", "advance"],
        commands: ["until [linha]", "advance <alvo>"],
        example: {
          programId: "sum-loop",
          setup: ["break 7", "run", "delete 1"],
          steps: [
            { cmd: "until 9", note: "termina o laço e para direto na linha 9" },
            { cmd: "advance 10", note: "avança até o return 0 na linha 10" },
          ],
        },
        exercises: [
          ex(
            "sum-loop",
            stopAt("sum-loop", 7, ["Breakpoint 1, main () at sol.cpp:7"]),
            "Saia do laço indo até a linha 9 com until.",
            "until 9",
          ),
          ex(
            "sum-loop",
            stopAt("sum-loop", 5, ["Breakpoint 1, main () at sol.cpp:5"]),
            "Avance até a linha 9 usando advance.",
            "advance 9",
          ),
          ex(
            "two-pointers",
            stopAt("two-pointers", 7, ["Breakpoint 1, main () at twoptr.cpp:7"]),
            "Salte o laço até a linha 14 com until.",
            "until 14",
          ),
        ],
        practiceKinds: ["andar"],
      },
      {
        id: "u3-repeat",
        unitId: "u3-andar",
        title: "Contagens e repetir com Enter",
        explanation:
          "Comandos de passo aceitam contagem: next 3 avança 3 linhas e continue 4 pula 3 paradas e só para na 4ª. No gdb interativo, apertar Enter numa linha vazia repete o último comando.",
        helpKeys: [],
        commands: ["next <N>", "step <N>", "continue <N>", "Enter (repetir)"],
        example: {
          programId: "sum-loop",
          setup: ["break 7", "run"],
          steps: [
            { cmd: "continue 3", note: "ignora 2 passagens e para na 3ª iteração (i = 3)" },
            { cmd: "print i", note: "confirma que i avançou 3 iterações" },
          ],
        },
        exercises: [
          ex(
            "sum-loop",
            stopAt("sum-loop", 5, ["Breakpoint 1, main () at sol.cpp:5"]),
            "Avance 3 linhas de uma vez usando contagem no next.",
            "next 3",
          ),
          ex(
            "sum-loop",
            stopAt("sum-loop", 7, ["Breakpoint 1, main () at sol.cpp:7"]),
            "Continue parando somente na 4ª próxima passagem pelo breakpoint.",
            "continue 4",
          ),
          ex(
            "sum-loop",
            stopAt("sum-loop", 5, ["Breakpoint 1, main () at sol.cpp:5"]),
            "Avance 2 passos entrando em chamadas com step.",
            "step 2",
          ),
        ],
        practiceKinds: ["andar"],
      },
    ],
  },

  // Unit 4: Olhar
  {
    id: "u4-olhar",
    number: 4,
    title: "Olhar",
    lessons: [
      {
        id: "u4-print",
        unitId: "u4-olhar",
        title: "Inspecionar valores com print",
        explanation:
          "print (ou p) avalia qualquer expressão C++ no frame atual e mostra o resultado (p sum, p a[i], p a.x - b.x). Cada valor fica salvo no histórico $1, $2, ...",
        helpKeys: ["print"],
        commands: ["print <expr>", "p <expr>"],
        example: {
          programId: "sum-loop",
          setup: ["break 7", "run"],
          steps: [
            { cmd: "print i", note: "mostra o índice atual do laço" },
            { cmd: "print a[i]", note: "avalia o elemento do array" },
            { cmd: "next", note: "executa sum += a[i]" },
            { cmd: "print sum", note: "mostra o novo valor de sum" },
          ],
        },
        exercises: [
          ex(
            "sum-loop",
            stopAt("sum-loop", 7, ["Breakpoint 1, main () at sol.cpp:7"]),
            "Imprima o valor atual de sum.",
            "print sum",
          ),
          ex(
            "sum-loop",
            stopAt("sum-loop", 7, ["Breakpoint 1, main () at sol.cpp:7"]),
            "Imprima o elemento a[i].",
            "print a[i]",
          ),
          ex(
            "struct-point",
            stopAt("struct-point", 8, ["Breakpoint 1, dist2 (...) at point.cpp:8"]),
            "Imprima o campo a.x.",
            "print a.x",
          ),
        ],
        practiceKinds: ["olhar"],
      },
      {
        id: "u4-display",
        unitId: "u4-olhar",
        title: "Acompanhar com display e undisplay",
        explanation:
          "display <expr> imprime a expressão automaticamente toda vez que o programa para, poupando print repetido em laços. undisplay N remove o item N da lista automática.",
        helpKeys: ["display", "undisplay"],
        commands: ["display <expr>", "undisplay <N>"],
        example: {
          programId: "sum-loop",
          setup: ["break 7", "run"],
          steps: [
            { cmd: "display sum", note: "registra sum como display #1" },
            { cmd: "continue", note: "na próxima parada, sum aparece automaticamente" },
            { cmd: "undisplay 1", note: "remove o display #1" },
          ],
        },
        exercises: [
          ex(
            "sum-loop",
            stopAt("sum-loop", 7, ["Breakpoint 1, main () at sol.cpp:7"]),
            "Mostre sum automaticamente a cada parada.",
            "display sum",
          ),
          ex(
            "sum-loop",
            stopAt("sum-loop", 7, ["Breakpoint 1, main () at sol.cpp:7", "1: sum = 0"], {
              displays: [{ id: 1, expr: "sum" }],
            }),
            "Remova o display número 1.",
            "undisplay 1",
          ),
          ex(
            "two-pointers",
            stopAt("two-pointers", 7, ["Breakpoint 1, main () at twoptr.cpp:7"]),
            "Acompanhe cur automaticamente a cada parada.",
            "display cur",
          ),
        ],
        practiceKinds: ["olhar"],
      },
      {
        id: "u4-info-vars",
        unitId: "u4-olhar",
        title: "Ver variáveis com info locals e info args",
        explanation:
          "info locals lista todas as variáveis locais do frame atual de uma vez. info args mostra todos os parâmetros recebidos pela função selecionada.",
        helpKeys: ["info locals", "info args"],
        commands: ["info locals", "info args"],
        example: {
          programId: "binary-search",
          setup: ["break 6", "run"],
          steps: [
            { cmd: "info args", note: "mostra a, n e target recebidos por lower_idx" },
            { cmd: "info locals", note: "mostra lo, hi e mid do frame atual" },
          ],
        },
        exercises: [
          ex(
            "binary-search",
            stopAt("binary-search", 6, ["Breakpoint 1, lower_idx (...) at bsearch.cpp:6"]),
            "Liste todas as variáveis locais de lower_idx.",
            "info locals",
          ),
          ex(
            "binary-search",
            stopAt("binary-search", 6, ["Breakpoint 1, lower_idx (...) at bsearch.cpp:6"]),
            "Liste os parâmetros recebidos por lower_idx.",
            "info args",
          ),
          ex(
            "gcd-rec",
            stopAt("gcd-rec", 3, ["Breakpoint 1, gcd (a=48, b=18) at gcd.cpp:3"]),
            "Mostre os argumentos desta chamada de gcd.",
            "info args",
          ),
        ],
        practiceKinds: ["olhar"],
      },
      {
        id: "u4-list",
        unitId: "u4-olhar",
        title: "Ler o código com list",
        explanation:
          "list (ou l) exibe 10 linhas do código-fonte ao redor da linha atual, de um número (l 12) ou de uma função (l lower_idx). Ajuda a conferir números de linha sem sair do terminal do gdb.",
        helpKeys: ["list"],
        commands: ["list", "list <linha>", "list <função>"],
        example: {
          programId: "binary-search",
          steps: [
            { cmd: "list lower_idx", note: "mostra o código ao redor de lower_idx" },
            { cmd: "list 15", note: "mostra o código ao redor da linha 15" },
          ],
        },
        exercises: [
          ex(
            "binary-search",
            stopAt("binary-search", 6, ["Breakpoint 1, lower_idx (...) at bsearch.cpp:6"]),
            "Mostre o código ao redor da linha atual.",
            "list",
          ),
          ex(
            "binary-search",
            stopAt("binary-search", 6, ["Breakpoint 1, lower_idx (...) at bsearch.cpp:6"]),
            "Mostre o código da função lower_idx.",
            "list lower_idx",
          ),
          ex(
            "sum-loop",
            stopAt("sum-loop", 5, ["Breakpoint 1, main () at sol.cpp:5"]),
            "Mostre o código ao redor da linha 9.",
            "list 9",
          ),
        ],
        practiceKinds: ["olhar"],
      },
    ],
  },

  // Unit 5: Pilha
  {
    id: "u5-pilha",
    number: 5,
    title: "Pilha",
    lessons: [
      {
        id: "u5-backtrace",
        unitId: "u5-pilha",
        title: "Ler a pilha com backtrace",
        explanation:
          "backtrace (ou bt, where) mostra a pilha completa de chamadas do frame #0 (onde o programa parou) até main. Em recursões como DFS, cada linha revela os argumentos de cada nível.",
        helpKeys: ["backtrace"],
        commands: ["backtrace", "bt", "where"],
        example: {
          programId: "dfs-tree",
          setup: ["break 6 if u == 4", "run"],
          steps: [{ cmd: "bt", note: "lista a cadeia dfs(4) <- dfs(2) <- dfs(1) <- main" }],
        },
        exercises: [
          ex(
            "dfs-tree",
            stopAt("dfs-tree", 6, ["Breakpoint 1, dfs (u=4, parent=2, depth=2) at dfs.cpp:6"]),
            "Exiba toda a pilha de chamadas atual.",
            "bt",
          ),
          ex(
            "gcd-rec",
            stopAt("gcd-rec", 3, ["Breakpoint 1, gcd (a=6, b=0) at gcd.cpp:3"]),
            "Mostre a pilha de chamadas recursivas de gcd.",
            "backtrace",
          ),
          ex(
            "dfs-tree",
            stopAt("dfs-tree", 6, ["Breakpoint 1, dfs (u=4, parent=2, depth=2) at dfs.cpp:6"]),
            "Mostre apenas os 2 frames mais internos da pilha.",
            "bt 2",
          ),
        ],
        practiceKinds: ["pilha"],
      },
      {
        id: "u5-frame",
        unitId: "u5-pilha",
        title: "Navegar com frame, up e down",
        explanation:
          "frame N (ou f N) pula direto para o frame #N da pilha para inspecionar suas variáveis locais. up [N] sobe N frames rumo ao chamador e down [N] desce rumo ao frame #0.",
        helpKeys: ["frame", "up", "down"],
        commands: ["frame <N>", "up [N]", "down [N]"],
        example: {
          programId: "dfs-tree",
          setup: ["break 6 if u == 4", "run"],
          steps: [
            { cmd: "up", note: "sobe do frame #0 (u=4) para o #1 (u=2)" },
            { cmd: "print u", note: "lê o u do chamador no frame #1" },
            { cmd: "frame 3", note: "pula direto para main (#3)" },
            { cmd: "down", note: "desce para o frame #2 (u=1)" },
          ],
        },
        exercises: [
          ex(
            "dfs-tree",
            stopAt("dfs-tree", 6, ["#0 dfs(4)  #1 dfs(2)  #2 dfs(1)  #3 main()"], {
              frames: [
                { index: 0, func: "dfs", file: "dfs.cpp", line: 6, isUser: true },
                { index: 1, func: "dfs", file: "dfs.cpp", line: 9, isUser: true },
                { index: 2, func: "dfs", file: "dfs.cpp", line: 9, isUser: true },
                { index: 3, func: "main", file: "dfs.cpp", line: 19, isUser: true },
              ],
              currentFrame: 0,
            }),
            "Vá para o frame #2 da pilha.",
            "frame 2",
          ),
          ex(
            "dfs-tree",
            stopAt("dfs-tree", 9, ["No frame #1 (dfs u=2)"], {
              frames: [
                { index: 0, func: "dfs", file: "dfs.cpp", line: 6, isUser: true },
                { index: 1, func: "dfs", file: "dfs.cpp", line: 9, isUser: true },
                { index: 2, func: "dfs", file: "dfs.cpp", line: 9, isUser: true },
                { index: 3, func: "main", file: "dfs.cpp", line: 19, isUser: true },
              ],
              currentFrame: 1,
            }),
            "Você está no frame #1. Suba 2 frames até #3 (main).",
            "up 2",
          ),
          ex(
            "dfs-tree",
            stopAt("dfs-tree", 19, ["No frame #3 (main)"], {
              frames: [
                { index: 0, func: "dfs", file: "dfs.cpp", line: 6, isUser: true },
                { index: 1, func: "dfs", file: "dfs.cpp", line: 9, isUser: true },
                { index: 2, func: "dfs", file: "dfs.cpp", line: 9, isUser: true },
                { index: 3, func: "main", file: "dfs.cpp", line: 19, isUser: true },
              ],
              currentFrame: 3,
            }),
            "Você está no frame #3. Desça 1 frame para #2.",
            "down",
          ),
        ],
        practiceKinds: ["pilha"],
      },
    ],
  },

  // Unit 6: Condições
  {
    id: "u6-condicoes",
    number: 6,
    title: "Condições",
    lessons: [
      {
        id: "u6-break-if",
        unitId: "u6-condicoes",
        title: "Parada condicional com break … if",
        explanation:
          "break <alvo> if <condição> só pausa quando a expressão C++ for verdadeira, evitando dezenas de continue manuais dentro de um laço. Cuidado para usar == (comparação) e nunca = (atribuição).",
        helpKeys: ["break if"],
        commands: ["break <alvo> if <cond>"],
        example: {
          programId: "sum-loop",
          steps: [
            { cmd: "break 7 if i == 4", note: "cria parada na linha 7 apenas quando i == 4" },
            { cmd: "run", note: "pula direto para a iteração i == 4" },
            { cmd: "print i", note: "confirma i == 4" },
          ],
        },
        exercises: [
          ex(
            "sum-loop",
            emptyStop(["Reading symbols from ./sol..."]),
            "Pare na linha 7 só quando i == 4.",
            "break 7 if i == 4",
          ),
          ex(
            "dfs-tree",
            emptyStop(["Reading symbols from ./dfs..."]),
            "Pare na função dfs só quando u == 5.",
            "break dfs if u == 5",
          ),
          ex(
            "two-pointers",
            emptyStop(["Reading symbols from ./twoptr..."]),
            "Pare na linha 7 só quando cur > 5.",
            "break 7 if cur > 5",
          ),
        ],
        practiceKinds: ["break-cond"],
      },
      {
        id: "u6-condition",
        unitId: "u6-condicoes",
        title: "Trocar condição com condition",
        explanation:
          "condition <N> <cond> adiciona ou substitui a condição de um breakpoint que já existe, sem precisar apagá-lo e recriá-lo. O número N vem de info breakpoints.",
        helpKeys: ["condition"],
        commands: ["condition <N> <cond>"],
        example: {
          programId: "sum-loop",
          steps: [
            { cmd: "break 7", note: "cria breakpoint 1 sem condição" },
            { cmd: "condition 1 i == 3", note: "anexa a condição i == 3 ao breakpoint 1" },
            { cmd: "run", note: "para já na iteração i == 3" },
          ],
        },
        exercises: [
          ex(
            "sum-loop",
            stopAt("sum-loop", 7, ["Breakpoint 1 at ADDR: file sol.cpp, line 7."]),
            "Configure o breakpoint 1 para parar só quando i == 3.",
            "condition 1 i == 3",
          ),
          ex(
            "prefix-sum",
            stopAt("prefix-sum", 11, ["Breakpoint 2 at ADDR: file prefix.cpp, line 11."], {
              breakpoints: [
                { id: 1, line: 10, enabled: true },
                { id: 2, line: 11, enabled: true },
              ],
            }),
            "Configure o breakpoint 2 para parar só quando i == 4.",
            "condition 2 i == 4",
          ),
          ex(
            "two-pointers",
            stopAt("two-pointers", 7, ["Breakpoint 1 at ADDR: file twoptr.cpp, line 7."]),
            "Faça o breakpoint 1 disparar apenas quando cur > 6.",
            "condition 1 cur > 6",
          ),
        ],
        practiceKinds: ["condition"],
      },
      {
        id: "u6-ignore",
        unitId: "u6-condicoes",
        title: "Pular passagens com ignore",
        explanation:
          "ignore <N> <cont> faz o breakpoint N não parar nas próximas cont passagens. É mais rápido do que uma condição quando você só quer pular as primeiras iterações.",
        helpKeys: ["ignore"],
        commands: ["ignore <N> <cont>"],
        example: {
          programId: "sum-loop",
          steps: [
            { cmd: "break 7", note: "cria breakpoint 1 dentro do laço" },
            { cmd: "ignore 1 3", note: "ignora as 3 primeiras passagens (i = 0, 1, 2)" },
            { cmd: "run", note: "para na 4ª passagem (i = 3)" },
            { cmd: "print i", note: "confirma i = 3" },
          ],
        },
        exercises: [
          ex(
            "sum-loop",
            stopAt("sum-loop", 7, ["Breakpoint 1 at ADDR: file sol.cpp, line 7."]),
            "Ignore as próximas 3 passagens do breakpoint 1.",
            "ignore 1 3",
          ),
          ex(
            "dp-subset",
            stopAt("dp-subset", 8, ["Breakpoint 2 at ADDR: file dp.cpp, line 8."], {
              breakpoints: [
                { id: 1, line: 6, enabled: true },
                { id: 2, line: 8, enabled: true },
              ],
            }),
            "Ignore as próximas 5 passagens do breakpoint 2.",
            "ignore 2 5",
          ),
          ex(
            "sum-loop",
            stopAt("sum-loop", 7, ["Breakpoint 1 at ADDR: file sol.cpp, line 7."]),
            "Zere a contagem de ignore do breakpoint 1 (ignore 1 0).",
            "ignore 1 0",
          ),
        ],
        practiceKinds: ["ignore"],
      },
    ],
  },

  // Unit 7: Vigias
  {
    id: "u7-vigias",
    number: 7,
    title: "Vigias",
    lessons: [
      {
        id: "u7-watch",
        unitId: "u7-vigias",
        title: "Vigiar escritas com watch",
        explanation:
          "watch <expr> para o programa no instante em que o valor da expressão muda, mostrando o valor antigo e o novo. É a ferramenta certa quando uma variável muda de valor e você não sabe qual linha a alterou.",
        helpKeys: ["watch"],
        commands: ["watch <expr>"],
        example: {
          programId: "two-pointers",
          setup: ["break 6", "run"],
          steps: [
            { cmd: "watch best", note: "cria hardware watchpoint em best" },
            { cmd: "continue", note: "para assim que best muda de 0 para 1" },
          ],
        },
        exercises: [
          ex(
            "two-pointers",
            stopAt("two-pointers", 6, ["Breakpoint 1, main () at twoptr.cpp:6"]),
            "Crie uma vigia que pare quando best mudar.",
            "watch best",
          ),
          ex(
            "sum-loop",
            stopAt("sum-loop", 6, ["Breakpoint 1, main () at sol.cpp:6"]),
            "Crie uma vigia de escrita sobre sum.",
            "watch sum",
          ),
          ex(
            "binary-search",
            stopAt("binary-search", 4, ["Breakpoint 1, lower_idx (...) at bsearch.cpp:4"]),
            "Pare sempre que lo mudar de valor.",
            "watch lo",
          ),
        ],
        practiceKinds: ["vigia"],
      },
      {
        id: "u7-rw-watch",
        unitId: "u7-vigias",
        title: "Vigiar leituras e acessos com rwatch e awatch",
        explanation:
          "rwatch <expr> para quando a expressão é lida, e awatch <expr> para tanto em leituras quanto em escritas. Úteis para achar onde um valor é consultado ou corrompido.",
        helpKeys: ["rwatch", "awatch"],
        commands: ["rwatch <expr>", "awatch <expr>"],
        example: {
          programId: "two-pointers",
          setup: ["break 6", "run"],
          steps: [
            { cmd: "rwatch limit", note: "vigia leituras de limit" },
            { cmd: "awatch cur", note: "vigia qualquer leitura ou escrita em cur" },
            { cmd: "info breakpoints", note: "mostra os tipos read watchpoint e acc watchpoint" },
          ],
        },
        exercises: [
          ex(
            "two-pointers",
            stopAt("two-pointers", 6, ["Breakpoint 1, main () at twoptr.cpp:6"]),
            "Crie uma vigia de leitura sobre limit.",
            "rwatch limit",
          ),
          ex(
            "two-pointers",
            stopAt("two-pointers", 6, ["Breakpoint 1, main () at twoptr.cpp:6"]),
            "Crie uma vigia de acesso (leitura ou escrita) sobre cur.",
            "awatch cur",
          ),
          ex(
            "binary-search",
            stopAt("binary-search", 4, ["Breakpoint 1, lower_idx (...) at bsearch.cpp:4"]),
            "Crie uma vigia de leitura sobre target.",
            "rwatch target",
          ),
        ],
        practiceKinds: ["vigia"],
      },
      {
        id: "u7-watch-loc",
        unitId: "u7-vigias",
        title: "Vigiar endereço com watch -l",
        explanation:
          "watch -l <expr> (ou watch -location) avalia o endereço da expressão agora e vigia aquela posição fixa de memória. Assim a vigia continua valendo mesmo se o ponteiro cur andar para outro nó ou sair de escopo.",
        helpKeys: ["watch -l"],
        commands: ["watch -l <expr>", "watch -location <expr>"],
        example: {
          programId: "linked-list",
          setup: ["break 16", "run"],
          steps: [
            { cmd: "watch -l cur->val", note: "vigia o endereço do campo val do nó atual" },
            { cmd: "continue", note: "para dentro de bump() quando p->val muda de 10 para 20" },
          ],
        },
        exercises: [
          ex(
            "linked-list",
            stopAt("linked-list", 16, ["Breakpoint 1, main () at list.cpp:16"]),
            "Vigie o endereço de memória de cur->val com -l.",
            "watch -l cur->val",
          ),
          ex(
            "linked-list",
            stopAt("linked-list", 7, ["Breakpoint 1, bump (p=ADDR) at list.cpp:7"]),
            "Vigie diretamente o endereço de p->val.",
            "watch -l p->val",
          ),
          ex(
            "linked-list",
            stopAt("linked-list", 16, ["Breakpoint 1, main () at list.cpp:16"]),
            "Vigie o endereço de n2.val usando watch -l.",
            "watch -l n2.val",
          ),
        ],
        practiceKinds: ["vigia"],
      },
    ],
  },

  // Unit 8: Mudar o estado
  {
    id: "u8-mudar",
    number: 8,
    title: "Mudar o estado",
    lessons: [
      {
        id: "u8-set-var",
        unitId: "u8-mudar",
        title: "Alterar variáveis com set var e print",
        explanation:
          "set var x = 10 (ou print x = 10) altera o valor de uma variável no meio da execução sem recompilar. Usar set var em vez de set puro evita conflito com opções internas do gdb.",
        helpKeys: ["set var"],
        commands: ["set var <v> = <expr>", "print <v> = <expr>"],
        example: {
          programId: "sum-loop",
          setup: ["break 7", "run"],
          steps: [
            { cmd: "set var sum = 100", note: "muda sum para 100 em memória" },
            { cmd: "print sum", note: "confirma que sum agora vale 100" },
          ],
        },
        exercises: [
          ex(
            "sum-loop",
            stopAt("sum-loop", 7, ["Breakpoint 1, main () at sol.cpp:7"]),
            "Altere a variável sum para 100.",
            "set var sum = 100",
          ),
          ex(
            "binary-search",
            stopAt("binary-search", 6, ["Breakpoint 1, lower_idx (...) at bsearch.cpp:6"]),
            "Troque o valor de lo para 2.",
            "set var lo = 2",
          ),
          ex(
            "two-pointers",
            stopAt("two-pointers", 7, ["Breakpoint 1, main () at twoptr.cpp:7"]),
            "Defina limit como 10.",
            "set var limit = 10",
          ),
        ],
        practiceKinds: ["mudar"],
      },
      {
        id: "u8-call",
        unitId: "u8-mudar",
        title: "Chamar funções com call",
        explanation:
          "call <função(args)> executa uma função do próprio programa durante a parada e exibe o retorno (quando não é void). Útil para testar hipóteses ou rodar funções auxiliares de depuração.",
        helpKeys: ["call"],
        commands: ["call <fn(...)>"],
        example: {
          programId: "gcd-rec",
          setup: ["break 12", "run"],
          steps: [
            { cmd: "call gcd(48, 18)", note: "executa gcd(48, 18) e mostra $1 = 6" },
            { cmd: "call lcm(12, 8)", note: "executa lcm(12, 8) e mostra $2 = 24" },
          ],
        },
        exercises: [
          ex(
            "gcd-rec",
            stopAt("gcd-rec", 12, ["Breakpoint 1, main () at gcd.cpp:12"]),
            "Chame gcd(48, 18) pelo gdb.",
            "call gcd(48, 18)",
          ),
          ex(
            "struct-point",
            stopAt("struct-point", 17, ["Breakpoint 1, main () at point.cpp:17"]),
            "Chame dist2(a, b) diretamente.",
            "call dist2(a, b)",
          ),
          ex(
            "gcd-rec",
            stopAt("gcd-rec", 12, ["Breakpoint 1, main () at gcd.cpp:12"]),
            "Chame lcm(12, 8) durante a parada.",
            "call lcm(12, 8)",
          ),
        ],
        practiceKinds: ["mudar"],
      },
    ],
  },

  // Unit 9: Crash
  {
    id: "u9-crash",
    number: 9,
    title: "Crash",
    lessons: [
      {
        id: "u9-signals",
        unitId: "u9-crash",
        title: "Investigar SIGSEGV, SIGFPE e SIGABRT",
        explanation:
          "Quando o programa recebe SIGSEGV (acesso inválido), SIGFPE (divisão por zero) ou SIGABRT (assert), o gdb para automaticamente no ponto da falha. O primeiro passo é rodar bt para ver a linha e a pilha de chamadas.",
        helpKeys: [],
        commands: ["run", "bt", "info args"],
        example: {
          programId: "segfault-ptr",
          steps: [
            { cmd: "run", note: "roda até o SIGSEGV em p->val" },
            { cmd: "bt", note: "mostra sum_nodes <- solve <- main com p=0x0" },
            { cmd: "print p", note: "confirma que o ponteiro p é nulo (0x0)" },
          ],
        },
        exercises: [
          ex(
            "segfault-ptr",
            stopAt("segfault-ptr", 9, ["Program received signal SIGSEGV, Segmentation fault."], {
              breakpoints: [],
              signal: "SIGSEGV",
              frames: [
                { index: 0, func: "sum_nodes", file: "segv.cpp", line: 9, isUser: true },
                { index: 1, func: "solve", file: "segv.cpp", line: 16, isUser: true },
                { index: 2, func: "main", file: "segv.cpp", line: 19, isUser: true },
              ],
            }),
            "O programa parou em SIGSEGV. Veja a pilha de chamadas.",
            "bt",
          ),
          ex(
            "divzero-fpe",
            stopAt("divzero-fpe", 3, ["Program received signal SIGFPE, Arithmetic exception."], {
              breakpoints: [],
              signal: "SIGFPE",
              frames: [
                { index: 0, func: "ratio", file: "sigfpe.cpp", line: 3, isUser: true },
                { index: 1, func: "compute", file: "sigfpe.cpp", line: 7, isUser: true },
              ],
            }),
            "O programa parou em SIGFPE. Veja os argumentos de ratio.",
            "info args",
          ),
          ex(
            "divzero-fpe",
            stopAt("divzero-fpe", 3, ["Program received signal SIGFPE, Arithmetic exception."], {
              breakpoints: [],
              signal: "SIGFPE",
              frames: [
                { index: 0, func: "ratio", file: "sigfpe.cpp", line: 3, isUser: true },
                { index: 1, func: "compute", file: "sigfpe.cpp", line: 7, isUser: true },
              ],
            }),
            "Veja a pilha de chamadas para achar quem passou den = 0.",
            "bt",
          ),
        ],
        practiceKinds: ["crash"],
      },
      {
        id: "u9-up-user",
        unitId: "u9-crash",
        title: "Subir da biblioteca até o seu código",
        explanation:
          "Em SIGABRT ou falhas dentro da biblioteca padrão, os primeiros frames (#0, #1, …) pertencem à libc ou libstdc++. Use bt para achar o primeiro frame do seu arquivo e pule para lá com frame N ou up.",
        helpKeys: [],
        commands: ["bt", "frame <N>", "up <N>"],
        example: {
          programId: "abort-assert",
          steps: [
            { cmd: "run", note: "falha no assert e para dentro da libc com SIGABRT" },
            { cmd: "bt", note: "mostra frames da libc seguidos por check_idx em abort.cpp:4" },
            { cmd: "frame 5", note: "sobe direto para check_idx no seu código" },
            { cmd: "print idx", note: "mostra idx = -3, a causa do assert" },
          ],
        },
        exercises: [
          ex(
            "abort-assert",
            stopAt("abort-assert", 4, ["Program received signal SIGABRT, Aborted."], {
              breakpoints: [],
              signal: "SIGABRT",
              frames: [
                {
                  index: 0,
                  func: "__pthread_kill_implementation",
                  file: "libc.so.6",
                  line: null,
                  isUser: false,
                },
                { index: 1, func: "raise", file: "libc.so.6", line: null, isUser: false },
                { index: 2, func: "abort", file: "libc.so.6", line: null, isUser: false },
                {
                  index: 3,
                  func: "__libc_message_impl.cold",
                  file: "libc.so.6",
                  line: null,
                  isUser: false,
                },
                { index: 4, func: "__assert_fail", file: "libc.so.6", line: null, isUser: false },
                { index: 5, func: "check_idx", file: "abort.cpp", line: 4, isUser: true },
                { index: 6, func: "process", file: "abort.cpp", line: 8, isUser: true },
                { index: 7, func: "main", file: "abort.cpp", line: 11, isUser: true },
              ],
              currentFrame: 0,
            }),
            "Você está em #0 (libc). Vá para o frame #5 (check_idx), no seu código.",
            "frame 5",
          ),
          ex(
            "abort-assert",
            stopAt("abort-assert", 4, ["No frame #5 (check_idx)"], {
              breakpoints: [],
              signal: "SIGABRT",
              frames: [
                {
                  index: 0,
                  func: "__pthread_kill_implementation",
                  file: "libc.so.6",
                  line: null,
                  isUser: false,
                },
                { index: 1, func: "raise", file: "libc.so.6", line: null, isUser: false },
                { index: 2, func: "abort", file: "libc.so.6", line: null, isUser: false },
                {
                  index: 3,
                  func: "__libc_message_impl.cold",
                  file: "libc.so.6",
                  line: null,
                  isUser: false,
                },
                { index: 4, func: "__assert_fail", file: "libc.so.6", line: null, isUser: false },
                { index: 5, func: "check_idx", file: "abort.cpp", line: 4, isUser: true },
                { index: 6, func: "process", file: "abort.cpp", line: 8, isUser: true },
                { index: 7, func: "main", file: "abort.cpp", line: 11, isUser: true },
              ],
              currentFrame: 5,
            }),
            "Agora em #5 (check_idx), suba 1 frame até process (#6).",
            "up",
          ),
          ex(
            "abort-assert",
            stopAt("abort-assert", 8, ["No frame #6 (process)"], {
              breakpoints: [],
              signal: "SIGABRT",
              frames: [
                {
                  index: 0,
                  func: "__pthread_kill_implementation",
                  file: "libc.so.6",
                  line: null,
                  isUser: false,
                },
                { index: 1, func: "raise", file: "libc.so.6", line: null, isUser: false },
                { index: 2, func: "abort", file: "libc.so.6", line: null, isUser: false },
                {
                  index: 3,
                  func: "__libc_message_impl.cold",
                  file: "libc.so.6",
                  line: null,
                  isUser: false,
                },
                { index: 4, func: "__assert_fail", file: "libc.so.6", line: null, isUser: false },
                { index: 5, func: "check_idx", file: "abort.cpp", line: 4, isUser: true },
                { index: 6, func: "process", file: "abort.cpp", line: 8, isUser: true },
                { index: 7, func: "main", file: "abort.cpp", line: 11, isUser: true },
              ],
              currentFrame: 6,
            }),
            "Imprima o parâmetro x do frame atual.",
            "print x",
          ),
        ],
        practiceKinds: ["crash"],
      },
      {
        id: "u9-catch-throw",
        unitId: "u9-crash",
        title: "Interceptar exceções com catch throw",
        explanation:
          "catch throw para o programa no momento exato em que uma exceção C++ (std::out_of_range, std::bad_alloc etc.) é lançada, antes de a pilha ser desenrolada. Com bt, você vê logo a linha que disparou a exceção.",
        helpKeys: ["catch throw"],
        commands: ["catch throw"],
        example: {
          programId: "throw-oob",
          steps: [
            { cmd: "catch throw", note: "cria catchpoint para qualquer throw C++" },
            { cmd: "run", note: "para assim que v.at(5) lança std::out_of_range" },
            { cmd: "bt 4", note: "mostra a pilha a partir de __cxa_throw até get_item" },
          ],
        },
        exercises: [
          ex(
            "throw-oob",
            emptyStop(["Reading symbols from ./throw_oob..."]),
            "Configure o gdb para parar assim que uma exceção C++ for lançada.",
            "catch throw",
          ),
          ex(
            "throw-oob",
            {
              ...emptyStop(["Catchpoint 1 (throw)"]),
              breakpoints: [],
            },
            "Execute o programa até disparar o catchpoint de exceção.",
            "run",
          ),
          ex(
            "throw-oob",
            emptyStop(["Reading symbols from ./sol..."]),
            "Intercepte qualquer exceção C++ lançada usando catch throw.",
            "catch throw",
          ),
        ],
        practiceKinds: ["crash"],
      },
    ],
  },
  // Unit 10: Formatos (T26 AC-8)
  {
    id: "u10-formatos",
    number: 10,
    title: "Formatos",
    lessons: [
      {
        id: "u10-formats",
        unitId: "u10-formatos",
        title: "Formatos /x, /d, /u, /t e /o",
        explanation:
          "O comando print aceita modificadores de base logo após a barra: /x para hexadecimal, /d para decimal com sinal, /u sem sinal, /t para binário e /o para octal. Em /x e /t não há zeros à esquerda, e /o usa prefixo 0 para valores não nulos.",
        helpKeys: [],
        outputHelpKeys: ["p/x", "p/u", "p/t", "p/o"],
        commands: ["p/x n", "p/d n", "p/u n", "p/t n", "p/o n"],
        example: {
          programId: "formats-demo",
          setup: ["break 10", "run"],
          steps: [
            { cmd: "p/x n", note: "258 em hexadecimal: 0x102 (sem zeros à esquerda)." },
            { cmd: "p/o n", note: "258 em octal: prefixo 0 seguido de 402." },
            { cmd: "p/t n", note: "258 em binário: 100000010." },
          ],
        },
        exercises: [
          outEx(
            "formats-demo",
            10,
            ["Breakpoint 1, main () at formats.cpp:10", "n = 258"],
            "p/x n",
            "print",
            "0x102",
            "258 = 256 + 2 = 0x102 em hexadecimal.",
          ),
          outEx(
            "formats-demo",
            10,
            ["Breakpoint 1, main () at formats.cpp:10", "n = 258"],
            "p/o n",
            "print",
            "0402",
            "258 = 4×64 + 2 = 0402 em octal.",
          ),
          outEx(
            "formats-demo",
            10,
            ["Breakpoint 1, main () at formats.cpp:10", "n = 258"],
            "p/t n",
            "print",
            "100000010",
            "258 = 2^8 + 2^1 = 100000010 em binário.",
          ),
        ],
        practiceKinds: [],
        practiceOutputKinds: ["formato"],
      },
      {
        id: "u10-twos-complement",
        unitId: "u10-formatos",
        title: "Complemento de dois e largura do tipo",
        explanation:
          "Quando você imprime um inteiro negativo com /x, /u ou /t, o gdb mostra os bits em complemento de dois na largura exata do tipo. Um int de 4 bytes produz 8 dígitos hex (0xffffffff para -1), enquanto um short de 2 bytes produz 4 dígitos (0xffff).",
        helpKeys: [],
        outputHelpKeys: ["twos"],
        commands: ["p/x neg", "p/u neg", "p/x s", "p/u s"],
        example: {
          programId: "formats-demo",
          setup: ["break 10", "run"],
          steps: [
            { cmd: "p/x neg", note: "int -1 ocupa 32 bits: 0xffffffff." },
            { cmd: "p/u neg", note: "Os mesmos 32 bits sem sinal valem 4294967295." },
            { cmd: "p/x s", note: "short -1 ocupa 16 bits: 0xffff." },
          ],
        },
        exercises: [
          outEx(
            "formats-demo",
            10,
            ["Breakpoint 1, main () at formats.cpp:10", "int neg = -1; short s = -1;"],
            "p/x neg",
            "print",
            "0xffffffff",
            "int tem 4 bytes (32 bits), logo -1 em hex é 0xffffffff.",
          ),
          outEx(
            "formats-demo",
            10,
            ["Breakpoint 1, main () at formats.cpp:10", "short s = -1;"],
            "p/x s",
            "print",
            "0xffff",
            "short tem 2 bytes (16 bits), logo -1 em hex é 0xffff.",
          ),
          outEx(
            "formats-demo",
            10,
            ["Breakpoint 1, main () at formats.cpp:10", "short s = -1;"],
            "p/u s",
            "print",
            "65535",
            "short -1 reinterpretado sem sinal em 16 bits vale 65535.",
          ),
        ],
        practiceKinds: [],
        practiceOutputKinds: ["formato"],
      },
      {
        id: "u10-char",
        unitId: "u10-formatos",
        title: "Caractere com p e p/c",
        explanation:
          "O gdb imprime variáveis char mostrando primeiro o valor numérico do byte e depois o caractere entre aspas simples, como 65 'A'. Caracteres de controle usam escapes C (10 '\\n', 0 '\\000') e p/c aplica esse mesmo formato a qualquer inteiro.",
        helpKeys: [],
        outputHelpKeys: ["p/c"],
        commands: ["p ch", "p nl", "p/c 65", "p/d ch"],
        example: {
          programId: "formats-demo",
          setup: ["break 10", "run"],
          steps: [
            { cmd: "p ch", note: "char 'A' sai como 65 'A'." },
            { cmd: "p nl", note: "Quebra de linha sai como 10 '\\n'." },
            { cmd: "p/c 65", note: "/c exibe o byte baixo como caractere." },
          ],
        },
        exercises: [
          outEx(
            "formats-demo",
            10,
            ["Breakpoint 1, main () at formats.cpp:10", "char ch = 'A';"],
            "p ch",
            "print",
            "65 'A'",
            "O gdb mostra código numérico e caractere entre aspas simples: 65 'A'.",
          ),
          outEx(
            "formats-demo",
            10,
            ["Breakpoint 1, main () at formats.cpp:10", "char nl = '\\n';"],
            "p nl",
            "print",
            "10 '\\n'",
            "Quebra de linha tem código ASCII 10 e escape '\\n'.",
          ),
          outEx(
            "formats-demo",
            10,
            ["Breakpoint 1, main () at formats.cpp:10", "char ch = 'A';"],
            "p/d ch",
            "print",
            "65",
            "Com /d o gdb imprime apenas o número sem o literal de caractere.",
          ),
        ],
        practiceKinds: [],
        practiceOutputKinds: ["char"],
      },
    ],
  },
  // Unit 11: Expressões (T26 AC-8)
  {
    id: "u11-expressoes",
    number: 11,
    title: "Expressões",
    lessons: [
      {
        id: "u11-div-mod",
        unitId: "u11-expressoes",
        title: "Divisão inteira e resto em C",
        explanation:
          "Nas expressões avaliadas pelo gdb, a divisão inteira de C/C++ sempre trunca em direção a zero: -7 / 2 resulta em -3, nunca -4. O resto a % b mantém o sinal do dividendo a, garantindo a / b * b + a % b == a.",
        helpKeys: [],
        outputHelpKeys: ["div-c"],
        commands: ["p -7 / 2", "p -7 % 3", "p a / b", "p a % c"],
        example: {
          programId: "formats-demo",
          setup: ["break 10", "run"],
          steps: [
            { cmd: "p a / b", note: "-7 / 2 trunca para zero e vale -3." },
            { cmd: "p a % c", note: "-7 % 3 mantém o sinal de -7 e vale -1." },
          ],
        },
        exercises: [
          outEx(
            "formats-demo",
            10,
            ["Breakpoint 1, main () at formats.cpp:10", "int a = -7, b = 2, c = 3;"],
            "p a / b",
            "print",
            "-3",
            "Em C/C++, -7 / 2 trunca em direção a zero e resulta em -3.",
          ),
          outEx(
            "formats-demo",
            10,
            ["Breakpoint 1, main () at formats.cpp:10", "int a = -7, b = 2, c = 3;"],
            "p a % c",
            "print",
            "-1",
            "-7 = (-2)*3 + (-1), logo -7 % 3 = -1.",
          ),
          outEx(
            "formats-demo",
            10,
            ["Breakpoint 1, main () at formats.cpp:10", "int a = -7, b = 2, c = 3;"],
            "p -7 / 3",
            "print",
            "-2",
            "-7 / 3 trunca em direção a zero e resulta em -2.",
          ),
        ],
        practiceKinds: [],
        practiceOutputKinds: ["expressao"],
      },
      {
        id: "u11-casts",
        unitId: "u11-expressoes",
        title: "Casts, promoções e sem sinal",
        explanation:
          "Casts para tipos sem sinal fazem volta modular na largura do tipo destino: (unsigned)-1 vale 4294967295 e (unsigned short)-1 vale 65535. Já tipos menores que int, como unsigned char, sofrem promoção inteira para int com sinal antes de somar ou subtrair.",
        helpKeys: [],
        outputHelpKeys: ["casts"],
        commands: ["p (unsigned)-1", "p (unsigned short)-1", "p uc - 1"],
        example: {
          programId: "formats-demo",
          setup: ["break 10", "run"],
          steps: [
            { cmd: "p (unsigned)-1", note: "Volta em 32 bits sem sinal: 4294967295." },
            { cmd: "p (unsigned short)-1", note: "Volta em 16 bits sem sinal: 65535." },
            { cmd: "p uc - 1", note: "unsigned char 0 é promovido para int, logo 0 - 1 = -1." },
          ],
        },
        exercises: [
          outEx(
            "formats-demo",
            10,
            ["Breakpoint 1, main () at formats.cpp:10", "int neg = -1; unsigned char uc = 0;"],
            "p (unsigned)-1",
            "print",
            "4294967295",
            "(unsigned)-1 envolve para 2^32 - 1 = 4294967295.",
          ),
          outEx(
            "formats-demo",
            10,
            ["Breakpoint 1, main () at formats.cpp:10", "unsigned char uc = 0;"],
            "p (unsigned short)-1",
            "print",
            "65535",
            "(unsigned short)-1 envolve para 2^16 - 1 = 65535.",
          ),
          outEx(
            "formats-demo",
            10,
            ["Breakpoint 1, main () at formats.cpp:10", "unsigned char uc = 0;"],
            "p uc - 1",
            "print",
            "-1",
            "unsigned char é promovido a int antes da subtração, resultando em -1.",
          ),
        ],
        practiceKinds: [],
        practiceOutputKinds: ["expressao"],
      },
    ],
  },
  // Unit 12: Arrays e strings (T26 AC-8)
  {
    id: "u12-arrays",
    number: 12,
    title: "Arrays e strings",
    lessons: [
      {
        id: "u12-slices",
        unitId: "u12-arrays",
        title: "Arrays e fatias com @",
        explanation:
          "Imprimir um array fixo mostra todos os elementos entre chaves, separados por vírgula e espaço. Para recortar parte de um array ou inspecionar memória a partir de um ponteiro, use o operador @: a[1]@3 ou *ptr@3 imprime 3 elementos seguidos.",
        helpKeys: [],
        outputHelpKeys: ["@"],
        commands: ["p a", "p a[1]@3", "p *ptr@3"],
        example: {
          programId: "arrays-demo",
          setup: ["break 9", "run"],
          steps: [
            { cmd: "p a", note: "Array inteiro entre chaves." },
            { cmd: "p a[1]@3", note: "Fatia de 3 elementos a partir de a[1]." },
            { cmd: "p *ptr@3", note: "Mesma fatia via ponteiro ptr = &a[1]." },
          ],
        },
        exercises: [
          outEx(
            "arrays-demo",
            9,
            ["Breakpoint 1, main () at arrays.cpp:9", "int a[5] = {3, 1, 4, 1, 5};"],
            "p a",
            "print",
            "{3, 1, 4, 1, 5}",
            "Arrays inteiros aparecem entre chaves com elementos separados por vírgula e espaço.",
          ),
          outEx(
            "arrays-demo",
            9,
            ["Breakpoint 1, main () at arrays.cpp:9", "int a[5] = {3, 1, 4, 1, 5};"],
            "p a[1]@3",
            "print",
            "{1, 4, 1}",
            "a[1]@3 pega 3 elementos começando no índice 1: {1, 4, 1}.",
          ),
          outEx(
            "arrays-demo",
            9,
            ["Breakpoint 1, main () at arrays.cpp:9", "int* ptr = &a[1];"],
            "p *ptr@3",
            "print",
            "{1, 4, 1}",
            "*ptr@3 lê 3 inteiros consecutivos a partir de ptr (&a[1]).",
          ),
        ],
        practiceKinds: [],
        practiceOutputKinds: ["array"],
      },
      {
        id: "u12-repeats",
        unitId: "u12-arrays",
        title: "Repetições com <repeats> e limite de 200",
        explanation:
          "Por padrão o gdb usa print repeats = 10 e print elements = 200. Qualquer sequência com mais de 10 elementos idênticos seguidos é compactada em valor <repeats N times>, e arrays muito longos cortam após 200 itens exibidos com reticências.",
        helpKeys: [],
        outputHelpKeys: ["repeats"],
        commands: ["p z", "show print repeats", "show print elements"],
        example: {
          programId: "arrays-demo",
          setup: ["break 9", "run"],
          steps: [
            { cmd: "p z", note: "16 zeros (> 10) viram {0 <repeats 16 times>}." },
            { cmd: "p z[0]@10", note: "Exatamente 10 zeros ainda são listados por extenso." },
          ],
        },
        exercises: [
          outEx(
            "arrays-demo",
            9,
            ["Breakpoint 1, main () at arrays.cpp:9", "int z[16] = {0};"],
            "p z",
            "print",
            "{0 <repeats 16 times>}",
            "Mais de 10 elementos iguais (16) são compactados como {0 <repeats 16 times>}.",
          ),
          outEx(
            "arrays-demo",
            9,
            ["Breakpoint 1, main () at arrays.cpp:9", "int z[16] = {0};"],
            "p z[0]@12",
            "print",
            "{0 <repeats 12 times>}",
            "12 zeros seguidos excedem o limiar de 10: {0 <repeats 12 times>}.",
          ),
          outEx(
            "arrays-demo",
            9,
            ["Breakpoint 1, main () at arrays.cpp:9", "int z[16] = {0};"],
            "p z[0]@3",
            "print",
            "{0, 0, 0}",
            "Até 10 elementos iguais são exibidos individualmente sem <repeats>.",
          ),
        ],
        practiceKinds: [],
        practiceOutputKinds: ["array"],
      },
      {
        id: "u12-char-arrays",
        unitId: "u12-arrays",
        title: "Arrays de char e strings com \\000",
        explanation:
          "Um array char[N] é impresso como string entre aspas duplas: se terminar em byte nulo, o gdb descarta apenas o último '\\0' e imprime os zeros restantes como \\000. Se sobrarem mais de 10 zeros, eles viram um segmento separado '\\000' <repeats K times>.",
        helpKeys: [],
        outputHelpKeys: ["char[]"],
        commands: ["p s", "p big", "p full"],
        example: {
          programId: "arrays-demo",
          setup: ["break 9", "run"],
          steps: [
            { cmd: "p s", note: 'char[10] com "abc" tem 7 zeros; sem o último, sobram 6 \\000.' },
            { cmd: "p big", note: "char[15] deixa 11 zeros (> 10), compactados em <repeats 11 times>." },
            { cmd: "p full", note: 'Sem \\0 final, imprime os 4 caracteres: "abcd".' },
          ],
        },
        exercises: [
          outEx(
            "arrays-demo",
            9,
            ["Breakpoint 1, main () at arrays.cpp:9", 'char s[10] = "abc";'],
            "p s",
            "print",
            '"abc\\000\\000\\000\\000\\000\\000"',
            "char[10] guarda 'a','b','c' e 7 zeros; o último é omitido e restam 6 \\000.",
          ),
          outEx(
            "arrays-demo",
            9,
            ["Breakpoint 1, main () at arrays.cpp:9", 'char big[15] = "abc";'],
            "p big",
            "print",
            '"abc", \'\\000\' <repeats 11 times>',
            "char[15] tem 12 zeros; removido o final, sobram 11 (> 10), compactados em <repeats 11 times>.",
          ),
          outEx(
            "arrays-demo",
            9,
            ["Breakpoint 1, main () at arrays.cpp:9", "char full[4] = {'a', 'b', 'c', 'd'};"],
            "p full",
            "print",
            '"abcd"',
            "Quando não há \\0 no final do array de char, todos os bytes entram nas aspas.",
          ),
        ],
        practiceKinds: [],
        practiceOutputKinds: ["string"],
      },
    ],
  },
  // Unit 13: Structs e ponteiros (T26 AC-8)
  {
    id: "u13-structs",
    number: 13,
    title: "Structs e ponteiros",
    lessons: [
      {
        id: "u13-structs-ptrs",
        unitId: "u13-structs",
        title: "Structs, *p e p->next->val",
        explanation:
          "O gdb imprime structs com os nomes dos campos entre chaves, preservando a formatação de cada tipo (inclusive char). Com ponteiros, você pode encadear * e -> diretamente na expressão, como p *h->next ou p h->next->val.",
        helpKeys: [],
        outputHelpKeys: ["struct-ptr"],
        commands: ["p sm", "p *h", "p h->next->val", "p *h->next"],
        example: {
          programId: "structs-demo",
          setup: ["break 10", "run"],
          steps: [
            { cmd: "p sm", note: "Campos nomeados com char no formato código + literal." },
            { cmd: "p h->next->val", note: "Navega pelos ponteiros até o campo val de n2." },
            { cmd: "p *h->next", note: "Imprime a struct n2 completa com next = 0x0." },
          ],
        },
        exercises: [
          outEx(
            "structs-demo",
            10,
            ["Breakpoint 1, main () at structs.cpp:10", "Small sm{'a', 7, 9};"],
            "p sm",
            "print",
            "{c = 97 'a', x = 7, y = 9}",
            "Structs aparecem com cada campo nomeado e char no formato 97 'a'.",
          ),
          outEx(
            "structs-demo",
            10,
            ["Breakpoint 1, main () at structs.cpp:10", "Node n2{20, nullptr}; Node n1{10, &n2}; Node* h = &n1;"],
            "p h->next->val",
            "print",
            "20",
            "h aponta para n1, h->next aponta para n2 e n2.val vale 20.",
          ),
          outEx(
            "structs-demo",
            10,
            ["Breakpoint 1, main () at structs.cpp:10", "Node n2{20, nullptr}; Node n1{10, &n2}; Node* h = &n1;"],
            "p *h->next",
            "print",
            "{val = 20, next = 0x0}",
            "*h->next desreferencia o ponteiro para n2, cujo campo next é nulo (0x0).",
          ),
        ],
        practiceKinds: [],
        practiceOutputKinds: ["struct", "ponteiro"],
      },
      {
        id: "u13-whatis-ptype",
        unitId: "u13-structs",
        title: "Tipos com whatis e ptype",
        explanation:
          "O comando whatis mostra o tipo resumido de uma expressão no formato type = ..., útil para distinguir arrays (int [5]) de ponteiros (int *). Já ptype expande a definição completa de structs com seus campos.",
        helpKeys: [],
        outputHelpKeys: ["whatis", "ptype"],
        commands: ["whatis h", "whatis sm", "ptype sm"],
        example: {
          programId: "structs-demo",
          setup: ["break 10", "run"],
          steps: [
            { cmd: "whatis h", note: "Mostra o tipo ponteiro: type = Node *." },
            { cmd: "whatis sm", note: "Para struct, whatis mostra só o nome: type = Small." },
            { cmd: "ptype sm", note: "ptype lista cada campo declarado dentro de struct Small." },
          ],
        },
        exercises: [
          outEx(
            "structs-demo",
            10,
            ["Breakpoint 1, main () at structs.cpp:10", "Node* h = &n1;"],
            "whatis h",
            "whatis",
            "type = Node *",
            "whatis imprime type = seguido do tipo estático da variável.",
          ),
          outEx(
            "structs-demo",
            10,
            ["Breakpoint 1, main () at structs.cpp:10", "Small sm{'a', 7, 9};"],
            "whatis sm",
            "whatis",
            "type = Small",
            "whatis não expande os campos da struct, mostrando apenas type = Small.",
          ),
          outEx(
            "structs-demo",
            10,
            ["Breakpoint 1, main () at structs.cpp:10", "Node n1{10, &n2};"],
            "whatis n1.val",
            "whatis",
            "type = int",
            "O campo val de Node tem tipo int.",
          ),
        ],
        practiceKinds: [],
        practiceOutputKinds: ["struct", "ponteiro"],
      },
      {
        id: "u13-nullptr",
        unitId: "u13-structs",
        title: "Ponteiro nulo e erro de acesso",
        explanation:
          "Imprimir um ponteiro diretamente mostra o tipo entre parênteses e o endereço, como (Node *) 0x0 para nulo; dentro de structs aparece só 0x0 ou o endereço (aceito aqui como ADDR). Desreferenciar 0x0 produz o erro Cannot access memory at address 0x0.",
        helpKeys: [],
        outputHelpKeys: ["nullptr"],
        commands: ["p np", "p n1", "p *np"],
        example: {
          programId: "structs-demo",
          setup: ["break 10", "run"],
          steps: [
            { cmd: "p np", note: "Ponteiro nulo no topo: (Node *) 0x0." },
            { cmd: "p n1", note: "Dentro da struct, o ponteiro não nulo aparece mascarado como ADDR." },
            { cmd: "p *np", note: "Desreferenciar 0x0 dispara o erro de acesso à memória." },
          ],
        },
        exercises: [
          outEx(
            "structs-demo",
            10,
            ["Breakpoint 1, main () at structs.cpp:10", "Node* np = nullptr;"],
            "p np",
            "print",
            "(Node *) 0x0",
            "No topo, um ponteiro nulo é impresso com o cast de tipo: (Node *) 0x0.",
          ),
          outEx(
            "structs-demo",
            10,
            ["Breakpoint 1, main () at structs.cpp:10", "Node* np = nullptr;"],
            "p *np",
            "error",
            "Cannot access memory at address 0x0",
            "Ler do endereço 0x0 falha com Cannot access memory at address 0x0.",
          ),
          outEx(
            "structs-demo",
            10,
            ["Breakpoint 1, main () at structs.cpp:10", "Node n1{10, &n2};"],
            "p n1",
            "print",
            "{val = 10, next = ADDR}",
            "Em structs, ponteiros não nulos aparecem como endereço (use ADDR).",
          ),
        ],
        practiceKinds: [],
        practiceOutputKinds: ["ponteiro"],
      },
    ],
  },
  // Unit 14: Memória (T26 AC-8)
  {
    id: "u14-memoria",
    number: 14,
    title: "Memória",
    lessons: [
      {
        id: "u14-sizeof",
        unitId: "u14-memoria",
        title: "sizeof, alinhamento e padding",
        explanation:
          "Na ABI x86-64 SysV LP64, cada campo de struct começa num deslocamento múltiplo do seu alinhamento e o tamanho total é múltiplo do maior alinhamento. Por isso struct {char; int; long long} ocupa 16 bytes (offsets 0, 4 e 8), com 3 bytes de padding após o char.",
        helpKeys: [],
        outputHelpKeys: ["sizeof"],
        commands: ["p sizeof(Padded)", "p sizeof(int)", "p sizeof(long long)"],
        example: {
          programId: "memory-demo",
          setup: ["break 9", "run"],
          steps: [
            { cmd: "p sizeof(Padded)", note: "char(0) + 3B padding + int(4) + long long(8) = 16." },
            { cmd: "p sizeof(a)", note: "Array int[4] ocupa 4 × 4 = 16 bytes." },
          ],
        },
        exercises: [
          outEx(
            "memory-demo",
            9,
            ["Breakpoint 1, main () at memory.cpp:9", "struct Padded { char c; int x; long long y; };"],
            "p sizeof(Padded)",
            "print",
            "16",
            "Offsets 0 (char), 4 (int, após 3B de padding) e 8 (long long): total 16 bytes.",
          ),
          outEx(
            "memory-demo",
            9,
            ["Breakpoint 1, main () at memory.cpp:9", "int a[4] = {3, 1, 4, 1};"],
            "p sizeof(a)",
            "print",
            "16",
            "Array de 4 inteiros de 4 bytes ocupa 16 bytes.",
          ),
          outEx(
            "memory-demo",
            9,
            ["Breakpoint 1, main () at memory.cpp:9", "int n = 258;"],
            "p sizeof(&n)",
            "print",
            "8",
            "Todo ponteiro em x86-64 (LP64) ocupa 8 bytes.",
          ),
        ],
        practiceKinds: [],
        practiceOutputKinds: ["sizeof"],
      },
      {
        id: "u14-endian",
        unitId: "u14-memoria",
        title: "x/Nxb e endianness little-endian",
        explanation:
          "O comando x/Nfu examina N unidades de tamanho u (b=1, h=2, w=4, g=8 bytes) no formato f (x, d, u, t, c), sempre preenchendo zeros à esquerda em /x e /t. Em x86-64 little-endian, o byte menos significativo fica no menor endereço: int 258 (0x00000102) vira 0x02 0x01 0x00 0x00.",
        helpKeys: [],
        outputHelpKeys: ["x/Nxb"],
        commands: ["x/4xb &n", "x/4xb &big", "x/2xh &big"],
        example: {
          programId: "memory-demo",
          setup: ["break 9", "run"],
          steps: [
            { cmd: "x/4xb &n", note: "258 = 0x00000102 em little-endian: 0x02 0x01 0x00 0x00." },
            { cmd: "x/4xb &big", note: "0x12345678 invertido byte a byte: 0x78 0x56 0x34 0x12." },
            { cmd: "x/2xh &big", note: "Em halfwords (2B): 0x5678 0x1234." },
          ],
        },
        exercises: [
          outEx(
            "memory-demo",
            9,
            ["Breakpoint 1, main () at memory.cpp:9", "int n = 258;"],
            "x/4xb &n",
            "examine",
            "0x02 0x01 0x00 0x00",
            "Em little-endian, o byte menos significativo (0x02) vem primeiro.",
          ),
          outEx(
            "memory-demo",
            9,
            ["Breakpoint 1, main () at memory.cpp:9", "int big = 0x12345678;"],
            "x/4xb &big",
            "examine",
            "0x78 0x56 0x34 0x12",
            "Os 4 bytes de 0x12345678 aparecem do menos ao mais significativo: 0x78 0x56 0x34 0x12.",
          ),
          outEx(
            "memory-demo",
            9,
            ["Breakpoint 1, main () at memory.cpp:9", "int big = 0x12345678;"],
            "x/2xh &big",
            "examine",
            "0x5678 0x1234",
            "Cada halfword (h = 2 bytes) lê os bytes em little-endian: 0x5678 depois 0x1234.",
          ),
        ],
        practiceKinds: [],
        practiceOutputKinds: ["memoria"],
      },
      {
        id: "u14-examine",
        unitId: "u14-memoria",
        title: "Examinar palavras com x/Ndw e strings com x/s",
        explanation:
          "Use x/Ndw para ler N inteiros de 4 bytes diretamente de um endereço ou array, e x/s para ler bytes até o primeiro '\\0' como string C (ao contrário de p, x/s não imprime os zeros excedentes do buffer).",
        helpKeys: [],
        outputHelpKeys: ["x/Ndw", "x/s"],
        commands: ["x/4dw a", "x/s msg", "x/4cb msg"],
        example: {
          programId: "memory-demo",
          setup: ["break 9", "run"],
          steps: [
            { cmd: "x/4dw a", note: "4 words de 4 bytes em decimal: 3 1 4 1." },
            { cmd: "x/s msg", note: 'Lê até o primeiro \\0 e imprime apenas "abc".' },
            { cmd: "x/4cb msg", note: "4 bytes individuais como char, incluindo o terminador 0 '\\000'." },
          ],
        },
        exercises: [
          outEx(
            "memory-demo",
            9,
            ["Breakpoint 1, main () at memory.cpp:9", "int a[4] = {3, 1, 4, 1};"],
            "x/4dw a",
            "examine",
            "3 1 4 1",
            "x/4dw lê 4 words de 4 bytes com sinal a partir de a.",
          ),
          outEx(
            "memory-demo",
            9,
            ["Breakpoint 1, main () at memory.cpp:9", 'char msg[8] = "abc";'],
            "x/s msg",
            "examine",
            '"abc"',
            'x/s para no primeiro byte nulo e mostra só "abc".',
          ),
          outEx(
            "memory-demo",
            9,
            ["Breakpoint 1, main () at memory.cpp:9", 'char msg[8] = "abc";'],
            "x/4cb msg",
            "examine",
            "97 'a' 98 'b' 99 'c' 0 '\\000'",
            "x/4cb lê 4 bytes como caracteres, mostrando inclusive o 0 '\\000' final.",
          ),
        ],
        practiceKinds: [],
        practiceOutputKinds: ["memoria"],
      },
    ],
  },
];

export const GDB_LESSONS: readonly GdbLesson[] = GDB_UNITS.flatMap((u) => u.lessons);

const LESSON_BY_ID: ReadonlyMap<string, GdbLesson> = new Map(GDB_LESSONS.map((l) => [l.id, l]));

const LESSON_BY_KEY: ReadonlyMap<string, GdbLesson> = new Map(
  GDB_LESSONS.flatMap((lesson) => lesson.helpKeys.map((key) => [key, lesson] as const)),
);

const COMMAND_DESCRIPTIONS: ReadonlyMap<string, string> = new Map(
  COMMAND_TABLE.map((c) => [c.key, c.text] as const),
);

export function gdbLessonById(id: string): GdbLesson | undefined {
  return LESSON_BY_ID.get(id);
}

export function gdbLessonForCommand(key: string): GdbLesson | undefined {
  return LESSON_BY_KEY.get(key);
}

export function gdbCommandDescription(key: string): string | undefined {
  return COMMAND_DESCRIPTIONS.get(key);
}

export const OUTPUT_FORMAT_TABLE: readonly OutputRefEntry[] = [
  { key: "p/x", syntax: "p/x expr", text: "hexadecimal em complemento de dois na largura do tipo" },
  { key: "p/u", syntax: "p/u expr", text: "decimal sem sinal na largura do tipo" },
  { key: "p/t", syntax: "p/t expr", text: "binário sem zeros à esquerda" },
  { key: "p/o", syntax: "p/o expr", text: "octal com prefixo 0" },
  { key: "p/c", syntax: "p/c expr", text: "byte baixo como código numérico + caractere" },
  { key: "div-c", syntax: "p -7 / 2", text: "divisão inteira truncada para zero e resto com sinal do dividendo" },
  { key: "casts", syntax: "p (unsigned)-1", text: "casts modulares e promoções inteiras de C" },
  { key: "@", syntax: "p a[1]@3 / *ptr@3", text: "fatia artificial de N elementos consecutivos" },
  { key: "repeats", syntax: "<repeats N times>", text: "compactação automática acima de 10 itens iguais" },
  { key: "char[]", syntax: "p str", text: "string com \\000 (descarta só o último '\\0')" },
  { key: "struct-ptr", syntax: "p *h->next", text: "campos nomeados e navegação com * e ->" },
  { key: "whatis", syntax: "whatis expr", text: "mostra type = ... resumido" },
  { key: "nullptr", syntax: "p *np", text: "0x0 e erro Cannot access memory at address 0x0" },
  { key: "sizeof", syntax: "p sizeof(T)", text: "tamanho em bytes com alinhamento e padding x86-64" },
  { key: "x/Nxb", syntax: "x/4xb &n", text: "bytes em hex preenchido (ordem little-endian)" },
  { key: "x/Ndw", syntax: "x/4dw arr", text: "N words de 4 bytes em decimal com sinal" },
  { key: "x/s", syntax: "x/s str", text: "string C lida até o primeiro byte nulo" },
];

const LESSON_BY_OUTPUT_KEY: ReadonlyMap<string, GdbLesson> = new Map(
  GDB_LESSONS.flatMap((lesson) =>
    (lesson.outputHelpKeys ?? []).map((key) => [key, lesson] as const),
  ),
);

export function isOutputLesson(lesson: GdbLesson): boolean {
  return lesson.practiceOutputKinds !== undefined && lesson.practiceOutputKinds.length > 0;
}

export function gdbLessonForOutputKey(key: string): GdbLesson | undefined {
  return LESSON_BY_OUTPUT_KEY.get(key);
}
