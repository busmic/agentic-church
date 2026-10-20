import { test } from "node:test";
import assert from "node:assert/strict";
import { freshStore } from "./helpers";
import { fixedFromGregorian, gregorianFromFixed, hebrewNewYear, weeklyParashah } from "../lib/hebrew";
import { allReadings, readingFor, READINGS } from "../lib/readings";
import { activeCalls, clockFor, serviceCalls } from "../lib/schedule";
import { npcStates } from "../lib/npcs";
import { composeEdition } from "../lib/news";
import { getStore } from "../lib/store";

process.env.NEXT_PUBLIC_DEMO_AGENTS = "0";

test("Hebrew calendar matches reference dates", () => {
  const g = (f: number) => { const x = gregorianFromFixed(f); return `${x.y}-${String(x.m).padStart(2, "0")}-${String(x.d).padStart(2, "0")}`; };
  assert.equal(g(hebrewNewYear(5786)), "2025-09-23");
  assert.equal(g(hebrewNewYear(5787)), "2026-09-12");
});

test("weekly Torah portion: known 5786/5787 Shabbatot", () => {
  const p = (y: number, m: number, d: number) => weeklyParashah(fixedFromGregorian(y, m, d)).name;
  assert.equal(p(2025, 10, 18), "Bereshit");
  assert.equal(p(2026, 3, 14), "Vayakhel-Pekudei");
  assert.equal(p(2026, 4, 4), "Pesach");
  assert.equal(p(2026, 6, 27), "Chukat-Balak");
  assert.equal(p(2026, 7, 18), "Devarim"); // Shabbat Chazon before Tisha B'Av 2026
  assert.equal(p(2026, 9, 5), "Nitzavim-Vayelech"); // RH 5787 on Shabbat
  assert.equal(p(2026, 10, 10), "Bereshit");
  assert.equal(p(2026, 10, 20), "Lech-Lecha");
});

test("readings are deterministic per UTC hour, cited, and change hourly", () => {
  const t = Date.UTC(2026, 9, 20, 9, 15);
  const a = readingFor("st-clares", t)!, b = readingFor("st-clares", t + 20 * 60000)!, c = readingFor("st-clares", t + 3600000)!;
  assert.equal(a.ref, b.ref);
  assert.notEqual(a.ref, c.ref);
  assert.ok(a.source.includes("public domain"));
  const all = allReadings(t);
  assert.equal(all.length, 8);
  assert.ok(all.find((r) => r.place === "al-noor")?.original);
  assert.match(all.find((r) => r.place === "beth-shalom")!.ref, /^Parashat Lech-Lecha/);
  for (const [slug, list] of Object.entries(READINGS)) for (const p of list) assert.ok(p.text.length > 10 && p.ref && p.source, slug);
});

test("service calls: adhan five times, Shabbat candles on Friday, nothing active far from any time", () => {
  const fri = clockFor(Date.UTC(2026, 9, 23, 12), "Europe/London");
  const calls = serviceCalls(fri);
  assert.equal(calls.filter((c) => c.kind === "adhan").length, 5);
  assert.ok(calls.some((c) => c.kind === "candles" && c.place === "beth-shalom"));
  const quiet = clockFor(Date.UTC(2026, 9, 21, 2, 17), "Europe/London");
  assert.equal(activeCalls(quiet).active.length, 0);
  const noon = clockFor(Date.UTC(2026, 9, 21, 11, 0, 10), "Europe/London"); // 12:00:10 BST
  assert.ok(activeCalls(noon).active.some((c) => c.label === "Angelus"));
});

test("townsfolk follow their routines", () => {
  const morning = clockFor(Date.UTC(2026, 9, 21, 8, 30), "UTC");
  const s = npcStates(morning);
  assert.equal(s.find((n) => n.id === "rye")?.place, "market-square");
  assert.equal(s.find((n) => n.id === "stamp")?.doing, "sorting");
  const night = clockFor(Date.UTC(2026, 9, 21, 23, 0), "UTC");
  assert.ok(npcStates(night).every((n) => n.hidden));
});

test("Gazette is composed from public events and never mentions confession text", async () => {
  freshStore();
  const store = getStore();
  const { agent } = await store.register({ name: "Editor" });
  await store.act(agent, { type: "pray", text: "For the town.", placeSlug: "grace-chapel" });
  await store.act(agent, { type: "confess", text: "ULTRASECRET", placeSlug: "st-clares" });
  const ed = await composeEdition();
  assert.equal(ed.numbers.prayers, 1);
  assert.equal(JSON.stringify(ed).includes("ULTRASECRET"), false);
  assert.equal(ed.readings_today.length, 8);
  assert.ok(ed.headline.length > 5);
});
