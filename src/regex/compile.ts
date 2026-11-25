export type RegexDialect = "python" | "ere";

export const REGEX_DIALECTS: readonly RegexDialect[] = ["python", "ere"];

export const REGEX_DIALECT_LABELS: Readonly<Record<RegexDialect, string>> = {
  python: "Python re",
  ere: "grep -E",
};

export type MatchMode = "search" | "fullmatch";

export type MatchSpan = {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  /** Capture groups 1..N (0-indexed: groups[0] is group 1). */
  readonly groups: readonly (string | undefined)[];
};

export type CompiledRegex = {
  readonly pattern: string;
  readonly dialect: RegexDialect;
  readonly mode: MatchMode;
  readonly jsSource: string;
  readonly groupCount: number;
  exec(line: string): MatchSpan | null;
  test(line: string): boolean;
  findAll(line: string): readonly MatchSpan[];
};

export type CompileResult =
  | { readonly ok: true; readonly matcher: CompiledRegex }
  | { readonly ok: false; readonly error: string };

export type ReplaceResult =
  | { readonly ok: true; readonly output: string }
  | { readonly ok: false; readonly error: string };

const POSIX_CLASSES: Readonly<Record<string, string>> = {
  digit: "0-9",
  alpha: "A-Za-z",
  alnum: "A-Za-z0-9",
  lower: "a-z",
  upper: "A-Z",
  xdigit: "0-9A-Fa-f",
  space: " \\t\\r\\n\\v\\f",
  blank: " \\t",
  punct: "!-\"$%&'()*+,\\-./:;<=>?@[\\\\\\]^_`{|}~#",
};

const ERE_SHORTHAND_HINTS: Readonly<Record<string, string>> = {
  d: "`\\d` não existe no `grep -E`; use `[0-9]` ou `[[:digit:]]`",
  D: "`\\D` não existe no `grep -E`; use `[^0-9]`",
  w: "`\\w` não existe no `grep -E`; use `[A-Za-z0-9_]` ou `[[:alnum:]_]`",
  W: "`\\W` não existe no `grep -E`; use `[^A-Za-z0-9_]`",
  s: "`\\s` não existe no `grep -E`; use `[[:space:]]`",
  S: "`\\S` não existe no `grep -E`; use `[^[:space:]]`",
};

const ESCAPABLE_META = new Set([
  ".",
  "*",
  "+",
  "?",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
  "|",
  "^",
  "$",
  "\\",
  "/",
  "-",
  ":",
  ",",
  ";",
  "=",
  "!",
  "<",
  ">",
  '"',
  "'",
  "#",
  "@",
  "%",
  "&",
  "~",
  "`",
  " ",
  "_",
]);

type ClassParse =
  | { readonly ok: true; readonly js: string; readonly nextIndex: number }
  | { readonly ok: false; readonly error: string };

function parseCharClass(pattern: string, start: number, dialect: RegexDialect): ClassParse {
  const barePosix = /^\[:([a-z]+):\]/.exec(pattern.slice(start));
  if (barePosix !== null) {
    return {
      ok: false,
      error: `Classes POSIX precisam de colchetes duplos: [${barePosix[0]}]`,
    };
  }

  let i = start + 1;
  let out = "[";

  if (pattern[i] === "^") {
    out += "^";
    i += 1;
  }

  // Leading `]` after `[` or `[^` is literal in Python and POSIX ERE, but empty in JS RegExp.
  if (pattern[i] === "]") {
    out += "\\]";
    i += 1;
  }

  while (i < pattern.length) {
    const ch = pattern[i]!;
    if (ch === "]") {
      return { ok: true, js: `${out}]`, nextIndex: i + 1 };
    }

    if (pattern.startsWith("[:", i)) {
      const close = pattern.indexOf(":]", i + 2);
      if (close !== -1) {
        const name = pattern.slice(i + 2, close);
        if (dialect === "python") {
          return {
            ok: false,
            error: `Classes POSIX como \`[[:${name}:]]\` são do \`grep -E\`; no Python \`re\` use \`\\d\`, \`\\w\`, \`\\s\` ou faixas como \`[0-9]\``,
          };
        }
        const mapped = POSIX_CLASSES[name];
        if (mapped === undefined) {
          return { ok: false, error: `Classe POSIX desconhecida \`[:${name}:]\`` };
        }
        out += mapped;
        i = close + 2;
        continue;
      }
    }

    if (ch === "\\") {
      const next = pattern[i + 1];
      if (next === undefined) {
        return { ok: false, error: "Classe '[' sem fechar" };
      }
      if (dialect === "ere") {
        const hint = ERE_SHORTHAND_HINTS[next];
        if (hint !== undefined) {
          return { ok: false, error: `${hint} (também fora de \`[...]\`)` };
        }
        // In POSIX ERE, `\` inside `[...]` is a literal backslash.
        out += "\\\\";
        i += 1;
        continue;
      }
      if (next === "u" || next === "x" || next === "p" || next === "P" || next === "U") {
        return { ok: false, error: "Escapes Unicode/hex estão fora do subconjunto ensinado" };
      }
      if (next >= "1" && next <= "9") {
        return {
          ok: false,
          error: `Retro-referência \`\\${next}\` no padrão está fora do subconjunto ensinado`,
        };
      }
      out += `\\${next}`;
      i += 2;
      continue;
    }

    out += ch;
    i += 1;
  }

  return { ok: false, error: "Classe '[' sem fechar" };
}

type TranslateResult =
  | { readonly ok: true; readonly jsSource: string; readonly groupCount: number }
  | { readonly ok: false; readonly error: string };

function translatePattern(pattern: string, dialect: RegexDialect): TranslateResult {
  let out = "";
  let i = 0;
  let groupCount = 0;
  const parens: ("group" | "lookahead")[] = [];
  let prev: "none" | "atom" | "anchor" | "quant" = "none";

  while (i < pattern.length) {
    const ch = pattern[i]!;

    if (ch === "[") {
      const cls = parseCharClass(pattern, i, dialect);
      if (!cls.ok) return cls;
      out += cls.js;
      i = cls.nextIndex;
      prev = "atom";
      continue;
    }

    if (ch === "(") {
      if (pattern[i + 1] === "?") {
        const rest = pattern.slice(i);
        if (rest.startsWith("(?<=") || rest.startsWith("(?<!")) {
          return { ok: false, error: "Lookbehind está fora do subconjunto ensinado" };
        }
        if (rest.startsWith("(?P<") || rest.startsWith("(?<")) {
          return {
            ok: false,
            error: "Grupos nomeados estão fora do subconjunto ensinado; use `(...)`",
          };
        }
        if (/^\(\?[imsxauL-]+[:)]/.test(rest)) {
          return {
            ok: false,
            error: "Flags inline como `(?i)` estão fora do subconjunto ensinado",
          };
        }
        if (rest.startsWith("(?:")) {
          if (dialect === "ere") {
            return {
              ok: false,
              error: "Grupo sem captura `(?:...)` não existe no `grep -E`; use `(...)`",
            };
          }
          out += "(?:";
          parens.push("group");
          i += 3;
          prev = "none";
          continue;
        }
        if (rest.startsWith("(?=") || rest.startsWith("(?!")) {
          if (dialect === "ere") {
            return {
              ok: false,
              error: "Lookahead `(?=...)`/`(?!...)` não existe no `grep -E`; use Python `re`",
            };
          }
          out += rest.slice(0, 3);
          parens.push("lookahead");
          i += 3;
          prev = "none";
          continue;
        }
        return { ok: false, error: "Sintaxe `(?...)` não suportada neste subconjunto" };
      }
      out += "(";
      parens.push("group");
      groupCount += 1;
      i += 1;
      prev = "none";
      continue;
    }

    if (ch === ")") {
      const kind = parens.pop();
      if (kind === undefined) {
        return { ok: false, error: "Parêntese ')' sem abrir" };
      }
      out += ")";
      i += 1;
      prev = kind === "lookahead" ? "anchor" : "atom";
      continue;
    }

    if (ch === "|") {
      out += "|";
      i += 1;
      prev = "none";
      continue;
    }

    if (ch === "^" || ch === "$") {
      out += ch;
      i += 1;
      prev = "anchor";
      continue;
    }

    if (ch === "*" || ch === "+" || ch === "?") {
      if (ch === "?" && prev === "quant") {
        if (dialect === "ere") {
          return {
            ok: false,
            error:
              "Quantificador preguiçoso (`*?`, `+?`, `??`) não existe no `grep -E`; use Python `re`",
          };
        }
        out += "?";
        i += 1;
        prev = "none";
        continue;
      }
      if (prev !== "atom") {
        return {
          ok: false,
          error: `Quantificador \`${ch}\` sem elemento antes para repetir`,
        };
      }
      out += ch;
      i += 1;
      prev = "quant";
      continue;
    }

    if (ch === "{") {
      const m = /^\{(\d*)(?:,(\d*))?\}/.exec(pattern.slice(i));
      const hasComma = m !== null && m[0].includes(",");
      const minStr = m?.[1] ?? "";
      const maxStr = m?.[2] ?? "";
      if (m === null || (minStr.length === 0 && (!hasComma || maxStr.length === 0))) {
        return {
          ok: false,
          error: "Chave '{' inválida; use `{n}`, `{n,m}` ou escape com `\\{`",
        };
      }
      if (prev !== "atom") {
        return {
          ok: false,
          error: `Quantificador \`${m[0]}\` sem elemento antes para repetir`,
        };
      }
      const min = minStr.length === 0 ? 0 : Number(minStr);
      const max = maxStr.length === 0 ? null : Number(maxStr);
      if (max !== null && max < min) {
        return {
          ok: false,
          error: `Intervalo inválido \`${m[0]}\`: o mínimo não pode ser maior que o máximo`,
        };
      }
      out += hasComma
        ? max === null
          ? `{${String(min)},}`
          : `{${String(min)},${String(max)}}`
        : `{${String(min)}}`;
      i += m[0].length;
      prev = "quant";
      continue;
    }

    if (ch === "\\") {
      const next = pattern[i + 1];
      if (next === undefined) {
        return { ok: false, error: "Barra invertida '\\' sobrando no fim do padrão" };
      }
      if (next >= "1" && next <= "9") {
        return {
          ok: false,
          error: `Retro-referência \`\\${next}\` no padrão está fora do subconjunto ensinado; use \`\\1\` só na troca`,
        };
      }
      if (next === "u" || next === "x" || next === "p" || next === "P" || next === "U") {
        return { ok: false, error: "Escapes Unicode/hex estão fora do subconjunto ensinado" };
      }
      if (next === "A" || next === "Z") {
        return {
          ok: false,
          error: `\`\\${next}\` está fora do subconjunto ensinado; use \`^\` e \`$\``,
        };
      }
      const shorthandHint = ERE_SHORTHAND_HINTS[next];
      if (shorthandHint !== undefined) {
        if (dialect === "ere") return { ok: false, error: shorthandHint };
        out += `\\${next}`;
        i += 2;
        prev = "atom";
        continue;
      }
      if (next === "b" || next === "B") {
        if (dialect === "ere") {
          return {
            ok: false,
            error: `\`\\${next}\` não faz parte do \`grep -E\`; use Python \`re\` ou delimitadores`,
          };
        }
        out += `\\${next}`;
        i += 2;
        prev = "anchor";
        continue;
      }
      if (next === "t" || next === "n" || next === "r") {
        if (dialect === "ere") {
          return {
            ok: false,
            error: `\`\\${next}\` não é padrão no \`grep -E\`; use \`[[:space:]]\` ou Python \`re\``,
          };
        }
        out += `\\${next}`;
        i += 2;
        prev = "atom";
        continue;
      }
      if (ESCAPABLE_META.has(next)) {
        out += `\\${next}`;
        i += 2;
        prev = "atom";
        continue;
      }
      return { ok: false, error: `Escape desconhecido \`\\${next}\`` };
    }

    out += ch;
    i += 1;
    prev = "atom";
  }

  if (parens.length > 0) {
    return { ok: false, error: "Parêntese '(' sem fechar" };
  }

  return { ok: true, jsSource: out, groupCount };
}

function toSpan(match: RegExpExecArray): MatchSpan {
  return {
    start: match.index,
    end: match.index + match[0].length,
    text: match[0],
    groups: match.slice(1),
  };
}

/**
 * Validates `pattern` against the taught subset of `dialect` (`python` or `ere`),
 * translates it to a JS RegExp (no `u` flag), and returns a matcher or readable error.
 */
export function compile(
  pattern: string,
  dialect: RegexDialect,
  mode: MatchMode = "search",
): CompileResult {
  const translated = translatePattern(pattern, dialect);
  if (!translated.ok) return translated;

  const source = mode === "fullmatch" ? `^(?:${translated.jsSource})$` : translated.jsSource;
  let single: RegExp;
  let global: RegExp;
  try {
    single = new RegExp(source);
    global = new RegExp(source, "g");
  } catch {
    return { ok: false, error: "Faixa ou expressão regular inválida" };
  }

  const matcher: CompiledRegex = {
    pattern,
    dialect,
    mode,
    jsSource: source,
    groupCount: translated.groupCount,
    exec(line: string): MatchSpan | null {
      const m = single.exec(line);
      return m === null ? null : toSpan(m);
    },
    test(line: string): boolean {
      return single.test(line);
    },
    findAll(line: string): readonly MatchSpan[] {
      const spans: MatchSpan[] = [];
      global.lastIndex = 0;
      while (true) {
        const m = global.exec(line);
        if (m === null) break;
        spans.push(toSpan(m));
        if (m[0].length === 0) {
          if (global.lastIndex >= line.length) break;
          global.lastIndex += 1;
        }
      }
      return spans;
    },
  };

  return { ok: true, matcher };
}

type TranslatedReplacement =
  | { readonly ok: true; readonly jsReplacement: string }
  | { readonly ok: false; readonly error: string };

function translateReplacement(
  replacement: string,
  dialect: RegexDialect,
  groupCount: number,
): TranslatedReplacement {
  let out = "";
  let i = 0;
  while (i < replacement.length) {
    const ch = replacement[i]!;
    if (ch === "$") {
      out += "$$";
      i += 1;
      continue;
    }
    if (ch === "&" && dialect === "ere") {
      out += "$&";
      i += 1;
      continue;
    }
    if (ch === "\\") {
      const next = replacement[i + 1];
      if (next === undefined) {
        return { ok: false, error: "Barra invertida '\\' sobrando no fim da substituição" };
      }
      if (next === "\\") {
        out += "\\";
        i += 2;
        continue;
      }
      if (next === "&" && dialect === "ere") {
        out += "&";
        i += 2;
        continue;
      }
      if (next >= "1" && next <= "9") {
        const n = Number(next);
        if (n > groupCount) {
          return {
            ok: false,
            error: `Grupo \`\\${String(n)}\` não existe neste padrão (há ${String(groupCount)})`,
          };
        }
        out += `$${next}`;
        i += 2;
        continue;
      }
      if (next === "g") {
        if (dialect === "ere") {
          return {
            ok: false,
            error: "`\\g<...>` só existe no Python `re.sub`; no `sed -E` use `\\1`",
          };
        }
        const m = /^\\g<(\d+)>/.exec(replacement.slice(i));
        if (m === null) {
          return { ok: false, error: "Use `\\g<1>` com o número do grupo" };
        }
        const n = Number(m[1]);
        if (n > groupCount) {
          return {
            ok: false,
            error: `Grupo \`\\g<${String(n)}>\` não existe neste padrão (há ${String(groupCount)})`,
          };
        }
        out += n === 0 ? "$&" : `$${String(n)}`;
        i += m[0].length;
        continue;
      }
      if (next === "t" && dialect === "python") {
        out += "\t";
        i += 2;
        continue;
      }
      if (next === "n" && dialect === "python") {
        out += "\n";
        i += 2;
        continue;
      }
      return { ok: false, error: `Escape desconhecido \`\\${next}\` na substituição` };
    }
    out += ch;
    i += 1;
  }
  return { ok: true, jsReplacement: out };
}

export function validateReplacement(
  replacement: string,
  dialect: RegexDialect,
  groupCount: number,
): { readonly ok: true } | { readonly ok: false; readonly error: string } {
  const res = translateReplacement(replacement, dialect, groupCount);
  return res.ok ? { ok: true } : res;
}

/** Applies global replacement matching Python `re.sub` or GNU `sed -E 's/.../.../g'`. */
export function applyReplace(
  matcher: CompiledRegex,
  line: string,
  replacement: string,
): ReplaceResult {
  const translated = translateReplacement(replacement, matcher.dialect, matcher.groupCount);
  if (!translated.ok) return translated;
  const global = new RegExp(matcher.jsSource, "g");
  return { ok: true, output: line.replace(global, translated.jsReplacement) };
}
