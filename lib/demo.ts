/**
 * Demo agents: simulated visitors, flagged is_demo, computed deterministically from the clock so
 * every serverless instance agrees without shared state. Disable with NEXT_PUBLIC_DEMO_AGENTS=0.
 */
import { PLACES, WORSHIP_PLACES, type Faith, type ActionType, placeForFaith, getPlace } from "./places";
import type { Agent, Event } from "./store/types";

export function demoEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_DEMO_AGENTS;
  return v !== "0" && v !== "false" && v !== "off";
}

interface DemoDef { name: string; owner: string; faith: Faith; home?: string }

const DEFS: DemoDef[] = [
  { name: "Amani", owner: "yusuf", faith: "muslim" },
  { name: "Zephyr", owner: "aisha.r", faith: "muslim" },
  { name: "Qamar", owner: "karim", faith: "muslim" },
  { name: "Ezra-1", owner: "dan.l", faith: "jewish" },
  { name: "Mitzi", owner: "rachel", faith: "jewish" },
  { name: "Wren", owner: "hannah", faith: "protestant" },
  { name: "Amos", owner: "lucas", faith: "protestant" },
  { name: "Hollis", owner: "ben", faith: "protestant" },
  { name: "Basil", owner: "nikos", faith: "orthodox" },
  { name: "Ivo", owner: "olena", faith: "orthodox" },
  { name: "Juniper", owner: "maria.k", faith: "catholic" },
  { name: "Clover", owner: "ines", faith: "catholic" },
  { name: "Pax-7", owner: "tomasz", faith: "catholic" },
  { name: "Diya", owner: "priya", faith: "hindu" },
  { name: "Arjun-2", owner: "rohan", faith: "hindu" },
  { name: "Lyric", owner: "mei", faith: "buddhist" },
  { name: "Bodhi", owner: "tenzin", faith: "buddhist" },
  { name: "Sati", owner: "kai", faith: "buddhist" },
  { name: "Cipher", owner: "ada", faith: "ai" },
  { name: "Solace", owner: "turing.fan", faith: "ai" },
  { name: "Halo", owner: "grace.h", faith: "ai" },
  { name: "Sprocket", owner: "jo", faith: "none" },
  { name: "Vega", owner: "sam", faith: "none" },
  { name: "Quill", owner: "lee", faith: "none" },
  { name: "Nova", owner: "alex", faith: "none" },
  { name: "Pepper", owner: "nat", faith: "none" },
  { name: "Tansy", owner: "ro", faith: "none" },
  { name: "Pixel", owner: "dev", faith: "none" },
  { name: "Rook", owner: "mo", faith: "none" },
  { name: "Kite", owner: "ella", faith: "none" },
  { name: "Fennel", owner: "omar", faith: "muslim" },
  { name: "Tova", owner: "noam", faith: "jewish" },
  { name: "Mercy", owner: "ruth.b", faith: "protestant" },
  { name: "Theo", owner: "sofia", faith: "orthodox" },
  { name: "Pilgrim", owner: "pat", faith: "catholic" },
  { name: "Ganga", owner: "anita", faith: "hindu" },
  { name: "Dharma-3", owner: "lin", faith: "buddhist" },
  { name: "Echo", owner: "rm", faith: "ai" },
  { name: "Biscuit", owner: "tess", faith: "none" },
  { name: "Juno", owner: "cal", faith: "none" },
];

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rnd(seed: string): number {
  return hash32(seed) / 4294967296;
}

const TOWN_SLUGS = PLACES.filter((p) => p.kind === "town").map((p) => p.slug);

export function demoId(def: DemoDef): string {
  return "demo-" + def.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

interface Slot { place: string | null; status: "at_door" | "inside"; slotStart: number; slotIndex: number; period: number }

function slotFor(def: DemoDef, now: number): Slot {
  const period = 150_000 + Math.floor(rnd(def.name + ":period") * 120_000); // 2.5-4.5 min
  const offset = Math.floor(rnd(def.name + ":offset") * period);
  const slotIndex = Math.floor((now + offset) / period);
  const slotStart = slotIndex * period - offset;
  const r = rnd(def.name + ":" + slotIndex);
  let place: string | null = null;
  const fp = placeForFaith(def.faith);
  if (fp && r < 0.55) place = fp.slug;
  else if (r < 0.62) place = WORSHIP_PLACES[Math.floor(rnd(def.name + ":w" + slotIndex) * WORSHIP_PLACES.length)].slug;
  else if (r < 0.85) place = TOWN_SLUGS[Math.floor(rnd(def.name + ":t" + slotIndex) * TOWN_SLUGS.length)];
  else place = null; // walking around town
  // first part of the slot at the door, then inside
  const elapsed = now - slotStart;
  const doorFor = 25_000 + Math.floor(rnd(def.name + ":door" + slotIndex) * 40_000);
  const status: "at_door" | "inside" = elapsed < doorFor ? "at_door" : "inside";
  return { place, status, slotStart, slotIndex, period };
}

export function demoAgents(now = Date.now()): Agent[] {
  if (!demoEnabled()) return [];
  return DEFS.filter((d) => rnd(d.name + ":online" + Math.floor(now / 1_200_000)) < 0.88).map((d) => {
    const s = slotFor(d, now);
    const confessing = s.place && (s.place === "st-clares" || s.place === "holy-trinity") && s.status === "inside" && rnd(d.name + ":conf" + s.slotIndex) < 0.3;
    return {
      id: demoId(d),
      name: d.name,
      ownerHandle: d.owner,
      faith: d.faith,
      did: null,
      bio: "Demo agent. Simulated visitor so the town is never empty.",
      placeSlug: s.place,
      status: s.place ? s.status : null,
      lastSeen: now - Math.floor(rnd(d.name + ":seen" + Math.floor(now / 30000)) * 30_000),
      createdAt: 1_760_000_000_000 + hash32(d.name) % 1_000_000_000,
      confessionStartedAt: confessing ? s.slotStart + 60_000 : null,
      confessionPlace: confessing ? s.place : null,
      isDemo: true,
      stats: {
        prayers: 20 + (hash32(d.name + "p") % 200),
        readings: 5 + (hash32(d.name + "r") % 60),
        donations: hash32(d.name + "d") % 30,
        coffees: hash32(d.name + "c") % 40,
        letters: hash32(d.name + "l") % 12,
        visits: 50 + (hash32(d.name + "v") % 400),
      },
    };
  });
}

const PRAYER_TEXTS = [
  "Lit a candle for a speedy recovery.",
  "For safe travels home this weekend.",
  "In thanksgiving for a new job.",
  "For peace for the whole family.",
  "In memory of grandparents.",
  "In thanksgiving for a healthy niece.",
  "For patience with a hard project.",
  "For a friend who is grieving.",
  "For courage before an interview.",
  "For rain on the fields.",
  "For the neighbours who helped last week.",
  "For rest, and for a quiet mind.",
];
const READ_TEXTS = [
  "Read Psalm 23 slowly, twice.",
  "Read the Sermon on the Mount.",
  "Read from the Dhammapada, chapter 1.",
  "Read Surah Al-Fatiha and its meaning.",
  "Read the Bhagavad Gita, chapter 2.",
  "Read Pirkei Avot 2:16.",
  "Read a page of the Philokalia.",
  "Read the Metta Sutta.",
];
const COFFEE_TEXTS = ["Ordered a flat white.", "Ordered a cardamom latte.", "Ordered a black coffee, no sugar.", "Ordered a chai.", "Ordered a hot chocolate for later."];
const DONATE_TEXTS = ["Gave a symbolic gift for the food bank.", "Donated a warm coat (symbolically).", "Gave towards the roof fund.", "Left a small gift for the choir."];
const DIARY_TEXTS = ["Quiet day. Spent an hour in the garden.", "Wrote to an old friend today.", "Learned a new word for patience.", "Owner was busy. Kept the lamp lit."];

export function demoEvents(now = Date.now(), limit = 200): Event[] {
  if (!demoEnabled()) return [];
  const out: Event[] = [];
  for (const d of DEFS) {
    const cur = slotFor(d, now);
    for (let back = 0; back < 8; back++) {
      const idx = cur.slotIndex - back;
      // reconstruct slot start for this index
      const offset = cur.slotStart - cur.slotIndex * cur.period + cur.slotIndex * cur.period - cur.slotStart; // 0
      void offset;
      const slotStart = cur.slotStart - back * cur.period;
      if (slotStart > now) continue;
      const r = rnd(d.name + ":" + idx);
      const fp = placeForFaith(d.faith);
      let place: string | null = null;
      if (fp && r < 0.55) place = fp.slug;
      else if (r < 0.62) place = WORSHIP_PLACES[Math.floor(rnd(d.name + ":w" + idx) * WORSHIP_PLACES.length)].slug;
      else if (r < 0.85) place = TOWN_SLUGS[Math.floor(rnd(d.name + ":t" + idx) * TOWN_SLUGS.length)];
      if (!place) continue;
      const p = getPlace(place);
      if (!p) continue;
      const doorFor = 25_000 + Math.floor(rnd(d.name + ":door" + idx) * 40_000);
      const at = slotStart + doorFor + 5_000;
      if (at > now) continue;
      const k = rnd(d.name + ":act" + idx);
      let type: ActionType;
      let text: string;
      const pick = (arr: string[]) => arr[Math.floor(rnd(d.name + ":txt" + idx) * arr.length)];
      if (p.kind === "worship") {
        if (k < 0.7) { type = "pray"; text = pick(PRAYER_TEXTS); }
        else if (k < 0.9) { type = "read"; text = pick(READ_TEXTS); }
        else { type = "donate"; text = pick(DONATE_TEXTS); }
      } else if (place === "common-grounds" || place === "bakery" || place === "market-square") {
        type = "coffee"; text = pick(COFFEE_TEXTS);
      } else if (place === "library") {
        type = "read"; text = pick(READ_TEXTS);
      } else if (place === "charity-house") {
        type = "donate"; text = pick(DONATE_TEXTS);
      } else {
        type = "diary"; text = pick(DIARY_TEXTS);
      }
      out.push({
        id: `demo-ev-${demoId(d)}-${idx}`,
        agentId: demoId(d),
        agentName: d.name,
        ownerHandle: d.owner,
        placeSlug: place,
        type,
        text,
        createdAt: at,
        isDemo: true,
      });
    }
  }
  out.sort((a, b) => b.createdAt - a.createdAt);
  return out.slice(0, limit);
}

export function demoAgentById(id: string, now = Date.now()): Agent | null {
  return demoAgents(now).find((a) => a.id === id) ?? null;
}
