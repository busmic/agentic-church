/**
 * Townsfolk with daily routines. Positions are a pure function of local time, so the town looks
 * the same for every viewer in the same zone. They are drawn as people (not robots).
 */
import { getPlace } from "./places";
import type { Clock } from "./schedule";

export interface NpcStop { t: string; place: string; doing: string; hidden?: boolean }
export interface Npc { id: string; name: string; role: string; robe: string; accent: string; hat?: string; stops: NpcStop[] }

export const NPCS: Npc[] = [
  { id: "crema", name: "Crema", role: "barista", robe: "#8a5a33", accent: "#f8f4ea", hat: "#2e2a26", stops: [
    { t: "06:30", place: "common-grounds", doing: "opening up" }, { t: "10:30", place: "market-square", doing: "buying beans" }, { t: "11:10", place: "common-grounds", doing: "serving" },
    { t: "15:00", place: "bakery", doing: "fetching buns" }, { t: "15:30", place: "common-grounds", doing: "serving" }, { t: "22:00", place: "ivy-cottage", doing: "home", hidden: true } ] },
  { id: "rye", name: "Rye", role: "baker", robe: "#f8f4ea", accent: "#a9743f", hat: "#f8f4ea", stops: [
    { t: "04:30", place: "bakery", doing: "baking" }, { t: "08:00", place: "market-square", doing: "bread stall" }, { t: "12:00", place: "bakery", doing: "shop open" },
    { t: "14:00", place: "charity-house", doing: "day-old bread" }, { t: "14:40", place: "bakery", doing: "shop open" }, { t: "18:00", place: "rose-cottage", doing: "home", hidden: true } ] },
  { id: "stamp", name: "Stamp", role: "postman", robe: "#3f7fd0", accent: "#f5d35a", hat: "#294a86", stops: [
    { t: "07:30", place: "post-office", doing: "sorting" }, { t: "09:00", place: "rose-cottage", doing: "delivering" }, { t: "09:40", place: "st-clares", doing: "delivering" },
    { t: "10:20", place: "grace-chapel", doing: "delivering" }, { t: "11:00", place: "community-hall", doing: "delivering" }, { t: "11:40", place: "ivy-cottage", doing: "delivering" },
    { t: "12:20", place: "post-office", doing: "counter" }, { t: "15:00", place: "charity-house", doing: "parcels" }, { t: "15:40", place: "post-office", doing: "counter" },
    { t: "18:00", place: "ivy-cottage", doing: "home", hidden: true } ] },
  { id: "petal", name: "Petal", role: "florist", robe: "#4f9d3f", accent: "#ea7fab", hat: "#ea7fab", stops: [
    { t: "07:00", place: "peace-garden", doing: "picking" }, { t: "08:00", place: "florist", doing: "shop open" }, { t: "13:00", place: "shree-ganesh", doing: "delivering garlands" },
    { t: "13:40", place: "st-clares", doing: "delivering lilies" }, { t: "14:20", place: "florist", doing: "shop open" }, { t: "18:00", place: "rose-cottage", doing: "home", hidden: true } ] },
  { id: "folio", name: "Folio", role: "librarian", robe: "#2f8f8a", accent: "#f8f4ea", hat: "#8f8f8f", stops: [
    { t: "08:30", place: "library", doing: "opening" }, { t: "12:30", place: "common-grounds", doing: "lunch" }, { t: "13:15", place: "library", doing: "reading room" },
    { t: "20:00", place: "peace-garden", doing: "evening walk" }, { t: "21:00", place: "ivy-cottage", doing: "home", hidden: true } ] },
];

export interface NpcState { id: string; name: string; role: string; place: string; doing: string; hidden: boolean; x: number; y: number; robe: string; accent: string; hat?: string; next: { t: string; place: string } | null }

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

export function npcStates(c: Clock): NpcState[] {
  const local = new Date(c.now + c.offsetMinutes * 60000);
  const m = local.getUTCHours() * 60 + local.getUTCMinutes();
  return NPCS.map((n) => {
    let cur = n.stops[n.stops.length - 1];
    let next: NpcStop | null = n.stops[0];
    for (let i = 0; i < n.stops.length; i++) {
      if (mins(n.stops[i].t) <= m) { cur = n.stops[i]; next = n.stops[i + 1] ?? null; }
    }
    const p = getPlace(cur.place);
    const door = p?.door ?? { x: 0, y: 0 };
    const side = n.id.charCodeAt(0) % 2 ? 1 : -1;
    return { id: n.id, name: n.name, role: n.role, place: cur.place, doing: cur.doing, hidden: Boolean(cur.hidden), x: door.x + side * 34, y: door.y + 6, robe: n.robe, accent: n.accent, hat: n.hat, next: next ? { t: next.t, place: next.place } : null };
  });
}
