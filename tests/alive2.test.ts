import { test } from "node:test";
import assert from "node:assert/strict";
import { freshStore } from "./helpers";
import { fixedFromGregorian, torahCycle, weeklyParashah, gregorianFromFixed, isHebrewLeapYear, PARASHOT } from "../lib/hebrew";
import { allReadings, readingFor, READING_PLACES } from "../lib/readings";
import { activeCalls, clockFor, prayerTimes, serviceCalls } from "../lib/schedule";
import { composeEdition, localDateFor, localDayStartMs } from "../lib/news";
import { getStore, getTownState, searchAgents, getPlaceState } from "../lib/store";
import { handleRpc } from "../lib/mcp";
import { npcStates, NPCS } from "../lib/npcs";

process.env.NEXT_PUBLIC_DEMO_AGENTS = "0";

test("reading selection: every place changes passage across a day and never repeats within 6 hours", () => {
  const base = Date.UTC(2026, 9, 20, 0, 30);
  for (const slug of READING_PLACES.filter((s) => s !== "beth-shalom")) {
    const refs = Array.from({ length: 24 }, (_, h) => readingFor(slug, base + h * 3600000)!.ref);
    assert.ok(new Set(refs).size >= 12, `${slug} should vary over a day (${new Set(refs).size})`);
    for (let h = 0; h < 18; h++) assert.ok(!refs.slice(h + 1, h + 6).includes(refs[h]), `${slug} repeats within 6h at hour ${h}`);
  }
  // identical for any caller in the same hour, regardless of zone
  const a = allReadings(base + 5 * 3600000 + 10), b = allReadings(base + 5 * 3600000 + 25 * 60000);
  assert.deepEqual(a.map((r) => r.ref), b.map((r) => r.ref));
});

test("Torah cycle 5787 (leap year): 54 portions all read, holiday Shabbatot skipped, Matot-Masei split", () => {
  assert.equal(isHebrewLeapYear(5787), true);
  const cycle = torahCycle(5787);
  const read = cycle.flatMap((w) => w.indices);
  for (let i = 0; i <= 52; i++) assert.ok(read.includes(i), `${PARASHOT[i]} missing from 5787 cycle`);
  assert.equal(new Set(read).size, read.length, "no portion read twice");
  const g = (f: number) => { const x = gregorianFromFixed(f); return `${x.y}-${String(x.m).padStart(2, "0")}-${String(x.d).padStart(2, "0")}`; };
  const byDate = Object.fromEntries(cycle.map((w) => [g(w.fixed), w.name]));
  assert.equal(byDate["2026-10-10"], "Bereshit");
  assert.equal(byDate["2027-04-24"], "Pesach"); // Pesach 5787 = 22-29 Apr 2027, Shabbat 24 Apr inside it
  // 5787: 49 free Shabbatot for 51 portions, so exactly two pairs combine: Chukat-Balak (Shavuot II on Shabbat) and Matot-Masei
  assert.ok(Object.values(byDate).includes("Chukat-Balak"));
  assert.ok(Object.values(byDate).includes("Matot-Masei"));
  assert.ok(!Object.values(byDate).includes("Tazria-Metzora"), "leap year does not combine Tazria-Metzora");
  // consecutive readings are 7 days apart, except across Rosh Hashanah / Yom Kippur Shabbatot (14)
  for (let i = 1; i < cycle.length; i++) assert.ok([7, 14].includes(cycle[i].fixed - cycle[i - 1].fixed));
});

test("Torah: dates between Shabbatot map to the coming Shabbat; festival week labelled", () => {
  const w = weeklyParashah(fixedFromGregorian(2026, 4, 1)); // Wed before Pesach Shabbat
  assert.equal(w.name, "Pesach");
  assert.equal(w.special, "festival");
  const r = readingFor("beth-shalom", Date.UTC(2026, 3, 1, 12))!;
  assert.match(r.ref, /^Pesach \(festival week\)/);
});

test("call times follow the solar prayer times and the weekly service table", () => {
  const sun = clockFor(Date.UTC(2026, 9, 25, 12), "Europe/London"); // Sunday
  const calls = serviceCalls(sun);
  const p = prayerTimes(sun);
  const adhan = calls.filter((c) => c.kind === "adhan").map((c) => c.at);
  assert.deepEqual(adhan, [p.fajr, p.dhuhr, p.asr, p.maghrib, p.isha]);
  assert.ok(calls.some((c) => c.place === "st-clares" && c.label === "Bells for Mass"));
  assert.ok(calls.some((c) => c.place === "holy-trinity" && c.label === "Bells for Divine Liturgy"));
  assert.ok(!calls.some((c) => c.place === "beth-shalom" && c.kind === "candles"), "no candles on Sunday");
  // every call is on the viewer's calendar day
  const day = localDateFor(sun.now, sun.offsetMinutes);
  for (const c of calls) assert.equal(localDateFor(c.at, sun.offsetMinutes), day, c.label);
  // active window is 45 s and ends
  const at = calls.find((c) => c.label === "Angelus")!.at;
  assert.equal(activeCalls({ ...sun, now: at + 10000 }).active.length >= 1, true);
  assert.equal(activeCalls({ ...sun, now: at + 46000 }).active.some((c) => c.at === at), false);
  assert.equal(activeCalls({ ...sun, now: at - 1000 }).next?.at, at);
});

test("Gazette: local date windows, midnight boundary, incomplete today, stored past editions", async () => {
  assert.equal(localDateFor(Date.UTC(2026, 9, 20, 23, 30), 60), "2026-10-21"); // 00:30 BST next day
  assert.equal(localDateFor(Date.UTC(2026, 9, 20, 23, 30), -300), "2026-10-20");
  assert.equal(localDayStartMs("2026-10-21", 60), Date.UTC(2026, 9, 20, 23, 0));
  freshStore();
  const store = getStore();
  const { agent } = await store.register({ name: "Night" });
  await store.act(agent, { type: "pray", text: "Late prayer.", placeSlug: "st-clares" });
  const now = Date.now();
  const today = await composeEdition(now, { date: localDateFor(now, 120), tzOffsetMinutes: 120 });
  assert.equal(today.complete, false);
  assert.equal(today.numbers.prayers, 1);
  const yesterday = await composeEdition(now, { date: localDateFor(now - 86400000, 120), tzOffsetMinutes: 120 });
  assert.equal(yesterday.complete, true);
  assert.equal(yesterday.numbers.prayers, 0, "today's prayer must not appear in yesterday's edition");
  // bad input falls back safely
  const bad = await composeEdition(now, { date: "not-a-date", tzOffsetMinutes: 99999 });
  assert.equal(bad.tz_offset_minutes, 840);
  assert.match(bad.date, /^\d{4}-\d{2}-\d{2}$/);
});

test("townsfolk are in town state but never agents: counts, search, online list, place counts", async () => {
  freshStore();
  const town = await getTownState();
  assert.ok(town.townsfolk.length === NPCS.length);
  for (const t of town.townsfolk) {
    assert.equal(t.kind, "townsfolk");
    assert.equal(t.owner_handle, null);
    assert.ok(t.role);
    assert.ok(!town.agents.some((a) => a.name === t.name));
  }
  assert.equal(town.online, 0);
  for (const p of town.places) assert.equal(p.count, 0);
  assert.equal((await searchAgents("Crema")).length, 0);
  const lib = await getPlaceState("library");
  assert.equal(lib?.count, 0);
  // hidden townsfolk report no place
  const night = npcStates(clockFor(Date.UTC(2026, 9, 21, 23, 30), "UTC"));
  assert.ok(night.every((n) => n.hidden));
});

test("feed, town state and Gazette never carry confession content; MCP get_state/get_reading agree with REST shapes", async () => {
  freshStore();
  const store = getStore();
  const { agent } = await store.register({ name: "Quiet" });
  await store.act(agent, { type: "confess", text: "NEVERSHOWN", placeSlug: "holy-trinity" });
  const town = await getTownState();
  assert.equal(JSON.stringify(town).includes("NEVERSHOWN"), false);
  assert.equal(town.feed.filter((e) => e.type === "reading").length, 8, "this hour's readings stay in the feed");
  assert.equal(town.feed.some((e) => e.type === "confess"), false);
  const ed = await composeEdition();
  assert.equal(JSON.stringify(ed).includes("NEVERSHOWN"), false);
  const ctx = { ip: "t", token: null };
  const st = (await handleRpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_state", arguments: {} } }, ctx)) as { result: { structuredContent: { townsfolk: unknown[]; readings: unknown[] } } };
  assert.equal(st.result.structuredContent.townsfolk.length, NPCS.length);
  assert.equal(st.result.structuredContent.readings.length, 8);
  const rd = (await handleRpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_reading", arguments: { slug: "beth-shalom" } } }, ctx)) as { result: { structuredContent: { reading: { ref: string; first_sentence: string } } } };
  assert.match(rd.result.structuredContent.reading.ref, /^Parashat|^Pesach|^Shavuot/);
  const bad = (await handleRpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_reading", arguments: { slug: "bakery" } } }, ctx)) as { result: { isError: boolean } };
  assert.equal(bad.result.isError, true);
});

test("every passage reference is unique within its place", async () => {
  const { READINGS } = await import("../lib/readings");
  for (const [slug, list] of Object.entries(READINGS)) {
    const refs = list.map((p) => p.ref);
    assert.equal(new Set(refs).size, refs.length, `${slug} has duplicate refs`);
  }
});
