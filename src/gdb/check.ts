import { parseCommand, type GdbAction, type Location } from "./commands";

export type CheckContext = {
  readonly file: string;
  readonly currentFrame: number;
  readonly frameCount: number;
};

export type CheckResult =
  | { readonly ok: true; readonly action: GdbAction }
  | { readonly ok: false; readonly reason: string };

function sameLocation(a: Location | undefined, b: Location | undefined, file: string): boolean {
  if (a === undefined || b === undefined) return a === b;
  if (a.kind !== b.kind) return false;
  const fileA = a.file ?? file;
  const fileB = b.file ?? file;
  if (fileA !== fileB) return false;
  return a.kind === "line" && b.kind === "line"
    ? a.line === b.line
    : a.kind === "func" && b.kind === "func" && a.func === b.func;
}

function sameNumbers(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Resolves `frame N`, `up K` or `down K` to the absolute frame index in `ctx`. */
function targetFrame(action: GdbAction, ctx: CheckContext): number | null {
  if (action.kind === "frame") {
    return action.index >= 0 && action.index < ctx.frameCount ? action.index : null;
  }
  if (action.kind === "frame-shift") {
    const idx =
      action.dir === "up" ? ctx.currentFrame + action.count : ctx.currentFrame - action.count;
    return idx >= 0 && idx < ctx.frameCount ? idx : null;
  }
  return null;
}

function actionsMatch(got: GdbAction, expected: GdbAction, ctx: CheckContext): boolean {
  const expFrame = targetFrame(expected, ctx);
  const gotFrame = targetFrame(got, ctx);
  if (expFrame !== null || gotFrame !== null) {
    return expFrame !== null && gotFrame !== null && expFrame === gotFrame;
  }

  if (got.kind !== expected.kind) return false;
  switch (expected.kind) {
    case "launch":
      return got.kind === "launch" && got.program === expected.program;
    case "run":
      return got.kind === "run" && got.inputFile === expected.inputFile;
    case "start":
    case "kill":
    case "quit":
    case "finish":
    case "repeat":
      return true;
    case "break":
      return (
        got.kind === "break" &&
        got.temporary === expected.temporary &&
        got.cond === expected.cond &&
        sameLocation(got.at, expected.at, ctx.file)
      );
    case "condition":
      return got.kind === "condition" && got.id === expected.id && got.cond === expected.cond;
    case "ignore":
      return got.kind === "ignore" && got.id === expected.id && got.count === expected.count;
    case "info":
      return got.kind === "info" && got.topic === expected.topic;
    case "bp-op":
      return got.kind === "bp-op" && got.op === expected.op && sameNumbers(got.ids, expected.ids);
    case "step":
      return got.kind === "step" && got.mode === expected.mode && got.count === expected.count;
    case "continue":
      return got.kind === "continue" && got.count === expected.count;
    case "until":
      return got.kind === "until" && sameLocation(got.at, expected.at, ctx.file);
    case "advance":
      return got.kind === "advance" && sameLocation(got.at, expected.at, ctx.file);
    case "print":
      return got.kind === "print" && got.expr === expected.expr;
    case "display":
      return got.kind === "display" && got.expr === expected.expr;
    case "undisplay":
      return got.kind === "undisplay" && sameNumbers(got.ids, expected.ids);
    case "list":
      return got.kind === "list" && sameLocation(got.at, expected.at, ctx.file);
    case "backtrace":
      return got.kind === "backtrace" && got.count === expected.count;
    case "watch":
      return (
        got.kind === "watch" &&
        got.mode === expected.mode &&
        got.location === expected.location &&
        got.expr === expected.expr
      );
    case "set-var":
      return got.kind === "set-var" && got.target === expected.target && got.expr === expected.expr;
    case "call":
      return got.kind === "call" && got.expr === expected.expr;
    case "catch":
      return got.kind === "catch" && got.event === expected.event;
    default:
      return false;
  }
}

function explainMismatch(got: GdbAction, expected: GdbAction, ctx: CheckContext): string {
  if (got.kind === "repeat") return "Digite o comando pedido antes de pressionar Enter.";

  const expFrame = targetFrame(expected, ctx);
  if (expFrame !== null) {
    const gotFrame = targetFrame(got, ctx);
    if (gotFrame !== null) {
      return `Isso seleciona o frame #${String(gotFrame)}, mas o objetivo é o frame #${String(expFrame)}.`;
    }
    return `O objetivo é navegar até o frame #${String(expFrame)} com frame, up ou down.`;
  }

  if (expected.kind === "step" && got.kind === "step") {
    if (got.mode !== expected.mode) {
      return expected.mode === "next"
        ? "step entra na chamada de função; use next para pular a chamada."
        : "next pula a chamada de função; use step para entrar nela.";
    }
    return `Contagem diferente: esperado ${String(expected.count)}, recebido ${String(got.count)}.`;
  }

  if (expected.kind === "break" && got.kind === "break") {
    if (got.temporary !== expected.temporary) {
      return expected.temporary
        ? "break cria um ponto permanente; use tbreak para parada única."
        : "tbreak apaga o ponto ao parar; use break para mantê-lo.";
    }
    if (!sameLocation(got.at, expected.at, ctx.file)) {
      return "O arquivo ou o alvo (linha/função) do breakpoint não corresponde ao pedido.";
    }
    return "A condição do breakpoint não equivale à pedida.";
  }

  if (expected.kind === "watch" && got.kind === "watch") {
    if (got.mode !== expected.mode) {
      return `${got.mode} e ${expected.mode} observam eventos diferentes (escrita, leitura ou acesso).`;
    }
    if (got.location !== expected.location) {
      return expected.location
        ? "Faltou -l (-location) para vigiar diretamente o endereço de memória."
        : "Este objetivo não usa -l (-location).";
    }
    return "A expressão vigiada não corresponde à pedida.";
  }

  if (expected.kind === "bp-op" && got.kind === "bp-op") {
    if (got.op !== expected.op) {
      return `${got.op} tem efeito diferente de ${expected.op}.`;
    }
    if (got.ids.length === 0 && expected.ids.length > 0) {
      return `Sem número, ${got.op} afeta todos os breakpoints; informe o número pedido.`;
    }
    return "O número do breakpoint informado não corresponde ao pedido.";
  }

  if (expected.kind === "continue" && got.kind === "continue") {
    return `Contagem diferente: esperado continue ${String(expected.count)}.`;
  }

  if (expected.kind === "ignore" && got.kind === "ignore") {
    return "Confira a ordem dos argumentos: ignore <breakpoint> <contagem>.";
  }

  if (expected.kind === "info" && got.kind === "info") {
    return `info ${got.topic} mostra outra informação; o pedido é info ${expected.topic}.`;
  }

  if (expected.kind === "display" && got.kind === "print") {
    return "print mostra apenas uma vez; use display para acompanhar a cada parada.";
  }

  if (expected.kind === "advance" && got.kind === "until") {
    return "until só avança no frame atual; o pedido usa advance.";
  }

  if (expected.kind === "until" && got.kind === "advance") {
    return "advance entra em outras funções; o pedido usa until.";
  }

  return "O comando digitado tem efeito diferente do objetivo pedido.";
}

/**
 * Checks whether `input` produces the same gdb effect as `expected` in `context` (AC-2).
 */
export function checkCommand(
  input: string,
  expected: GdbAction,
  context: CheckContext,
): CheckResult {
  const parsed = parseCommand(input);
  if (!parsed.ok) return { ok: false, reason: parsed.error };
  if (actionsMatch(parsed.action, expected, context)) {
    return { ok: true, action: parsed.action };
  }
  return { ok: false, reason: explainMismatch(parsed.action, expected, context) };
}
