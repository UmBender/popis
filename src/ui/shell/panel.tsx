import { createContext, useContext, useEffect, type ReactNode } from "react";

/** The open reference panels, kept by the window (ADR-T18-1). */
export type References = {
  readonly isOpen: (id: string) => boolean;
  readonly setOpen: (id: string, open: boolean) => void;
};

const CLOSED: References = {
  isOpen: () => false,
  setOpen: () => undefined,
};

export const ReferencesContext = createContext<References>(CLOSED);

/** The first block of every panel: the title and a one-line description. */
export function PanelTitle({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <header className="panel-title" data-panel="title">
      <h1>{title}</h1>
      <p className="muted">{children}</p>
    </header>
  );
}

/** A reference panel, closed by default, whose state the window saves. */
export function Reference({
  id,
  title,
  className,
  testId,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly className?: string;
  readonly testId?: string;
  readonly children: ReactNode;
}): ReactNode {
  const refs = useContext(ReferencesContext);
  return (
    <details
      role="group"
      aria-label={title}
      className={className === undefined ? "reference" : `reference ${className}`}
      data-panel="reference"
      data-testid={testId}
      open={refs.isOpen(id)}
      onToggle={(e) => {
        const open = e.currentTarget.open;
        if (open !== refs.isOpen(id)) refs.setOpen(id, open);
      }}
    >
      <summary>{title}</summary>
      {children}
    </details>
  );
}

/** Reports to the window whether a round is being played. */
export function useRunning(
  onRunning: ((running: boolean) => void) | undefined,
  running: boolean,
): void {
  useEffect(() => {
    onRunning?.(running);
  }, [onRunning, running]);
}
