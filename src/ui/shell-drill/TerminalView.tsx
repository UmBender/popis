import type { ReactNode } from "react";

type Props = {
  readonly cwd: string;
  readonly files: readonly string[];
  readonly terminalLines: readonly string[];
  readonly filesTestId?: string;
  readonly terminalTestId?: string;
};

/** Displays working directory, directory files and recent terminal output for Shell drills (AC-5, AC-6). */
export function TerminalView({
  cwd,
  files,
  terminalLines,
  filesTestId,
  terminalTestId,
}: Props): ReactNode {
  return (
    <div className="shell-drill-viewer">
      <div className="shell-drill-dir-bar">
        <span className="shell-drill-cwd">{cwd}</span>
        <ul className="shell-drill-files" data-testid={filesTestId} aria-label="Arquivos da pasta">
          {files.map((file) => (
            <li key={file} className="shell-drill-file">
              <code>{file}</code>
            </li>
          ))}
        </ul>
      </div>
      <pre className="shell-drill-terminal" data-testid={terminalTestId}>
        {terminalLines.length > 0 ? terminalLines.join("\n") : "$ "}
      </pre>
    </div>
  );
}
