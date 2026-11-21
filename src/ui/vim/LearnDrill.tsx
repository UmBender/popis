import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Clock } from "../../core/clock";
import type { KeyValueStore } from "../../storage/history";
import { parseVimEditSettings, saveVimEditSettings, type VimEditSettings } from "../../storage/vim";
import { loadUnlocked, unlockKind } from "../../storage/vim-learn";
import { diffText } from "../../vim/diff";
import type { RegisterKind } from "../../vim/drills/register-edit";
import { pressEditKey } from "../../vim/edit";
import { formatKeys, keyFromEvent, parseKeys, type Key } from "../../vim/keys";
import {
  LESSONS,
  exampleFrames,
  exerciseFor,
  lessonFor,
  type Frame,
  type Lesson,
} from "../../vim/lessons";
import { createState, type VimState } from "../../vim/state";
import { selectionRange } from "../../vim/visual";
import { PanelTitle } from "../shell/panel";
import { Buffer, modeLabel } from "./EditDrill";

/** One key of the animated example every 600 ms (ADR-T16-1). */
const STEP_MS = 600;

type Props = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly settings: VimEditSettings;
  readonly onSettings: (settings: VimEditSettings) => void;
};

/** The Learn mode (ADR-T16-1): a lesson for each kind, before its free practice. */
export function LearnDrill({ store, onBack, settings, onSettings }: Props): ReactNode {
  const [open, setOpen] = useState<RegisterKind | null>(null);
  const [unlocked, setUnlocked] = useState(() => loadUnlocked(store));

  const finish = (kind: RegisterKind) => {
    unlockKind(store, kind);
    setUnlocked(loadUnlocked(store));
    // The free practice takes the kind in as soon as its lesson is done.
    if (!settings.kinds.includes(kind)) {
      const updated = parseVimEditSettings({ ...settings, kinds: [...settings.kinds, kind] });
      saveVimEditSettings(store, updated);
      onSettings(updated);
    }
  };

  return (
    <div className="screen vim">
      <PanelTitle title="Aprender">
        Cada tipo tem uma explicação, um exemplo animado e um exercício com a referência à vista. Ao
        fazer o exercício uma vez, o tipo entra no treino de edição.
      </PanelTitle>

      <ul className="vim-lessons" data-panel="options" aria-label="Lições">
        {LESSONS.map((lesson) => (
          <li key={lesson.kind}>
            <button
              type="button"
              aria-current={open === lesson.kind}
              onClick={() => {
                setOpen(lesson.kind);
              }}
            >
              {unlocked.includes(lesson.kind) ? `${lesson.title} — feito` : lesson.title}
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <LessonView
          key={open}
          lesson={lessonFor(open)}
          done={unlocked.includes(open)}
          onFinish={() => {
            finish(open);
          }}
          onList={() => {
            setOpen(null);
          }}
        />
      )}

      <div className="actions">
        <button type="button" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}

function LessonView({
  lesson,
  done,
  onFinish,
  onList,
}: {
  readonly lesson: Lesson;
  readonly done: boolean;
  readonly onFinish: () => void;
  readonly onList: () => void;
}): ReactNode {
  return (
    <section className="vim-lesson" data-panel="area">
      <h2>{lesson.title}</h2>
      <p data-testid="learn-explanation">{lesson.explanation}</p>
      <ul className="vim-lesson-commands" data-testid="learn-commands">
        {lesson.commands.map((command) => (
          <li key={command}>
            <code>{command}</code>
          </li>
        ))}
      </ul>
      <Example lesson={lesson} />
      <Exercise lesson={lesson} done={done} onFinish={onFinish} />
      <div className="actions">
        <button type="button" onClick={onList}>
          Lições
        </button>
      </div>
    </section>
  );
}

/** The animated example: the keys appear one by one and the buffer changes. */
function Example({ lesson }: { readonly lesson: Lesson }): ReactNode {
  const frames = useMemo(() => exampleFrames(lesson), [lesson]);
  const keys = useMemo(() => parseKeys(lesson.example.keys), [lesson]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const last = frames.length - 1;
  const running = playing && index < last;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setIndex((i) => Math.min(i + 1, last));
    }, STEP_MS);
    return () => {
      clearInterval(id);
    };
  }, [running, last]);

  // `index` never leaves the frames.
  const frame = frames[index] as Frame;
  return (
    <div className="vim-example">
      <h3>Exemplo</h3>
      <pre className="vim-code" data-testid="learn-buffer">
        <Buffer
          lines={frame.lines}
          mask={[]}
          mark=""
          cursor={frame.cursor}
          insert={frame.mode === "insert"}
        />
      </pre>
      <p className="vim-status" data-testid="learn-keys">
        {formatKeys(keys.slice(0, index))}
      </p>
      <div className="actions">
        <button
          type="button"
          onClick={() => {
            if (index >= last) setIndex(0);
            setPlaying(index >= last || !playing);
          }}
        >
          {running ? "Pausar" : "Tocar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setPlaying(true);
          }}
        >
          Recomeçar
        </button>
      </div>
    </div>
  );
}

/** The guided exercise: the reference is on screen and its next key is marked. */
function Exercise({
  lesson,
  done,
  onFinish,
}: {
  readonly lesson: Lesson;
  readonly done: boolean;
  readonly onFinish: () => void;
}): ReactNode {
  const edit = useMemo(() => exerciseFor(lesson), [lesson]);
  const reference = useMemo(() => parseKeys(edit.reference), [edit]);
  const fresh = (): VimState => createState(edit.lines, edit.start);
  const [vim, setVim] = useState(fresh);
  const [typed, setTyped] = useState<readonly Key[]>([]);
  const [finished, setFinished] = useState(false);
  const latest = useRef({ vim, typed, finished });
  const box = useRef<HTMLTextAreaElement>(null);

  const feed = (key: Key) => {
    const state = latest.current;
    if (state.finished) return;
    const next = pressEditKey(state.vim, key);
    const keys = [...state.typed, key];
    const reached =
      next.mode === "normal" &&
      next.lines.length === edit.after.length &&
      next.lines.every((line, i) => line === edit.after[i]);
    latest.current = { vim: next, typed: keys, finished: reached };
    setVim(next);
    setTyped(keys);
    if (reached) {
      setFinished(true);
      onFinish();
    }
  };

  const restart = () => {
    const state = fresh();
    latest.current = { vim: state, typed: [], finished: false };
    setVim(state);
    setTyped([]);
    setFinished(false);
    box.current?.focus();
  };

  // The keys typed so far are the start of the reference, or the highlight goes back to its start.
  const matched = typed.every((key, i) => key === reference[i]) ? typed.length : 0;
  const masks = useMemo(
    () => diffText(vim.lines.join("\n"), edit.after.join("\n")),
    [vim.lines, edit.after],
  );

  return (
    <div className="vim-exercise typing-area">
      <h3>Exercício</h3>
      <textarea
        ref={box}
        className="typing-input"
        aria-label="Teclas do Vim"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => {
          if ((e.nativeEvent as InputEvent).isComposing) return;
          const text = e.target.value;
          e.target.value = "";
          for (const ch of text.replace(/[\r\n]/g, "")) feed(ch);
        }}
        onCompositionEnd={(e) => {
          const text = e.currentTarget.value;
          e.currentTarget.value = "";
          for (const ch of text.replace(/[\r\n]/g, "")) feed(ch);
        }}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          const key = keyFromEvent(e);
          if (key === null) return;
          e.preventDefault();
          feed(key);
        }}
      />
      <pre
        className="vim-code"
        data-testid="vim-code"
        onClick={() => {
          box.current?.focus();
        }}
      >
        <Buffer
          lines={vim.lines}
          mask={masks.aMask}
          mark="vim-diff-del"
          cursor={vim.mode === "cmdline" ? null : vim.cursor}
          insert={vim.mode === "insert"}
          selection={(line) => selectionRange(vim, line)}
        />
      </pre>
      <pre className="vim-after" data-testid="vim-after">
        <Buffer lines={edit.after} mask={masks.bMask} mark="vim-diff-add" cursor={null} />
      </pre>
      <p className="vim-status" data-testid="vim-status">
        <strong>{modeLabel(vim)}</strong>{" "}
        {vim.recording !== null && (
          <span className="vim-recording">{`gravando @${vim.recording.name}`}</span>
        )}{" "}
        <span className="vim-pending">{formatKeys(vim.pending)}</span>
      </p>
      <p className="vim-reference" data-testid="learn-reference">
        {reference.map((key, i) => (
          <Fragment key={i}>
            {i > 0 ? " " : null}
            <span
              className={i === matched ? "vim-next-key" : i < matched ? "muted" : undefined}
              data-testid={i === matched && !finished ? "learn-next-key" : undefined}
            >
              {key}
            </span>
          </Fragment>
        ))}
      </p>
      {(finished || done) && (
        <p className="vim-better" data-testid={finished ? "learn-done" : "learn-was-done"}>
          {finished
            ? "Feito! O treino livre deste tipo está liberado."
            : "Este tipo já está liberado no treino livre."}
        </p>
      )}
      <div className="actions">
        <button type="button" onClick={restart}>
          Recomeçar exercício
        </button>
      </div>
    </div>
  );
}
