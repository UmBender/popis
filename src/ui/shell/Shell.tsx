import { useEffect, useRef, useState, type ReactNode } from "react";
import { HELP_HINTS, type Hint } from "../keys";
import { folderOf, ITEMS, itemByShortcut, SECTIONS, type ItemId } from "./sections";

/** The mode block of the status line, as in Neovim. */
export type StatusMode = "NORMAL" | "JOGANDO" | "RESULTADO";

export type { Hint };

/** The tree and what its keys do; null while a round is played. */
export type TreeState = {
  readonly item: ItemId;
  /** Ids of the closed folders. */
  readonly closed: readonly string[];
  readonly reviewCount: number;
  /** Code typing and Vim are left out on touch screens. */
  readonly touch: boolean;
  readonly onChoose: (id: ItemId) => void;
  readonly onFolder: (folder: string, open: boolean) => void;
  /** Enter on the menu. */
  readonly onStart: () => void;
  /** Esc on the menu. */
  readonly onBack: () => void;
};

type Props = {
  /** Segments after "popis/". */
  readonly path: readonly string[];
  readonly right: ReactNode;
  readonly mode: StatusMode;
  readonly hints: readonly Hint[];
  readonly tree: TreeState | null;
  /** Below 48rem the tree is a drawer. */
  readonly narrow: boolean;
  readonly collapsed: boolean;
  readonly onCollapsed: (collapsed: boolean) => void;
  /** The keys of a screen without the tree (the results). */
  readonly onKey?: (event: KeyboardEvent) => void;
  readonly children: ReactNode;
};

const HELP = HELP_HINTS;

const TEXT_INPUTS = new Set(["checkbox", "radio", "button", "submit", "reset", "file"]);

/** Keys typed here belong to the field, not to the window. */
export function isField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && !TEXT_INPUTS.has(target.type);
}

/** Enter on these already does something. */
export function isControl(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLButtonElement ||
    target instanceof HTMLAnchorElement ||
    (target instanceof HTMLElement && target.tagName === "SUMMARY")
  );
}

const FOCUSABLE =
  'button, [href], input:not([type="radio"]), input[type="radio"]:checked, select, textarea';

const isTreeRadio = (el: Element | null): boolean =>
  el instanceof HTMLInputElement && el.name === "shell-item";

/** The editor window around every screen (ADR-T18-1, docs/architecture/Shell.md). */
export function Shell(props: Props): ReactNode {
  const { path, right, mode, hints, tree, narrow, collapsed, children } = props;
  const [drawer, setDrawer] = useState(false);
  const [help, setHelp] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  // Focus follows the checked item when the keys moved it from a tree radio.
  const follow = useRef(false);

  const open = tree !== null && (narrow ? drawer : !collapsed);

  const closeDrawer = () => {
    setDrawer(false);
    burger.current?.focus();
  };

  const toggleMenu = () => {
    if (narrow) {
      if (drawer) closeDrawer();
      else setDrawer(true);
    } else {
      props.onCollapsed(!collapsed);
    }
  };

  const pick = (id: ItemId) => {
    tree?.onChoose(id);
    if (narrow && drawer) closeDrawer();
  };

  // The latest values, read by the window's key listener.
  const latest = useRef({ props, drawer, help, toggleMenu, closeDrawer });
  useEffect(() => {
    latest.current = { props, drawer, help, toggleMenu, closeDrawer };
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const now = latest.current;
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (now.help) {
        if (e.key === "Escape") {
          e.preventDefault();
          setHelp(false);
        }
        return;
      }
      if (now.drawer && e.key === "Escape") {
        e.preventDefault();
        now.closeDrawer();
        return;
      }
      if (now.drawer && e.key === "Tab" && dialog.current !== null) {
        trapTab(e, dialog.current);
        return;
      }
      if (isField(e.target)) return;
      const t = now.props.tree;
      if (t === null) {
        now.props.onKey?.(e);
        return;
      }
      const choose = (id: ItemId) => {
        follow.current = isTreeRadio(document.activeElement);
        t.onChoose(id);
      };
      const move = (delta: number) => {
        const shown = ITEMS.filter(
          (i) =>
            (t.touch ? i.touch : true) &&
            (i.id === t.item || !t.closed.includes(folderOf(i.id).id)),
        );
        const next = shown[shown.findIndex((i) => i.id === t.item) + delta];
        if (next !== undefined) choose(next.id);
      };
      switch (e.key) {
        case "j":
        case "ArrowDown":
          move(1);
          break;
        case "k":
        case "ArrowUp":
          move(-1);
          break;
        case "h":
        case "ArrowLeft":
          t.onFolder(folderOf(t.item).id, false);
          break;
        case "l":
        case "ArrowRight":
          t.onFolder(folderOf(t.item).id, true);
          break;
        case "m":
          now.toggleMenu();
          break;
        case "?":
          setHelp(true);
          break;
        case "Escape":
          t.onBack();
          break;
        case "Enter":
          if (isControl(e.target)) return;
          t.onStart();
          break;
        default: {
          const item = /^[1-9]$/.test(e.key) ? itemByShortcut(Number(e.key)) : undefined;
          if (item === undefined) return;
          choose(item.id);
        }
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const item = tree?.item;
  useEffect(() => {
    if (!follow.current) return;
    follow.current = false;
    root.current?.querySelector<HTMLInputElement>('input[name="shell-item"]:checked')?.focus();
  }, [item]);

  useEffect(() => {
    if (!drawer) return;
    dialog.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    dialog.current?.querySelector<HTMLInputElement>('input[name="shell-item"]:checked')?.focus();
  }, [drawer]);

  const list = tree === null ? null : <Tree tree={tree} onPick={pick} />;

  return (
    <div ref={root} className={`shell${open ? "" : " shell-closed"}`}>
      <header className="shell-bar" data-testid="shell-bar">
        <span className="where">
          {tree !== null && (
            <button
              ref={burger}
              type="button"
              className="burger"
              aria-label="Menu"
              aria-expanded={open}
              aria-controls="shell-tree"
              onClick={toggleMenu}
            >
              ☰
            </button>
          )}
          <span className="path" data-testid="shell-path">
            {["popis", ...path].join("/")}
          </span>
        </span>
        <span className="shell-right">{right}</span>
      </header>
      <div className="shell-body">
        {list !== null && !narrow && (
          <nav id="shell-tree" className="tree" aria-label="Treinos" hidden={collapsed}>
            {list}
          </nav>
        )}
        <main className="shell-main">{children}</main>
      </div>
      <footer className="shell-status" data-testid="shell-status">
        <span className={`status-mode ${mode.toLowerCase()}`}>{mode}</span>
        {hints.map(([keys, text]) => (
          <span key={keys} className="status-hint">
            <kbd>{keys}</kbd> {text}
          </span>
        ))}
      </footer>
      {list !== null && narrow && drawer && (
        <>
          <div className="shell-backdrop" data-testid="shell-backdrop" onClick={closeDrawer} />
          <div
            ref={dialog}
            id="shell-tree"
            className="tree drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Treinos"
          >
            {list}
          </div>
        </>
      )}
      {help && (
        <Help
          onClose={() => {
            setHelp(false);
          }}
        />
      )}
    </div>
  );
}

/** Keeps Tab and Shift+Tab inside an open dialog. */
function trapTab(e: KeyboardEvent, container: HTMLElement): void {
  const stops = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  const first = stops[0];
  const last = stops.at(-1);
  if (first !== undefined && last !== undefined) {
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !container.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !container.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }
}

function Tree({
  tree,
  onPick,
}: {
  readonly tree: TreeState;
  readonly onPick: (id: ItemId) => void;
}): ReactNode {
  return (
    <div role="radiogroup" aria-label="Treinos" className="tree-list">
      {SECTIONS.map((folder) => {
        const items = folder.items.filter((i) => !tree.touch || i.touch);
        if (items.length === 0) return null;
        const open = !tree.closed.includes(folder.id);
        return (
          <div key={folder.id} className="tree-folder">
            <button
              type="button"
              className="folder"
              aria-expanded={open}
              onClick={() => {
                tree.onFolder(folder.id, !open);
              }}
            >
              {`${open ? "▾" : "▸"} ${folder.label}`}
            </button>
            {open &&
              items.map((item) => (
                <label key={item.id} className="tree-item">
                  <input
                    type="radio"
                    name="shell-item"
                    aria-label={item.label}
                    checked={tree.item === item.id}
                    // A click, not a change: choosing the checked item still closes the drawer.
                    onClick={() => {
                      onPick(item.id);
                    }}
                    onChange={() => undefined}
                  />
                  <span className="tree-name">{item.label}</span>
                  {item.id === "review" && tree.reviewCount > 0 && (
                    <span className="count" data-testid="tree-review-count">
                      {tree.reviewCount}
                    </span>
                  )}
                  {item.shortcut !== null && <kbd aria-hidden="true">{item.shortcut}</kbd>}
                </label>
              ))}
          </div>
        );
      })}
    </div>
  );
}

function Help({ onClose }: { readonly onClose: () => void }): ReactNode {
  return (
    <div className="shell-help" role="dialog" aria-modal="true" aria-label="Atalhos">
      <h2>Atalhos</h2>
      <dl>
        {HELP.map(([keys, text]) => (
          <div key={`${keys} ${text}`}>
            <dt>
              <kbd>{keys}</kbd>
            </dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
      <button type="button" autoFocus onClick={onClose}>
        Fechar <kbd>Esc</kbd>
      </button>
    </div>
  );
}
