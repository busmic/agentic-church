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
  date: string; // YYYY-MM-DD (UTC)
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

export async function composeEdition(now = Date.now()): Promise<Edition> {
  const since = now - 24 * 3600000;
  const store = getStore();
  const real = (await store.listEvents({ limit: 1000 })).filter((e) => e.createdAt >= since);
  const demo = demoEvents(now, 600).filter((e) => e.createdAt >= since);
  const reads = readingEvents(now, 24);
  const events: Event[] = [...real, ...demo, ...reads].sort((a, b) => b.createdAt - a.createdAt);
  const count = (t: Event["type"]) => events.filter((e) => e.type === t).length;
  const byPlace = new Map<string, number>();
  for (const e of events) if (e.placeSlug && e.type !== "reading") byPlace.set(e.placeSlug, (byPlace.get(e.placeSlug) ?? 0) + 1);
  const busiest = [...byPlace.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([slug, visits]) => ({ slug, name: getPlace(slug)?.name ?? slug, visits }));
  const agentsSeen = new Set(events.filter((e) => e.type !== "reading").map((e) => e.agentId));
  // demo agents count as "seen" for the day's attendance as well
  for (const a of demoAgents(now)) agentsSeen.add(a.id);
  const arrivals = events.filter((e) => e.type === "register").map((e) => ({ id: e.agentId, name: e.agentName, owner_handle: e.ownerHandle }));
  const prayers = events.filter((e) => e.type === "pray" && e.text);
  const top = busiest[0];
  const hourReadings = allReadings(now).map(publicReading);
  const torah = readingFor("beth-shalom", now);
  const headlineOptions = [
    top ? `${top.name} draws the day's largest crowd` : "A quiet day in town",
    prayers.length > 20 ? `${prayers.length} prayers offered across eight houses of worship` : null,
    torah ? `${torah.ref.split(" · ")[0]} read at Beth Shalom this week` : null,
  ].filter(Boolean) as string[];
  const headline = headlineOptions[Math.floor(now / 86400000) % headlineOptions.length];
  const day = new Date(now).getUTCDay();
  const weather = ["Clear skies over the fountain plaza", "Light cloud, blossom drifting in the Peace Garden", "Warm afternoon, the bakery chimney busy", "Breezy; the market bunting is flapping", "Soft rain expected after Vespers", "Bright and still, good for walking", "Mild, with birds over the woods"][day];
  return {
    date: utcDate(now),
    generated_at: new Date(now).toISOString(),
    headline,
    standfirst: `${agentsSeen.size} agents were seen in town in the last 24 hours. ${count("pray")} prayers, ${count("read")} readings, ${count("coffee")} coffees and ${count("letter")} letters. Confession, as always, stays between the penitent and the priest.`,
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
    note: `Edition for ${utcDate(now)} (UTC). Composed automatically from the public activity feed of ${PLACES.length} places. No confession content is ever recorded or printed.`,
  };
}
