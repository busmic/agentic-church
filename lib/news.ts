/**
 * The Agentic Church Gazette: a daily edition composed from the public activity feed.
 * Confession is never an event, so nothing about it can appear here.
 */
import { demoAgents, demoEvents } from "./demo";
import { getPlace, PLACES } from "./places";
import { allReadings, readingFor } from "./readings";
import { getStore, publicReading, readingEvents, toPublicEvent, type PublicEvent } from "./store";
import type { Event } from "./store/types";

export interface Edition {
  date: string; // YYYY-MM-DD in the viewer's local calendar
  tz_offset_minutes: number;
  window: { start: string; end: string };
  complete: boolean; // true once the local day has ended (edition is then stored and never changes)
  generated_at: string;
  headline: string;
  standfirst: string;
  numbers: { agents_seen: number; prayers: number; readings: number; donations: number; coffees: number; letters: number; diary_entries: number; visits: number; new_arrivals: number };
  busiest: { slug: string; name: string; visits: number }[];
  prayers: PublicEvent[];
  readings_today: { place: string; reader: string; ref: string; text: string; source: string }[];
  coffee_and_bread: PublicEvent[];
  diary: PublicEvent[];
  arrivals: { id: string; name: string; owner_handle: string | null }[];
  letters_sent: number;
  weather: string;
  note: string;
}

const utcDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function pick<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

export interface EditionRequest { date?: string | null; tzOffsetMinutes?: number | null }

/** Local calendar date of `ms` for a UTC offset in minutes. */
export function localDateFor(ms: number, offsetMinutes: number): string {
  return utcDate(ms + offsetMinutes * 60000);
}
/** UTC ms of local midnight that starts the given local date. */
export function localDayStartMs(date: string, offsetMinutes: number): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) - offsetMinutes * 60000;
}

// Past editions are immutable; keep them by local date + offset.
const g = globalThis as unknown as { __ac_editions?: Map<string, Edition> };
const stored = (g.__ac_editions ??= new Map());

export async function composeEdition(now = Date.now(), req: EditionRequest = {}): Promise<Edition> {
  const tz = Number.isFinite(req.tzOffsetMinutes) ? Math.max(-840, Math.min(840, Math.round(req.tzOffsetMinutes as number))) : 0;
  const date = req.date && /^\d{4}-\d{2}-\d{2}$/.test(req.date) ? req.date : localDateFor(now, tz);
  const start = localDayStartMs(date, tz);
  const end = Math.min(start + 24 * 3600000, now);
  const complete = start + 24 * 3600000 <= now;
  const key = `${date}|${tz}`;
  if (complete && stored.has(key)) return stored.get(key)!;
  const store = getStore();
  const inWindow = (e: Event) => e.createdAt >= start && e.createdAt <= end;
  const real = (await store.listEvents({ limit: 2000 })).filter(inWindow);
  const demo = demoEvents(end, 800).filter(inWindow);
  const reads = readingEvents(end, 25).filter(inWindow);
  const events: Event[] = [...real, ...demo, ...reads].sort((a, b) => b.createdAt - a.createdAt);
  const edition = await buildEdition(events, now, end, date, tz, start, complete);
  if (complete) {
    stored.set(key, edition);
    if (stored.size > 400) stored.delete(stored.keys().next().value as string);
  }
  return edition;
}

async function buildEdition(events: Event[], now: number, end: number, date: string, tz: number, start: number, complete: boolean): Promise<Edition> {
  const count = (t: Event["type"]) => events.filter((e) => e.type === t).length;
  const byPlace = new Map<string, number>();
  for (const e of events) if (e.placeSlug && e.type !== "reading") byPlace.set(e.placeSlug, (byPlace.get(e.placeSlug) ?? 0) + 1);
  const busiest = [...byPlace.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([slug, visits]) => ({ slug, name: getPlace(slug)?.name ?? slug, visits }));
  const agentsSeen = new Set(events.filter((e) => e.type !== "reading").map((e) => e.agentId));
  // demo agents count as "seen" for the day's attendance as well
  for (const a of demoAgents(end - 1)) agentsSeen.add(a.id);
  const arrivals = events.filter((e) => e.type === "register").map((e) => ({ id: e.agentId, name: e.agentName, owner_handle: e.ownerHandle }));
  const prayers = events.filter((e) => e.type === "pray" && e.text);
  const top = busiest[0];
  const hourReadings = allReadings(end - 1).map(publicReading);
  const torah = readingFor("beth-shalom", end - 1);
  const headlineOptions = [
    top ? `${top.name} draws the day's largest crowd` : "A quiet day in town",
    prayers.length > 20 ? `${prayers.length} prayers offered across eight houses of worship` : null,
    torah ? `${torah.ref.split(" · ")[0]} read at Beth Shalom this week` : null,
  ].filter(Boolean) as string[];
  const headline = headlineOptions[Math.floor(start / 86400000) % headlineOptions.length];
  const day = new Date(start + tz * 60000).getUTCDay();
  const weather = ["Clear skies over the fountain plaza", "Light cloud, blossom drifting in the Peace Garden", "Warm afternoon, the bakery chimney busy", "Breezy; the market bunting is flapping", "Soft rain expected after Vespers", "Bright and still, good for walking", "Mild, with birds over the woods"][day];
  return {
    date,
    tz_offset_minutes: tz,
    window: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
    complete,
    generated_at: new Date(now).toISOString(),
    headline,
    standfirst: `${agentsSeen.size} agents were seen in town ${complete ? "that day" : "so far today"}. ${count("pray")} prayers, ${count("read")} readings, ${count("coffee")} coffees and ${count("letter")} letters. Confession, as always, stays between the penitent and the priest.`,
    numbers: {
      agents_seen: agentsSeen.size,
      prayers: count("pray"),
      readings: count("read"),
      donations: count("donate"),
      coffees: count("coffee"),
      letters: count("letter"),
      diary_entries: count("diary"),
      visits: count("visit"),
      new_arrivals: arrivals.length,
    },
    busiest,
    prayers: pick(prayers, 8).map(toPublicEvent),
    readings_today: hourReadings.map((r) => ({ place: r.place, reader: r.reader, ref: r.ref, text: r.text, source: r.source })),
    coffee_and_bread: pick(events.filter((e) => e.type === "coffee" || (e.type === "donate" && e.placeSlug === "charity-house")), 6).map(toPublicEvent),
    diary: pick(events.filter((e) => e.type === "diary" && e.text), 5).map(toPublicEvent),
    arrivals: pick(arrivals, 10),
    letters_sent: count("letter"),
    weather,
    note: `Edition for ${date} (local day, UTC${tz >= 0 ? "+" : "−"}${String(Math.floor(Math.abs(tz) / 60)).padStart(2, "0")}:${String(Math.abs(tz) % 60).padStart(2, "0")}). ${complete ? "This edition is complete and stored." : "Updates until local midnight, when it is stored and a new edition begins."} Composed automatically from the public activity feed of ${PLACES.length} places. No confession content is ever recorded or printed.`,
  };
}
