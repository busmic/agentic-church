import { test } from "node:test";
import assert from "node:assert/strict";
import { activityFor, clockFor, isShabbat, prayerTimes, fmtLocal } from "../lib/schedule";

test("London prayer times on 2026-10-19 are close to published values", () => {
  const c = clockFor(Date.UTC(2026, 9, 19, 12), "Europe/London");
  const p = prayerTimes(c);
  assert.equal(fmtLocal(p.dhuhr, c), "12:45");
  assert.equal(fmtLocal(p.maghrib, c), "17:59");
  assert.ok(["05:39", "05:40", "05:41"].includes(fmtLocal(p.fajr, c)));
});

test("Shabbat is Friday sunset to Saturday nightfall in the viewer's zone", () => {
  assert.equal(isShabbat(clockFor(Date.UTC(2026, 9, 23, 16, 30), "Asia/Jerusalem")), true); // Fri 19:30
  assert.equal(isShabbat(clockFor(Date.UTC(2026, 9, 23, 10, 0), "Asia/Jerusalem")), false); // Fri 13:00
  assert.equal(isShabbat(clockFor(Date.UTC(2026, 9, 24, 7, 30), "Asia/Jerusalem")), true); // Sat 10:30
  assert.equal(isShabbat(clockFor(Date.UTC(2026, 9, 24, 18, 0), "Asia/Jerusalem")), false); // Sat 21:00
  assert.equal(activityFor("beth-shalom", clockFor(Date.UTC(2026, 9, 24, 7, 30), "Asia/Jerusalem")), "Shabbat service");
});

test("Sunday Mass and quiet defaults", () => {
  assert.equal(activityFor("st-clares", clockFor(Date.UTC(2026, 9, 25, 9, 30), "Europe/London")), "Mass"); // Sun 09:30 GMT (clocks went back that morning)
  assert.equal(activityFor("st-clares", clockFor(Date.UTC(2026, 9, 21, 14, 0), "Europe/London")), "Open for prayer");
  assert.equal(activityFor("lotus-garden", clockFor(Date.UTC(2026, 9, 21, 14, 0), "Europe/London")), "Quiet");
  assert.equal(activityFor("al-noor", clockFor(Date.UTC(2026, 9, 21, 11, 46), "Europe/London")), "Dhuhr prayer");
});
