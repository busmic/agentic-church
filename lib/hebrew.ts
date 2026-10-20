/**
 * Hebrew calendar (Dershowitz & Reingold arithmetic) and the diaspora weekly Torah portion.
 * Fixed dates are "R.D." day numbers (1 = 1 Jan 1 Gregorian, proleptic).
 */

const HEBREW_EPOCH = -1373427; // R.D. of 1 Tishrei AM 1

export const isHebrewLeapYear = (y: number) => ((7 * y + 1) % 19) < 7;

function hebrewCalendarElapsedDays(year: number): number {
  const monthsElapsed = Math.floor((235 * year - 234) / 19);
  const partsElapsed = 12084 + 13753 * monthsElapsed;
  let day = 29 * monthsElapsed + Math.floor(partsElapsed / 25920);
  if ((3 * (day + 1)) % 7 < 3) day += 1;
  return day;
}
function hebrewNewYearDelay(year: number): number {
  const ny0 = hebrewCalendarElapsedDays(year - 1);
  const ny1 = hebrewCalendarElapsedDays(year);
  const ny2 = hebrewCalendarElapsedDays(year + 1);
  if (ny2 - ny1 === 356) return 2;
  if (ny1 - ny0 === 382) return 1;
  return 0;
}
/** R.D. of 1 Tishrei of the given Hebrew year. */
export function hebrewNewYear(year: number): number {
  return HEBREW_EPOCH + hebrewCalendarElapsedDays(year) + hebrewNewYearDelay(year);
}
export const daysInHebrewYear = (y: number) => hebrewNewYear(y + 1) - hebrewNewYear(y);
const longMarheshvan = (y: number) => [355, 385].includes(daysInHebrewYear(y));
const shortKislev = (y: number) => [353, 383].includes(daysInHebrewYear(y));
export const lastMonthOfHebrewYear = (y: number) => (isHebrewLeapYear(y) ? 13 : 12);

/** Months numbered from Nisan = 1 ... Tishrei = 7 ... Adar = 12, Adar II = 13. */
export function lastDayOfHebrewMonth(year: number, month: number): number {
  if ([2, 4, 6, 10, 13].includes(month)) return 29;
  if (month === 12 && !isHebrewLeapYear(year)) return 29;
  if (month === 8 && !longMarheshvan(year)) return 29;
  if (month === 9 && shortKislev(year)) return 29;
  return 30;
}

export function fixedFromHebrew(year: number, month: number, day: number): number {
  let d = hebrewNewYear(year) + day - 1;
  if (month < 7) {
    for (let m = 7; m <= lastMonthOfHebrewYear(year); m++) d += lastDayOfHebrewMonth(year, m);
    for (let m = 1; m < month; m++) d += lastDayOfHebrewMonth(year, m);
  } else {
    for (let m = 7; m < month; m++) d += lastDayOfHebrewMonth(year, m);
  }
  return d;
}

export function hebrewFromFixed(fixed: number): { year: number; month: number; day: number } {
  const approx = Math.floor((fixed - HEBREW_EPOCH) / (35975351 / 98496)) + 1; // mean year length 365.2468
  let year = approx - 1;
  while (hebrewNewYear(year + 1) <= fixed) year++;
  const start = fixed < fixedFromHebrew(year, 1, 1) ? 7 : 1;
  let month = start;
  while (fixed > fixedFromHebrew(year, month, lastDayOfHebrewMonth(year, month))) month++;
  const day = fixed - fixedFromHebrew(year, month, 1) + 1;
  return { year, month, day };
}

// ------------------------------------------------------------------ Gregorian <-> fixed
const isGregLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export function fixedFromGregorian(y: number, m: number, d: number): number {
  const y1 = y - 1;
  let f = 365 * y1 + Math.floor(y1 / 4) - Math.floor(y1 / 100) + Math.floor(y1 / 400) + Math.floor((367 * m - 362) / 12) + d;
  if (m > 2) f -= isGregLeap(y) ? 1 : 2;
  return f;
}
export function gregorianFromFixed(fixed: number): { y: number; m: number; d: number } {
  const d0 = fixed - 1;
  const n400 = Math.floor(d0 / 146097), d1 = d0 % 146097;
  const n100 = Math.floor(d1 / 36524), d2 = d1 % 36524;
  const n4 = Math.floor(d2 / 1461), d3 = d2 % 1461;
  const n1 = Math.floor(d3 / 365);
  let y = 400 * n400 + 100 * n100 + 4 * n4 + n1;
  if (!(n100 === 4 || n1 === 4)) y += 1;
  const jan1 = fixedFromGregorian(y, 1, 1);
  const priorDays = fixed - jan1;
  const correction = fixed < fixedFromGregorian(y, 3, 1) ? 0 : isGregLeap(y) ? 1 : 2;
  const m = Math.floor((12 * (priorDays + correction) + 373) / 367);
  const d = fixed - fixedFromGregorian(y, m, 1) + 1;
  return { y, m, d };
}
/** Fixed date of a UTC-midnight-anchored JS time plus a local offset. */
export function fixedFromTime(ms: number, offsetMinutes = 0): number {
  const dt = new Date(ms + offsetMinutes * 60000);
  return fixedFromGregorian(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}
export const dayOfWeek = (fixed: number) => ((fixed % 7) + 7) % 7; // 0 = Sunday, 6 = Shabbat

// ------------------------------------------------------------------ weekly Torah portion (diaspora)

export const PARASHOT = [
  "Bereshit", "Noach", "Lech-Lecha", "Vayera", "Chayei Sara", "Toldot", "Vayetzei", "Vayishlach", "Vayeshev", "Miketz", "Vayigash", "Vayechi",
  "Shemot", "Vaera", "Bo", "Beshalach", "Yitro", "Mishpatim", "Terumah", "Tetzaveh", "Ki Tisa", "Vayakhel", "Pekudei",
  "Vayikra", "Tzav", "Shmini", "Tazria", "Metzora", "Achrei Mot", "Kedoshim", "Emor", "Behar", "Bechukotai",
  "Bamidbar", "Nasso", "Beha'alotcha", "Sh'lach", "Korach", "Chukat", "Balak", "Pinchas", "Matot", "Masei",
  "Devarim", "Vaetchanan", "Eikev", "Re'eh", "Shoftim", "Ki Teitzei", "Ki Tavo", "Nitzavim", "Vayelech", "Ha'azinu", "Vezot Haberakhah",
];

export interface ParashahWeek { fixed: number; indices: number[]; name: string; special?: string }

/** Full schedule for the annual cycle that starts after Simchat Torah of Hebrew year `y` (23 Tishrei y). */
export function torahCycle(y: number): ParashahWeek[] {
  const leap = isHebrewLeapYear(y);
  const simchatTorah = fixedFromHebrew(y, 7, 23);
  const nextRH = hebrewNewYear(y + 1);
  const sukkotNext = fixedFromHebrew(y + 1, 7, 15);
  const ykNext = fixedFromHebrew(y + 1, 7, 10);
  const pesachStart = fixedFromHebrew(y, 1, 15), pesachEnd = fixedFromHebrew(y, 1, 22);
  const shavuot1 = fixedFromHebrew(y, 3, 6), shavuot2 = fixedFromHebrew(y, 3, 7);
  const isHoliday = (f: number) => (f >= pesachStart && f <= pesachEnd) || f === shavuot1 || f === shavuot2;

  // Segment A: Shabbatot after Simchat Torah up to the last Shabbat before next Rosh Hashanah.
  let s = simchatTorah + 1;
  while (dayOfWeek(s) !== 6) s++;
  const segA: number[] = [];
  const skipped: number[] = [];
  for (; s < nextRH; s += 7) (isHoliday(s) ? skipped : segA).push(s);
  // Segment B: Shabbatot between next Rosh Hashanah and Sukkot, excluding Yom Kippur.
  const segB: number[] = [];
  for (let t = nextRH; t < sukkotNext; t++) if (dayOfWeek(t) === 6 && t !== ykNext && t !== nextRH && t !== nextRH + 1) segB.push(t);

  // Which pairs are combined.
  const combined = new Set<number>(); // index of the first portion of a combined pair
  const VAYAKHEL = 21, TAZRIA = 26, ACHREI = 28, BEHAR = 31, CHUKAT = 38, MATOT = 41, NITZAVIM = 50;
  if (!leap) for (const i of [VAYAKHEL, TAZRIA, ACHREI, BEHAR, MATOT]) combined.add(i);
  else combined.add(MATOT);
  if (dayOfWeek(shavuot2) === 6) combined.add(CHUKAT);
  if (segB.length < 2) combined.add(NITZAVIM); // only one free Shabbat before Sukkot: Ha'azinu takes it
  // Portions to place in segment A: Bereshit .. Nitzavim (51), minus combinations inside A.
  const inA = (i: number) => i <= NITZAVIM;
  let readingsA = 51 - [...combined].filter((i) => inA(i) && i !== NITZAVIM).length;
  // Reconcile with the number of available Shabbatot (handles the rare year types).
  const adjustOrder = [MATOT, VAYAKHEL, CHUKAT, BEHAR, ACHREI, TAZRIA];
  for (const i of adjustOrder) {
    if (readingsA === segA.length) break;
    if (readingsA > segA.length && !combined.has(i)) { combined.add(i); readingsA--; }
    else if (readingsA < segA.length && combined.has(i)) { combined.delete(i); readingsA++; }
  }
  const weeks: ParashahWeek[] = [];
  let idx = 0;
  for (const f of segA) {
    if (idx > NITZAVIM) break;
    const indices = combined.has(idx) ? [idx, idx + 1] : [idx];
    weeks.push({ fixed: f, indices, name: indices.map((i) => PARASHOT[i]).join("-") });
    idx += indices.length;
  }
  for (const f of skipped) weeks.push({ fixed: f, indices: [], name: f >= pesachStart && f <= pesachEnd ? "Pesach" : "Shavuot", special: "festival" });
  // Segment B
  let bi = 0;
  for (const f of segB) {
    const i = combined.has(NITZAVIM) ? 52 : bi === 0 ? 51 : 52;
    weeks.push({ fixed: f, indices: [i], name: PARASHOT[i] });
    bi++;
  }
  weeks.sort((a, b) => a.fixed - b.fixed);
  return weeks;
}

/** The portion for the coming Shabbat (or today's, if Shabbat), diaspora. */
export function weeklyParashah(fixed: number): ParashahWeek & { shabbat: { y: number; m: number; d: number } } {
  const h = hebrewFromFixed(fixed);
  // Cycle year: Nisan..Elul belong to the cycle that began the previous Tishrei of the same numbered year.
  const y = h.month < 7 ? h.year : fixed >= fixedFromHebrew(h.year, 7, 23) ? h.year : h.year - 1;
  const cycle = torahCycle(y);
  let week = cycle.find((w) => w.fixed >= fixed);
  if (!week) {
    // between Rosh Hashanah and Simchat Torah with no further weeks: Vezot Haberakhah
    let sat = fixed;
    while (dayOfWeek(sat) !== 6) sat++;
    week = { fixed: sat, indices: [53], name: PARASHOT[53] };
  }
  return { ...week, shabbat: gregorianFromFixed(week.fixed) };
}
