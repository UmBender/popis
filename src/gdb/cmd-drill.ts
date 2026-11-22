import { createRng, deriveSeed } from "../core/rng";
import type { CheckContext } from "./check";
import { parseCommand, type GdbAction } from "./commands";
import { programById } from "./programs";

export const GDB_CMD_KINDS = [
  "iniciar",
  "break-linha",
  "break-funcao",
  "tbreak",
  "break-cond",
  "condition",
  "gerir",
  "ignore",
  "andar",
  "olhar",
  "pilha",
  "vigia",
  "mudar",
  "crash",
] as const;

export type GdbCmdKind = (typeof GDB_CMD_KINDS)[number];

export const GDB_CMD_KIND_LABELS: Readonly<Record<GdbCmdKind, string>> = {
  iniciar: "Iniciar (run, start, kill)",
  "break-linha": "Break em linha",
  "break-funcao": "Break em função",
  tbreak: "Break temporário (tbreak)",
  "break-cond": "Break condicional (if)",
  condition: "Condição (condition)",
  gerir: "Gerir breakpoints",
  ignore: "Ignorar passagens (ignore)",
  andar: "Andar (next, step, finish, until)",
  olhar: "Olhar (print, display, info, list)",
  pilha: "Pilha (bt, frame, up, down)",
  vigia: "Vigias (watch, rwatch, awatch)",
  mudar: "Mudar estado (set var, call)",
  crash: "Crash e exceções (bt, catch throw)",
};

export type BreakpointMark = {
  readonly id: number;
  readonly line: number;
  readonly enabled: boolean;
  readonly temporary?: boolean;
  readonly cond?: string;
  readonly ignore?: number;
};

export type DisplayMark = {
  readonly id: number;
  readonly expr: string;
};

export type StackFrame = {
  readonly index: number;
  readonly func: string;
  readonly file: string;
  readonly line: number | null;
  readonly args?: string;
  readonly isUser: boolean;
};

export type StopState = {
  readonly line: number | null;
  readonly running: boolean;
  readonly breakpoints: readonly BreakpointMark[];
  readonly displays: readonly DisplayMark[];
  readonly frames: readonly StackFrame[];
  readonly currentFrame: number;
  readonly signal?: "SIGSEGV" | "SIGFPE" | "SIGABRT";
  readonly sessionLines: readonly string[];
};

export type GdbCommandItem = {
  readonly seed: number;
  readonly index: number;
  readonly kind: GdbCmdKind;
  readonly kc: `gdb.cmd.${GdbCmdKind}`;
  readonly programId: string;
  readonly file: string;
  readonly lines: readonly string[];
  readonly stop: StopState;
  readonly prompt: string;
  readonly canonical: string;
  readonly alternatives: readonly string[];
  readonly expected: GdbAction;
  readonly context: CheckContext;
  readonly setupCommands: readonly string[];
  readonly oracleProbe: readonly string[];
};

type ItemSpec = {
  readonly programId: string;
  readonly stop: StopState;
  readonly prompt: string;
  readonly canonical: string;
  readonly alternatives: readonly string[];
  readonly setupCommands: readonly string[];
  readonly oracleProbe: readonly string[];
};

function mustParse(cmd: string): GdbAction {
  const res = parseCommand(cmd);
  if (!res.ok) throw new Error(`invalid canonical command "${cmd}": ${res.error}`);
  return res.action;
}

function buildItem(seed: number, index: number, kind: GdbCmdKind, spec: ItemSpec): GdbCommandItem {
  const prog = programById(spec.programId);
  const frameCount = Math.max(1, spec.stop.frames.length);
  const context: CheckContext = {
    file: prog.file,
    currentFrame: spec.stop.currentFrame,
    frameCount,
  };
  return {
    seed,
    index,
    kind,
    kc: `gdb.cmd.${kind}`,
    programId: prog.id,
    file: prog.file,
    lines: prog.lines,
    stop: spec.stop,
    prompt: spec.prompt,
    canonical: spec.canonical,
    alternatives: spec.alternatives,
    expected: mustParse(spec.canonical),
    context,
    setupCommands: spec.setupCommands,
    oracleProbe: spec.oracleProbe,
  };
}

function genIniciar(rng: ReturnType<typeof createRng>): ItemSpec {
  const variant = rng.int(0, 3);
  if (variant === 0) {
    return {
      programId: "sum-loop",
      stop: {
        line: null,
        running: false,
        breakpoints: [{ id: 1, line: 7, enabled: true }],
        displays: [],
        frames: [],
        currentFrame: 0,
        sessionLines: ["Breakpoint 1 at ADDR: file sol.cpp, line 7."],
      },
      prompt: "Execute o programa desde o início até bater no breakpoint.",
      canonical: "run",
      alternatives: ["r", "ru"],
      setupCommands: ["break 7"],
      oracleProbe: ["frame"],
    };
  }
  if (variant === 1) {
    return {
      programId: "stdin-sum",
      stop: {
        line: null,
        running: false,
        breakpoints: [{ id: 1, line: 8, enabled: true }],
        displays: [],
        frames: [],
        currentFrame: 0,
        sessionLines: ["Breakpoint 1 at ADDR: file stdin_sum.cpp, line 8."],
      },
      prompt: "Execute o programa lendo a entrada padrão do arquivo in.txt.",
      canonical: "run < in.txt",
      alternatives: ["r < in.txt", "r <in.txt", "ru < in.txt"],
      setupCommands: ["break 8"],
      oracleProbe: ["frame"],
    };
  }
  if (variant === 2) {
    return {
      programId: "prefix-sum",
      stop: {
        line: null,
        running: false,
        breakpoints: [],
        displays: [],
        frames: [],
        currentFrame: 0,
        sessionLines: ["Reading symbols from ./prefix..."],
      },
      prompt: "Inicie o programa parando automaticamente na entrada de main.",
      canonical: "start",
      alternatives: ["start"],
      setupCommands: [],
      oracleProbe: ["frame"],
    };
  }
  return {
    programId: "sum-loop",
    stop: {
      line: 7,
      running: true,
      breakpoints: [{ id: 1, line: 7, enabled: true }],
      displays: [],
      frames: [{ index: 0, func: "main", file: "sol.cpp", line: 7, isUser: true }],
      currentFrame: 0,
      sessionLines: ["Breakpoint 1, main () at sol.cpp:7", "7\t    sum += a[i];"],
    },
    prompt: "Encerre o processo em execução sem sair do gdb.",
    canonical: "kill",
    alternatives: ["k", "ki"],
    setupCommands: ["break 7", "run"],
    oracleProbe: ["info program"],
  };
}

function genBreakLinha(rng: ReturnType<typeof createRng>): ItemSpec {
  const candidates = ["sum-loop", "prefix-sum", "binary-search", "two-pointers", "dp-subset"];
  const prog = programById(rng.pick(candidates));
  const target = rng.pick(prog.targets);
  return {
    programId: prog.id,
    stop: {
      line: null,
      running: false,
      breakpoints: [],
      displays: [],
      frames: [],
      currentFrame: 0,
      sessionLines: [`Reading symbols from ./${prog.id}...`],
    },
    prompt: `Crie um ponto de parada na linha ${String(target.line)} (${target.label}).`,
    canonical: `break ${String(target.line)}`,
    alternatives: [
      `b ${String(target.line)}`,
      `br ${String(target.line)}`,
      `break ${prog.file}:${String(target.line)}`,
      `b ${prog.file}:${String(target.line)}`,
    ],
    setupCommands: [],
    oracleProbe: ["info breakpoints"],
  };
}

function genBreakFuncao(rng: ReturnType<typeof createRng>): ItemSpec {
  const candidates = [
    "prefix-sum",
    "binary-search",
    "dfs-tree",
    "gcd-rec",
    "struct-point",
    "linked-list",
  ];
  const prog = programById(rng.pick(candidates));
  const nonMain = prog.functions.filter((f) => f.name !== "main");
  const fn = rng.pick(nonMain);
  return {
    programId: prog.id,
    stop: {
      line: null,
      running: false,
      breakpoints: [],
      displays: [],
      frames: [],
      currentFrame: 0,
      sessionLines: [`Reading symbols from ./${prog.id}...`],
    },
    prompt: `Crie um ponto de parada na entrada da função ${fn.name}.`,
    canonical: `break ${fn.name}`,
    alternatives: [
      `b ${fn.name}`,
      `brea ${fn.name}`,
      `break ${prog.file}:${fn.name}`,
      `b ${prog.file}:${fn.name}`,
    ],
    setupCommands: [],
    oracleProbe: ["info breakpoints"],
  };
}

function genTbreak(rng: ReturnType<typeof createRng>): ItemSpec {
  const byFunc = rng.int(0, 1) === 1;
  if (byFunc) {
    const prog = programById(rng.pick(["prefix-sum", "binary-search", "gcd-rec", "struct-point"]));
    const fn = rng.pick(prog.functions.filter((f) => f.name !== "main"));
    return {
      programId: prog.id,
      stop: {
        line: null,
        running: false,
        breakpoints: [],
        displays: [],
        frames: [],
        currentFrame: 0,
        sessionLines: [`Reading symbols from ./${prog.id}...`],
      },
      prompt: `Crie um ponto de parada temporário (que some ao parar) na função ${fn.name}.`,
      canonical: `tbreak ${fn.name}`,
      alternatives: [`tb ${fn.name}`, `tbr ${prog.file}:${fn.name}`],
      setupCommands: [],
      oracleProbe: ["info breakpoints"],
    };
  }
  const prog = programById(rng.pick(["sum-loop", "two-pointers", "dp-subset"]));
  const target = rng.pick(prog.targets);
  return {
    programId: prog.id,
    stop: {
      line: null,
      running: false,
      breakpoints: [],
      displays: [],
      frames: [],
      currentFrame: 0,
      sessionLines: [`Reading symbols from ./${prog.id}...`],
    },
    prompt: `Crie um ponto de parada temporário na linha ${String(target.line)}.`,
    canonical: `tbreak ${String(target.line)}`,
    alternatives: [`tb ${String(target.line)}`, `tb ${prog.file}:${String(target.line)}`],
    setupCommands: [],
    oracleProbe: ["info breakpoints"],
  };
}

function genBreakCond(rng: ReturnType<typeof createRng>): ItemSpec {
  const variant = rng.int(0, 3);
  if (variant === 0) {
    const val = rng.int(2, 5);
    return {
      programId: "sum-loop",
      stop: {
        line: null,
        running: false,
        breakpoints: [],
        displays: [],
        frames: [],
        currentFrame: 0,
        sessionLines: ["Reading symbols from ./sum-loop..."],
      },
      prompt: `Pare na linha 7 só quando i == ${String(val)}.`,
      canonical: `break 7 if i == ${String(val)}`,
      alternatives: [
        `b 7 if i==${String(val)}`,
        `break sol.cpp:7 if ${String(val)} == i`,
        `br 7 if (i == ${String(val)})`,
      ],
      setupCommands: [],
      oracleProbe: ["run", "frame", "print i"],
    };
  }
  if (variant === 1) {
    const val = rng.int(2, 4);
    return {
      programId: "prefix-sum",
      stop: {
        line: null,
        running: false,
        breakpoints: [],
        displays: [],
        frames: [],
        currentFrame: 0,
        sessionLines: ["Reading symbols from ./prefix-sum..."],
      },
      prompt: `Pare na linha 11 só quando i == ${String(val)}.`,
      canonical: `break 11 if i == ${String(val)}`,
      alternatives: [`b 11 if i==${String(val)}`, `b prefix.cpp:11 if ${String(val)} == i`],
      setupCommands: [],
      oracleProbe: ["run", "frame", "print i"],
    };
  }
  if (variant === 2) {
    const val = rng.int(2, 5);
    return {
      programId: "dfs-tree",
      stop: {
        line: null,
        running: false,
        breakpoints: [],
        displays: [],
        frames: [],
        currentFrame: 0,
        sessionLines: ["Reading symbols from ./dfs-tree..."],
      },
      prompt: `Pare na função dfs só quando u == ${String(val)}.`,
      canonical: `break dfs if u == ${String(val)}`,
      alternatives: [`b dfs if u==${String(val)}`, `break dfs.cpp:dfs if ${String(val)} == u`],
      setupCommands: [],
      oracleProbe: ["run", "frame", "print u"],
    };
  }
  const thresh = rng.int(4, 7);
  return {
    programId: "two-pointers",
    stop: {
      line: null,
      running: false,
      breakpoints: [],
      displays: [],
      frames: [],
      currentFrame: 0,
      sessionLines: ["Reading symbols from ./two-pointers..."],
    },
    prompt: `Pare na linha 8 só quando cur > ${String(thresh)}.`,
    canonical: `break 8 if cur > ${String(thresh)}`,
    alternatives: [`b 8 if cur>${String(thresh)}`, `b twoptr.cpp:8 if ${String(thresh)} < cur`],
    setupCommands: [],
    oracleProbe: ["run", "frame", "print cur"],
  };
}

function genCondition(rng: ReturnType<typeof createRng>): ItemSpec {
  const bpId = rng.int(1, 2);
  const val = rng.int(2, 5);
  return {
    programId: "sum-loop",
    stop: {
      line: 7,
      running: true,
      breakpoints: [
        { id: 1, line: 6, enabled: true },
        { id: 2, line: 7, enabled: true },
      ],
      displays: [],
      frames: [{ index: 0, func: "main", file: "sol.cpp", line: 7, isUser: true }],
      currentFrame: 0,
      sessionLines: [
        "Breakpoint 1 at ADDR: file sol.cpp, line 6.",
        "Breakpoint 2 at ADDR: file sol.cpp, line 7.",
      ],
    },
    prompt: `Faça o breakpoint ${String(bpId)} disparar apenas quando i == ${String(val)}.`,
    canonical: `condition ${String(bpId)} i == ${String(val)}`,
    alternatives: [
      `cond ${String(bpId)} i==${String(val)}`,
      `condition ${String(bpId)} ${String(val)} == i`,
    ],
    setupCommands: ["break 6", "break 7"],
    oracleProbe: ["run", "frame", "print i"],
  };
}

function genGerir(rng: ReturnType<typeof createRng>): ItemSpec {
  const variant = rng.int(0, 3);
  const stop: StopState = {
    line: 7,
    running: true,
    breakpoints: [
      { id: 1, line: 7, enabled: true },
      { id: 2, line: 9, enabled: variant !== 3 },
    ],
    displays: [],
    frames: [{ index: 0, func: "main", file: "sol.cpp", line: 7, isUser: true }],
    currentFrame: 0,
    sessionLines: ["Breakpoint 1, main () at sol.cpp:7", "7\t    sum += a[i];"],
  };
  if (variant === 0) {
    return {
      programId: "sum-loop",
      stop,
      prompt: "Liste todos os pontos de parada ativos e desativados.",
      canonical: "info breakpoints",
      alternatives: ["i b", "info b", "inf br"],
      setupCommands: ["break 7", "break 9"],
      oracleProbe: ["info breakpoints"],
    };
  }
  if (variant === 1) {
    const id = rng.int(1, 2);
    return {
      programId: "sum-loop",
      stop,
      prompt: `Apague o breakpoint ${String(id)}.`,
      canonical: `delete ${String(id)}`,
      alternatives: [`d ${String(id)}`, `del ${String(id)}`],
      setupCommands: ["break 7", "break 9"],
      oracleProbe: ["info breakpoints"],
    };
  }
  if (variant === 2) {
    const id = rng.int(1, 2);
    return {
      programId: "sum-loop",
      stop,
      prompt: `Desative o breakpoint ${String(id)} sem apagá-lo.`,
      canonical: `disable ${String(id)}`,
      alternatives: [`dis ${String(id)}`, `disa ${String(id)}`],
      setupCommands: ["break 7", "break 9"],
      oracleProbe: ["info breakpoints"],
    };
  }
  return {
    programId: "sum-loop",
    stop,
    prompt: "Reative o breakpoint 2 que está desativado.",
    canonical: "enable 2",
    alternatives: ["en 2"],
    setupCommands: ["break 7", "break 9", "disable 2"],
    oracleProbe: ["info breakpoints"],
  };
}

function genIgnore(rng: ReturnType<typeof createRng>): ItemSpec {
  const count = rng.int(2, 5);
  return {
    programId: "sum-loop",
    stop: {
      line: 7,
      running: true,
      breakpoints: [{ id: 1, line: 7, enabled: true }],
      displays: [],
      frames: [{ index: 0, func: "main", file: "sol.cpp", line: 7, isUser: true }],
      currentFrame: 0,
      sessionLines: ["Breakpoint 1, main () at sol.cpp:7", "7\t    sum += a[i];"],
    },
    prompt: `Ignore as próximas ${String(count)} passagens do breakpoint 1.`,
    canonical: `ignore 1 ${String(count)}`,
    alternatives: [`ig 1 ${String(count)}`],
    setupCommands: ["break 7"],
    oracleProbe: ["info breakpoints"],
  };
}

function genAndar(rng: ReturnType<typeof createRng>): ItemSpec {
  const variant = rng.int(0, 6);
  if (variant === 0) {
    return {
      programId: "prefix-sum",
      stop: {
        line: 13,
        running: true,
        breakpoints: [{ id: 1, line: 13, enabled: true }],
        displays: [],
        frames: [{ index: 0, func: "main", file: "prefix.cpp", line: 13, isUser: true }],
        currentFrame: 0,
        sessionLines: [
          "Breakpoint 1, main () at prefix.cpp:13",
          "13\t  int ans = range_sum(pref, 1, 4);",
        ],
      },
      prompt: "Execute a linha atual pulando por cima da chamada range_sum.",
      canonical: "next",
      alternatives: ["n", "n 1"],
      setupCommands: ["break 13", "run"],
      oracleProbe: ["frame"],
    };
  }
  if (variant === 1) {
    return {
      programId: "prefix-sum",
      stop: {
        line: 13,
        running: true,
        breakpoints: [{ id: 1, line: 13, enabled: true }],
        displays: [],
        frames: [{ index: 0, func: "main", file: "prefix.cpp", line: 13, isUser: true }],
        currentFrame: 0,
        sessionLines: [
          "Breakpoint 1, main () at prefix.cpp:13",
          "13\t  int ans = range_sum(pref, 1, 4);",
        ],
      },
      prompt: "Entre na chamada da função range_sum.",
      canonical: "step",
      alternatives: ["s", "s 1"],
      setupCommands: ["break 13", "run"],
      oracleProbe: ["frame"],
    };
  }
  if (variant === 2) {
    const count = rng.int(2, 3);
    return {
      programId: "sum-loop",
      stop: {
        line: 5,
        running: true,
        breakpoints: [{ id: 1, line: 5, enabled: true }],
        displays: [],
        frames: [{ index: 0, func: "main", file: "sol.cpp", line: 5, isUser: true }],
        currentFrame: 0,
        sessionLines: ["Breakpoint 1, main () at sol.cpp:5", "5\t  int sum = 0;"],
      },
      prompt: `Avance ${String(count)} linhas de uma vez sem entrar em funções.`,
      canonical: `next ${String(count)}`,
      alternatives: [`n ${String(count)}`],
      setupCommands: ["break 5", "run"],
      oracleProbe: ["frame"],
    };
  }
  if (variant === 3) {
    return {
      programId: "binary-search",
      stop: {
        line: 5,
        running: true,
        breakpoints: [{ id: 1, line: 5, enabled: true }],
        displays: [],
        frames: [
          {
            index: 0,
            func: "lower_idx",
            file: "bsearch.cpp",
            line: 5,
            args: "a=ADDR, n=7, target=16",
            isUser: true,
          },
          { index: 1, func: "main", file: "bsearch.cpp", line: 16, isUser: true },
        ],
        currentFrame: 0,
        sessionLines: [
          "Breakpoint 1, lower_idx (...) at bsearch.cpp:5",
          "5\t    int mid = lo + (hi - lo) / 2;",
        ],
      },
      prompt: "Execute até a função lower_idx retornar para main.",
      canonical: "finish",
      alternatives: ["fin"],
      setupCommands: ["break 5", "run", "delete 1"],
      oracleProbe: ["frame"],
    };
  }
  if (variant === 4) {
    return {
      programId: "sum-loop",
      stop: {
        line: 7,
        running: true,
        breakpoints: [{ id: 1, line: 7, enabled: true }],
        displays: [],
        frames: [{ index: 0, func: "main", file: "sol.cpp", line: 7, isUser: true }],
        currentFrame: 0,
        sessionLines: ["Breakpoint 1, main () at sol.cpp:7", "7\t    sum += a[i];"],
      },
      prompt: "Avance até a linha 9 (fora do laço) usando until.",
      canonical: "until 9",
      alternatives: ["u 9", "unt 9", "u sol.cpp:9"],
      setupCommands: ["break 7", "run", "delete 1"],
      oracleProbe: ["frame"],
    };
  }
  if (variant === 5) {
    return {
      programId: "sum-loop",
      stop: {
        line: 5,
        running: true,
        breakpoints: [{ id: 1, line: 5, enabled: true }],
        displays: [],
        frames: [{ index: 0, func: "main", file: "sol.cpp", line: 5, isUser: true }],
        currentFrame: 0,
        sessionLines: ["Breakpoint 1, main () at sol.cpp:5", "5\t  int sum = 0;"],
      },
      prompt: "Continue até a linha 9 usando advance.",
      canonical: "advance 9",
      alternatives: ["adv 9", "advance sol.cpp:9"],
      setupCommands: ["break 5", "run"],
      oracleProbe: ["frame"],
    };
  }
  const hits = rng.int(2, 4);
  return {
    programId: "sum-loop",
    stop: {
      line: 7,
      running: true,
      breakpoints: [{ id: 1, line: 7, enabled: true }],
      displays: [],
      frames: [{ index: 0, func: "main", file: "sol.cpp", line: 7, isUser: true }],
      currentFrame: 0,
      sessionLines: ["Breakpoint 1, main () at sol.cpp:7", "7\t    sum += a[i];"],
    },
    prompt: `Continue a execução parando somente na ${String(hits)}ª próxima passagem pelo breakpoint.`,
    canonical: `continue ${String(hits)}`,
    alternatives: [`c ${String(hits)}`, `cont ${String(hits)}`],
    setupCommands: ["break 7", "run"],
    oracleProbe: ["frame", "print i"],
  };
}

function genOlhar(rng: ReturnType<typeof createRng>): ItemSpec {
  const variant = rng.int(0, 5);
  if (variant === 0) {
    const expr = rng.pick(["sum", "a[i]", "i"]);
    return {
      programId: "sum-loop",
      stop: {
        line: 7,
        running: true,
        breakpoints: [{ id: 1, line: 7, enabled: true }],
        displays: [],
        frames: [{ index: 0, func: "main", file: "sol.cpp", line: 7, isUser: true }],
        currentFrame: 0,
        sessionLines: ["Breakpoint 1, main () at sol.cpp:7", "7\t    sum += a[i];"],
      },
      prompt: `Imprima o valor atual de ${expr}.`,
      canonical: `print ${expr}`,
      alternatives: [`p ${expr}`, `inspect ${expr}`],
      setupCommands: ["break 7", "run"],
      oracleProbe: ["frame"],
    };
  }
  if (variant === 1) {
    const expr = rng.pick(["sum", "i"]);
    return {
      programId: "sum-loop",
      stop: {
        line: 7,
        running: true,
        breakpoints: [{ id: 1, line: 7, enabled: true }],
        displays: [],
        frames: [{ index: 0, func: "main", file: "sol.cpp", line: 7, isUser: true }],
        currentFrame: 0,
        sessionLines: ["Breakpoint 1, main () at sol.cpp:7", "7\t    sum += a[i];"],
      },
      prompt: `Mostre ${expr} automaticamente a cada parada.`,
      canonical: `display ${expr}`,
      alternatives: [`disp ${expr}`],
      setupCommands: ["break 7", "run"],
      oracleProbe: ["info display"],
    };
  }
  if (variant === 2) {
    return {
      programId: "sum-loop",
      stop: {
        line: 7,
        running: true,
        breakpoints: [{ id: 1, line: 7, enabled: true }],
        displays: [{ id: 1, expr: "sum" }],
        frames: [{ index: 0, func: "main", file: "sol.cpp", line: 7, isUser: true }],
        currentFrame: 0,
        sessionLines: ["Breakpoint 1, main () at sol.cpp:7", "1: sum = 0"],
      },
      prompt: "Remova o display 1 da exibição automática.",
      canonical: "undisplay 1",
      alternatives: ["und 1"],
      setupCommands: ["break 7", "run", "display sum"],
      oracleProbe: ["info display"],
    };
  }
  if (variant === 3) {
    return {
      programId: "binary-search",
      stop: {
        line: 6,
        running: true,
        breakpoints: [{ id: 1, line: 6, enabled: true }],
        displays: [],
        frames: [
          {
            index: 0,
            func: "lower_idx",
            file: "bsearch.cpp",
            line: 6,
            args: "a=ADDR, n=7, target=16",
            isUser: true,
          },
          { index: 1, func: "main", file: "bsearch.cpp", line: 16, isUser: true },
        ],
        currentFrame: 0,
        sessionLines: ["Breakpoint 1, lower_idx (...) at bsearch.cpp:6"],
      },
      prompt: "Liste todas as variáveis locais da função atual.",
      canonical: "info locals",
      alternatives: ["i lo", "inf locals"],
      setupCommands: ["break 6", "run"],
      oracleProbe: ["frame"],
    };
  }
  if (variant === 4) {
    return {
      programId: "binary-search",
      stop: {
        line: 6,
        running: true,
        breakpoints: [{ id: 1, line: 6, enabled: true }],
        displays: [],
        frames: [
          {
            index: 0,
            func: "lower_idx",
            file: "bsearch.cpp",
            line: 6,
            args: "a=ADDR, n=7, target=16",
            isUser: true,
          },
          { index: 1, func: "main", file: "bsearch.cpp", line: 16, isUser: true },
        ],
        currentFrame: 0,
        sessionLines: ["Breakpoint 1, lower_idx (...) at bsearch.cpp:6"],
      },
      prompt: "Liste os argumentos recebidos pela função atual.",
      canonical: "info args",
      alternatives: ["i ar", "inf args"],
      setupCommands: ["break 6", "run"],
      oracleProbe: ["frame"],
    };
  }
  return {
    programId: "binary-search",
    stop: {
      line: 6,
      running: true,
      breakpoints: [{ id: 1, line: 6, enabled: true }],
      displays: [],
      frames: [{ index: 0, func: "lower_idx", file: "bsearch.cpp", line: 6, isUser: true }],
      currentFrame: 0,
      sessionLines: ["Breakpoint 1, lower_idx (...) at bsearch.cpp:6"],
    },
    prompt: "Mostre o código-fonte ao redor da função lower_idx.",
    canonical: "list lower_idx",
    alternatives: ["l lower_idx", "li lower_idx", "l bsearch.cpp:lower_idx"],
    setupCommands: ["break 6", "run"],
    oracleProbe: ["frame"],
  };
}

function genPilha(rng: ReturnType<typeof createRng>): ItemSpec {
  const frames: readonly StackFrame[] = [
    {
      index: 0,
      func: "dfs",
      file: "dfs.cpp",
      line: 6,
      args: "u=4, parent=2, depth=2",
      isUser: true,
    },
    {
      index: 1,
      func: "dfs",
      file: "dfs.cpp",
      line: 9,
      args: "u=2, parent=1, depth=1",
      isUser: true,
    },
    {
      index: 2,
      func: "dfs",
      file: "dfs.cpp",
      line: 9,
      args: "u=1, parent=0, depth=0",
      isUser: true,
    },
    { index: 3, func: "main", file: "dfs.cpp", line: 19, isUser: true },
  ];
  const variant = rng.int(0, 3);
  if (variant === 0) {
    return {
      programId: "dfs-tree",
      stop: {
        line: 6,
        running: true,
        breakpoints: [{ id: 1, line: 6, enabled: true, cond: "u == 4" }],
        displays: [],
        frames,
        currentFrame: 0,
        sessionLines: ["Breakpoint 1, dfs (u=4, parent=2, depth=2) at dfs.cpp:6"],
      },
      prompt: "Mostre toda a pilha de chamadas atual.",
      canonical: "bt",
      alternatives: ["backtrace", "where", "ba"],
      setupCommands: ["break 6 if u == 4", "run"],
      oracleProbe: ["frame"],
    };
  }
  if (variant === 1) {
    const target = rng.int(1, 3);
    return {
      programId: "dfs-tree",
      stop: {
        line: 6,
        running: true,
        breakpoints: [{ id: 1, line: 6, enabled: true, cond: "u == 4" }],
        displays: [],
        frames,
        currentFrame: 0,
        sessionLines: [
          "#0  dfs (u=4, parent=2, depth=2) at dfs.cpp:6",
          "#1  dfs (u=2, parent=1, depth=1) at dfs.cpp:9",
          "#2  dfs (u=1, parent=0, depth=0) at dfs.cpp:9",
          "#3  main () at dfs.cpp:19",
        ],
      },
      prompt: `Vá diretamente para o frame #${String(target)} da pilha.`,
      canonical: `frame ${String(target)}`,
      alternatives: [`f ${String(target)}`, `up ${String(target)}`],
      setupCommands: ["break 6 if u == 4", "run"],
      oracleProbe: ["frame"],
    };
  }
  if (variant === 2) {
    return {
      programId: "dfs-tree",
      stop: {
        line: 9,
        running: true,
        breakpoints: [{ id: 1, line: 6, enabled: true, cond: "u == 4" }],
        displays: [],
        frames,
        currentFrame: 1,
        sessionLines: [
          "#1  dfs (u=2, parent=1, depth=1) at dfs.cpp:9",
          "#2  dfs (u=1, parent=0, depth=0) at dfs.cpp:9",
          "#3  main () at dfs.cpp:19",
        ],
      },
      prompt: "Você está no frame #1. Suba 2 frames até o chamador em main (#3).",
      canonical: "up 2",
      alternatives: ["frame 3", "f 3"],
      setupCommands: ["break 6 if u == 4", "run", "frame 1"],
      oracleProbe: ["frame"],
    };
  }
  return {
    programId: "dfs-tree",
    stop: {
      line: 19,
      running: true,
      breakpoints: [{ id: 1, line: 6, enabled: true, cond: "u == 4" }],
      displays: [],
      frames,
      currentFrame: 3,
      sessionLines: ["#2  dfs (u=1, parent=0, depth=0) at dfs.cpp:9", "#3  main () at dfs.cpp:19"],
    },
    prompt: "Você está no frame #3 (main). Desça 1 frame para o frame #2.",
    canonical: "down",
    alternatives: ["do", "down 1", "frame 2", "f 2"],
    setupCommands: ["break 6 if u == 4", "run", "frame 3"],
    oracleProbe: ["frame"],
  };
}

function genVigia(rng: ReturnType<typeof createRng>): ItemSpec {
  const variant = rng.int(0, 3);
  if (variant === 0) {
    const expr = rng.pick(["cur", "best"]);
    return {
      programId: "two-pointers",
      stop: {
        line: 6,
        running: true,
        breakpoints: [{ id: 1, line: 6, enabled: true }],
        displays: [],
        frames: [{ index: 0, func: "main", file: "twoptr.cpp", line: 6, isUser: true }],
        currentFrame: 0,
        sessionLines: ["Breakpoint 1, main () at twoptr.cpp:6"],
      },
      prompt: `Crie uma vigia que pare sempre que ${expr} mudar de valor.`,
      canonical: `watch ${expr}`,
      alternatives: [`wa ${expr}`],
      setupCommands: ["break 6", "run"],
      oracleProbe: ["info breakpoints"],
    };
  }
  if (variant === 1) {
    return {
      programId: "two-pointers",
      stop: {
        line: 6,
        running: true,
        breakpoints: [{ id: 1, line: 6, enabled: true }],
        displays: [],
        frames: [{ index: 0, func: "main", file: "twoptr.cpp", line: 6, isUser: true }],
        currentFrame: 0,
        sessionLines: ["Breakpoint 1, main () at twoptr.cpp:6"],
      },
      prompt: "Crie uma vigia de leitura para parar quando limit for lida.",
      canonical: "rwatch limit",
      alternatives: ["rw limit"],
      setupCommands: ["break 6", "run"],
      oracleProbe: ["info breakpoints"],
    };
  }
  if (variant === 2) {
    return {
      programId: "two-pointers",
      stop: {
        line: 6,
        running: true,
        breakpoints: [{ id: 1, line: 6, enabled: true }],
        displays: [],
        frames: [{ index: 0, func: "main", file: "twoptr.cpp", line: 6, isUser: true }],
        currentFrame: 0,
        sessionLines: ["Breakpoint 1, main () at twoptr.cpp:6"],
      },
      prompt: "Crie uma vigia de acesso (leitura ou escrita) sobre cur.",
      canonical: "awatch cur",
      alternatives: ["aw cur"],
      setupCommands: ["break 6", "run"],
      oracleProbe: ["info breakpoints"],
    };
  }
  return {
    programId: "linked-list",
    stop: {
      line: 16,
      running: true,
      breakpoints: [{ id: 1, line: 16, enabled: true }],
      displays: [],
      frames: [{ index: 0, func: "main", file: "list.cpp", line: 16, isUser: true }],
      currentFrame: 0,
      sessionLines: ["Breakpoint 1, main () at list.cpp:16", "16\t    bump(cur);"],
    },
    prompt: "Vigie diretamente o endereço de memória de cur->val (mesmo se cur mudar depois).",
    canonical: "watch -l cur->val",
    alternatives: ["wa -l cur->val", "watch -location cur->val"],
    setupCommands: ["break 16", "run"],
    oracleProbe: ["info breakpoints"],
  };
}

function genMudar(rng: ReturnType<typeof createRng>): ItemSpec {
  const variant = rng.int(0, 2);
  if (variant === 0) {
    const val = rng.int(10, 99);
    return {
      programId: "sum-loop",
      stop: {
        line: 7,
        running: true,
        breakpoints: [{ id: 1, line: 7, enabled: true }],
        displays: [],
        frames: [{ index: 0, func: "main", file: "sol.cpp", line: 7, isUser: true }],
        currentFrame: 0,
        sessionLines: ["Breakpoint 1, main () at sol.cpp:7"],
      },
      prompt: `Altere o valor da variável sum para ${String(val)}.`,
      canonical: `set var sum = ${String(val)}`,
      alternatives: [
        `set variable sum = ${String(val)}`,
        `set sum = ${String(val)}`,
        `print sum = ${String(val)}`,
        `p sum = ${String(val)}`,
      ],
      setupCommands: ["break 7", "run"],
      oracleProbe: ["print sum"],
    };
  }
  if (variant === 1) {
    const val = rng.int(1, 5);
    return {
      programId: "binary-search",
      stop: {
        line: 6,
        running: true,
        breakpoints: [{ id: 1, line: 6, enabled: true }],
        displays: [],
        frames: [{ index: 0, func: "lower_idx", file: "bsearch.cpp", line: 6, isUser: true }],
        currentFrame: 0,
        sessionLines: ["Breakpoint 1, lower_idx (...) at bsearch.cpp:6"],
      },
      prompt: `Troque o valor de lo para ${String(val)} durante a parada.`,
      canonical: `set var lo = ${String(val)}`,
      alternatives: [`p lo = ${String(val)}`, `set variable lo = ${String(val)}`],
      setupCommands: ["break 6", "run"],
      oracleProbe: ["print lo"],
    };
  }
  const a = rng.pick([12, 24, 36]);
  const b = rng.pick([8, 18]);
  return {
    programId: "gcd-rec",
    stop: {
      line: 12,
      running: true,
      breakpoints: [{ id: 1, line: 12, enabled: true }],
      displays: [],
      frames: [{ index: 0, func: "main", file: "gcd.cpp", line: 12, isUser: true }],
      currentFrame: 0,
      sessionLines: ["Breakpoint 1, main () at gcd.cpp:12"],
    },
    prompt: `Chame a função gcd(${String(a)}, ${String(b)}) diretamente pelo gdb.`,
    canonical: `call gcd(${String(a)}, ${String(b)})`,
    alternatives: [`cal gcd(${String(a)},${String(b)})`],
    setupCommands: ["break 12", "run"],
    oracleProbe: ["frame"],
  };
}

function genCrash(rng: ReturnType<typeof createRng>): ItemSpec {
  const variant = rng.int(0, 2);
  if (variant === 0) {
    return {
      programId: "segfault-ptr",
      stop: {
        line: 9,
        running: true,
        breakpoints: [],
        displays: [],
        frames: [
          {
            index: 0,
            func: "sum_nodes",
            file: "segv.cpp",
            line: 9,
            args: "p=0x0, steps=2",
            isUser: true,
          },
          { index: 1, func: "solve", file: "segv.cpp", line: 16, isUser: true },
          { index: 2, func: "main", file: "segv.cpp", line: 19, isUser: true },
        ],
        currentFrame: 0,
        signal: "SIGSEGV",
        sessionLines: [
          "Program received signal SIGSEGV, Segmentation fault.",
          "ADDR in sum_nodes (p=0x0, steps=2) at segv.cpp:9",
          "9\t    total += p->val;",
        ],
      },
      prompt:
        "O programa recebeu SIGSEGV. Veja a pilha de chamadas para descobrir quem chamou sum_nodes.",
      canonical: "bt",
      alternatives: ["backtrace", "where"],
      setupCommands: ["run"],
      oracleProbe: ["frame"],
    };
  }
  if (variant === 1) {
    return {
      programId: "abort-assert",
      stop: {
        line: 4,
        running: true,
        breakpoints: [],
        displays: [],
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
          { index: 5, func: "check_idx", file: "abort.cpp", line: 4, args: "idx=-3", isUser: true },
          { index: 6, func: "process", file: "abort.cpp", line: 8, args: "x=2", isUser: true },
          { index: 7, func: "main", file: "abort.cpp", line: 11, isUser: true },
        ],
        currentFrame: 0,
        signal: "SIGABRT",
        sessionLines: [
          "Program received signal SIGABRT, Aborted.",
          "#0..#4  (funções internas da libc)",
          "#5  check_idx (idx=-3) at abort.cpp:4",
          "#6  process (x=2) at abort.cpp:8",
        ],
      },
      prompt:
        "O assert abortou dentro da libc (#0). Selecione o frame #5 (check_idx), no seu código.",
      canonical: "frame 5",
      alternatives: ["f 5", "up 5"],
      setupCommands: ["run"],
      oracleProbe: ["frame"],
    };
  }
  return {
    programId: "throw-oob",
    stop: {
      line: null,
      running: false,
      breakpoints: [],
      displays: [],
      frames: [],
      currentFrame: 0,
      sessionLines: ["Reading symbols from ./throw-oob..."],
    },
    prompt: "Configure o gdb para parar assim que uma exceção C++ for lançada.",
    canonical: "catch throw",
    alternatives: ["cat t", "cat throw"],
    setupCommands: [],
    oracleProbe: ["info breakpoints"],
  };
}

/** Deterministic generator for GDB Comandos items (AC-3). */
export function generateCommandItem(
  seed: number,
  index: number,
  kinds: readonly GdbCmdKind[],
): GdbCommandItem {
  const pool = kinds.length > 0 ? kinds : GDB_CMD_KINDS;
  const itemSeed = deriveSeed(seed, index);
  const rng = createRng(itemSeed);
  const kind = rng.pick(pool);

  let spec: ItemSpec;
  switch (kind) {
    case "iniciar":
      spec = genIniciar(rng);
      break;
    case "break-linha":
      spec = genBreakLinha(rng);
      break;
    case "break-funcao":
      spec = genBreakFuncao(rng);
      break;
    case "tbreak":
      spec = genTbreak(rng);
      break;
    case "break-cond":
      spec = genBreakCond(rng);
      break;
    case "condition":
      spec = genCondition(rng);
      break;
    case "gerir":
      spec = genGerir(rng);
      break;
    case "ignore":
      spec = genIgnore(rng);
      break;
    case "andar":
      spec = genAndar(rng);
      break;
    case "olhar":
      spec = genOlhar(rng);
      break;
    case "pilha":
      spec = genPilha(rng);
      break;
    case "vigia":
      spec = genVigia(rng);
      break;
    case "mudar":
      spec = genMudar(rng);
      break;
    case "crash":
      spec = genCrash(rng);
      break;
  }

  return buildItem(itemSeed, index, kind, spec);
}
