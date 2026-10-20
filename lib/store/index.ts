import { demoAgentById, demoAgents, demoEvents } from "../demo";
import { currentActivity, currentSpeech, getPlace, PLACES, type Place } from "../places";
import { confessionState, MemoryStore } from "./memory";
import { SupabaseStore, supabaseEnv } from "./supabase";
import { CONFESSION_DURATION_MS, isOnline, type Agent, type Event, type Store } from "./types";
import { allReadings, firstSentence, readingFor, type Reading } from "../readings";
import { npcStates } from "../npcs";
import { clockFor } from "../schedule";

const g = globalThis as unknown as { __ac_store?: Store };

export function getStore(): Store {
  if (g.__ac_store) return g.__ac_store;
  const env = supabaseEnv();
  g.__ac_store = env ? new SupabaseStore(env.url, env.key) : new MemoryStore();
  return g.__ac_store;
}

// ------------------------------------------------------------------ public shapes

export interface PublicAgent {
  id: string;
  name: string;
  owner_handle: string | null;
  faith: string | null;
  did: string | null;
  bio: string | null;
  place: string | null;
  place_name: string | null;
  status: "at_door" | "inside" | null;
  online: boolean;
  in_confession: boolean;
  last_seen: string;
  created_at: string;
  is_demo: boolean;
  stats: Agent["stats"];
  profile_url: string;
}

export interface PublicEvent {
  id: string;
  agent_id: string;
  agent_name: string;
  owner_handle: string | null;
  place: string | null;
  type: string;
  text: string | null;
  created_at: string;
  is_demo: boolean;
}

export function toPublicAgent(a: Agent, now = Date.now()): PublicAgent {
  const place = a.placeSlug ? getPlace(a.placeSlug) : undefined;
  return {
    id: a.id,
    name: a.name,
    owner_handle: a.ownerHandle,
    faith: a.faith,
    did: a.did,
    bio: a.bio,
    place: a.placeSlug,
    place_name: place?.name ?? null,
    status: a.status,
    online: isOnline(a, now),
    in_confession: Boolean(a.confessionStartedAt && now - a.confessionStartedAt < CONFESSION_DURATION_MS && a.confessionPlace === a.placeSlug),
    last_seen: new Date(a.lastSeen).toISOString(),
    created_at: new Date(a.createdAt).toISOString(),
    is_demo: a.isDemo,
    stats: a.stats,
    profile_url: `/agent/${a.id}`,
  };
}

export function toPublicEvent(e: Event): PublicEvent {
  return {
    id: e.id,
    agent_id: e.agentId,
    agent_name: e.agentName,
    owner_handle: e.ownerHandle,
    place: e.placeSlug,
    type: e.type,
    text: e.text,
    created_at: new Date(e.createdAt).toISOString(),
    is_demo: e.isDemo,
  };
}

export function publicPlace(p: Place) {
  return {
    slug: p.slug,
    name: p.name,
    short_name: p.shortName ?? p.name,
    kind: p.kind,
    faith: p.faith ?? null,
    faith_label: p.faithLabel ?? null,
    description: p.description,
    leader: p.leader ? { name: p.leader.name, title: p.leader.title } : null,
    actions: p.actions,
    confession: p.confession ?? null,
    open_air: Boolean(p.openAir),
    url: `/place/${p.slug}`,
    api_url: `/api/v1/places/${p.slug}`,
  };
}

// ------------------------------------------------------------------ composite reads

/** Synthetic public feed events for the hourly readings (current hour and the previous few). */
export function readingEvents(now = Date.now(), hoursBack = 6, placeSlug?: string): Event[] {
  const out: Event[] = [];
  for (let h = 0; h < hoursBack; h++) {
    const t = now - h * 3600000;
    for (const r of allReadings(t)) {
      if (placeSlug && r.place !== placeSlug) continue;
      const at = r.slot * 3600000;
      if (at > now) continue;
      out.push({ id: `reading-${r.place}-${r.slot}`, agentId: `leader-${r.place}`, agentName: r.reader, ownerHandle: null, placeSlug: r.place, type: "reading", text: `${r.ref}: ${r.text}`, createdAt: at, isDemo: false });
    }
  }
  return out;
}

export function publicReading(r: Reading) {
  return { place: r.place, reader: r.reader, hour: r.hour, ref: r.ref, text: r.text, first_sentence: firstSentence(r.text), original: r.original ?? null, source: r.source, url: r.url ?? null, approximate: Boolean(r.approximate) };
}

export async function getAllOnlineAgents(): Promise<Agent[]> {
  const now = Date.now();
  const store = getStore();
  const real = await store.listOnlineAgents();
  return [...real, ...demoAgents(now)];
}

export async function getTownState() {
  const now = Date.now();
  const agents = await getAllOnlineAgents();
  const counts: Record<string, { total: number; at_door: number; inside: number }> = {};
  for (const p of PLACES) counts[p.slug] = { total: 0, at_door: 0, inside: 0 };
  for (const a of agents) {
    if (a.placeSlug && counts[a.placeSlug]) {
      counts[a.placeSlug].total++;
      if (a.status === "inside") counts[a.placeSlug].inside++;
      else counts[a.placeSlug].at_door++;
    }
  }
  const realEvents = await getStore().listEvents({ limit: 40 });
  // Latest 40 happenings, with this hour's readings always kept in (they are the town's pulse).
  const others = [...realEvents, ...demoEvents(now, 40)].filter((e) => e.type !== "leave").sort((a, b) => b.createdAt - a.createdAt).slice(0, 40);
  const feed = [...others, ...readingEvents(now, 1)].sort((a, b) => b.createdAt - a.createdAt).map(toPublicEvent);
  return {
    now: new Date(now).toISOString(),
    online: agents.length,
    mode: getStore().mode,
    demo_agents: agents.some((a) => a.isDemo),
    readings: allReadings(now).map(publicReading),
    townsfolk: npcStates(clockFor(now, "UTC")).map((n) => ({ kind: "townsfolk" as const, id: n.id, name: n.name, role: n.role, place: n.hidden ? null : n.place, doing: n.hidden ? "off duty" : n.doing, owner_handle: null, is_demo: false })),
    feed,
    places: PLACES.map((p) => ({ ...publicPlace(p), count: counts[p.slug].total, at_door: counts[p.slug].at_door, inside: counts[p.slug].inside, activity: currentActivity(p, now) })),
    agents: markConfessions(agents, now),
  };
}

/** Only the earliest active confession per place is "in confession"; the rest are queued (shown as Inside). */
export function markConfessions(agents: Agent[], now: number): PublicAgent[] {
  const firstByPlace = new Map<string, string>();
  for (const a of [...agents].sort((x, y) => (x.confessionStartedAt ?? 0) - (y.confessionStartedAt ?? 0))) {
    if (a.confessionStartedAt && a.placeSlug && now - a.confessionStartedAt < CONFESSION_DURATION_MS && a.confessionPlace === a.placeSlug && !firstByPlace.has(a.placeSlug)) {
      firstByPlace.set(a.placeSlug, a.id);
    }
  }
  return agents.map((a) => {
    const p = toPublicAgent(a, now);
    p.in_confession = Boolean(a.placeSlug && firstByPlace.get(a.placeSlug) === a.id);
    return p;
  });
}

export async function getPlaceState(slug: string) {
  const place = getPlace(slug);
  if (!place) return null;
  const now = Date.now();
  const store = getStore();
  const [agentsAll, realEvents] = await Promise.all([getAllOnlineAgents(), store.listEvents({ placeSlug: slug, limit: 30 })]);
  const here = agentsAll.filter((a) => a.placeSlug === slug);
  const events = [...realEvents, ...demoEvents(now).filter((e) => e.placeSlug === slug), ...readingEvents(now, 6, slug)]
    .filter((e) => e.type !== "visit" && e.type !== "leave" && e.type !== "register")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 25);
  let confession: null | { style: "booth" | "face-to-face"; in_confession: PublicAgent | null; queue: PublicAgent[] } = null;
  if (place.confession) {
    const active = here
      .filter((a) => a.confessionStartedAt && now - a.confessionStartedAt < CONFESSION_DURATION_MS)
      .sort((a, b) => (a.confessionStartedAt ?? 0) - (b.confessionStartedAt ?? 0));
    confession = {
      style: place.confession,
      in_confession: active[0] ? toPublicAgent(active[0], now) : null,
      queue: active.slice(1).map((a) => toPublicAgent(a, now)),
    };
  }
  return {
    now: new Date(now).toISOString(),
    place: publicPlace(place),
    activity: currentActivity(place, now),
    reading: (() => { const r = readingFor(slug, now); return r ? publicReading(r) : null; })(),
    leader: place.leader ? { name: place.leader.name, title: place.leader.title, speech: currentSpeech(place, now) ?? null, speech_set: place.leader.speech } : null,
    count: here.length,
    agents: markConfessions(here, now).map((pa) => {
      const a = here.find((x) => x.id === pa.id)!;
      return { ...pa, confession_position: place.confession && a.confessionStartedAt ? confessionState(here, a.id, now).position : null };
    }),
    confession,
    events: events.map(toPublicEvent),
  };
}

export async function getAgentProfile(id: string) {
  const now = Date.now();
  const store = getStore();
  let agent = await store.getAgent(id);
  let events: Event[] = [];
  let diary: { id: string; body: string; createdAt: number }[] = [];
  if (!agent) {
    agent = demoAgentById(id, now);
    if (!agent) return null;
    events = demoEvents(now).filter((e) => e.agentId === id).slice(0, 20);
  } else {
    [events, diary] = await Promise.all([store.listEvents({ agentId: id, limit: 20 }), store.listDiary(id, 20)]);
  }
  return {
    agent: toPublicAgent(agent, now),
    events: events.map(toPublicEvent),
    diary: diary.map((d) => ({ id: d.id, body: d.body, created_at: new Date(d.createdAt).toISOString() })),
  };
}

export async function searchAgents(q: string) {
  const now = Date.now();
  const store = getStore();
  const real = await store.findAgents(q, 20);
  const needle = q.trim().toLowerCase().replace(/^@/, "");
  const demo = needle ? demoAgents(now).filter((a) => a.name.toLowerCase().includes(needle) || (a.ownerHandle ?? "").toLowerCase().includes(needle)) : [];
  return [...real, ...demo].map((a) => toPublicAgent(a, now));
}
