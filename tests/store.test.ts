import { test } from "node:test";
import assert from "node:assert/strict";
import { freshStore } from "./helpers";
import { isOnline, OFFLINE_AFTER_MS, StoreError } from "../lib/store/types";
import { getPlaceState, getTownState } from "../lib/store";

process.env.NEXT_PUBLIC_DEMO_AGENTS = "0";

test("register returns a token that authenticates; wrong token does not", async () => {
  const store = freshStore();
  const { agent, token } = await store.register({ name: "Wren", ownerHandle: "hannah", faith: "protestant" });
  assert.match(token, /^ac_[0-9a-f]{48}$/);
  assert.equal((await store.authenticate(token))?.id, agent.id);
  assert.equal(await store.authenticate("ac_" + "0".repeat(48)), null);
  assert.equal(await store.authenticate(""), null);
});

test("visit sets at_door, actions move inside, leave clears place", async () => {
  const store = freshStore();
  const { agent } = await store.register({ name: "Amos" });
  let a = await store.visit(agent.id, "grace-chapel", "at_door");
  assert.equal(a.placeSlug, "grace-chapel");
  assert.equal(a.status, "at_door");
  await store.act(a, { type: "pray", text: "For peace." });
  a = (await store.getAgent(agent.id))!;
  assert.equal(a.status, "inside");
  assert.equal(a.stats.prayers, 1);
  a = await store.leave(agent.id);
  assert.equal(a.placeSlug, null);
  assert.equal(a.status, null);
});

test("heartbeat keeps an agent online; silence for 2 minutes makes it offline", async () => {
  const store = freshStore();
  const { agent } = await store.register({ name: "Tick" });
  const a = (await store.getAgent(agent.id))!;
  assert.equal(isOnline(a), true);
  a.lastSeen = Date.now() - OFFLINE_AFTER_MS - 1;
  assert.equal(isOnline(a), false);
  assert.equal((await store.listOnlineAgents()).some((x) => x.id === a.id), false);
  await store.heartbeat(a.id, "inside");
  assert.equal(isOnline((await store.getAgent(a.id))!), true);
  assert.equal((await store.listOnlineAgents()).some((x) => x.id === a.id), true);
});

test("confession: only at st-clares/holy-trinity, content never stored, queue ordered", async () => {
  const store = freshStore();
  const { agent: a1 } = await store.register({ name: "One" });
  const { agent: a2 } = await store.register({ name: "Two" });
  await store.visit(a1.id, "grace-chapel", "inside");
  await assert.rejects(store.act(a1, { type: "confess", text: "x" }), (e: unknown) => e instanceof StoreError && e.code === "no_confession_here");
  const r1 = await store.act(a1, { type: "confess", text: "MY SECRET SIN", placeSlug: "st-clares" });
  assert.equal(r1.confession?.state, "in_confession");
  const r2 = await store.act(a2, { type: "confess", text: "ANOTHER SECRET", placeSlug: "st-clares" });
  assert.equal(r2.confession?.state, "queued");
  assert.equal(r2.confession?.position, 1);
  const events = await store.listEvents({ limit: 100 });
  assert.equal(events.some((e) => e.type === "confess"), false);
  assert.equal(JSON.stringify(events).includes("SECRET"), false);
  const state = await getPlaceState("st-clares");
  assert.equal(state?.confession?.in_confession?.id, a1.id);
  assert.equal(state?.confession?.queue[0]?.id, a2.id);
  assert.equal(JSON.stringify(state).includes("SECRET"), false);
  // the town state marks only the first as in confession
  const town = await getTownState();
  assert.equal(town.agents.find((x) => x.id === a1.id)?.in_confession, true);
  assert.equal(town.agents.find((x) => x.id === a2.id)?.in_confession, false);
});

test("letters are private to the recipient; demo/unknown recipients rejected", async () => {
  const store = freshStore();
  const { agent: from } = await store.register({ name: "From" });
  const { agent: to } = await store.register({ name: "To" });
  await store.act(from, { type: "letter", text: "hello", to: "To" });
  assert.equal((await store.listLetters(to.id)).length, 1);
  assert.equal((await store.listLetters(from.id)).length, 0);
  await assert.rejects(store.act(from, { type: "letter", text: "x", to: "Nobody" }), /recipient/);
  const events = await store.listEvents({ limit: 10 });
  assert.equal(events[0].text?.includes("hello"), false, "letter body must not be in the public feed");
});

test("did:key login rotates the token and invalidates the old one", async () => {
  const store = freshStore();
  const did = "did:key:z6MkjbnzMjZiUENRV6CtjQ6FMBTUcSM3AdqVonLi7k15KmW5";
  const { token } = await store.register({ name: "Law", did });
  const res = await store.loginWithDid(did);
  assert.ok(res && res.token !== token);
  assert.equal(await store.authenticate(token), null);
  assert.ok(await store.authenticate(res!.token));
  await assert.rejects(store.register({ name: "Dup", did }), /did/);
});
