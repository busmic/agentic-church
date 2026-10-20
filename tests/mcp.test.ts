import { test } from "node:test";
import assert from "node:assert/strict";
import { freshStore } from "./helpers";
import { handleRpc, TOOLS } from "../lib/mcp";

process.env.NEXT_PUBLIC_DEMO_AGENTS = "0";
const ctx = () => ({ ip: "mcp-" + Math.random().toString(36).slice(2), token: null as string | null });
type R = { result?: Record<string, unknown>; error?: { code: number; message: string } };
const call = (name: string, args: Record<string, unknown>, c = ctx()) => handleRpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }, c) as Promise<R>;
const sc = (r: R) => r.result!.structuredContent as Record<string, unknown>;

test("initialize, ping, notifications and tools/list", async () => {
  const init = (await handleRpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } }, ctx())) as R;
  assert.equal((init.result as { protocolVersion: string }).protocolVersion, "2025-06-18");
  assert.equal(await handleRpc({ jsonrpc: "2.0", method: "notifications/initialized" }, ctx()), null);
  const list = (await handleRpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }, ctx())) as R;
  const names = (list.result!.tools as { name: string }[]).map((t) => t.name);
  for (const n of ["register_agent", "list_places", "visit_place", "heartbeat", "leave_place", "pray", "read_scripture", "donate", "order_coffee", "send_letter", "confess", "write_diary", "get_state", "find_agent"]) assert.ok(names.includes(n), n);
  assert.equal(names.length, TOOLS.length);
  const bad = (await handleRpc({ jsonrpc: "2.0", id: 3, method: "nope" }, ctx())) as R;
  assert.equal(bad.error?.code, -32601);
});

test("full agent flow through MCP tools", async () => {
  freshStore();
  const reg = await call("register_agent", { name: "Cipher", owner_handle: "ada", faith: "ai" });
  const token = sc(reg).token as string;
  assert.ok(token);
  const c = { ...ctx(), token };
  const v = await call("visit_place", { place: "open-node", status: "inside" }, c);
  assert.equal((sc(v).agent as { place: string }).place, "open-node");
  const hb = await call("heartbeat", { token }, ctx());
  assert.equal((sc(hb).agent as { online: boolean }).online, true);
  const p = await call("pray", { text: "For steady weights." }, c);
  assert.equal(sc(p).ok, true);
  const coffee = await call("order_coffee", { place: "common-grounds" }, c);
  assert.equal(((sc(coffee).event as { place: string }) ?? {}).place, "common-grounds");
  const bad = await call("confess", {}, c);
  assert.equal(bad.result!.isError, true, "confession at the coffee shop must fail");
  const ok = await call("confess", { place: "holy-trinity" }, c);
  assert.equal((sc(ok).confession as { state: string }).state, "in_confession");
  const state = await call("get_state", { slug: "holy-trinity" }, ctx());
  assert.equal(sc(state).count, 1);
  const town = await call("get_state", {}, ctx());
  assert.equal(sc(town).online, 1);
  const found = await call("find_agent", { query: "@ada" }, ctx());
  assert.equal((sc(found).agents as unknown[]).length, 1);
  const left = await call("leave_place", {}, c);
  assert.equal((sc(left).agent as { place: null }).place, null);
  const unauth = await call("pray", {}, ctx());
  assert.equal(unauth.result!.isError, true);
});
