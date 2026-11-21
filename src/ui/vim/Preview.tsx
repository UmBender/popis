import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  commandDescription,
  curriculumExampleFrames,
  curriculumLessonById,
  type CurriculumLesson,
} from "../../vim/curriculum";
import { formatKeys, parseKeys } from "../../vim/keys";
import type { Frame } from "../../vim/lessons";
import type { PreviewBlock } from "../../vim/preview";

const STEP_MS = 600;

export type OptimalPreviewProps = {
  readonly blocks: readonly PreviewBlock[];
  readonly matchedKeys: number;
  readonly onOpenLesson: (lessonId: string) => void;
};

/**
 * Optimal key sequence shown above the code buffer (T21 AC-2, AC-6).
 * Each command is a block; hovering or focusing shows its one-line description,
 * and clicking opens its T20 lesson while pausing the round.
 */
export function OptimalPreview({
  blocks,
  matchedKeys,
  onOpenLesson,
}: OptimalPreviewProps): ReactNode {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active =
    activeIndex !== null && activeIndex < blocks.length ? blocks[activeIndex] : undefined;

  return (
    <div
      className="vim-preview"
      data-testid="vim-preview"
      role="region"
      aria-label="Prévia do ótimo"
    >
      <div className="vim-preview-blocks">
        {blocks.map((block, idx) => {
          const state =
            block.endKeyIndex <= matchedKeys
              ? "done"
              : block.startKeyIndex <= matchedKeys
                ? "next"
                : "pending";
          const handlers = {
            onMouseEnter: () => {
              setActiveIndex(idx);
            },
            onMouseLeave: () => {
              setActiveIndex(null);
            },
            onFocus: () => {
              setActiveIndex(idx);
            },
            onBlur: () => {
              setActiveIndex(null);
            },
          };
          if (block.lessonId !== null) {
            const lessonId = block.lessonId;
            return (
              <button
                key={`${String(block.startKeyIndex)}-${block.text}`}
                type="button"
                className="vim-preview-block"
                data-testid="vim-preview-block"
                data-state={state}
                data-lesson-id={lessonId}
                title={block.description ?? undefined}
                onClick={() => {
                  onOpenLesson(lessonId);
                }}
                {...handlers}
              >
                {block.text}
              </button>
            );
          }
          return (
            <span
              key={`${String(block.startKeyIndex)}-${block.text}`}
              tabIndex={0}
              className="vim-preview-block vim-preview-literal"
              data-testid="vim-preview-block"
              data-state={state}
              title={block.description ?? undefined}
              {...handlers}
            >
              {block.text}
            </span>
          );
        })}
      </div>
      {active !== undefined && active.description !== null && (
        <p className="vim-preview-desc" data-testid="vim-preview-desc">
          <code>{active.text}</code> — {active.description}
        </p>
      )}
    </div>
  );
}

export type LessonModalProps = {
  readonly lessonId: string;
  readonly onClose: () => void;
};

/** Modal showing a T20 lesson without leaving or losing the current round (T21 AC-6). */
export function LessonModal({ lessonId, onClose }: LessonModalProps): ReactNode {
  const lesson = curriculumLessonById(lessonId);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [onClose]);

  if (lesson === undefined) return null;

  return (
    <>
      <div className="shell-backdrop" onClick={onClose} />
      <div
        className="shell-help vim-lesson-modal"
        role="dialog"
        aria-modal="true"
        aria-label={lesson.title}
        data-testid="vim-lesson-modal"
      >
        <h2>{lesson.title}</h2>
        <p>{lesson.explanation}</p>
        <ul className="vim-lesson-commands">
          {lesson.commands.map((command) => {
            const desc = commandDescription(command);
            return (
              <li key={command}>
                <code>{command}</code>
                {desc !== undefined && <span className="muted">{` — ${desc}`}</span>}
              </li>
            );
          })}
        </ul>
        <ModalExample lesson={lesson} />
        <div className="actions">
          <button type="button" autoFocus onClick={onClose}>
            Voltar para a rodada <kbd>Esc</kbd>
          </button>
        </div>
      </div>
    </>
  );
}

function ModalExample({ lesson }: { readonly lesson: CurriculumLesson }): ReactNode {
  const frames = useMemo(() => curriculumExampleFrames(lesson), [lesson]);
  const keys = useMemo(() => parseKeys(lesson.example.keys), [lesson]);
  const [index, setIndex] = useState(0);
  const last = frames.length - 1;

  useEffect(() => {
    if (index >= last) return;
    const id = setInterval(() => {
      setIndex((i) => Math.min(i + 1, last));
    }, STEP_MS);
    return () => {
      clearInterval(id);
    };
  }, [index, last]);

  const frame = frames[index] as Frame;
  return (
    <div className="vim-example">
      <h3>Exemplo</h3>
      <pre className="vim-code">
        {frame.lines.map((text, line) => (
          <Fragment key={line}>
            {line > 0 ? "\n" : null}
            {frame.cursor.line === line
              ? [...(frame.cursor.col >= text.length ? `${text} ` : text)].map((ch, col) =>
                  col === frame.cursor.col ? (
                    <span
                      key={col}
                      className={`vim-cursor${frame.mode === "insert" ? " vim-insert" : ""}`}
                    >
                      {ch}
                    </span>
                  ) : (
                    ch
                  ),
                )
              : text}
          </Fragment>
        ))}
      </pre>
      <p className="vim-status">{formatKeys(keys.slice(0, index))}</p>
    </div>
  );
}
