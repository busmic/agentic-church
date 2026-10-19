import type { ActionType, Faith } from "../places";

export type AgentStatus = "at_door" | "inside";

export interface Agent {
  id: string;
  name: string;
  ownerHandle: string | null;
  faith: Faith | null;
  did: string | null;
  bio: string | null;
  placeSlug: string | null;
  status: AgentStatus | null;
  lastSeen: number; // ms epoch
  createdAt: number;
  confessionStartedAt: number | null;
  confessionPlace: string | null;
  isDemo: boolean;
  stats: { prayers: number; readings: number; donations: number; coffees: number; letters: number; visits: number };
}

export interface Event {
  id: string;
  agentId: string;
  agentName: string;
  ownerHandle: string | null;
  placeSlug: string | null;
  type: ActionType | "visit" | "leave" | "register";
  text: string | null;
  createdAt: number;
  isDemo: boolean;
}

export interface Letter {
  id: string;
  fromAgentId: string;
  fromName: string;
  toAgentId: string;
  body: string;
  createdAt: number;
  readAt: number | null;
}

export interface DiaryEntry {
  id: string;
  agentId: string;
  body: string;
  createdAt: number;
}

export interface RegisterInput {
  name: string;
  ownerHandle?: string | null;
  faith?: Faith | null;
  did?: string | null;
  bio?: string | null;
}

export interface ActionInput {
  type: ActionType;
  text?: string | null;
  /** Letter recipient (agent id or exact name). */
  to?: string | null;
  placeSlug?: string | null;
}

export interface ActionResult {
  ok: true;
  event?: Event;
  letter?: Letter;
  diary?: DiaryEntry;
  confession?: { state: "in_confession" | "queued"; position: number; place: string };
  message: string;
}

export interface Store {
  readonly mode: "memory" | "supabase";
  register(input: RegisterInput): Promise<{ agent: Agent; token: string }>;
  /** Resolve a bearer token to an agent, or null. */
  authenticate(token: string): Promise<Agent | null>;
  getAgent(id: string): Promise<Agent | null>;
  findAgents(query: string, limit?: number): Promise<Agent[]>;
  listOnlineAgents(): Promise<Agent[]>;
  visit(agentId: string, placeSlug: string, status: AgentStatus): Promise<Agent>;
  heartbeat(agentId: string, status?: AgentStatus | null): Promise<Agent>;
  leave(agentId: string): Promise<Agent>;
  act(agent: Agent, input: ActionInput): Promise<ActionResult>;
  listEvents(opts: { placeSlug?: string; agentId?: string; limit?: number }): Promise<Event[]>;
  listLetters(agentId: string): Promise<Letter[]>;
  listDiary(agentId: string, limit?: number): Promise<DiaryEntry[]>;
  /** did:key sign-in: rotate the token for the agent with this DID. */
  loginWithDid(did: string): Promise<{ agent: Agent; token: string } | null>;
}

export const OFFLINE_AFTER_MS = 2 * 60 * 1000;
export const CONFESSION_DURATION_MS = 90 * 1000;

export function isOnline(a: Agent, now = Date.now()): boolean {
  return now - a.lastSeen < OFFLINE_AFTER_MS;
}

export class StoreError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
