import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  buildAgenda,
  DAY_MS,
  formatCountdown,
  formatDuration,
  formatUpdatedAgo,
  isStale,
  MINUTE_MS,
} from "../contests/agenda";
import { googleCalendarUrl, toIcs } from "../contests/export";
import {
  parseSnapshot,
  SITE_LABEL,
  SITES,
  type Contest,
  type ContestsSnapshot,
  type Site,
} from "../contests/model";
import { loadContestsPrefs, saveContestsPrefs } from "../contests/prefs";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";
import { PanelTitle } from "./shell/panel";

export type ContestsScreenProps = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  /** Optional fetch override for tests; defaults to global `fetch`. */
  readonly fetchData?: typeof fetch;
  /** Optional download handler for tests; defaults to browser `.ics` download. */
  readonly save?: (name: string, text: string) => void;
  /** Optional IANA time zone for tests; defaults to the browser's local time zone. */
  readonly timeZone?: string;
};

type LoadState =
  | { readonly kind: "loading" }
  | { readonly kind: "missing" }
  | { readonly kind: "ready"; readonly snapshot: ContestsSnapshot };

function saveIcs(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function contestsJsonUrl(): string {
  return `${import.meta.env.BASE_URL}contests.json`;
}

function capitalize(text: string): string {
  return `${text.charAt(0).toLocaleUpperCase("pt-BR")}${text.slice(1)}`;
}

function makeFormatters(timeZone?: string) {
  const tz = timeZone === undefined ? {} : { timeZone };
  const dayParts = new Intl.DateTimeFormat("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...tz,
  });
  const dayHeading = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    ...tz,
  });
  const timeOfDay = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...tz,
  });

  const dayKey = (ms: number): string => {
    const parts = new Map(dayParts.formatToParts(ms).map((p) => [p.type, p.value]));
    return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`;
  };

  const dayLabel = (ms: number, now: number): string => {
    const base = capitalize(dayHeading.format(ms));
    const key = dayKey(ms);
    if (key === dayKey(now)) return `${base} (hoje)`;
    if (key === dayKey(now + DAY_MS)) return `${base} (amanhã)`;
    return base;
  };

  const clockTime = (ms: number): string => timeOfDay.format(ms);

  return { dayKey, dayLabel, clockTime };
}

type ContestRowProps = {
  readonly contest: Contest;
  readonly now: number;
  readonly startTimeLabel: string;
  readonly onDownloadOne: (contest: Contest) => void;
};

function ContestRow({ contest, now, startTimeLabel, onDownloadOne }: ContestRowProps): ReactNode {
  return (
    <li className="contest-row">
      <div className="contest-main">
        <span className="contest-site" data-site={contest.site}>
          {SITE_LABEL[contest.site]}
        </span>
        <a className="contest-name" href={contest.url} target="_blank" rel="noopener noreferrer">
          {contest.name}
        </a>
        <div className="contest-meta">
          <span className="contest-time">{startTimeLabel}</span>
          <span className="contest-duration">{formatDuration(contest.durationMs)}</span>
          <span className="contest-countdown">{formatCountdown(contest, now)}</span>
        </div>
      </div>
      <div className="contest-actions">
        <a
          className="contest-action"
          href={googleCalendarUrl(contest)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Agenda
        </a>
        <button
          type="button"
          className="contest-action"
          aria-label={`Baixar .ics de ${contest.name}`}
          onClick={() => {
            onDownloadOne(contest);
          }}
        >
          .ics
        </button>
      </div>
    </li>
  );
}

/** Upcoming competitive programming contests in the user's local time zone (T38, ADR-T38-1). */
export function ContestsScreen({
  clock,
  store,
  fetchData,
  save = saveIcs,
  timeZone,
}: ContestsScreenProps): ReactNode {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [now, setNow] = useState(() => clock.wallTime());
  const [enabledSites, setEnabledSites] = useState<readonly Site[]>(
    () => loadContestsPrefs(store).sites,
  );

  const fmt = useMemo(() => makeFormatters(timeZone), [timeZone]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(clock.wallTime());
    }, MINUTE_MS);
    return () => {
      window.clearInterval(id);
    };
  }, [clock]);

  useEffect(() => {
    let cancelled = false;
    const loader = fetchData ?? fetch;
    void (async () => {
      let next: LoadState = { kind: "missing" };
      try {
        const res = await loader(contestsJsonUrl(), { cache: "no-cache" });
        if (res.ok) {
          const parsed = parseSnapshot((await res.json()) as unknown);
          if (parsed !== null) next = { kind: "ready", snapshot: parsed };
        }
      } catch {
        // Missing or unreadable file keeps the missing state.
      }
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  const toggleSite = (site: Site) => {
    setEnabledSites((prev) => {
      const set = new Set(prev);
      if (set.has(site)) set.delete(site);
      else set.add(site);
      const next = SITES.filter((s) => set.has(s));
      saveContestsPrefs(store, { sites: next });
      return next;
    });
  };

  const enabledSet = useMemo(() => new Set(enabledSites), [enabledSites]);
  const agenda = useMemo(() => {
    if (state.kind !== "ready") return null;
    const filtered = state.snapshot.contests.filter((c) => enabledSet.has(c.site));
    return buildAgenda(filtered, now, fmt.dayKey);
  }, [state, enabledSet, now, fmt]);

  const visibleContests = useMemo(
    () => (agenda === null ? [] : [...agenda.running, ...agenda.upcoming]),
    [agenda],
  );

  const downloadOne = (contest: Contest) => {
    save(`${contest.site}-${contest.id}.ics`, toIcs([contest], now));
  };

  const downloadAll = () => {
    save("contests.ics", toIcs(visibleContests, now));
  };

  return (
    <div className="screen contests" data-testid="contests-screen">
      <PanelTitle title="Contests">
        Próximos contests de Codeforces, AtCoder, CodeChef e LeetCode no seu fuso horário.
      </PanelTitle>

      <div className="contests-controls" data-panel="options">
        <div role="group" aria-label="Sites" className="contests-sites">
          {SITES.map((site) => (
            <label key={site} className="op">
              <input
                type="checkbox"
                checked={enabledSet.has(site)}
                onChange={() => {
                  toggleSite(site);
                }}
              />
              <span className="contest-site" data-site={site}>
                {SITE_LABEL[site]}
              </span>
            </label>
          ))}
        </div>
        {state.kind === "ready" && (
          <>
            <div className="contests-bar">
              <span className="muted contests-updated">
                {formatUpdatedAgo(state.snapshot.generatedAt, now)}
              </span>
              <button type="button" onClick={downloadAll} disabled={visibleContests.length === 0}>
                Baixar .ics
              </button>
            </div>
            {isStale(state.snapshot.generatedAt, now) && (
              <p role="alert" className="contests-warning">
                Os dados têm mais de 24 h e podem estar desatualizados.
              </p>
            )}
            {state.snapshot.errors.map((err) => (
              <p key={err.site} role="alert" className="contests-warning">
                {`${SITE_LABEL[err.site]} indisponível na última atualização`}
              </p>
            ))}
          </>
        )}
      </div>

      <div className="contests-area" data-panel="area">
        {state.kind === "loading" && <p className="muted">Carregando agenda...</p>}

        {state.kind === "missing" && (
          <div className="contests-missing" role="status">
            <p>
              Arquivo <code>contests.json</code> não encontrado.
            </p>
            <p className="muted">
              Em desenvolvimento, gere-o executando <code>npm run contests:fetch</code>.
            </p>
          </div>
        )}

        {state.kind === "ready" && agenda !== null && (
          <>
            {agenda.running.length > 0 && (
              <section className="contests-section" aria-labelledby="contests-running-title">
                <h2 id="contests-running-title">Acontecendo agora</h2>
                <ul className="contests-list">
                  {agenda.running.map((c) => (
                    <ContestRow
                      key={`${c.site}:${c.id}`}
                      contest={c}
                      now={now}
                      startTimeLabel={fmt.clockTime(c.startMs)}
                      onDownloadOne={downloadOne}
                    />
                  ))}
                </ul>
              </section>
            )}

            <section className="contests-section" aria-labelledby="contests-upcoming-title">
              <h2 id="contests-upcoming-title">Próximos 14 dias</h2>
              {enabledSites.length === 0 ? (
                <p className="muted">Nenhum site selecionado.</p>
              ) : agenda.days.length === 0 ? (
                <p className="muted">Nenhum contest nos próximos 14 dias.</p>
              ) : (
                agenda.days.map((group) => {
                  const first = group.contests[0]!;
                  const headingId = `contests-day-${group.day}-title`;
                  return (
                    <section
                      key={group.day}
                      className="contests-day"
                      data-testid={`contests-day-${group.day}`}
                      aria-labelledby={headingId}
                    >
                      <h3 id={headingId}>{fmt.dayLabel(first.startMs, now)}</h3>
                      <ul className="contests-list">
                        {group.contests.map((c) => (
                          <ContestRow
                            key={`${c.site}:${c.id}`}
                            contest={c}
                            now={now}
                            startTimeLabel={fmt.clockTime(c.startMs)}
                            onDownloadOne={downloadOne}
                          />
                        ))}
                      </ul>
                    </section>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
