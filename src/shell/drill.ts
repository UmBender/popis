import { createRng, deriveSeed, type Rng } from "../core/rng";
import { equivalentForms, type CheckOptions, type ShellExpected } from "./check";

export const SHELL_DRILL_KINDS = [
  "arquivos",
  "compilar",
  "rodar",
  "comparar",
  "stress",
  "limites",
  "texto",
  "setup",
  "scripts",
] as const;

export type ShellDrillKind = (typeof SHELL_DRILL_KINDS)[number];

export const SHELL_DRILL_KIND_LABELS: Readonly<Record<ShellDrillKind, string>> = {
  arquivos: "Arquivos (ls, cd, mkdir, cp, mv, cat, rm)",
  compilar: "Compilar (g++, avisos, sanitizers)",
  rodar: "Rodar (<, >, 2>, tee, time, timeout)",
  comparar: "Comparar (diff, -Z, -w, cmp, <())",
  stress: "Stress test (for/while, || break)",
  limites: "Limites (ulimit -s, -v, -a)",
  texto: "Texto (head, tail, wc, sort, uniq, grep)",
  setup: "Setup (alias, função, source)",
  scripts: "Scripts (if, for, função, exit)",
};

export type ShellDrillItem = {
  readonly seed: number;
  readonly index: number;
  readonly kind: ShellDrillKind;
  readonly kc: `shell.${ShellDrillKind}`;
  readonly prompt: string;
  readonly mentionedFiles: readonly string[];
  readonly cwd: string;
  readonly files: readonly string[];
  readonly terminalLines: readonly string[];
  readonly canonical: string;
  readonly alternatives: readonly string[];
  readonly expected: ShellExpected;
  readonly oracleFixture: string;
  readonly oracleProbe?: string;
};

type ItemSpec = {
  readonly prompt: string;
  readonly mentionedFiles: readonly string[];
  readonly cwd: string;
  readonly files: readonly string[];
  readonly terminalLines: readonly string[];
  readonly canonical: string;
  readonly extraAccepted?: readonly string[];
  readonly options?: CheckOptions;
  readonly oracleFixture: string;
  readonly oracleProbe?: string;
};

const PROBS = ["a", "b", "c", "sol"] as const;
const INPUTS = ["in1", "in2", "in.txt"] as const;
const OUTPUTS = ["out1", "out2", "out.txt"] as const;
const ANSWERS = ["ans1", "ans2"] as const;

function buildArquivos(rng: Rng): ItemSpec {
  const variant = rng.int(0, 7);
  const src = `${rng.pick(PROBS)}.cpp`;
  const dst = rng.pick(["backup.cpp", "old.cpp", "sol_bak.cpp"]);
  const dir = rng.pick(["sub", "tests", "tmp"]);
  const nested = rng.pick(["tests/day1", "a/b/c", "work/in"]);
  const inp = rng.pick(INPUTS);
  const trash = rng.pick(["tmp.out", "debug.log", "old.out"]);

  switch (variant) {
    case 0:
      return {
        prompt: "Liste todos os arquivos da pasta atual, incluindo ocultos, em formato longo.",
        mentionedFiles: [],
        cwd: "~/contest/a",
        files: [src, inp, ".hidden"],
        terminalLines: ["$ pwd", "/home/contest/a"],
        canonical: "ls -la",
        oracleFixture: "files",
      };
    case 1:
      return {
        prompt: "Liste os arquivos em formato longo com tamanhos legíveis (KB, MB).",
        mentionedFiles: [],
        cwd: "~/contest/a",
        files: [src, inp, "out1"],
        terminalLines: ["$ pwd", "/home/contest/a"],
        canonical: "ls -lh",
        oracleFixture: "files",
      };
    case 2:
      return {
        prompt: `Entre na pasta ${dir}.`,
        mentionedFiles: [dir],
        cwd: "~/contest",
        files: [`${dir}/`, src, inp],
        terminalLines: ["$ ls", `${dir}  ${src}  ${inp}`],
        canonical: `cd ${dir}`,
        oracleFixture: "files",
        oracleProbe: "pwd",
      };
    case 3:
      return {
        prompt: "Volte para a pasta anterior no terminal.",
        mentionedFiles: [],
        cwd: "~/contest/sub",
        files: [src, inp],
        terminalLines: ["$ cd sub", "$ pwd", "/home/contest/sub"],
        canonical: "cd -",
        oracleFixture: "files-prev",
        oracleProbe: "pwd",
      };
    case 4:
      return {
        prompt: `Crie a pasta ${nested} criando pastas intermediárias se ainda não existirem.`,
        mentionedFiles: [nested],
        cwd: "~/contest",
        files: [src, inp],
        terminalLines: ["$ ls", `${src}  ${inp}`],
        canonical: `mkdir -p ${nested}`,
        oracleFixture: "files",
      };
    case 5:
      return {
        prompt: `Copie ${src} para ${dst}.`,
        mentionedFiles: [src, dst],
        cwd: "~/contest/a",
        files: [src, inp],
        terminalLines: ["$ ls", `${src}  ${inp}`],
        canonical: `cp ${src} ${dst}`,
        oracleFixture: "files",
      };
    case 6:
      return {
        prompt: `Renomeie ${src} para ${dst}.`,
        mentionedFiles: [src, dst],
        cwd: "~/contest/a",
        files: [src, inp],
        terminalLines: ["$ ls", `${src}  ${inp}`],
        canonical: `mv ${src} ${dst}`,
        oracleFixture: "files",
      };
    default:
      return rng.int(0, 1) === 0
        ? {
            prompt: `Mostre o conteúdo completo de ${inp} na tela.`,
            mentionedFiles: [inp],
            cwd: "~/contest/a",
            files: [src, inp],
            terminalLines: ["$ ls", `${src}  ${inp}`],
            canonical: `cat ${inp}`,
            oracleFixture: "files",
          }
        : {
            prompt: `Remova o arquivo ${trash} sem pedir confirmação (forçado).`,
            mentionedFiles: [trash],
            cwd: "~/contest/a",
            files: [src, trash],
            terminalLines: ["$ ls", `${src}  ${trash}`],
            canonical: `rm -f ${trash}`,
            oracleFixture: "files",
          };
  }
}

function buildCompilar(rng: Rng): ItemSpec {
  const variant = rng.int(0, 4);
  const name = rng.pick(PROBS);
  const src = `${name}.cpp`;

  switch (variant) {
    case 0:
      return {
        prompt: `Compile ${src} para o executável ${name} com otimização -O2 e padrão gnu++20 (flags do juiz).`,
        mentionedFiles: [src, name],
        cwd: "~/contest",
        files: [src, "in1"],
        terminalLines: ["$ ls", `${src}  in1`],
        canonical: `g++ -O2 -std=gnu++20 ${src} -o ${name}`,
        oracleFixture: "compile",
        oracleProbe: `./${name} < in1`,
      };
    case 1:
      return {
        prompt: `Compile ${src} para ${name} com os avisos -Wall, -Wextra e -Wshadow.`,
        mentionedFiles: [src, name],
        cwd: "~/contest",
        files: [src, "in1"],
        terminalLines: ["$ ls", `${src}  in1`],
        canonical: `g++ -Wall -Wextra -Wshadow ${src} -o ${name}`,
        oracleFixture: "compile",
        oracleProbe: `./${name} < in1`,
      };
    case 2:
      return {
        prompt: `Compile ${src} para ${name} ativando depuração da STL com -D_GLIBCXX_DEBUG e padrão gnu++20.`,
        mentionedFiles: [src, name],
        cwd: "~/contest",
        files: [src, "in1"],
        terminalLines: ["$ ls", `${src}  in1`],
        canonical: `g++ -std=gnu++20 -D_GLIBCXX_DEBUG ${src} -o ${name}`,
        oracleFixture: "compile",
        oracleProbe: `./${name} < in1`,
      };
    case 3:
      return {
        prompt: `Compile ${src} para ${name} com -g e sanitizers de endereço e comportamento indefinido (-fsanitize=address,undefined).`,
        mentionedFiles: [src, name],
        cwd: "~/contest",
        files: [src, "in1"],
        terminalLines: ["$ ls", `${src}  in1`],
        canonical: `g++ -g -fsanitize=address,undefined ${src} -o ${name}`,
        oracleFixture: "compile",
        oracleProbe: `./${name} < in1`,
      };
    default:
      return {
        prompt: `Compile ${src} para ${name} com -O2, -std=gnu++20, -Wall e -Wextra.`,
        mentionedFiles: [src, name],
        cwd: "~/contest",
        files: [src, "in1"],
        terminalLines: ["$ ls", `${src}  in1`],
        canonical: `g++ -O2 -std=gnu++20 -Wall -Wextra ${src} -o ${name}`,
        oracleFixture: "compile",
        oracleProbe: `./${name} < in1`,
      };
  }
}

function buildRodar(rng: Rng): ItemSpec {
  const variant = rng.int(0, 5);
  const bin = rng.pick(["a", "b", "sol"]);
  const inp = rng.pick(INPUTS);
  const out = rng.pick(OUTPUTS);
  const err = rng.pick(["err.log", "stderr.txt"]);
  const secs = rng.pick([1, 2, 3]);

  switch (variant) {
    case 0:
      return {
        prompt: `Rode ./${bin} lendo a entrada de ${inp}.`,
        mentionedFiles: [`./${bin}`, inp],
        cwd: "~/contest",
        files: [bin, `${bin}.cpp`, inp],
        terminalLines: [`$ g++ -O2 ${bin}.cpp -o ${bin}`],
        canonical: `./${bin} < ${inp}`,
        oracleFixture: "run",
      };
    case 1:
      return {
        prompt: `Rode ./${bin} lendo de ${inp} e salvando a saída em ${out}.`,
        mentionedFiles: [`./${bin}`, inp, out],
        cwd: "~/contest",
        files: [bin, inp],
        terminalLines: ["$ ls", `${bin}  ${inp}`],
        canonical: `./${bin} < ${inp} > ${out}`,
        oracleFixture: "run",
      };
    case 2:
      return {
        prompt: `Rode ./${bin} lendo de ${inp} e salvando apenas a saída de erro (stderr) em ${err}.`,
        mentionedFiles: [`./${bin}`, inp, err],
        cwd: "~/contest",
        files: [bin, inp],
        terminalLines: ["$ ls", `${bin}  ${inp}`],
        canonical: `./${bin} < ${inp} 2> ${err}`,
        oracleFixture: "run",
      };
    case 3:
      return {
        prompt: `Rode ./${bin} com ${inp}, mostrando a saída na tela e gravando em ${out} com tee.`,
        mentionedFiles: [`./${bin}`, inp, out],
        cwd: "~/contest",
        files: [bin, inp],
        terminalLines: ["$ ls", `${bin}  ${inp}`],
        canonical: `./${bin} < ${inp} | tee ${out}`,
        oracleFixture: "run",
      };
    case 4:
      return {
        prompt: `Meça o tempo de execução de ./${bin} lendo ${inp} com time.`,
        mentionedFiles: [`./${bin}`, inp],
        cwd: "~/contest",
        files: [bin, inp],
        terminalLines: ["$ ls", `${bin}  ${inp}`],
        canonical: `time ./${bin} < ${inp}`,
        oracleFixture: "run",
      };
    default:
      return {
        prompt: `Rode ./${bin} com ${inp} limitando o tempo a ${String(secs)} s com timeout.`,
        mentionedFiles: [`./${bin}`, inp],
        cwd: "~/contest",
        files: [bin, inp],
        terminalLines: ["$ ls", `${bin}  ${inp}`],
        canonical: `timeout ${String(secs)} ./${bin} < ${inp}`,
        oracleFixture: "run",
      };
  }
}

function buildComparar(rng: Rng): ItemSpec {
  const variant = rng.int(0, 4);
  const out = rng.pick(["out1", "out2"]);
  const ans = rng.pick(ANSWERS);
  const inp = rng.pick(INPUTS);

  switch (variant) {
    case 0:
      return {
        prompt: `Compare ${out} e ${ans} linha a linha com diff.`,
        mentionedFiles: [out, ans],
        cwd: "~/contest",
        files: ["sol", inp, out, ans],
        terminalLines: [`$ ./sol < ${inp} > ${out}`],
        canonical: `diff ${out} ${ans}`,
        oracleFixture: "compare",
      };
    case 1:
      return {
        prompt: `Compare ${out} e ${ans} ignorando apenas espaços no fim da linha (-Z).`,
        mentionedFiles: [out, ans],
        cwd: "~/contest",
        files: ["sol", inp, out, ans],
        terminalLines: [`$ ./sol < ${inp} > ${out}`],
        canonical: `diff -Z ${out} ${ans}`,
        oracleFixture: "compare",
      };
    case 2:
      return {
        prompt: `Compare ${out} e ${ans} ignorando todos os espaços em branco (-w).`,
        mentionedFiles: [out, ans],
        cwd: "~/contest",
        files: ["sol", inp, out, ans],
        terminalLines: [`$ ./sol < ${inp} > ${out}`],
        canonical: `diff -w ${out} ${ans}`,
        oracleFixture: "compare",
      };
    case 3:
      return {
        prompt: `Verifique silenciosamente se ${out} e ${ans} são idênticos byte a byte com cmp -s.`,
        mentionedFiles: [out, ans],
        cwd: "~/contest",
        files: [out, ans],
        terminalLines: ["$ ls", `${out}  ${ans}`],
        canonical: `cmp -s ${out} ${ans}`,
        oracleFixture: "compare",
      };
    default:
      return {
        prompt: `Compare diretamente as saídas de ./sol e ./brute para ${inp} sem arquivos temporários, usando diff <(...) <(...).`,
        mentionedFiles: ["./sol", "./brute", inp],
        cwd: "~/contest",
        files: ["sol", "brute", inp],
        terminalLines: ["$ ls", `sol  brute  ${inp}`],
        canonical: `diff <(./sol < ${inp}) <(./brute < ${inp})`,
        oracleFixture: "compare",
      };
  }
}

function buildStress(rng: Rng): ItemSpec {
  const variant = rng.int(0, 2);
  const count = rng.pick([10, 20, 50]);
  const inp = rng.pick(["in", "in.txt"]);

  switch (variant) {
    case 0:
      return {
        prompt: `Faça um laço for com $i de 1 a ${String(count)}: gere ${inp} com ./gen $i, rode ./sol em out1 e ./brute em out2, e pare no primeiro caso em que diff out1 out2 falhar.`,
        mentionedFiles: ["./gen", "./sol", "./brute", inp, "out1", "out2"],
        cwd: "~/contest/stress",
        files: ["gen", "sol", "brute"],
        terminalLines: ["$ ls", "gen  sol  brute"],
        canonical: `for i in $(seq 1 ${String(count)}); do ./gen $i > ${inp} && ./sol < ${inp} > out1 && ./brute < ${inp} > out2 && diff out1 out2 || break; done`,
        options: { allowSemicolon: true },
        oracleFixture: "stress",
        oracleProbe: `cat ${inp}`,
      };
    case 1:
      return {
        prompt: `Repita com for para $i de 1 a ${String(count)}: gere ${inp} com ./gen $i, compare ./sol e ./brute em out1 e out2 com diff -Z, parando ao diferir (|| break).`,
        mentionedFiles: ["./gen", "./sol", "./brute", inp, "out1", "out2"],
        cwd: "~/contest/stress",
        files: ["gen", "sol", "brute"],
        terminalLines: ["$ ls", "gen  sol  brute"],
        canonical: `for i in $(seq 1 ${String(count)}); do ./gen $i > ${inp} && ./sol < ${inp} > out1 && ./brute < ${inp} > out2 && diff -Z out1 out2 || break; done`,
        options: { allowSemicolon: true },
        oracleFixture: "stress",
        oracleProbe: `cat ${inp}`,
      };
    default:
      return {
        prompt: `Rode um laço while true gerando ${inp} com ./gen, executando ./sol em out1 e ./brute em out2, e parando quando diff out1 out2 diferir.`,
        mentionedFiles: ["./gen", "./sol", "./brute", inp, "out1", "out2"],
        cwd: "~/contest/stress",
        files: ["gen", "sol", "brute"],
        terminalLines: ["$ ls", "gen  sol  brute"],
        canonical: `while true; do ./gen > ${inp} && ./sol < ${inp} > out1 && ./brute < ${inp} > out2 && diff out1 out2 || break; done`,
        options: { allowSemicolon: true },
        oracleFixture: "stress",
        oracleProbe: `cat ${inp}`,
      };
  }
}

function buildLimites(rng: Rng): ItemSpec {
  const variant = rng.int(0, 3);
  const stackKb = rng.pick([65536, 131072, 262144]);
  const memKb = rng.pick([262144, 524288, 1048576]);

  switch (variant) {
    case 0:
      return {
        prompt: "Libere o limite de pilha para ilimitado (unlimited) antes de rodar uma DFS funda.",
        mentionedFiles: [],
        cwd: "~/contest",
        files: ["dfs.cpp", "dfs", "in1"],
        terminalLines: ["$ ./dfs < in1", "Segmentation fault (core dumped)"],
        canonical: "ulimit -s unlimited",
        oracleFixture: "limits",
        oracleProbe: "ulimit -s",
      };
    case 1:
      return {
        prompt: `Ajuste o limite de pilha para ${String(stackKb)} KB com ulimit.`,
        mentionedFiles: [],
        cwd: "~/contest",
        files: ["dfs.cpp", "dfs", "in1"],
        terminalLines: ["$ ulimit -s", "8192"],
        canonical: `ulimit -s ${String(stackKb)}`,
        oracleFixture: "limits",
        oracleProbe: "ulimit -s",
      };
    case 2:
      return {
        prompt: `Limite a memória virtual do processo a ${String(memKb)} KB com ulimit.`,
        mentionedFiles: [],
        cwd: "~/contest",
        files: ["sol.cpp", "sol", "in1"],
        terminalLines: ["$ ulimit -v", "unlimited"],
        canonical: `ulimit -v ${String(memKb)}`,
        oracleFixture: "limits",
        oracleProbe: "ulimit -v",
      };
    default:
      return {
        prompt: "Mostre todos os limites ativos da sessão atual com ulimit.",
        mentionedFiles: [],
        cwd: "~/contest",
        files: ["sol.cpp", "sol"],
        terminalLines: ["$ pwd", "/home/contest"],
        canonical: "ulimit -a",
        oracleFixture: "limits",
      };
  }
}

function buildTexto(rng: Rng): ItemSpec {
  const variant = rng.int(0, 5);
  const n = rng.pick([5, 10, 20]);
  const file = rng.pick(["out1", "log.txt", "data.txt"]);
  const pat = rng.pick(["ERR", "WA", "seed"]);

  switch (variant) {
    case 0:
      return {
        prompt: `Mostre as primeiras ${String(n)} linhas de ${file}.`,
        mentionedFiles: [file],
        cwd: "~/contest",
        files: [file, "nums.txt", "words.txt"],
        terminalLines: ["$ ls", `${file}  nums.txt  words.txt`],
        canonical: `head -n ${String(n)} ${file}`,
        oracleFixture: "text",
      };
    case 1:
      return {
        prompt: `Mostre as últimas ${String(n)} linhas de ${file}.`,
        mentionedFiles: [file],
        cwd: "~/contest",
        files: [file, "nums.txt", "words.txt"],
        terminalLines: ["$ ls", `${file}  nums.txt  words.txt`],
        canonical: `tail -n ${String(n)} ${file}`,
        oracleFixture: "text",
      };
    case 2:
      return {
        prompt: `Conte quantas linhas tem o arquivo ${file}.`,
        mentionedFiles: [file],
        cwd: "~/contest",
        files: [file, "nums.txt"],
        terminalLines: ["$ ls", `${file}  nums.txt`],
        canonical: `wc -l ${file}`,
        oracleFixture: "text",
      };
    case 3:
      return {
        prompt: "Ordene nums.txt em ordem numérica crescente.",
        mentionedFiles: ["nums.txt"],
        cwd: "~/contest",
        files: ["nums.txt", "words.txt"],
        terminalLines: ["$ cat nums.txt", "10", "2", "1"],
        canonical: "sort -n nums.txt",
        oracleFixture: "text",
      };
    case 4:
      return {
        prompt: "Ordene words.txt e conte as ocorrências de cada linha com uniq -c.",
        mentionedFiles: ["words.txt"],
        cwd: "~/contest",
        files: ["words.txt", "nums.txt"],
        terminalLines: ["$ head -n 3 words.txt", "wa", "ac", "wa"],
        canonical: "sort words.txt | uniq -c",
        oracleFixture: "text",
      };
    default:
      return {
        prompt: `Procure ${pat} em ${file} mostrando o número da linha.`,
        mentionedFiles: [file],
        cwd: "~/contest",
        files: [file, "nums.txt"],
        terminalLines: ["$ ls", `${file}  nums.txt`],
        canonical: `grep -n ${pat} ${file}`,
        oracleFixture: "text",
      };
  }
}

function buildSetup(rng: Rng): ItemSpec {
  const variant = rng.int(0, 2);

  switch (variant) {
    case 0:
      return {
        prompt: "Crie o alias c para compilar com g++ -O2 -std=gnu++20 -Wall -Wextra.",
        mentionedFiles: [],
        cwd: "~/contest",
        files: ["a.cpp", ".bashrc"],
        terminalLines: ["$ ls -a", ".bashrc  a.cpp"],
        canonical: "alias c='g++ -O2 -std=gnu++20 -Wall -Wextra'",
        oracleFixture: "setup",
        oracleProbe: "alias c",
      };
    case 1:
      return {
        prompt: 'Defina a função c que compila "$1.cpp" para "$1" com g++ -O2 -std=gnu++20.',
        mentionedFiles: [],
        cwd: "~/contest",
        files: ["a.cpp", "in1"],
        terminalLines: ["$ ls", "a.cpp  in1"],
        canonical: `c() { g++ -O2 -std=gnu++20 "$1.cpp" -o "$1"; }`,
        oracleFixture: "setup",
        oracleProbe: "c a && ./a < in1",
      };
    default:
      return {
        prompt: "Recarregue o arquivo ~/.bashrc na sessão atual do terminal.",
        mentionedFiles: ["~/.bashrc"],
        cwd: "~/contest",
        files: ["a.cpp"],
        terminalLines: ["$ vim ~/.bashrc"],
        canonical: "source ~/.bashrc",
        oracleFixture: "setup",
        oracleProbe: "type c",
      };
  }
}

/** One-line script objectives: tests, if, loops, functions and exit codes (T54 AC-5). */
function buildScripts(_rng: Rng): ItemSpec {
  throw new Error("todo");
}

/** Generates a deterministic Shell Comandos drill item from seed, index and active kinds (AC-3). */
export function generateShellItem(
  seed: number,
  index: number,
  kinds: readonly ShellDrillKind[],
): ShellDrillItem {
  const pool = kinds.length > 0 ? kinds : SHELL_DRILL_KINDS;
  const itemSeed = deriveSeed(seed, index);
  const rng = createRng(itemSeed);
  const kind = rng.pick(pool);

  let spec: ItemSpec;
  switch (kind) {
    case "arquivos":
      spec = buildArquivos(rng);
      break;
    case "compilar":
      spec = buildCompilar(rng);
      break;
    case "rodar":
      spec = buildRodar(rng);
      break;
    case "comparar":
      spec = buildComparar(rng);
      break;
    case "stress":
      spec = buildStress(rng);
      break;
    case "limites":
      spec = buildLimites(rng);
      break;
    case "texto":
      spec = buildTexto(rng);
      break;
    case "setup":
      spec = buildSetup(rng);
      break;
    case "scripts":
      spec = buildScripts(rng);
      break;
  }

  const accepted = [spec.canonical, ...(spec.extraAccepted ?? [])];
  const alternatives = equivalentForms(spec.canonical, spec.options);
  return {
    seed: itemSeed,
    index,
    kind,
    kc: `shell.${kind}`,
    prompt: spec.prompt,
    mentionedFiles: spec.mentionedFiles,
    cwd: spec.cwd,
    files: spec.files,
    terminalLines: spec.terminalLines,
    canonical: spec.canonical,
    alternatives,
    expected: {
      accepted,
      ...(spec.options !== undefined ? { options: spec.options } : {}),
    },
    oracleFixture: spec.oracleFixture,
    ...(spec.oracleProbe !== undefined ? { oracleProbe: spec.oracleProbe } : {}),
  };
}
