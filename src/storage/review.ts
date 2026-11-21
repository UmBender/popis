import type { Problem } from "../core/problem";
import { modeOfSkill, type ReviewItem } from "../gen/review";
import { isMode, MODES } from "../modes";
import type { Attempt } from "../session/engine";
import { mainCommand } from "../stats/derive";
import { kcTargetTimeMs } from "../stats/elo";
import type { TrainingEvent } from "../stats/event";
import {
  gradeAttempt,
  isDue,
  newCard,
  reviewCard,
  type FsrsCard,
  type Rating,
} from "../stats/fsrs";
import { generateTarget } from "../vim/drills/target";
import { LEVELS, type Level } from "../vim/levels";
import type { Round } from "../vim/round";
import type { Pos } from "../vim/state";
import type { KeyValueStore, SessionRecord } from "./history";
import { readJson, tryWriteJson } from "./kv";

export const REVIEW_CARDS_KEY = "popis.review-cards.v1";

/** At most this many legacy items, the most recent first. */
export const MAX_REVIEW_ITEMS = 50;

/** A right answer slower than this many times its skill's mean is reviewed (legacy T06). */
export const SLOW_FACTOR = 1.5;

const MAX_REVIEW_CARDS = 200;

export type CalcReviewCard = {
  readonly id: string;
  readonly kind: "calc";
  readonly item: ReviewItem;
  readonly skill: string;
  readonly prompt: string;
  readonly card: FsrsCard;
};

export type VimReviewCard = {
  readonly id: string;
  readonly kind: "vim-motion";
  readonly kc: string;
  readonly level: Level;
  readonly snippetId: string;
  readonly lines: readonly string[];
  readonly start: Pos;
  readonly target: Pos;
  readonly minimum: number;
  readonly solution: string;
  readonly label: string;
  readonly card: FsrsCard;
};

export type ReviewCard = CalcReviewCard | VimReviewCard;

/** Mean time of the right answers of each skill in one session's log. */
function meanTimes(log: readonly Attempt[]): Map<string, number> {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const { problem, outcome, timeMs } of log) {
    if (outcome !== "correct") continue;
    const total = totals.get(problem.skill) ?? { sum: 0, count: 0 };
    totals.set(problem.skill, { sum: total.sum + timeMs, count: total.count + 1 });
  }
  return new Map([...totals].map(([skill, { sum, count }]) => [skill, sum / count]));
}

/** Skipped, corrected or slow; the end-of-session timeout never counts. */
function needsReview(attempt: Attempt, means: ReadonlyMap<string, number>): boolean {
  switch (attempt.outcome) {
    case "timeout":
      return false;
    case "skipped":
      return true;
    case "correct": {
      const mean = means.get(attempt.problem.skill) as number;
      return attempt.corrections > 0 || attempt.timeMs > SLOW_FACTOR * mean;
    }
  }
}

/** The item that replays `problem`, or null when it no longer regenerates exactly. */
function itemOf(problem: Problem): ReviewItem | null {
  const mode = modeOfSkill(problem.skill);
  if (!isMode(mode) || mode === "review") return null;
  const spec = MODES[mode];
  const params = spec.parseSettings(problem.params);
  if (params === null || spec.validate(params as never).length > 0) return null;
  const again = spec.generator.generate(problem.seed, params as never);
  const same =
    again.skill === problem.skill &&
    again.prompt === problem.prompt &&
    again.answer === problem.answer;
  return same ? { mode, seed: problem.seed, params } : null;
}

function isAttempt(value: unknown): value is Attempt {
  const problem = (value as { problem?: Partial<Problem> } | null)?.problem;
  return (
    typeof problem === "object" &&
    problem !== null &&
    typeof problem.skill === "string" &&
    typeof problem.seed === "number"
  );
}

/**
 * Legacy T06 review selector, kept for compatibility and migration of existing
 * history into new FSRS cards (ADR-T24-1).
 */
export function reviewItems(history: readonly SessionRecord[]): ReviewItem[] {
  const items: ReviewItem[] = [];
  const seen = new Set<string>();
  for (const session of [...history].reverse()) {
    const log = session.log.filter(isAttempt);
    const means = meanTimes(log);
    for (const attempt of [...log].reverse()) {
      if (items.length === MAX_REVIEW_ITEMS) return items;
      const key = `${attempt.problem.skill}#${String(attempt.problem.seed)}`;
      if (seen.has(key) || !needsReview(attempt, means)) continue;
      seen.add(key);
      const item = itemOf(attempt.problem);
      if (item !== null) items.push(item);
    }
  }
  return items;
}

/** Human-readable description for a Vim motion card (e.g. 'chegar ao `(` com 2 teclas'). */
export function formatVimCardLabel(
  lines: readonly string[],
  target: Pos,
  solution: string,
  minimum: number,
): string {
  const ch = lines[target.line]?.[target.col] ?? "";
  const unit = minimum === 1 ? "tecla" : "teclas";
  if (ch.trim().length > 0) {
    return `chegar ao \`${ch}\` com ${String(minimum)} ${unit}`;
  }
  return `usar \`${solution}\` com ${String(minimum)} ${unit}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPos(value: unknown): value is Pos {
  return (
    isRecord(value) &&
    typeof value["line"] === "number" &&
    typeof value["col"] === "number"
  );
}

function isFsrsCard(value: unknown): value is FsrsCard {
  if (!isRecord(value)) return false;
  return (
    typeof value["stability"] === "number" &&
    typeof value["difficulty"] === "number" &&
    typeof value["dueAt"] === "number" &&
    (value["lastReviewAt"] === null || typeof value["lastReviewAt"] === "number") &&
    typeof value["reps"] === "number" &&
    typeof value["lapses"] === "number"
  );
}

function isReviewCard(value: unknown): value is ReviewCard {
  if (!isRecord(value) || typeof value["id"] !== "string" || !isFsrsCard(value["card"])) {
    return false;
  }
  if (value["kind"] === "calc") {
    const item = value["item"];
    return (
      isRecord(item) &&
      typeof item["mode"] === "string" &&
      typeof item["seed"] === "number" &&
      typeof value["skill"] === "string" &&
      typeof value["prompt"] === "string"
    );
  }
  if (value["kind"] === "vim-motion") {
    return (
      typeof value["kc"] === "string" &&
      LEVELS.includes(value["level"] as Level) &&
      typeof value["snippetId"] === "string" &&
      Array.isArray(value["lines"]) &&
      isPos(value["start"]) &&
      isPos(value["target"]) &&
      typeof value["minimum"] === "number" &&
      typeof value["solution"] === "string" &&
      typeof value["label"] === "string"
    );
  }
  return false;
}

export function loadReviewCards(store: KeyValueStore): ReviewCard[] {
  const raw = readJson(store, REVIEW_CARDS_KEY);
  return Array.isArray(raw) ? raw.filter(isReviewCard) : [];
}

export function saveReviewCards(store: KeyValueStore, cards: readonly ReviewCard[]): void {
  tryWriteJson(store, REVIEW_CARDS_KEY, cards.slice(-MAX_REVIEW_CARDS));
}

export function dueReviewCards(cards: readonly ReviewCard[], now: number): ReviewCard[] {
  return cards.filter((c) => isDue(c.card, now)).sort((a, b) => a.card.dueAt - b.card.dueAt);
}

/**
 * Loads the FSRS deck and migrates any legacy review items from `history` that
 * are not yet in the deck into new due cards (AC-3).
 */
export function syncReviewDeck(
  store: KeyValueStore,
  history: readonly SessionRecord[],
  now: number,
): ReviewCard[] {
  const cards = loadReviewCards(store);
  const seen = new Set(cards.map((c) => c.id));
  let changed = false;

  for (const item of reviewItems(history)) {
    const mode = item.mode;
    if (!isMode(mode) || mode === "review") continue;
    const problem = MODES[mode].generator.generate(item.seed, item.params as never);
    const id = `${problem.skill}#${String(problem.seed)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    cards.push({
      id,
      kind: "calc",
      item,
      skill: problem.skill,
      prompt: problem.prompt,
      card: newCard(now),
    });
    changed = true;
  }

  if (changed) saveReviewCards(store, cards);
  return cards;
}

/**
 * Updates the FSRS deck after a calculation/review session:
 * - in a review session, every answered/skipped card is graded 1–4 and rescheduled;
 * - in a normal session, skipped/corrected/slow problems become new due cards (or
 *   update an existing card).
 */
export function recordSessionReview(
  store: KeyValueStore,
  session: SessionRecord,
  allEvents: readonly TrainingEvent[],
  now: number,
): ReviewCard[] {
  const cards = loadReviewCards(store);
  const byId = new Map(cards.map((c, idx) => [c.id, idx] as const));
  const means = meanTimes(session.log.filter(isAttempt));
  let changed = false;

  for (const attempt of session.log.filter(isAttempt)) {
    if (attempt.outcome === "timeout") continue;
    const id = `${attempt.problem.skill}#${String(attempt.problem.seed)}`;
    const medianMs = kcTargetTimeMs(allEvents, attempt.problem.skill, now);
    const rating = gradeAttempt({
      ok: attempt.outcome === "correct",
      corrections: attempt.corrections,
      timeMs: attempt.timeMs,
      medianMs,
    });
    const existingIdx = byId.get(id);

    if (session.mode === "review" && existingIdx !== undefined) {
      const existing = cards[existingIdx]!;
      cards[existingIdx] = { ...existing, card: reviewCard(existing.card, rating, now) };
      changed = true;
      continue;
    }

    const slow =
      medianMs !== null
        ? attempt.timeMs > medianMs * SLOW_FACTOR
        : needsReview(attempt, means);
    const shouldAdd = attempt.outcome === "skipped" || attempt.corrections > 0 || slow;
    if (!shouldAdd) continue;

    if (existingIdx !== undefined) {
      const existing = cards[existingIdx]!;
      cards[existingIdx] = { ...existing, card: reviewCard(existing.card, rating, now) };
      changed = true;
    } else {
      const item = itemOf(attempt.problem);
      if (item === null) continue;
      byId.set(id, cards.length);
      cards.push({
        id,
        kind: "calc",
        item,
        skill: attempt.problem.skill,
        prompt: attempt.problem.prompt,
        card: newCard(now),
      });
      changed = true;
    }
  }

  if (changed) saveReviewCards(store, cards);
  return cards;
}

/**
 * Adds or updates FSRS cards for failed or inefficient Vim motion commands (AC-3).
 */
export function recordVimMotionReview(
  store: KeyValueStore,
  round: Pick<Round, "config" | "results">,
  allEvents: readonly TrainingEvent[],
  now: number,
): ReviewCard[] {
  const cards = loadReviewCards(store);
  const byId = new Map(cards.map((c, idx) => [c.id, idx] as const));
  let changed = false;

  for (const r of round.results) {
    const kc = mainCommand(r.solution);
    const medianMs = kcTargetTimeMs(allEvents, kc, now);
    const inefficient = r.keys > Math.max(r.minimum + 2, Math.ceil(r.minimum * 1.5));
    const slow = medianMs !== null && r.timeMs > medianMs * SLOW_FACTOR;
    if (!r.skipped && !inefficient && !slow) continue;

    const id = `vim.motion#${r.snippetId}#${String(r.seed)}`;
    const existingIdx = byId.get(id);
    if (existingIdx !== undefined) {
      const rating = gradeAttempt({
        ok: !r.skipped,
        corrections: inefficient ? 1 : 0,
        timeMs: r.timeMs,
        medianMs,
      });
      const existing = cards[existingIdx]!;
      cards[existingIdx] = { ...existing, card: reviewCard(existing.card, rating, now) };
      changed = true;
    } else {
      const t = generateTarget(round.config.seed, r.index, round.config.level);
      byId.set(id, cards.length);
      cards.push({
        id,
        kind: "vim-motion",
        kc,
        level: t.level,
        snippetId: t.snippetId,
        lines: t.lines,
        start: t.start,
        target: t.target,
        minimum: t.minimum,
        solution: t.solution,
        label: formatVimCardLabel(t.lines, t.target, t.solution, t.minimum),
        card: newCard(now),
      });
      changed = true;
    }
  }

  if (changed) saveReviewCards(store, cards);
  return cards;
}

/** Grades one reviewed Vim card and reschedules it with FSRS. */
export function reviewVimCardAttempt(
  store: KeyValueStore,
  cardId: string,
  rating: Rating,
  now: number,
): ReviewCard[] {
  const cards = loadReviewCards(store);
  const idx = cards.findIndex((c) => c.id === cardId);
  if (idx < 0) return cards;
  const target = cards[idx]!;
  cards[idx] = { ...target, card: reviewCard(target.card, rating, now) };
  saveReviewCards(store, cards);
  return cards;
}
