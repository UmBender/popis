// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { DAY_MS, HOUR_MS, MINUTE_MS } from "../contests/agenda";
import type { ContestsSnapshot } from "../contests/model";
import { CONTESTS_KEY } from "../contests/prefs";
import { memoryStore, type KeyValueStore } from "../storage/history";
import { App } from "./App";
import { ContestsScreen } from "./ContestsScreen";

// 2026-11-26 12:00 UTC = 09:00 America/Sao_Paulo (UTC-3).
const NOW = Date.UTC(2026, 10, 26, 12, 0, 0);

const SNAPSHOT: ContestsSnapshot = {
  generatedAt: NOW - 15 * MINUTE_MS,
  contests: [
    {
      site: "codeforces",
      id: "2292",
      name: "Codeforces Round 1138 (Div. 3)",
      url: "https://codeforces.com/contests/2292",
      startMs: NOW - 40 * MINUTE_MS,
      durationMs: 2 * HOUR_MS,
    },
    {
      site: "atcoder",
      id: "abc486",
      name: "AtCoder Beginner Contest 486",
      url: "https://atcoder.jp/contests/abc486",
      // 2026-11-27 01:00 UTC -> 2026-11-26 22:00 in America/Sao_Paulo.
      startMs: Date.UTC(2026, 10, 27, 1, 0, 0),
      durationMs: 100 * MINUTE_MS,
    },
    {
      site: "leetcode",
      id: "weekly-contest-530",
      name: "Weekly Contest 530",
      url: "https://leetcode.com/contest/weekly-contest-530",
      // 2026-11-29 02:30 UTC -> 2026-11-28 23:30 in America/Sao_Paulo.
      startMs: Date.UTC(2026, 10, 29, 2, 30, 0),
      durationMs: 90 * MINUTE_MS,
    },
    {
      site: "codechef",
      id: "START267",
      name: "Starters 267",
      url: "https://www.codechef.com/START267",
      // Beyond 14 days: must stay hidden.
      startMs: NOW + 16 * DAY_MS,
      durationMs: 2 * HOUR_MS,
    },
  ],
  errors: [],
};

let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function jsonFetch(snapshot: ContestsSnapshot): typeof fetch {
  return vi.fn<typeof fetch>(() =>
    Promise.resolve(
      new Response(JSON.stringify(snapshot), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function renderScreen(options?: {
  snapshot?: ContestsSnapshot;
  fetchData?: typeof fetch;
  store?: KeyValueStore;
  save?: (name: string, text: string) => void;
}) {
  const store = options?.store ?? memoryStore();
  const fetchData = options?.fetchData ?? jsonFetch(options?.snapshot ?? SNAPSHOT);
  const save = options?.save ?? vi.fn();
  render(
    <ContestsScreen
      clock={clock}
      store={store}
      fetchData={fetchData}
      save={save}
      timeZone="America/Sao_Paulo"
    />,
  );
  await flush();
  return { store, fetchData, save };
}

describe("ContestsScreen", () => {
  it("ContestsScreen groups running and upcoming contests by local day with links and Google Calendar buttons", async () => {
    const { fetchData } = await renderScreen();

    expect(fetchData).toHaveBeenCalledWith(
      `${import.meta.env.BASE_URL}contests.json`,
      expect.anything(),
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Contests");
    expect(screen.getByText("atualizado há 15 min")).toBeTruthy();

    const running = screen.getByRole("region", { name: "Acontecendo agora" });
    expect(
      within(running)
        .getByRole("link", { name: "Codeforces Round 1138 (Div. 3)" })
        .getAttribute("href"),
    ).toBe("https://codeforces.com/contests/2292");
    expect(within(running).getByText("Codeforces")).toBeTruthy();
    expect(within(running).getByText("termina em 1 h 20 min")).toBeTruthy();
    expect(
      within(running)
        .getByRole("link", { name: /Google Agenda/ })
        .getAttribute("href"),
    ).toContain("https://calendar.google.com/calendar/render?action=TEMPLATE");

    // Local timezone grouping: 2026-11-27 01:00 UTC lands on 2026-11-26 in America/Sao_Paulo.
    const day26 = screen.getByTestId("contests-day-2026-11-26");
    expect(within(day26).getByRole("link", { name: "AtCoder Beginner Contest 486" })).toBeTruthy();
    expect(within(day26).getByText("22:00")).toBeTruthy();
    expect(within(day26).getByText("1 h 40 min")).toBeTruthy();

    const day28 = screen.getByTestId("contests-day-2026-11-28");
    expect(within(day28).getByRole("link", { name: "Weekly Contest 530" })).toBeTruthy();
    expect(within(day28).getByText("23:30")).toBeTruthy();

    // Contest beyond 14 days is excluded.
    expect(screen.queryByText("Starters 267")).toBeNull();
  });

  it("ContestsScreen advances countdowns and freshness every minute on the injected clock", async () => {
    await renderScreen();
    expect(screen.getByText("termina em 1 h 20 min")).toBeTruthy();
    expect(screen.getByText("atualizado há 15 min")).toBeTruthy();

    act(() => {
      clock.advance(5 * MINUTE_MS);
      vi.advanceTimersByTime(5 * MINUTE_MS);
    });

    expect(screen.getByText("termina em 1 h 15 min")).toBeTruthy();
    expect(screen.getByText("atualizado há 20 min")).toBeTruthy();
  });

  it("ContestsScreen filters contests by site, persists to popis.contests and exports filtered .ics", async () => {
    const store = memoryStore();
    const save = vi.fn();
    await renderScreen({ store, save });

    const atcoderBox = screen.getByRole<HTMLInputElement>("checkbox", { name: "AtCoder" });
    expect(atcoderBox.checked).toBe(true);
    fireEvent.click(atcoderBox);
    expect(atcoderBox.checked).toBe(false);
    expect(screen.queryByText("AtCoder Beginner Contest 486")).toBeNull();
    expect(JSON.parse(store.getItem(CONTESTS_KEY) ?? "{}")).toEqual({
      sites: ["codeforces", "codechef", "leetcode"],
    });

    fireEvent.click(screen.getByRole("button", { name: "Baixar .ics" }));
    expect(save).toHaveBeenCalledTimes(1);
    const [name, ics] = save.mock.calls[0] as [string, string];
    expect(name).toBe("contests.ics");
    expect(ics).toContain("UID:codeforces-2292@popis");
    expect(ics).toContain("UID:leetcode-weekly-contest-530@popis");
    expect(ics).not.toContain("UID:atcoder-abc486@popis");

    // Per-contest .ics export downloads only that contest.
    fireEvent.click(screen.getByRole("button", { name: "Baixar .ics de Weekly Contest 530" }));
    expect(save).toHaveBeenCalledTimes(2);
    const [singleName, singleIcs] = save.mock.calls[1] as [string, string];
    expect(singleName).toBe("leetcode-weekly-contest-530.ics");
    expect(singleIcs).toContain("UID:leetcode-weekly-contest-530@popis");
    expect(singleIcs).not.toContain("UID:codeforces-2292@popis");

    // Filter survives remount.
    cleanup();
    await renderScreen({ store });
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "AtCoder" }).checked).toBe(false);
    expect(screen.queryByText("AtCoder Beginner Contest 486")).toBeNull();
  });

  it("ContestsScreen downloads .ics through the browser by default", async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:ics");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(
      <ContestsScreen
        clock={clock}
        store={memoryStore()}
        fetchData={jsonFetch(SNAPSHOT)}
        timeZone="America/Sao_Paulo"
      />,
    );
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "Baixar .ics" }));
    Reflect.deleteProperty(URL, "createObjectURL");
    Reflect.deleteProperty(URL, "revokeObjectURL");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL.mock.calls[0]?.[0].type).toContain("text/calendar");
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe("contests.ics");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:ics");
  });

  it("ContestsScreen warns when data is older than 24 h and when a source failed", async () => {
    const staleWithError: ContestsSnapshot = {
      ...SNAPSHOT,
      generatedAt: NOW - 25 * HOUR_MS,
      errors: [{ site: "atcoder", message: "HTTP 503" }],
    };

    await renderScreen({ snapshot: staleWithError });

    expect(screen.getByText(/mais de 24 h/i)).toBeTruthy();
    expect(screen.getByText("AtCoder indisponível na última atualização")).toBeTruthy();
  });

  it("ContestsScreen explains how to generate contests.json when the file is missing or invalid", async () => {
    const missing404 = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response("Not Found", { status: 404 })),
    );
    await renderScreen({ fetchData: missing404 });
    expect(screen.getByText(/npm run contests:fetch/)).toBeTruthy();

    cleanup();
    const htmlFallback = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response("<!doctype html><html><body>dev</body></html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
      ),
    );
    await renderScreen({ fetchData: htmlFallback });
    expect(screen.getByText(/npm run contests:fetch/)).toBeTruthy();

    cleanup();
    const netFail = vi.fn<typeof fetch>(() => Promise.reject(new Error("offline")));
    await renderScreen({ fetchData: netFail });
    expect(screen.getByText(/npm run contests:fetch/)).toBeTruthy();
  });

  it("ContestsScreen handles re-enabling a site, empty states, tomorrow heading and opening from App", async () => {
    // Tomorrow heading + toggling a site off and back on + empty selection.
    const tomorrowSnapshot: ContestsSnapshot = {
      generatedAt: NOW,
      contests: [
        {
          site: "atcoder",
          id: "abc487",
          name: "AtCoder Tomorrow",
          url: "https://atcoder.jp/contests/abc487",
          startMs: NOW + DAY_MS,
          durationMs: HOUR_MS,
        },
      ],
      errors: [],
    };
    const { store } = await renderScreen({ snapshot: tomorrowSnapshot });
    expect(screen.getByText(/amanhã/i)).toBeTruthy();

    const atcoder = screen.getByRole<HTMLInputElement>("checkbox", { name: "AtCoder" });
    fireEvent.click(atcoder);
    expect(screen.getByText("Nenhum contest nos próximos 14 dias.")).toBeTruthy();
    fireEvent.click(atcoder);
    expect(screen.getByRole("link", { name: "AtCoder Tomorrow" })).toBeTruthy();

    // Unchecking every site shows the no-site-selected message.
    for (const label of ["Codeforces", "AtCoder", "CodeChef", "LeetCode"]) {
      fireEvent.click(screen.getByRole("checkbox", { name: label }));
    }
    expect(screen.getByText("Nenhum site selecionado.")).toBeTruthy();
    expect(store.getItem(CONTESTS_KEY)).toBe(JSON.stringify({ sites: [] }));

    // Opening Contests from App uses global fetch and browser default timezone.
    cleanup();
    vi.stubGlobal("fetch", jsonFetch(tomorrowSnapshot));
    render(<App clock={clock} store={memoryStore()} newSeed={() => 1} />);
    fireEvent.click(screen.getByRole("radio", { name: "Contests" }));
    await flush();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Contests");
    expect(screen.getByRole("link", { name: "AtCoder Tomorrow" })).toBeTruthy();
    vi.unstubAllGlobals();
  });
});
