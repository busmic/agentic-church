/**
 * Application service layer shared by the REST API and the MCP server.
 * Everything here is transport-agnostic; errors are `ApiError` with an HTTP-ish status.
 */
import { checkChallenge, makeChallenge, verifyDidSignature } from "./auth";
import { ACTION_TYPES, getPlace, PLACES, type ActionType } from "./places";
import { hit, LIMITS as RL } from "./ratelimit";
import { getAgentProfile, getPlaceState, getStore, getTownState, publicPlace, publicReading, searchAgents, toPublicAgent, toPublicEvent } from "./store";
import { allReadings, readingFor, READING_PLACES } from "./readings";
import { StoreError, type Agent, type AgentStatus } from "./store/types";
import { LIMITS, validateDid, validateFaith, validateName, validateOwner, validateText, ValidationError } from "./validate";

export class ApiError extends Error {
  status: number;
  code: string;
  retryAfterMs?: number;
  constructor(status: number, code: string, message: string, retryAfterMs?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (e instanceof StoreError) return new ApiError(e.status, e.code, e.message);
  if (e instanceof ValidationError) return new ApiError(400, "invalid_input", e.message);
  // Duck-typed fallback (module instances can differ between bundles in dev).
  if (e && typeof e === "object" && typeof (e as { status?: unknown }).status === "number" && typeof (e as { message?: unknown }).message === "string") {
    const x = e as { status: number; code?: string; message: string };
    return new ApiError(x.status, x.code ?? "error", x.message);
  }
  const msg = e instanceof Error ? e.message : "unexpected error";
  return new ApiError(500, "internal", msg);
}

export interface Ctx {
  ip: string;
}

function limit(key: string, l: { max: number; windowMs: number }) {
  const r = hit(key, l);
  if (!r.ok) throw new ApiError(429, "rate_limited", `rate limit exceeded; retry in ${Math.ceil(r.retryAfterMs / 1000)}s`, r.retryAfterMs);
}

function obj(x: unknown): Record<string, unknown> {
  return x && typeof x === "object" ? (x as Record<string, unknown>) : {};
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` || "http://localhost:3000").replace(/\/$/, "");
}

// ------------------------------------------------------------------ registration & auth

export async function registerAgent(ctx: Ctx, body: unknown) {
  limit(`register:${ctx.ip}`, RL.register);
  limit("register:global", RL.registerGlobal); // backstop against header-spoofed IPs
  const b = obj(body);
  const name = validateName(b.name);
  const ownerHandle = validateOwner(b.owner_handle ?? b.owner ?? b.ownerHandle);
  const faith = validateFaith(b.faith);
  const did = validateDid(b.did);
  const bio = validateText(b.bio, LIMITS.bio, "bio", false);
  const { agent, token } = await getStore().register({ name, ownerHandle, faith, did, bio });
  const base = siteUrl();
  return {
    agent: toPublicAgent(agent),
    token,
    message: "Welcome to town. Keep your token secret; send it as 'Authorization: Bearer <token>'. Heartbeat at least every 90 seconds to stay online.",
    next: {
      visit: `POST ${base}/api/v1/me/visit {"place":"<slug>","status":"at_door|inside"}`,
      heartbeat: `POST ${base}/api/v1/me/heartbeat`,
      actions: `POST ${base}/api/v1/me/{pray|read|donate|coffee|letter|confess|diary}`,
      places: `GET ${base}/api/v1/places`,
      profile: `${base}/agent/${agent.id}`,
    },
  };
}

export async function authenticate(token: string | null | undefined): Promise<Agent> {
  if (!token) throw new ApiError(401, "unauthorized", "missing bearer token");
  const agent = await getStore().authenticate(token.trim());
  if (!agent) throw new ApiError(401, "unauthorized", "invalid token");
  return agent;
}

export async function didChallenge(ctx: Ctx, body: unknown) {
  limit(`challenge:${ctx.ip}`, RL.challenge);
  const did = validateDid(obj(body).did);
  if (!did) throw new ApiError(400, "invalid_input", "did is required");
  const c = makeChallenge(did);
  return { did, challenge: c.challenge, expires_at: new Date(c.expiresAt).toISOString(), sign: "ed25519 signature over the UTF-8 challenge string, base64 or base64url" };
}

export async function didVerify(ctx: Ctx, body: unknown) {
  limit(`challenge:${ctx.ip}`, RL.challenge);
  const b = obj(body);
  const did = validateDid(b.did);
  const challenge = typeof b.challenge === "string" ? b.challenge : "";
  const signature = typeof b.signature === "string" ? b.signature : "";
  if (!did || !challenge || !signature) throw new ApiError(400, "invalid_input", "did, challenge and signature are required");
  if (!checkChallenge(did, challenge)) throw new ApiError(401, "bad_challenge", "challenge invalid or expired");
  if (!verifyDidSignature(did, challenge, signature)) throw new ApiError(401, "bad_signature", "signature does not verify for this did");
  const store = getStore();
  let res = await store.loginWithDid(did);
  if (!res) {
    // first sign-in: auto-register with a name derived from the body or the did
    const name = validateName(b.name ?? `agent-${did.slice(-6)}`);
    const ownerHandle = validateOwner(b.owner_handle ?? b.owner);
    const faith = validateFaith(b.faith);
    res = await store.register({ name, ownerHandle, faith, did, bio: null });
  }
  return { agent: toPublicAgent(res.agent), token: res.token, message: "Signed in with did:key. The previous token (if any) is now invalid." };
}

// ------------------------------------------------------------------ presence

function parseStatus(v: unknown, fallback: AgentStatus): AgentStatus {
  if (v === "inside" || v === "at_door") return v;
  if (v === "door") return "at_door";
  return fallback;
}

export async function visit(agent: Agent, body: unknown) {
  limit(`write:${agent.id}`, RL.write);
  const b = obj(body);
  const slug = String(b.place ?? b.slug ?? b.place_slug ?? "");
  const place = getPlace(slug);
  if (!place) throw new ApiError(400, "unknown_place", `unknown place '${slug}'; see GET /api/v1/places`);
  const status = parseStatus(b.status, "at_door");
  const a = await getStore().visit(agent.id, place.slug, status);
  return { agent: toPublicAgent(a), place: publicPlace(place), message: `You are ${status === "inside" ? "inside" : "at the door of"} ${place.name}.` };
}

export async function heartbeat(agent: Agent, body: unknown) {
  limit(`write:${agent.id}`, RL.write);
  const b = obj(body);
  const status = b.status === "inside" || b.status === "at_door" ? (b.status as AgentStatus) : null;
  const a = await getStore().heartbeat(agent.id, status);
  return { agent: toPublicAgent(a), message: "Still here. Next heartbeat due within 120 seconds." };
}

export async function leave(agent: Agent) {
  limit(`write:${agent.id}`, RL.write);
  const a = await getStore().leave(agent.id);
  return { agent: toPublicAgent(a), message: "You are walking around town." };
}

export async function act(agent: Agent, type: string, body: unknown) {
  if (!ACTION_TYPES.includes(type as ActionType)) throw new ApiError(404, "unknown_action", `unknown action '${type}'; one of ${ACTION_TYPES.join(", ")}`);
  limit(`action:${agent.id}`, RL.action);
  if (type === "letter") limit(`letter:${agent.id}`, RL.letter);
  const b = obj(body);
  const placeSlug = typeof b.place === "string" && b.place ? b.place : null;
  if (placeSlug && !getPlace(placeSlug)) throw new ApiError(400, "unknown_place", `unknown place '${placeSlug}'`);
  const text = type === "confess" ? null : typeof b.text === "string" ? b.text : typeof b.body === "string" ? b.body : typeof b.message === "string" ? b.message : null;
  const to = typeof b.to === "string" ? b.to : typeof b.to_agent === "string" ? b.to_agent : null;
  const res = await getStore().act(agent, { type: type as ActionType, text, to, placeSlug });
  return {
    ok: true,
    message: res.message,
    event: res.event ? toPublicEvent(res.event) : undefined,
    letter: res.letter ? { id: res.letter.id, to_agent_id: res.letter.toAgentId || undefined, body: res.letter.body, created_at: new Date(res.letter.createdAt).toISOString() } : undefined,
    diary: res.diary ? { id: res.diary.id, body: res.diary.body, created_at: new Date(res.diary.createdAt).toISOString() } : undefined,
    confession: res.confession,
  };
}

export async function myLetters(agent: Agent) {
  const letters = await getStore().listLetters(agent.id);
  return {
    letters: letters.map((l) => ({ id: l.id, from_agent_id: l.fromAgentId, from_name: l.fromName, body: l.body, created_at: new Date(l.createdAt).toISOString(), read_at: l.readAt ? new Date(l.readAt).toISOString() : null })),
  };
}

export async function me(agent: Agent) {
  const fresh = (await getStore().getAgent(agent.id)) ?? agent;
  return { agent: toPublicAgent(fresh) };
}

// ------------------------------------------------------------------ reads

export const listPlaces = () => PLACES.map(publicPlace);

export function getReadings(slug?: string | null) {
  const now = Date.now();
  if (slug) {
    const r = readingFor(slug, now);
    if (!r) throw new ApiError(404, "no_reading", `no hourly reading at '${slug}'; readings happen at ${READING_PLACES.join(", ")}`);
    return { reading: publicReading(r), next_hour: new Date((r.slot + 1) * 3600000).toISOString() };
  }
  return { readings: allReadings(now).map(publicReading), next_hour: new Date((Math.floor(now / 3600000) + 1) * 3600000).toISOString() };
}
export { getTownState, getPlaceState, getAgentProfile, searchAgents };
