import type { LessonLike, UnitLike } from "../learn/curriculum";
import { compile, type MatchMode, type RegexDialect } from "./compile";
import type {
  CasarItem,
  ExtrairItem,
  LerItem,
  RegexItem,
  RegexItemKind,
  TrocarItem,
} from "./types";

export type RegexToken = {
  readonly syntax: string;
  readonly desc: string;
};

export type RegexExampleStep = {
  readonly pattern: string;
  readonly replacement?: string;
  readonly note: string;
};

export type RegexExample = {
  readonly dialect: RegexDialect;
  readonly mode: MatchMode;
  readonly lines: readonly string[];
  readonly steps: readonly RegexExampleStep[];
};

export type RegexLesson = LessonLike & {
  readonly id: string;
  readonly title: string;
  readonly explanation: string;
  readonly dialect: RegexDialect;
  readonly tokens: readonly RegexToken[];
  readonly example: RegexExample;
  readonly exercises: readonly [RegexItem, RegexItem, RegexItem];
  readonly practiceKinds: readonly RegexItemKind[];
  readonly practiceDialect: RegexDialect;
};

export type RegexUnit = UnitLike<RegexLesson> & {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly lessons: readonly RegexLesson[];
};

function casarEx(
  id: string,
  dialect: RegexDialect,
  mode: MatchMode,
  prompt: string,
  positive: readonly string[],
  negative: readonly string[],
  canonical: string,
  explanation: string,
  otherCanonical?: string,
): CasarItem {
  return {
    id,
    kind: "casar",
    kc: "regex.casar",
    family: id,
    dialect,
    mode,
    prompt,
    positive,
    negative,
    canonical,
    canonicalByDialect:
      dialect === "python"
        ? { python: canonical, ere: otherCanonical ?? canonical }
        : { python: otherCanonical ?? canonical, ere: canonical },
    explanation,
  };
}

function extrairEx(
  id: string,
  dialect: RegexDialect,
  prompt: string,
  cases: readonly { readonly line: string; readonly expected: string | null }[],
  canonical: string,
  explanation: string,
  otherCanonical?: string,
): ExtrairItem {
  return {
    id,
    kind: "extrair",
    kc: "regex.extrair",
    family: id,
    dialect,
    mode: "search",
    prompt,
    cases,
    canonical,
    canonicalByDialect:
      dialect === "python"
        ? { python: canonical, ere: otherCanonical ?? canonical }
        : { python: otherCanonical ?? canonical, ere: canonical },
    explanation,
  };
}

function trocarEx(
  id: string,
  dialect: RegexDialect,
  prompt: string,
  cases: readonly { readonly before: string; readonly after: string }[],
  canonical: string,
  canonicalReplacement: string,
  explanation: string,
): TrocarItem {
  const pair = { pattern: canonical, replacement: canonicalReplacement };
  return {
    id,
    kind: "trocar",
    kc: "regex.trocar",
    family: id,
    dialect,
    mode: "search",
    prompt,
    cases,
    canonical,
    canonicalReplacement,
    canonicalByDialect: { python: pair, ere: pair },
    explanation,
  };
}

function lerEx(
  id: string,
  dialect: RegexDialect,
  mode: MatchMode,
  pattern: string,
  lines: readonly string[],
  explanation: string,
): LerItem {
  const compiled = compile(pattern, dialect, mode);
  if (!compiled.ok) throw new Error(`invalid curriculum ler ${id}: ${compiled.error}`);
  const expected = lines.map((l) => compiled.matcher.test(l));
  const indices = expected
    .map((ok, i) => (ok ? String(i + 1) : null))
    .filter((x): x is string => x !== null);
  return {
    id,
    kind: "ler",
    kc: "regex.ler",
    family: id,
    dialect,
    mode,
    prompt: "Marque todas as linhas em que a expressão casa.",
    pattern,
    lines,
    expected,
    canonical: `linhas ${indices.join(", ")}`,
    explanation,
  };
}

export const REGEX_UNITS: readonly RegexUnit[] = [
  {
    id: "u1-literais",
    number: 1,
    title: "Literais",
    lessons: [
      {
        id: "u1-literal",
        title: "Caracteres literais",
        explanation:
          "Uma regex simples busca a sequência exata de caracteres em qualquer trecho da linha. Maiúsculas e minúsculas são tratadas como letras diferentes por padrão. Isso já resolve a maioria das buscas rápidas por um veredito num log de saída.",
        dialect: "python",
        tokens: [
          { syntax: "WA", desc: "casa o texto literal WA em qualquer lugar da linha" },
          { syntax: "Case #", desc: "espaços e símbolos comuns também são literais" },
        ],
        example: {
          dialect: "python",
          mode: "search",
          lines: ["caso 1: AC", "caso 2: WA", "caso 3: wa", "caso 4: WA (linha 2)"],
          steps: [
            { pattern: "W", note: "Busca a letra W maiúscula nas linhas." },
            { pattern: "WA", note: "Casa apenas as linhas que contêm WA exato." },
            { pattern: ": WA", note: "Incluir contexto estreita ainda mais o casamento." },
          ],
        },
        exercises: [
          casarEx(
            "u1-literal-1",
            "python",
            "search",
            "Casa todas as linhas que contêm WA em maiúsculas.",
            ["caso 2: WA", "WA no teste 7", "status=WA"],
            ["caso 1: AC", "caso 3: wa", "caso 4: TLE"],
            "WA",
            "Texto literal diferencia maiúsculas de minúsculas.",
          ),
          casarEx(
            "u1-literal-2",
            "python",
            "search",
            "Casa as linhas que contêm o cabeçalho 'Case #'.",
            ["Case #1: 42", "Case #12: 0", "saida Case #9: 5"],
            ["Case 1: 42", "case #1: 42", "Teste #1: 42"],
            "Case #",
            "Espaço e # são caracteres literais na regex.",
          ),
          casarEx(
            "u1-literal-3",
            "python",
            "search",
            "Casa apenas as linhas que reportam TLE.",
            ["caso 3: TLE", "caso 8: TLE", "TLE no teste 5"],
            ["caso 3: AC", "caso 8: WA", "caso 5: tle"],
            "TLE",
            "Escreva TLE exatamente em maiúsculas.",
          ),
        ],
        practiceKinds: ["casar"],
        practiceDialect: "python",
      },
      {
        id: "u1-dot-escape",
        title: "Ponto . e escape \\.",
        explanation:
          "O ponto sem escape casa qualquer caractere da linha, não apenas o ponto final. Para exigir um ponto literal em decimais ou nomes de arquivo, escape com barra invertida. O mesmo vale para outros metacaracteres como colchetes e sinais de soma.",
        dialect: "python",
        tokens: [
          { syntax: ".", desc: "casa qualquer caractere da linha" },
          { syntax: "\\.", desc: "casa apenas o caractere ponto literal" },
        ],
        example: {
          dialect: "python",
          mode: "search",
          lines: ["sol.cpp", "sol_cpp", "solXcpp", "main.cpp"],
          steps: [
            { pattern: "sol.cpp", note: "Sem escape, . casa também _ e X." },
            { pattern: "sol\\.cpp", note: "Com \\., apenas o ponto literal casa." },
          ],
        },
        exercises: [
          casarEx(
            "u1-dot-1",
            "python",
            "search",
            "Casa nomes terminados com a extensão literal '.cpp'.",
            ["sol.cpp", "brute.cpp", "gen.cpp"],
            ["sol_cpp", "solacpp", "sol.hpp"],
            "\\.cpp",
            "Escape o ponto com \\. para não aceitar sol_cpp.",
          ),
          casarEx(
            "u1-dot-2",
            "python",
            "search",
            "Casa '3.14' com ponto literal, rejeitando '3a14'.",
            ["pi=3.14", "3.14", "val 3.14 ok"],
            ["pi=3a14", "3-14", "314"],
            "3\\.14",
            "Sem escape, 3.14 casaria também 3a14 e 3-14.",
          ),
          casarEx(
            "u1-dot-3",
            "python",
            "search",
            "Casa versões no formato 'v1.' seguido de qualquer caractere único.",
            ["v1.0", "v1.a", "v1.9"],
            ["v1a0", "v1.", "v2.0"],
            "v1\\..",
            "O primeiro ponto é literal (\\.) e o segundo (.) casa qualquer caractere.",
          ),
        ],
        practiceKinds: ["casar"],
        practiceDialect: "python",
      },
    ],
  },
  {
    id: "u2-classes",
    number: 2,
    title: "Classes",
    lessons: [
      {
        id: "u2-brackets",
        title: "Conjuntos [abc], [a-z] e [^…]",
        explanation:
          "Colchetes definem um conjunto de caracteres aceitos numa única posição. Você pode usar faixas como [a-z] ou [0-9], e começar com circunflexo [^0-9] nega o conjunto inteiro. Dentro de colchetes, o ponto é literal.",
        dialect: "python",
        tokens: [
          { syntax: "[abc]", desc: "casa a, b ou c numa posição" },
          { syntax: "[0-9]", desc: "faixa de dígitos ASCII" },
          { syntax: "[^0-9]", desc: "qualquer caractere que não seja dígito" },
        ],
        example: {
          dialect: "python",
          mode: "search",
          lines: ["a1", "b2", "c3", "d4", "aX"],
          steps: [
            { pattern: "[abc]", note: "Casa apenas as letras a, b ou c." },
            { pattern: "[abc][0-9]", note: "Exige uma letra de a-c seguida de um dígito." },
            { pattern: "a[^0-9]", note: "Com ^ no início, casa 'a' seguido de não-dígito." },
          ],
        },
        exercises: [
          casarEx(
            "u2-brackets-1",
            "python",
            "search",
            "Casa identificadores curtos de tarefa: uma letra A, B ou C seguida de um dígito.",
            ["A1", "B2", "C9"],
            ["D1", "a1", "AA"],
            "[ABC][0-9]",
            "[ABC] aceita só as três letras e [0-9] exige um dígito.",
          ),
          casarEx(
            "u2-brackets-2",
            "python",
            "search",
            "Casa sinais de comparação de diff: '< ' ou '> '.",
            ["< 10", "> 20", "< ok"],
            ["= 10", "- 20", "a 10"],
            "[<>] ",
            "[<>] escolhe entre < e > antes do espaço.",
          ),
          casarEx(
            "u2-brackets-3",
            "python",
            "search",
            "Casa 'x' seguido de qualquer caractere que não seja dígito.",
            ["xa", "x_", "x-"],
            ["x0", "x5", "x9"],
            "x[^0-9]",
            "O ^ logo após [ inverte a classe para tudo que não é dígito.",
          ),
        ],
        practiceKinds: ["casar"],
        practiceDialect: "python",
      },
      {
        id: "u2-shorthands",
        title: "Atalhos \\d, \\w e \\s",
        explanation:
          "No Python, \\d casa um dígito, \\w casa letra, dígito ou sublinhado, e \\s casa espaço ou tabulação. As versões em maiúsculas (\\D, \\W, \\S) são a negação exata de cada classe. Esses atalhos deixam padrões de entrada e log muito mais curtos.",
        dialect: "python",
        tokens: [
          { syntax: "\\d", desc: "dígito (equivale a [0-9] em ASCII)" },
          { syntax: "\\w", desc: "caractere de palavra (letra, dígito ou _)" },
          { syntax: "\\s", desc: "espaço em branco (espaço, tab)" },
        ],
        example: {
          dialect: "python",
          mode: "search",
          lines: ["n = 7", "k = 9", "x=3", "a = b"],
          steps: [
            { pattern: "\\d", note: "\\d destaca cada dígito." },
            { pattern: "\\w\\s=\\s\\d", note: "Combina palavra, espaços e dígito." },
          ],
        },
        exercises: [
          casarEx(
            "u2-short-1",
            "python",
            "search",
            "Casa 'caso ' seguido de dois dígitos.",
            ["caso 12", "caso 07", "caso 99"],
            ["caso ab", "caso 5", "caso _1"],
            "caso \\d\\d",
            "Cada \\d casa um dígito.",
            "caso [0-9][0-9]",
          ),
          casarEx(
            "u2-short-2",
            "python",
            "search",
            "Casa 'id=' seguido de um caractere de palavra (letra, dígito ou '_').",
            ["id=a", "id=_", "id=7"],
            ["id=-", "id=!", "id= "],
            "id=\\w",
            "\\w inclui letras, dígitos e '_'.",
            "id=[A-Za-z0-9_]",
          ),
          casarEx(
            "u2-short-3",
            "python",
            "search",
            "Casa 'OK' separado de '1' por exatamente um espaço em branco.",
            ["OK 1", "OK\t1", "fim OK 1"],
            ["OK1", "OK-1", "OK  1"],
            "OK\\s1",
            "\\s casa espaço ou tabulação numa posição.",
            "OK[[:space:]]1",
          ),
        ],
        practiceKinds: ["casar"],
        practiceDialect: "python",
      },
    ],
  },
  {
    id: "u3-repeticao",
    number: 3,
    title: "Repetição",
    lessons: [
      {
        id: "u3-basic-quant",
        title: "Quantificadores *, + e ?",
        explanation:
          "Os quantificadores repetem o elemento imediatamente anterior: * aceita zero ou mais, + exige um ou mais e o ponto de interrogação (?) torna opcional. Um sinal opcional com dígitos obrigatórios vira [+-]?\\d+. Lembre que * também casa zero ocorrências.",
        dialect: "python",
        tokens: [
          { syntax: "*", desc: "zero ou mais repetições" },
          { syntax: "+", desc: "uma ou mais repetições" },
          { syntax: "?", desc: "zero ou uma ocorrência (opcional)" },
        ],
        example: {
          dialect: "python",
          mode: "search",
          lines: ["ans=0", "ans=-42", "ans=+7", "ans="],
          steps: [
            { pattern: "ans=\\d*", note: "\\d* casa também ans= sem nenhum dígito." },
            { pattern: "ans=\\d+", note: "\\d+ exige ao menos um dígito, mas ignora sinais." },
            {
              pattern: "ans=[+-]?\\d+",
              note: "[+-]? torna o sinal opcional com dígitos obrigatórios.",
            },
          ],
        },
        exercises: [
          casarEx(
            "u3-quant-1",
            "python",
            "search",
            "Casa 'n=' seguido de um ou mais dígitos.",
            ["n=1", "n=42", "n=1000"],
            ["n=", "n=abc", "m=5"],
            "n=\\d+",
            "+ exige pelo menos um dígito após '='.",
            "n=[0-9]+",
          ),
          casarEx(
            "u3-quant-2",
            "python",
            "search",
            "Casa 'x=' seguido de sinal negativo opcional e um ou mais dígitos.",
            ["x=7", "x=-15", "x=-0"],
            ["x=", "x=-", "x=+7"],
            "x=-?\\d+",
            "-? torna o hífen opcional antes dos dígitos.",
            "x=-?[0-9]+",
          ),
          casarEx(
            "u3-quant-3",
            "python",
            "search",
            "Casa 'ok' seguido de zero ou mais pontos de exclamação até o fim.",
            ["ok", "ok!", "ok!!!"],
            ["ok?", "ok!a", "no!"],
            "^ok!*$",
            "Com âncoras, !* aceita zero ou mais exclamações e nada diferente.",
          ),
        ],
        practiceKinds: ["casar"],
        practiceDialect: "python",
      },
      {
        id: "u3-bounds",
        title: "Contagem {n} e {n,m}",
        explanation:
          "Chaves fixam quantidades exatas ou intervalos: {n} repete exatamente n vezes, {n,} exige no mínimo n e {n,m} aceita entre n e m. Elas evitam escrever \\d\\d\\d\\d em datas, horas e octetos de IP. Sem âncoras, {4} ainda casaria dentro de 5 dígitos.",
        dialect: "python",
        tokens: [
          { syntax: "{n}", desc: "exatamente n repetições" },
          { syntax: "{n,m}", desc: "entre n e m repetições" },
          { syntax: "{n,}", desc: "n ou mais repetições" },
        ],
        example: {
          dialect: "python",
          mode: "search",
          lines: ["2026-11-25", "26-11-25", "2026-1-25", "12:30:05"],
          steps: [
            { pattern: "\\d{4}", note: "\\d{4} encontra o ano de 4 dígitos." },
            { pattern: "\\d{4}-\\d{2}-\\d{2}", note: "Casa a data completa AAAA-MM-DD." },
          ],
        },
        exercises: [
          casarEx(
            "u3-bounds-1",
            "python",
            "search",
            "Casa linhas que são exatamente um ano de 4 dígitos.",
            ["2026", "1999", "2000"],
            ["26", "20265", "202a"],
            "^\\d{4}$",
            "^\\d{4}$ exige exatamente 4 dígitos na linha inteira.",
            "^[0-9]{4}$",
          ),
          casarEx(
            "u3-bounds-2",
            "python",
            "search",
            "Casa linhas que são um octeto de 1 a 3 dígitos.",
            ["0", "42", "255"],
            ["", "1234", "12a"],
            "^\\d{1,3}$",
            "{1,3} aceita 1, 2 ou 3 dígitos.",
            "^[0-9]{1,3}$",
          ),
          casarEx(
            "u3-bounds-3",
            "python",
            "search",
            "Casa horários exatos HH:MM:SS (dois dígitos em cada parte).",
            ["09:15:42", "23:59:00", "00:00:01"],
            ["9:15:42", "09:15", "09:15:420"],
            "^\\d{2}:\\d{2}:\\d{2}$",
            "{2} garante dois dígitos em horas, minutos e segundos.",
            "^[0-9]{2}:[0-9]{2}:[0-9]{2}$",
          ),
        ],
        practiceKinds: ["casar"],
        practiceDialect: "python",
      },
      {
        id: "u3-greedy-lazy",
        title: "Guloso contra preguiçoso",
        explanation:
          "Por padrão, * e + são gulosos e avançam o máximo possível até o último delimitador da linha. Adicionar '?' logo após o quantificador (*?, +?) torna o casamento preguiçoso, parando no primeiro delimitador. No Python isso facilita extrair o primeiro trecho entre aspas ou colchetes.",
        dialect: "python",
        tokens: [
          { syntax: ".+", desc: "guloso: consome o maior trecho possível" },
          { syntax: ".+?", desc: "preguiçoso: para na primeira chance" },
          { syntax: "[^x]+", desc: "alternativa portátil que funciona no grep -E" },
        ],
        example: {
          dialect: "python",
          mode: "search",
          lines: ['"a.in" "b.out"', "[WA] [caso 4]"],
          steps: [
            { pattern: '".+"', note: "Guloso: vai da primeira aspa até a última da linha." },
            { pattern: '".+?"', note: "Preguiçoso: fecha na primeira aspa seguinte." },
            { pattern: "\\[.+?\\]", note: "Mesma ideia para pegar só o primeiro bloco [WA]." },
          ],
        },
        exercises: [
          extrairEx(
            "u3-lazy-1",
            "python",
            "Extraia no grupo 1 apenas o primeiro texto entre aspas duplas.",
            [
              { line: '"a.in" "b.out"', expected: "a.in" },
              { line: 'run "sol.cpp" "in.txt"', expected: "sol.cpp" },
              { line: '"ok"', expected: "ok" },
            ],
            '"(.+?)"',
            '(.+?) ou ([^"]+) evita engolir até a segunda aspa da linha.',
            '"([^"]+)"',
          ),
          extrairEx(
            "u3-lazy-2",
            "python",
            "Extraia no grupo 1 o primeiro rótulo dentro de colchetes.",
            [
              { line: "[WA] [caso 3]", expected: "WA" },
              { line: "[TLE] [1000ms]", expected: "TLE" },
              { line: "log [AC] [ok]", expected: "AC" },
            ],
            "\\[(.+?)\\]",
            "O quantificador preguiçoso para no primeiro ']'.",
            "\\[([^\\]]+)\\]",
          ),
          extrairEx(
            "u3-lazy-3",
            "python",
            "Extraia no grupo 1 a primeira tag entre '<' e '>'.",
            [
              { line: "<int> <long>", expected: "int" },
              { line: "vector<pair> e <set>", expected: "pair" },
              { line: "<ok>", expected: "ok" },
            ],
            "<(.+?)>",
            "<(.+?)> (ou <([^>]+)>) captura só a primeira tag.",
            "<([^>]+)>",
          ),
        ],
        practiceKinds: ["extrair"],
        practiceDialect: "python",
      },
    ],
  },
  {
    id: "u4-ancoras",
    number: 4,
    title: "Âncoras",
    lessons: [
      {
        id: "u4-line-anchors",
        title: "Início ^ e fim $",
        explanation:
          "Âncoras não consomem caracteres; elas exigem uma posição específica na linha. ^ prende o casamento ao início da linha e $ ao final. Usar os dois juntos transforma uma busca parcial em validação da linha inteira.",
        dialect: "python",
        tokens: [
          { syntax: "^", desc: "início da linha" },
          { syntax: "$", desc: "fim da linha" },
        ],
        example: {
          dialect: "python",
          mode: "search",
          lines: ["42", "x42", "42y", "  42  "],
          steps: [
            { pattern: "\\d+", note: "Sem âncoras, casa em todas as quatro linhas." },
            { pattern: "^\\d+", note: "Com ^, só linhas que começam com dígito." },
            { pattern: "^\\d+$", note: "Com ^ e $, só a linha contendo apenas dígitos." },
          ],
        },
        exercises: [
          casarEx(
            "u4-line-1",
            "python",
            "search",
            "Casa linhas que começam com 'Case #' (rejeitando prefixos antes).",
            ["Case #1: 5", "Case #12: 0", "Case #9: 99"],
            ["x Case #1: 5", "  Case #2: 3", "Teste #1: 5"],
            "^Case #",
            "^ fixa o casamento no primeiro caractere da linha.",
          ),
          casarEx(
            "u4-line-2",
            "python",
            "search",
            "Casa linhas que têm espaços sobrando no final.",
            ["int x = 1; ", "ans = 5  ", "ok "],
            ["int x = 1;", " ans = 5", "a b"],
            " +$",
            "$ garante que os espaços estejam no fim da linha.",
          ),
          casarEx(
            "u4-line-3",
            "python",
            "search",
            "Casa linhas em branco (vazias ou apenas com espaços).",
            ["", " ", "   "],
            [".", " a", "0"],
            "^\\s*$",
            "^\\s*$ exige que não haja nada além de espaços do início ao fim.",
            "^[[:space:]]*$",
          ),
        ],
        practiceKinds: ["casar"],
        practiceDialect: "python",
      },
      {
        id: "u4-word-boundary",
        title: "Fronteira de palavra \\b",
        explanation:
          "No Python, \\b marca a fronteira entre um caractere de palavra (\\w) e um que não é palavra (ou a borda da linha). Assim, \\bcat\\b casa 'cat' isolado, mas não 'scatter' nem 'cat_1'. Lembre que no grep -E padrão \\b não existe.",
        dialect: "python",
        tokens: [
          { syntax: "\\b", desc: "fronteira de palavra (apenas Python re)" },
          { syntax: "\\B", desc: "posição que não é fronteira de palavra" },
        ],
        example: {
          dialect: "python",
          mode: "search",
          lines: ["int n;", "print(n)", "uint32_t x", "main int"],
          steps: [
            { pattern: "int", note: "Sem \\b, casa dentro de print e uint32_t." },
            { pattern: "\\bint\\b", note: "Com \\b, casa apenas a palavra inteira int." },
          ],
        },
        exercises: [
          casarEx(
            "u4-wb-1",
            "python",
            "search",
            "Casa linhas que contêm a palavra isolada 'int' (não 'print' nem 'uint').",
            ["int n = 5;", "return int(x)", "int"],
            ["print(5)", "uint x = 1;", "int_val = 2"],
            "\\bint\\b",
            "\\b exige separação antes e depois de 'int'.",
          ),
          casarEx(
            "u4-wb-2",
            "python",
            "search",
            "Casa linhas com a palavra isolada 'sum' (não 'assume' nem 'sum2').",
            ["sum = 0", "get(sum)", "total: sum"],
            ["assume ok", "sum2 = 1", "my_sum = 3"],
            "\\bsum\\b",
            "Sublinhado e dígito fazem parte de \\w, então my_sum e sum2 não têm fronteira.",
          ),
          lerEx(
            "u4-wb-3",
            "python",
            "search",
            "\\bWA\\b",
            ["WA", "caso: WA!", "WAA", "WA_2", "(WA)"],
            "Pontuação e início/fim criam fronteira \\b; letras, dígitos e '_' não.",
          ),
        ],
        practiceKinds: ["casar", "ler"],
        practiceDialect: "python",
      },
      {
        id: "u4-search-fullmatch",
        title: "search contra fullmatch",
        explanation:
          "re.search e grep -E procuram o padrão em qualquer trecho da linha, como se houvesse .* antes e depois. Já re.fullmatch exige que a linha inteira case com o padrão, dispensando ^ e $. Saber qual modo a ferramenta usa evita bugs silenciosos em validação.",
        dialect: "python",
        tokens: [
          { syntax: "search", desc: "casa em qualquer trecho da linha (padrão do grep)" },
          { syntax: "fullmatch", desc: "exige que a linha inteira case" },
        ],
        example: {
          dialect: "python",
          mode: "fullmatch",
          lines: ["123", "123a", "a123", "-45"],
          steps: [
            {
              pattern: "\\d+",
              note: "Em fullmatch, \\d+ rejeita 123a e a123 sem precisar de ^ e $.",
            },
            { pattern: "-?\\d+", note: "Adicionar -? aceita também -45 na linha inteira." },
          ],
        },
        exercises: [
          casarEx(
            "u4-mode-1",
            "python",
            "fullmatch",
            "Em modo fullmatch, casa números decimais positivos (como 3.14).",
            ["3.14", "0.5", "120.05"],
            ["3a14", "3.14x", "3."],
            "\\d+\\.\\d+",
            "No fullmatch, \\d+\\.\\d+ já rejeita 3.14x automaticamente.",
            "[0-9]+\\.[0-9]+",
          ),
          lerEx(
            "u4-mode-2",
            "python",
            "fullmatch",
            "[A-Z]{2}",
            ["WA", "AC", "TLE", "WA!", "aWA"],
            "Em fullmatch, [A-Z]{2} exige exatamente duas maiúsculas na linha inteira.",
          ),
          casarEx(
            "u4-mode-3",
            "python",
            "search",
            "Agora em modo search: casa apenas linhas que são um inteiro positivo puro.",
            ["7", "42", "905"],
            ["7a", "a7", "-7"],
            "^\\d+$",
            "Em modo search você precisa de ^ e $ para rejeitar 7a e a7.",
            "^[0-9]+$",
          ),
        ],
        practiceKinds: ["casar", "ler"],
        practiceDialect: "python",
      },
    ],
  },
  {
    id: "u5-grupos",
    number: 5,
    title: "Grupos",
    lessons: [
      {
        id: "u5-alt-group",
        title: "Grupos ( ) e alternância |",
        explanation:
          "A barra vertical | escolhe entre alternativas, e tem precedência mais baixa que tudo ao redor. Parênteses ( ) delimitam onde a alternância começa e termina, e também permitem aplicar quantificadores a um bloco inteiro. Sem parênteses, ^WA|TLE$ significaria '^WA' ou 'TLE$'.",
        dialect: "python",
        tokens: [
          { syntax: "a|b", desc: "casa a ou b" },
          { syntax: "(a|b)", desc: "agrupa a alternância" },
          { syntax: "(ab)+", desc: "repete a sequência inteira" },
        ],
        example: {
          dialect: "python",
          mode: "search",
          lines: ["WA", "TLE", "WA extra", "pre TLE"],
          steps: [
            { pattern: "^WA|TLE$", note: "Sem grupo, ^ prende só WA e $ prende só TLE." },
            { pattern: "^(WA|TLE)$", note: "Com parênteses, ^ e $ valem para as duas opções." },
          ],
        },
        exercises: [
          casarEx(
            "u5-alt-1",
            "python",
            "search",
            "Casa linhas de falha exatas: 'WA', 'TLE' ou 'RTE' (linha inteira).",
            ["WA", "TLE", "RTE"],
            ["WA!", "AC", "caso TLE"],
            "^(WA|TLE|RTE)$",
            "Parênteses aplicam ^ e $ às três alternativas.",
          ),
          casarEx(
            "u5-alt-2",
            "python",
            "search",
            "Casa arquivos terminados em '.in' ou '.out'.",
            ["1.in", "teste.out", "a.in"],
            ["1.in.bak", "teste.txt", "1ain"],
            "\\.(in|out)$",
            "Escape o ponto e agrupe (in|out) antes de $.",
          ),
          casarEx(
            "u5-alt-3",
            "python",
            "search",
            "Casa a palavra 'ok' repetida duas ou mais vezes separadas por espaço (linha inteira).",
            ["ok ok", "ok ok ok", "ok  ok"],
            ["ok", "ok ok!", "okok"],
            "^ok( +ok)+$",
            "( +ok)+ repete espaço seguido de ok uma ou mais vezes.",
          ),
        ],
        practiceKinds: ["casar"],
        practiceDialect: "python",
      },
      {
        id: "u5-capture",
        title: "Grupo de captura e group(1)",
        explanation:
          "Cada par de parênteses ( ) cria um grupo de captura numerado a partir de 1 da esquerda para a direita. Em Python, m.group(1) devolve exatamente o trecho casado pelo primeiro grupo. Isso permite extrair números e campos direto de linhas mal formatadas.",
        dialect: "python",
        tokens: [
          { syntax: "(...)", desc: "cria grupo de captura numerado" },
          { syntax: "group(1)", desc: "texto capturado pelo primeiro grupo" },
        ],
        example: {
          dialect: "python",
          mode: "search",
          lines: ["Case #3: 17", "Case #12: -40", "Case #9: 0"],
          steps: [
            {
              pattern: "Case #\\d+: -?\\d+",
              note: "Casa a linha inteira, mas não isola a resposta.",
            },
            {
              pattern: "Case #\\d+: (-?\\d+)",
              note: "Colocar (-?\\d+) entre parênteses extrai só a resposta no grupo 1.",
            },
          ],
        },
        exercises: [
          extrairEx(
            "u5-cap-1",
            "python",
            "Extraia no grupo 1 o valor após 'ans='.",
            [
              { line: "caso 1 ans=42 ok", expected: "42" },
              { line: "caso 2 ans=-7 ok", expected: "-7" },
              { line: "ans=0", expected: "0" },
            ],
            "ans=(-?\\d+)",
            "Deixe 'ans=' fora dos parênteses para o grupo 1 guardar só o número.",
            "ans=(-?[0-9]+)",
          ),
          extrairEx(
            "u5-cap-2",
            "python",
            "Extraia no grupo 1 o número do caso em 'Case #N: ...'.",
            [
              { line: "Case #3: 17", expected: "3" },
              { line: "Case #12: 405", expected: "12" },
              { line: "Case #99: 0", expected: "99" },
            ],
            "Case #(\\d+):",
            "Os parênteses em (\\d+) capturam apenas o número após #.",
            "Case #([0-9]+):",
          ),
          extrairEx(
            "u5-cap-3",
            "python",
            "Extraia no grupo 1 o tempo em ms de 'time=Nms'.",
            [
              { line: "run=1 time=84ms", expected: "84" },
              { line: "run=2 time=1205ms", expected: "1205" },
              { line: "time=5ms ok", expected: "5" },
            ],
            "time=(\\d+)ms",
            "Colocar 'ms' fora do grupo devolve só os dígitos.",
            "time=([0-9]+)ms",
          ),
        ],
        practiceKinds: ["extrair"],
        practiceDialect: "python",
      },
      {
        id: "u5-non-capturing",
        title: "Grupo sem captura (?: )",
        explanation:
          "Quando você precisa agrupar uma alternância antes do dado que quer extrair, um parêntese comum rouba o índice do grupo 1. Usar (?:...) no Python agrupa sem numerar o grupo. Assim o valor desejado continua acessível diretamente em group(1).",
        dialect: "python",
        tokens: [{ syntax: "(?:...)", desc: "agrupa sem criar grupo de captura (Python re)" }],
        example: {
          dialect: "python",
          mode: "search",
          lines: ["Case 3: 17", "Test 12: 405"],
          steps: [
            { pattern: "(Case|Test) \\d+: (\\d+)", note: "Aqui o grupo 1 seria 'Case', não '17'." },
            {
              pattern: "(?:Case|Test) \\d+: (\\d+)",
              note: "Com (?:...), '17' passa a ser o grupo 1.",
            },
          ],
        },
        exercises: [
          extrairEx(
            "u5-nc-1",
            "python",
            "Extraia no grupo 1 o número após 'Case' ou 'Teste'.",
            [
              { line: "Case 3", expected: "3" },
              { line: "Teste 12", expected: "12" },
              { line: "Case 45", expected: "45" },
            ],
            "(?:Case|Teste) (\\d+)",
            "(?:Case|Teste) agrupa o prefixo sem ocupar o grupo 1.",
          ),
          extrairEx(
            "u5-nc-2",
            "python",
            "Extraia no grupo 1 a porta após 'http://' ou 'https://'.",
            [
              { line: "http://host:8080", expected: "8080" },
              { line: "https://host:443", expected: "443" },
              { line: "http://host:80", expected: "80" },
            ],
            "(?:http|https)://host:(\\d+)",
            "(?:http|https) agrupa o protocolo sem roubar o grupo 1 da porta.",
          ),
          extrairEx(
            "u5-nc-3",
            "python",
            "Extraia no grupo 1 o código numérico após 'WA:' ou 'TLE:'.",
            [
              { line: "WA:14", expected: "14" },
              { line: "TLE:200", expected: "200" },
              { line: "WA:3", expected: "3" },
            ],
            "(?:WA|TLE):(\\d+)",
            "(?:WA|TLE) evita deslocar o número para o grupo 2.",
          ),
        ],
        practiceKinds: ["extrair"],
        practiceDialect: "python",
      },
    ],
  },
  {
    id: "u6-trocar",
    number: 6,
    title: "Trocar",
    lessons: [
      {
        id: "u6-re-sub",
        title: "re.sub com \\1 e \\g<1>",
        explanation:
          "No re.sub do Python, a troca pode referenciar grupos capturados com \\1, \\2 ou \\g<1>. A forma \\g<1> evita ambiguidade quando o texto logo após o grupo começa com dígito. Use strings raw r'\\1' no código Python para não escapar a barra duas vezes.",
        dialect: "python",
        tokens: [
          { syntax: "\\1", desc: "insere o texto capturado no grupo 1" },
          { syntax: "\\g<1>", desc: "forma explícita no Python re.sub (segura antes de dígitos)" },
        ],
        example: {
          dialect: "python",
          mode: "search",
          lines: ["n=10 k=25", "ans=7"],
          steps: [
            { pattern: "([a-z]+)=(\\d+)", note: "Grupo 1 pega o nome e grupo 2 pega o número." },
            {
              pattern: "([a-z]+)=(\\d+)",
              replacement: "\\2:\\1",
              note: "A troca \\2:\\1 inverte todos os pares da linha.",
            },
          ],
        },
        exercises: [
          trocarEx(
            "u6-sub-1",
            "python",
            "Troque 'Case #N:' por 'Caso N:'.",
            [
              { before: "Case #3: 17", after: "Caso 3: 17" },
              { before: "Case #12: 0", after: "Caso 12: 0" },
              { before: "Teste 4: OK", after: "Teste 4: OK" },
            ],
            "Case #(\\d+):",
            "Caso \\1:",
            "\\1 reaproveita o número capturado.",
          ),
          trocarEx(
            "u6-sub-2",
            "python",
            "Troque pares 'chave=valor' por 'valor:chave'.",
            [
              { before: "n=10", after: "10:n" },
              { before: "a=3 b=9", after: "3:a 9:b" },
              { before: "ok", after: "ok" },
            ],
            "([a-z]+)=(\\d+)",
            "\\2:\\1",
            "Dois grupos permitem trocar a ordem das partes.",
          ),
          trocarEx(
            "u6-sub-3",
            "python",
            "Adicione o sufixo '0' logo após o número de 'v=N' usando \\g<1>.",
            [
              { before: "v=5", after: "v=50" },
              { before: "v=12 ok", after: "v=120 ok" },
              { before: "x=5", after: "x=5" },
            ],
            "v=(\\d+)",
            "v=\\g<1>0",
            "\\g<1>0 evita a confusão com um grupo \\10 inexistente.",
          ),
        ],
        practiceKinds: ["trocar"],
        practiceDialect: "python",
      },
      {
        id: "u6-sed-e",
        title: "sed -E 's/…/…/g'",
        explanation:
          "No terminal, sed -E ativa regex estendida (ERE) e a flag g aplica a troca em todas as ocorrências da linha. Na substituição do sed, \\1 referencia o grupo 1 e & representa o trecho inteiro casado. Lembre que no sed -E você usa [0-9] em vez de \\d.",
        dialect: "ere",
        tokens: [
          { syntax: "\\1", desc: "texto do grupo 1 no sed -E" },
          { syntax: "&", desc: "trecho inteiro casado no sed -E" },
          { syntax: "s/.../.../g", desc: "substituição global em cada linha" },
        ],
        example: {
          dialect: "ere",
          mode: "search",
          lines: ["2026-11-25", "10   20    30"],
          steps: [
            {
              pattern: "([0-9]{4})-([0-9]{2})-([0-9]{2})",
              replacement: "\\3/\\2/\\1",
              note: "Reorganiza AAAA-MM-DD para DD/MM/AAAA.",
            },
            {
              pattern: " {2,}",
              replacement: " ",
              note: "Colapsa múltiplos espaços em um único espaço.",
            },
          ],
        },
        exercises: [
          trocarEx(
            "u6-sed-1",
            "ere",
            "No dialeto sed -E, remova espaços sobrando no fim da linha.",
            [
              { before: "int x = 1;  ", after: "int x = 1;" },
              { before: "  ok ", after: "  ok" },
              { before: "fim", after: "fim" },
            ],
            " +$",
            "",
            "Trocar ' +$' por vazio limpa espaços finais sem afetar a indentação.",
          ),
          trocarEx(
            "u6-sed-2",
            "ere",
            "No dialeto sed -E, envolva cada número inteiro com colchetes usando &.",
            [
              { before: "a=3 b=12", after: "a=[3] b=[12]" },
              { before: "caso 7", after: "caso [7]" },
              { before: "sem numeros", after: "sem numeros" },
            ],
            "[0-9]+",
            "[&]",
            "No sed -E, & substitui pelo trecho inteiro casado sem precisar de parênteses.",
          ),
          trocarEx(
            "u6-sed-3",
            "ere",
            "No dialeto sed -E, converta datas AAAA-MM-DD para DD/MM/AAAA.",
            [
              { before: "2026-11-25", after: "25/11/2026" },
              { before: "prova 2025-05-09", after: "prova 09/05/2025" },
              { before: "2026/11/25", after: "2026/11/25" },
            ],
            "([0-9]{4})-([0-9]{2})-([0-9]{2})",
            "\\3/\\2/\\1",
            "No sed -E, use [0-9] para dígitos e \\3/\\2/\\1 na troca.",
          ),
        ],
        practiceKinds: ["trocar"],
        practiceDialect: "ere",
      },
    ],
  },
  {
    id: "u7-terminal",
    number: 7,
    title: "No terminal",
    lessons: [
      {
        id: "u7-grep-flags",
        title: "grep -E, -v, -n, -c, -o",
        explanation:
          "Com grep -E você filtra linhas usando ERE; -v inverte (mostra as que não casam), -n imprime o número da linha, -c conta quantas casaram e -o imprime apenas o trecho casado. Em prova, combinar grep -Ev '^$' ou grep -Eo '[0-9]+' limpa saídas em segundos.",
        dialect: "ere",
        tokens: [
          { syntax: "grep -E", desc: "ativa ERE (parênteses, +, ?, | sem barra)" },
          { syntax: "-v / -n / -c / -o", desc: "inverter / numerar / contar / só trecho" },
        ],
        example: {
          dialect: "ere",
          mode: "search",
          lines: ["Teste 1: OK", "Teste 2: WA", "", "Teste 3: TLE"],
          steps: [
            { pattern: "OK$", note: "grep -Ev 'OK$' descartaria os aprovados." },
            {
              pattern: "^[[:space:]]*$",
              note: "grep -Ev '^[[:space:]]*$' remove linhas em branco.",
            },
            { pattern: "(WA|TLE)$", note: "grep -En '(WA|TLE)$' lista e numera só as falhas." },
          ],
        },
        exercises: [
          casarEx(
            "u7-flags-1",
            "ere",
            "search",
            "Escreva o padrão de grep -E (para usar com -v depois) que casa apenas linhas em branco.",
            ["", " ", "   "],
            ["Teste 1: OK", "a", "0"],
            "^[[:space:]]*$",
            "Com -v, grep -Ev '^[[:space:]]*$' filtra fora as linhas vazias.",
            "^\\s*$",
          ),
          casarEx(
            "u7-flags-2",
            "ere",
            "search",
            "Escreva o padrão de grep -E que casa linhas de comentário C++ (começam com '//', com espaços opcionais antes).",
            ["// debug", "  // todo", "//x"],
            ["int x = 1; // ok", "a/b", "/ comentario"],
            "^[[:space:]]*//",
            "Ancorar em ^ com espaços opcionais pega apenas linhas inteiramente comentadas.",
            "^\\s*//",
          ),
          casarEx(
            "u7-flags-3",
            "ere",
            "search",
            "Escreva o padrão de grep -E que casa linhas com 'OK' ou 'AC' no fim.",
            ["Teste 1: OK", "caso 4: AC", "OK"],
            ["Teste 2: WA", "OK!", "AC no inicio"],
            "(OK|AC)$",
            "(OK|AC)$ prende a alternância ao fim da linha.",
          ),
        ],
        practiceKinds: ["casar"],
        practiceDialect: "ere",
      },
      {
        id: "u7-first-fail",
        title: "Achar o primeiro teste que falhou",
        explanation:
          "Num stress test ou log de juiz com centenas de casos, grep -En '(WA|TLE|RTE)' -m 1 mostra logo o primeiro erro e sua linha. Você também pode filtrar a saída do diff procurando linhas que começam com '< ' ou '> '. Tudo em dialeto grep -E, sem \\d.",
        dialect: "ere",
        tokens: [
          { syntax: "-m 1", desc: "para no primeiro casamento encontrado" },
          { syntax: "^[<>] ", desc: "linhas divergentes no diff tradicional" },
        ],
        example: {
          dialect: "ere",
          mode: "search",
          lines: ["caso 1: AC", "caso 2: AC", "caso 3: WA", "caso 4: TLE"],
          steps: [
            { pattern: "WA|TLE|RTE", note: "Encontra qualquer veredito de erro no log." },
            {
              pattern: "^caso [0-9]+: (WA|TLE|RTE)$",
              note: "Garante o formato exato do log do stress test.",
            },
          ],
        },
        exercises: [
          casarEx(
            "u7-fail-1",
            "ere",
            "search",
            "No grep -E, casa linhas de falha 'caso N: WA', 'TLE' ou 'RTE'.",
            ["caso 3: WA", "caso 14: TLE", "caso 7: RTE"],
            ["caso 1: AC", "caso 2: OK", "caso 3: WAA"],
            "^caso [0-9]+: (WA|TLE|RTE)$",
            "Em ERE use [0-9]+ no lugar de \\d+.",
            "^caso \\d+: (WA|TLE|RTE)$",
          ),
          casarEx(
            "u7-fail-2",
            "ere",
            "search",
            "No grep -E, casa linhas de diferença do diff tradicional ('< ' ou '> ' com conteúdo).",
            ["< 42", "> 17", "< ans=5"],
            ["---", "3c3", "< ", "a< 42"],
            "^[<>] .+$",
            "^[<>] ancora o marcador e .+ exige conteúdo após o espaço.",
          ),
          extrairEx(
            "u7-fail-3",
            "ere",
            "No dialeto ERE, extraia no grupo 1 a seed da linha de falha 'FAIL seed=N'.",
            [
              { line: "FAIL seed=7", expected: "7" },
              { line: "FAIL seed=420", expected: "420" },
              { line: "OK seed=5", expected: null },
            ],
            "FAIL seed=([0-9]+)",
            "Incluir FAIL antes de seed= ignora as linhas que passaram.",
            "FAIL seed=(\\d+)",
          ),
        ],
        practiceKinds: ["casar", "extrair"],
        practiceDialect: "ere",
      },
    ],
  },
  {
    id: "u8-dialetos",
    number: 8,
    title: "Dialetos",
    lessons: [
      {
        id: "u8-posix",
        title: "Python × grep -E: classes POSIX e \\d × [0-9]",
        explanation:
          "No grep -E (ERE do POSIX), atalhos do Python como \\d, \\w, \\s, \\b e (?:...) não existem. Em vez deles, use faixas explícitas como [0-9] ou classes POSIX dentro de colchetes duplos como [[:digit:]] e [[:space:]]. Esquecer os colchetes duplos é o erro mais comum no terminal.",
        dialect: "ere",
        tokens: [
          { syntax: "[[:digit:]]", desc: "dígito no grep -E (equivale a [0-9])" },
          { syntax: "[[:alpha:]]", desc: "letra ASCII no grep -E" },
          { syntax: "[[:space:]]", desc: "espaço ou tabulação no grep -E" },
        ],
        example: {
          dialect: "ere",
          mode: "search",
          lines: ["var_1 = 42", "9bad = 1", "ok = 7"],
          steps: [
            { pattern: "[[:digit:]]+", note: "[[:digit:]]+ substitui \\d+ no grep -E." },
            {
              pattern: "^[[:alpha:]_][[:alnum:]_]*[[:space:]]*=[[:space:]]*[[:digit:]]+$",
              note: "Reescreve toda a linha só com classes POSIX.",
            },
          ],
        },
        exercises: [
          casarEx(
            "u8-posix-1",
            "ere",
            "search",
            "Reescreva '^\\d+$' no dialeto grep -E usando [0-9] ou [[:digit:]].",
            ["0", "42", "905"],
            ["42a", "-5", ""],
            "^[[:digit:]]+$",
            "No grep -E, \\d não funciona; use [[:digit:]]+ ou [0-9]+.",
            "^\\d+$",
          ),
          casarEx(
            "u8-posix-2",
            "ere",
            "search",
            "No dialeto grep -E, casa palavras formadas apenas por letras ASCII.",
            ["Teste", "abc", "OK"],
            ["abc1", "a_b", "a b"],
            "^[[:alpha:]]+$",
            "[[:alpha:]] casa letras maiúsculas e minúsculas sem dígitos nem '_'.",
            "^[A-Za-z]+$",
          ),
          casarEx(
            "u8-posix-3",
            "ere",
            "search",
            "No dialeto grep -E, casa um identificador C++ completo (letra ou '_', seguido de alfanuméricos ou '_').",
            ["cnt_1", "_dp", "solveA"],
            ["1cnt", "cnt-1", "a b"],
            "^[[:alpha:]_][[:alnum:]_]*$",
            "[[:alnum:]_] substitui \\w no grep -E.",
            "^[A-Za-z_]\\w*$",
          ),
        ],
        practiceKinds: ["casar"],
        practiceDialect: "ere",
      },
      {
        id: "u8-bre",
        title: "BRE (grep sem -E)",
        explanation:
          "Sem -E, o grep usa BRE, onde +, ?, |, ( e ) são tratados como literais e precisam de barra invertida (\\+, \\(, \\|). Por isso, em prova passe sempre -E no grep e no sed para manter a mesma sintaxe limpa. Só quando você precisa buscar parênteses literais sem escapar é que BRE ajuda.",
        dialect: "ere",
        tokens: [
          { syntax: "grep -E", desc: "evita escapar \\+, \\?, \\(, \\) e \\|" },
          { syntax: "grep -F", desc: "busca texto fixo sem interpretar regex" },
        ],
        example: {
          dialect: "ere",
          mode: "search",
          lines: ["f(1)", "WA", "TLE", "g(2)"],
          steps: [
            { pattern: "(WA|TLE)", note: "Com -E, parênteses e | funcionam direto sem barras." },
            {
              pattern: "f\\([0-9]+\\)",
              note: "Com -E, parênteses literais levam escape \\( e \\).",
            },
          ],
        },
        exercises: [
          casarEx(
            "u8-bre-1",
            "ere",
            "search",
            "No dialeto grep -E, casa chamadas literais 'f(N)' com parênteses literais e um número inteiro.",
            ["f(1)", "f(42)", "x = f(0)"],
            ["f()", "f(a)", "f1"],
            "f\\([0-9]+\\)",
            "No grep -E, parênteses literais precisam de \\( e \\).",
          ),
          casarEx(
            "u8-bre-2",
            "ere",
            "search",
            "No dialeto grep -E, casa linhas que terminam com 'WA' ou 'RE' (sem barras extras no |).",
            ["caso 1: WA", "caso 2: RE", "WA"],
            ["caso 1: AC", "WA!", "RE: ok"],
            "(WA|RE)$",
            "Em ERE, (WA|RE) funciona sem escapar parênteses nem barra vertical.",
          ),
          lerEx(
            "u8-bre-3",
            "ere",
            "search",
            "^[0-9]+\\+[0-9]+$",
            ["1+2", "10+25", "1+2+3", "1a2", "+5"],
            "Em ERE, + repete dígitos e \\+ casa o sinal de soma literal.",
          ),
        ],
        practiceKinds: ["casar", "ler"],
        practiceDialect: "ere",
      },
    ],
  },
  {
    id: "u9-lookahead",
    number: 9,
    title: "Lookahead",
    lessons: [
      {
        id: "u9-lookahead-pos",
        title: "Lookahead positivo (?= )",
        explanation:
          "No Python, (?=...) verifica o que vem logo depois sem consumir esses caracteres no casamento. Isso permite destacar ou casar um prefixo só quando ele é seguido de um sufixo específico. Esse recurso não existe no grep -E.",
        dialect: "python",
        tokens: [
          { syntax: "(?=...)", desc: "lookahead positivo: exige padrão à frente sem consumir" },
        ],
        example: {
          dialect: "python",
          mode: "search",
          lines: ["time=120ms", "time=3s", "mem=64ms"],
          steps: [
            {
              pattern: "\\d+(?=ms)",
              note: "Casa apenas os dígitos que são seguidos de 'ms', sem incluir 'ms'.",
            },
            {
              pattern: "[a-z]+(?==\\d)",
              note: "Casa o nome da chave só quando seguida de '=dígito'.",
            },
          ],
        },
        exercises: [
          casarEx(
            "u9-la-pos-1",
            "python",
            "search",
            "Casa números seguidos de 'ms' (usando lookahead positivo para não consumir 'ms').",
            ["120ms", "5ms", "t=40ms"],
            ["120s", "120", "ms"],
            "\\d+(?=ms)",
            "(?=ms) confere 'ms' logo após os dígitos sem incluí-lo no trecho casado.",
          ),
          casarEx(
            "u9-la-pos-2",
            "python",
            "search",
            "Casa 'case' somente quando seguido de espaço e um dígito.",
            ["case 1", "case 42", "run case 7"],
            ["case a", "case:", "cases"],
            "case(?= \\d)",
            "(?= \\d) verifica espaço e dígito à frente.",
          ),
          lerEx(
            "u9-la-pos-3",
            "python",
            "search",
            "foo(?=\\d)",
            ["foo1", "foo99", "foo", "fooa", "barfoo2"],
            "foo(?=\\d) casa 'foo' apenas quando o caractere seguinte é um dígito.",
          ),
        ],
        practiceKinds: ["casar", "ler"],
        practiceDialect: "python",
      },
      {
        id: "u9-lookahead-neg",
        title: "Lookahead negativo (?! ) e quando evitar",
        explanation:
          "O lookahead negativo (?!...) exige que o padrão à frente não ocorra naquela posição. Aviso: na maioria das vezes não vale a pena usar lookahead em prova, porque grep -v ou dois testes simples em Python são mais legíveis e menos propensos a erro. Guarde (?!...) só para quando você realmente precisa de uma única regex.",
        dialect: "python",
        tokens: [
          { syntax: "(?!...)", desc: "lookahead negativo: proíbe padrão à frente" },
          { syntax: "grep -v", desc: "alternativa mais clara no terminal" },
        ],
        example: {
          dialect: "python",
          mode: "search",
          lines: ["caso 1: AC", "caso 2: WA", "caso 3: TLE"],
          steps: [
            {
              pattern: "^caso \\d+: (?!AC$)",
              note: "Rejeita linhas cujo veredito seja exatamente AC.",
            },
            { pattern: "^(?!#).+$", note: "Casa linhas não vazias que não começam com '#'." },
          ],
        },
        exercises: [
          casarEx(
            "u9-la-neg-1",
            "python",
            "search",
            "Casa linhas que começam com 'caso N: ' e cujo veredito não é 'AC'.",
            ["caso 2: WA", "caso 3: TLE", "caso 9: RTE"],
            ["caso 1: AC", "caso 5: AC", "teste 2: WA"],
            "^caso \\d+: (?!AC$)",
            "(?!AC$) descarta AC; no terminal, grep -v 'AC$' seria ainda mais simples.",
          ),
          casarEx(
            "u9-la-neg-2",
            "python",
            "search",
            "Casa 'sol' que não seja seguido de '.bak'.",
            ["sol.cpp", "sol.py", "sol"],
            ["sol.bak", "my sol.bak ok", "abc"],
            "sol(?!\\.bak)",
            "(?!\\.bak) impede casar quando vem '.bak' logo depois.",
          ),
          lerEx(
            "u9-la-neg-3",
            "python",
            "search",
            "^(?!//).+$",
            ["int x = 1;", "// comentario", "return 0;", "//", ""],
            "Rejeita linhas iniciadas por '//' e também linhas vazias (por causa de .+$).",
          ),
        ],
        practiceKinds: ["casar", "ler"],
        practiceDialect: "python",
      },
    ],
  },
];

export const REGEX_LESSONS: readonly RegexLesson[] = REGEX_UNITS.flatMap((u) => u.lessons);

const LESSON_BY_ID: ReadonlyMap<string, RegexLesson> = new Map(
  REGEX_LESSONS.map((lesson) => [lesson.id, lesson]),
);

const LESSON_BY_TOKEN: ReadonlyMap<string, RegexLesson> = new Map(
  REGEX_LESSONS.flatMap((lesson) => lesson.tokens.map((t) => [t.syntax, lesson] as const)),
);

export function regexLessonById(id: string): RegexLesson | undefined {
  return LESSON_BY_ID.get(id);
}

export function regexLessonForToken(syntax: string): RegexLesson | undefined {
  return LESSON_BY_TOKEN.get(syntax);
}
