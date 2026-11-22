import type { ReactNode } from "react";
import type { BreakpointMark } from "../../gdb/cmd-drill";

type Props = {
  readonly file: string;
  readonly lines: readonly string[];
  readonly currentLine: number | null;
  readonly breakpoints: readonly BreakpointMark[];
  readonly sessionLines: readonly string[];
  readonly codeTestId?: string;
  readonly sessionTestId?: string;
};

/** Displays numbered C++ source lines with current-line arrow, breakpoint markers and gdb output. */
export function CodeView({
  file,
  lines,
  currentLine,
  breakpoints,
  sessionLines,
  codeTestId,
  sessionTestId,
}: Props): ReactNode {
  const bpByLine = new Map<number, BreakpointMark>();
  for (const bp of breakpoints) bpByLine.set(bp.line, bp);

  return (
    <div className="gdb-viewer">
      <div className="gdb-file-bar">{file}</div>
      <pre className="gdb-code" data-testid={codeTestId}>
        {lines.map((text, idx) => {
          const lineNo = idx + 1;
          const isCurrent = currentLine === lineNo;
          const bp = bpByLine.get(lineNo);
          return (
            <span
              key={lineNo}
              className={isCurrent ? "gdb-line gdb-line-current" : "gdb-line"}
              data-line={lineNo}
            >
              <span
                className={
                  bp === undefined
                    ? "gdb-gutter-bp"
                    : bp.enabled
                      ? "gdb-gutter-bp gdb-bp-on"
                      : "gdb-gutter-bp gdb-bp-off"
                }
                aria-hidden="true"
              >
                {bp === undefined ? " " : bp.enabled ? "●" : "○"}
              </span>
              <span className="gdb-gutter-arrow" aria-hidden="true">
                {isCurrent ? "=>" : "  "}
              </span>
              <span className="gdb-gutter-num">{String(lineNo).padStart(2, " ")}</span>{" "}
              <span className="gdb-line-text">{text}</span>
            </span>
          );
        })}
      </pre>
      {sessionLines.length > 0 && (
        <pre className="gdb-session" data-testid={sessionTestId}>
          {sessionLines.join("\n")}
        </pre>
      )}
    </div>
  );
}
