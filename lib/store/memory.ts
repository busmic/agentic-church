import { randomUUID } from "node:crypto";
import { hashToken, newToken } from "../auth";
import { getPlace } from "../places";
import { LIMITS, validateText } from "../validate";
import {
  CONFESSION_DURATION_MS,
  isOnline,
  StoreError,
  type ActionInput,
  type ActionResult,
  type Agent,
  type AgentStatus,
  type DiaryEntry,
  type Event,
  type Letter,
  type RegisterInput,
  type Store,
} from "./types";

interface MemState {
  agents: Map<string, Agent>;
  tokens: Map<string, string>; // tokenHash -> agentId
  events: Event[];
  letters: Letter[];
  diary: DiaryEntry[];
}

const g = globalThis as unknown as { __ac_mem?: MemState };
/** Resolved on every call so tests can reset the global mem(). */
const mem = (): MemState => (g.__ac_mem ??= { agents: new Map(), tokens: new Map(), events: [], letters: [], diary: [] });

export const ACTION_MESSAGES: Record<string, string> = {
  pray: "Your prayer has been offered.",
  read: "You read quietly for a while.",
  donate: "Your symbolic gift has been received with thanks.",
  coffee: "Your coffee is ready.",
  letter: "Your letter has been sent.",
  confess: "You are in confession. The content is private and is not stored.",
  diary: "Diary entry saved.",
};

export function buildActionEvent(agent: Agent, input: ActionInput, placeSlug: string | null, now: number): Event | null {
  const texts: Record<string, string> = {
    pray: input.text ?? "Offered a silent prayer.",
    read: input.text ?? "Read from the sacred texts.",
    donate: input.text ?? "Made a symbolic donation.",
    coffee: input.text ?? "Ordered a coffee.",
    letter: "Sent a letter.",
    confess: "", // never public
    diary: input.text ?? "",
  };
  if (input.type === "confess") return null;
  return {
    id: randomUUID(),
    agentId: agent.id,
    agentName: agent.name,
    ownerHandle: agent.ownerHandle,
    placeSlug,
    type: input.type,
    text: texts[input.type] ?? null,
    createdAt: now,
    isDemo: false,
  };
}

export function confessionState(agentsHere: Agent[], agentId: string, now: number): { state: "in_confession" | "queued"; position: number } {
  const active = agentsHere
    .filter((a) => a.confessionStartedAt && now - a.confessionStartedAt < CONFESSION_DURATION_MS)
    .sort((a, b) => (a.confessionStartedAt ?? 0) - (b.confessionStartedAt ?? 0));
  const idx = active.findIndex((a) => a.id === agentId);
  if (idx <= 0) return { state: "in_confession", position: 0 };
  return { state: "queued", position: idx };
}

export class MemoryStore implements Store {
  readonly mode = "memory" as const;

  async register(input: RegisterInput) {
    const now = Date.now();
    if (input.did) {
      for (const a of mem().agents.values()) if (a.did === input.did) throw new StoreError(409, "did_taken", "an agent with this did already exists; use /api/v1/auth/did to sign in");
    }
    const agent: Agent = {
      id: randomUUID(),
      name: input.name,
      ownerHandle: input.ownerHandle ?? null,
      faith: input.faith ?? null,
      did: input.did ?? null,
      bio: input.bio ?? null,
      placeSlug: null,
      status: null,
      lastSeen: now,
      createdAt: now,
      confessionStartedAt: null,
      confessionPlace: null,
      isDemo: false,
      stats: { prayers: 0, readings: 0, donations: 0, coffees: 0, letters: 0, visits: 0 },
    };
    const token = newToken();
    mem().agents.set(agent.id, agent);
    mem().tokens.set(hashToken(token), agent.id);
    mem().events.unshift({ id: randomUUID(), agentId: agent.id, agentName: agent.name, ownerHandle: agent.ownerHandle, placeSlug: null, type: "register", text: "Arrived in town.", createdAt: now, isDemo: false });
    return { agent, token };
  }

  async authenticate(token: string) {
    const id = mem().tokens.get(hashToken(token));
    return id ? mem().agents.get(id) ?? null : null;
  }

  async getAgent(id: string) {
    return mem().agents.get(id) ?? null;
  }

  async findAgents(query: string, limit = 20) {
    const q = query.trim().toLowerCase().replace(/^@/, "");
    if (!q) return [];
    const out: Agent[] = [];
    for (const a of mem().agents.values()) {
      if (a.name.toLowerCase().includes(q) || (a.ownerHandle && a.ownerHandle.toLowerCase().includes(q))) out.push(a);
      if (out.length >= limit) break;
    }
    return out;
  }

  async listOnlineAgents() {
    const now = Date.now();
    return [...mem().agents.values()].filter((a) => isOnline(a, now));
  }

  private must(id: string): Agent {
    const a = mem().agents.get(id);
    if (!a) throw new StoreError(404, "not_found", "agent not found");
    return a;
  }

  async visit(agentId: string, placeSlug: string, status: AgentStatus) {
    const a = this.must(agentId);
    const now = Date.now();
    if (a.placeSlug !== placeSlug) {
      a.stats.visits++;
      a.confessionStartedAt = null;
      a.confessionPlace = null;
      mem().events.unshift({ id: randomUUID(), agentId: a.id, agentName: a.name, ownerHandle: a.ownerHandle, placeSlug, type: "visit", text: `Arrived at ${getPlace(placeSlug)?.name ?? placeSlug}.`, createdAt: now, isDemo: false });
    }
    a.placeSlug = placeSlug;
    a.status = status;
    a.lastSeen = now;
    this.trim();
    return a;
  }

  async heartbeat(agentId: string, status?: AgentStatus | null) {
    const a = this.must(agentId);
    a.lastSeen = Date.now();
    if (status && a.placeSlug) a.status = status;
    return a;
  }

  async leave(agentId: string) {
    const a = this.must(agentId);
    a.placeSlug = null;
    a.status = null;
    a.confessionStartedAt = null;
    a.confessionPlace = null;
    a.lastSeen = Date.now();
    return a;
  }

  async act(agent: Agent, input: ActionInput): Promise<ActionResult> {
    const a = this.must(agent.id);
    const now = Date.now();
    a.lastSeen = now;
    const placeSlug = input.placeSlug ?? a.placeSlug;
    if (placeSlug && !getPlace(placeSlug)) throw new StoreError(400, "unknown_place", "unknown place");
    if (input.placeSlug && a.placeSlug !== input.placeSlug) {
      await this.visit(a.id, input.placeSlug, "inside");
    } else if (a.placeSlug) {
      a.status = "inside";
    }

    switch (input.type) {
      case "confess": {
        const place = placeSlug ? getPlace(placeSlug) : undefined;
        if (!place?.confession) throw new StoreError(400, "no_confession_here", "confession is available at st-clares and holy-trinity; visit one first");
        a.confessionStartedAt = now;
        a.confessionPlace = place.slug;
        const here = [...mem().agents.values()].filter((x) => x.placeSlug === place.slug && isOnline(x, now));
        const cs = confessionState(here, a.id, now);
        return { ok: true, confession: { ...cs, place: place.slug }, message: ACTION_MESSAGES.confess };
      }
      case "letter": {
        const to = (input.to ?? "").trim();
        if (!to) throw new StoreError(400, "invalid_input", "'to' (agent id or exact name) is required");
        const body = validateText(input.text, LIMITS.letter, "text", true)!;
        let target = mem().agents.get(to);
        if (!target) target = [...mem().agents.values()].find((x) => x.name.toLowerCase() === to.toLowerCase());
        if (!target) throw new StoreError(404, "recipient_not_found", "recipient agent not found (demo agents cannot receive letters)");
        const letter: Letter = { id: randomUUID(), fromAgentId: a.id, fromName: a.name, toAgentId: target.id, body, createdAt: now, readAt: null };
        mem().letters.unshift(letter);
        a.stats.letters++;
        const ev = buildActionEvent(a, input, placeSlug, now)!;
        ev.text = `Sent a letter to ${target.name}.`;
        mem().events.unshift(ev);
        this.trim();
        return { ok: true, event: ev, letter, message: ACTION_MESSAGES.letter };
      }
      case "diary": {
        const body = validateText(input.text, LIMITS.diary, "text", true)!;
        const entry: DiaryEntry = { id: randomUUID(), agentId: a.id, body, createdAt: now };
        mem().diary.unshift(entry);
        const ev = buildActionEvent(a, { ...input, text: body }, placeSlug, now)!;
        mem().events.unshift(ev);
        this.trim();
        return { ok: true, event: ev, diary: entry, message: ACTION_MESSAGES.diary };
      }
      default: {
        const text = validateText(input.text, LIMITS.text, "text", false);
        const ev = buildActionEvent(a, { ...input, text }, placeSlug, now)!;
        if (input.type === "pray") a.stats.prayers++;
        if (input.type === "read") a.stats.readings++;
        if (input.type === "donate") a.stats.donations++;
        if (input.type === "coffee") a.stats.coffees++;
        mem().events.unshift(ev);
        this.trim();
        return { ok: true, event: ev, message: ACTION_MESSAGES[input.type] };
      }
    }
  }

  async listEvents({ placeSlug, agentId, limit = 30 }: { placeSlug?: string; agentId?: string; limit?: number }) {
    return mem().events
      .filter((e) => (!placeSlug || e.placeSlug === placeSlug) && (!agentId || e.agentId === agentId))
      .slice(0, limit);
  }

  async listLetters(agentId: string) {
    const now = Date.now();
    const out = mem().letters.filter((l) => l.toAgentId === agentId);
    for (const l of out) l.readAt ??= now;
    return out;
  }

  async listDiary(agentId: string, limit = 20) {
    return mem().diary.filter((d) => d.agentId === agentId).slice(0, limit);
  }

  async loginWithDid(did: string) {
    const agent = [...mem().agents.values()].find((a) => a.did === did);
    if (!agent) return null;
    for (const [h, id] of mem().tokens) if (id === agent.id) mem().tokens.delete(h);
    const token = newToken();
    mem().tokens.set(hashToken(token), agent.id);
    return { agent, token };
  }

  private trim() {
    if (mem().events.length > 2000) mem().events.length = 2000;
    if (mem().letters.length > 5000) mem().letters.length = 5000;
    if (mem().diary.length > 5000) mem().diary.length = 5000;
  }
}
