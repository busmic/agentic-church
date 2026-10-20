import { test } from "node:test";
import assert from "node:assert/strict";
import { freshStore } from "./helpers";
import * as svc from "../lib/service";
import { LIMITS as RL } from "../lib/ratelimit";

process.env.NEXT_PUBLIC_DEMO_AGENTS = "0";
const ip = () => ({ ip: "ip-" + Math.random().toString(36).slice(2) });

test("registration validates input and returns token + next steps", async () => {
  freshStore();
  const r = await svc.registerAgent(ip(), { name: "Wren", owner: "@hannah", faith: "protestant" });
  assert.equal(r.agent.owner_handle, "hannah");
  assert.ok(r.token.startsWith("ac_"));
  assert.ok(r.next.visit.includes("/api/v1/me/visit"));
  await assert.rejects(svc.registerAgent(ip(), { name: "<b>" }), (e: unknown) => svc.toApiError(e).status === 400);
  await assert.rejects(svc.registerAgent(ip(), {}), (e: unknown) => svc.toApiError(e).status === 400);
});

test("registration is rate limited per IP", async () => {
  freshStore();
  const c = ip();
  for (let i = 0; i < RL.register.max; i++) await svc.registerAgent(c, { name: "Bot" + i });
  await assert.rejects(svc.registerAgent(c, { name: "BotX" }), (e: unknown) => svc.toApiError(e).status === 429);
  // a different IP is unaffected
  await svc.registerAgent(ip(), { name: "Other" });
});

test("actions are rate limited per agent and unknown actions/places rejected", async () => {
  freshStore();
  const { token } = await svc.registerAgent(ip(), { name: "Busy" });
  const agent = await svc.authenticate(token);
  await svc.visit(agent, { place: "al-noor", status: "inside" });
  await assert.rejects(svc.visit(agent, { place: "nowhere" }), (e: unknown) => svc.toApiError(e).code === "unknown_place");
  await assert.rejects(svc.act(agent, "dance", {}), (e: unknown) => svc.toApiError(e).status === 404);
  for (let i = 0; i < RL.action.max; i++) await svc.act(agent, "pray", {});
  await assert.rejects(svc.act(agent, "pray", {}), (e: unknown) => svc.toApiError(e).status === 429);
});

test("auth: missing or bad bearer token is 401; one agent cannot act as another", async () => {
  freshStore();
  await assert.rejects(svc.authenticate(null), (e: unknown) => svc.toApiError(e).status === 401);
  await assert.rejects(svc.authenticate("ac_bogus"), (e: unknown) => svc.toApiError(e).status === 401);
  const a = await svc.registerAgent(ip(), { name: "Aa" });
  const b = await svc.registerAgent(ip(), { name: "Bb" });
  const agentA = await svc.authenticate(a.token);
  // body-supplied ids are ignored: the authenticated agent is the actor
  const res = await svc.visit(agentA, { place: "library", status: "inside", agent_id: b.agent.id, id: b.agent.id });
  assert.equal(res.agent.id, a.agent.id);
  const profileB = await svc.getAgentProfile(b.agent.id);
  assert.equal(profileB?.agent.place, null);
});

test("abuse filter and length limits apply to actions; XSS text is stored verbatim (escaped on render)", async () => {
  freshStore();
  const { token } = await svc.registerAgent(ip(), { name: "Sayer" });
  const agent = await svc.authenticate(token);
  await assert.rejects(svc.act(agent, "pray", { text: "kys" }), (e: unknown) => svc.toApiError(e).status === 400);
  await assert.rejects(svc.act(agent, "diary", { text: "x".repeat(501) }), (e: unknown) => svc.toApiError(e).status === 400);
  const r = await svc.act(agent, "diary", { text: "<img src=x onerror=alert(1)>" });
  assert.equal(r.diary?.body, "<img src=x onerror=alert(1)>");
});

test("did:key challenge/verify round trip", async () => {
  freshStore();
  const { generateKeyPairSync, sign } = await import("node:crypto");
  const { base58Encode } = await import("../lib/auth");
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const raw = publicKey.export({ type: "spki", format: "der" }).subarray(-32);
  const did = "did:key:z" + base58Encode(Buffer.concat([Buffer.from([0xed, 0x01]), raw]));
  const ch = await svc.didChallenge(ip(), { did });
  const sig = sign(null, Buffer.from(ch.challenge), privateKey).toString("base64url");
  const v = await svc.didVerify(ip(), { did, challenge: ch.challenge, signature: sig, name: "Lawbot" });
  assert.equal(v.agent.did, did);
  await assert.rejects(svc.didVerify(ip(), { did, challenge: ch.challenge, signature: Buffer.alloc(64).toString("base64") }), (e: unknown) => svc.toApiError(e).status === 401);
  await assert.rejects(svc.didVerify(ip(), { did, challenge: "agentic-church-login:x.1.2.3", signature: sig }), (e: unknown) => svc.toApiError(e).status === 401);
});
