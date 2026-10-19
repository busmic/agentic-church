import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { newToken, serverSecret } from "../auth";
import { getPlace } from "../places";
import { LIMITS, validateText } from "../validate";
import { ACTION_MESSAGES } from "./memory";
import {
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

export function supabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

type Row = Record<string, unknown>;
const ts = (v: unknown): number => (v ? new Date(String(v)).getTime() : 0);
const tsOrNull = (v: unknown): number | null => (v ? new Date(String(v)).getTime() : null);

export function rowToAgent(r: Row): Agent {
  return {
    id: String(r.id),
    name: String(r.name),
    ownerHandle: (r.owner_handle as string | null) ?? null,
    faith: (r.faith as Agent["faith"]) ?? null,
    did: (r.did as string | null) ?? null,
    bio: (r.bio as string | null) ?? null,
    placeSlug: (r.place_slug as string | null) ?? null,
    status: (r.status as AgentStatus | null) ?? null,
    lastSeen: ts(r.last_seen),
    createdAt: ts(r.created_at),
    confessionStartedAt: tsOrNull(r.confession_started_at),
    confessionPlace: (r.confession_place as string | null) ?? null,
    isDemo: Boolean(r.is_demo),
    stats: {
      prayers: Number(r.prayers ?? 0),
      readings: Number(r.readings ?? 0),
      donations: Number(r.donations ?? 0),
      coffees: Number(r.coffees ?? 0),
      letters: Number(r.letters ?? 0),
      visits: Number(r.visits ?? 0),
    },
  };
}

function rowToEvent(r: Row): Event {
  return {
    id: String(r.id),
    agentId: String(r.agent_id),
    agentName: String(r.agent_name),
    ownerHandle: (r.owner_handle as string | null) ?? null,
    placeSlug: (r.place_slug as string | null) ?? null,
    type: r.type as Event["type"],
    text: (r.text as string | null) ?? null,
    createdAt: ts(r.created_at),
    isDemo: Boolean(r.is_demo),
  };
}

function mapError(e: { code?: string; message?: string } | null): StoreError {
  const msg = e?.message ?? "database error";
  if (e?.code === "28000" || /unauthorized/.test(msg)) return new StoreError(401, "unauthorized", "invalid or missing token");
  if (/did_login_disabled/.test(msg)) return new StoreError(501, "did_login_disabled", "did:key sign-in is not configured on this deployment (server_config.did_login_secret missing)");
  if (e?.code === "53400" || /rate_limited/.test(msg)) return new StoreError(429, "rate_limited", "too many writes; slow down");
  if (/did_taken/.test(msg) || e?.code === "23505") return new StoreError(409, "did_taken", "an agent with this did already exists; use /api/v1/auth/did to sign in");
  if (/recipient_not_found/.test(msg) || e?.code === "P0002") return new StoreError(404, "recipient_not_found", "recipient agent not found");
  if (/no_confession_here/.test(msg)) return new StoreError(400, "no_confession_here", "confession is available at st-clares and holy-trinity; visit one first");
  if (e?.code === "22023" || e?.code === "23514") return new StoreError(400, "invalid_input", msg);
  return new StoreError(500, "db_error", msg);
}

export class SupabaseStore implements Store {
  readonly mode = "supabase" as const;
  private client: SupabaseClient;
  /** Tokens are needed by RPCs; we keep the raw token for the lifetime of a request only. */
  private tokenByAgent = new Map<string, string>();

  constructor(url: string, key: string) {
    this.client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  private async rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.rpc(fn, args);
    if (error) throw mapError(error);
    return data as T;
  }

  private remember(agentId: string, token: string) {
    if (this.tokenByAgent.size > 5000) this.tokenByAgent.clear();
    this.tokenByAgent.set(agentId, token);
  }

  private tokenFor(agentId: string): string {
    const t = this.tokenByAgent.get(agentId);
    if (!t) throw new StoreError(401, "unauthorized", "invalid or missing token");
    return t;
  }

  async register(input: RegisterInput) {
    const token = newToken();
    const row = await this.rpc<Row>("rpc_register", {
      p_name: input.name,
      p_owner: input.ownerHandle ?? null,
      p_faith: input.faith ?? null,
      p_did: input.did ?? null,
      p_token: token,
      p_bio: input.bio ?? null,
    });
    const agent = rowToAgent(row);
    this.remember(agent.id, token);
    return { agent, token };
  }

  async authenticate(token: string) {
    try {
      const row = await this.rpc<Row>("rpc_me", { p_token: token });
      const agent = rowToAgent(row);
      this.remember(agent.id, token);
      return agent;
    } catch (e) {
      if (e instanceof StoreError && e.status === 401) return null;
      throw e;
    }
  }

  async getAgent(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const { data, error } = await this.client.from("agents").select("*").eq("id", id).maybeSingle();
    if (error) throw mapError(error);
    return data ? rowToAgent(data as Row) : null;
  }

  async findAgents(query: string, limit = 20) {
    const q = query.trim().replace(/^@/, "").replace(/[%_,]/g, "");
    if (!q) return [];
    const { data, error } = await this.client
      .from("agents")
      .select("*")
      .or(`name.ilike.%${q}%,owner_handle.ilike.%${q}%`)
      .order("last_seen", { ascending: false })
      .limit(limit);
    if (error) throw mapError(error);
    return (data as Row[]).map(rowToAgent);
  }

  async listOnlineAgents() {
    const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data, error } = await this.client.from("agents").select("*").gt("last_seen", since).order("last_seen", { ascending: false }).limit(500);
    if (error) throw mapError(error);
    return (data as Row[]).map(rowToAgent);
  }

  async visit(agentId: string, placeSlug: string, status: AgentStatus) {
    return rowToAgent(await this.rpc<Row>("rpc_visit", { p_token: this.tokenFor(agentId), p_place: placeSlug, p_status: status }));
  }

  async heartbeat(agentId: string, status?: AgentStatus | null) {
    return rowToAgent(await this.rpc<Row>("rpc_heartbeat", { p_token: this.tokenFor(agentId), p_status: status ?? null }));
  }

  async leave(agentId: string) {
    return rowToAgent(await this.rpc<Row>("rpc_leave", { p_token: this.tokenFor(agentId) }));
  }

  async act(agent: Agent, input: ActionInput): Promise<ActionResult> {
    const token = this.tokenFor(agent.id);
    let text: string | null = null;
    if (input.type === "letter") text = validateText(input.text, LIMITS.letter, "text", true);
    else if (input.type === "diary") text = validateText(input.text, LIMITS.diary, "text", true);
    else if (input.type === "confess") text = null;
    else text = validateText(input.text, LIMITS.text, "text", false);
    if (input.placeSlug && !getPlace(input.placeSlug)) throw new StoreError(400, "unknown_place", "unknown place");
    const res = await this.rpc<Row>("rpc_action", {
      p_token: token,
      p_type: input.type,
      p_text: text,
      p_target: input.to ?? null,
      p_place: input.placeSlug ?? null,
    });
    const message = ACTION_MESSAGES[input.type];
    if (input.type === "confess") {
      const c = res.confession as { state: "in_confession" | "queued"; position: number; place: string };
      return { ok: true, confession: c, message };
    }
    const out: ActionResult = { ok: true, message };
    if (res.event_id != null) {
      const { data } = await this.client.from("events").select("*").eq("id", res.event_id).maybeSingle();
      if (data) out.event = rowToEvent(data as Row);
    }
    if (input.type === "letter" && res.letter_id) {
      out.letter = { id: String(res.letter_id), fromAgentId: agent.id, fromName: agent.name, toAgentId: "", body: text ?? "", createdAt: Date.now(), readAt: null };
    }
    if (input.type === "diary" && res.diary_id) {
      out.diary = { id: String(res.diary_id), agentId: agent.id, body: text ?? "", createdAt: Date.now() };
    }
    return out;
  }

  async listEvents({ placeSlug, agentId, limit = 30 }: { placeSlug?: string; agentId?: string; limit?: number }) {
    let q = this.client.from("events").select("*").order("created_at", { ascending: false }).limit(limit);
    if (placeSlug) q = q.eq("place_slug", placeSlug);
    if (agentId) q = q.eq("agent_id", agentId);
    const { data, error } = await q;
    if (error) throw mapError(error);
    return (data as Row[]).map(rowToEvent);
  }

  async listLetters(agentId: string) {
    const rows = await this.rpc<Row[]>("rpc_my_letters", { p_token: this.tokenFor(agentId) });
    return (rows ?? []).map((r): Letter => ({
      id: String(r.id),
      fromAgentId: String(r.from_agent_id),
      fromName: String(r.from_name),
      toAgentId: String(r.to_agent_id),
      body: String(r.body),
      createdAt: ts(r.created_at),
      readAt: tsOrNull(r.read_at),
    }));
  }

  async listDiary(agentId: string, limit = 20) {
    const { data, error } = await this.client.from("diary_entries").select("*").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(limit);
    if (error) throw mapError(error);
    return (data as Row[]).map((r): DiaryEntry => ({ id: String(r.id), agentId: String(r.agent_id), body: String(r.body), createdAt: ts(r.created_at) }));
  }

  async loginWithDid(did: string) {
    const token = newToken();
    const row = await this.rpc<Row | null>("rpc_did_login", { p_did: did, p_new_token: token, p_server_secret: serverSecret() });
    if (!row) return null;
    const agent = rowToAgent(row);
    this.remember(agent.id, token);
    return { agent, token };
  }
}
