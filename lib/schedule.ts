/**
 * Real-time activity schedules. Everything is computed for a viewer's time zone and (approximate)
 * location: the five daily prayers from a solar prayer-time calculation, Shabbat from Friday sunset
 * to Saturday nightfall, and local-clock services for the other places. When nothing is on, places
 * of worship show "Open for prayer" and the rest show "Quiet" or "Open".
 */

export interface Geo { lat: number; lon: number }

// Rough coordinates for common IANA zones; used when precise location is not granted.
const ZONE_GEO: Record<string, Geo> = {
  "Europe/London": { lat: 51.5, lon: -0.12 }, "Europe/Dublin": { lat: 53.3, lon: -6.3 }, "Europe/Lisbon": { lat: 38.7, lon: -9.1 },
  "Europe/Paris": { lat: 48.9, lon: 2.3 }, "Europe/Berlin": { lat: 52.5, lon: 13.4 }, "Europe/Madrid": { lat: 40.4, lon: -3.7 },
  "Europe/Rome": { lat: 41.9, lon: 12.5 }, "Europe/Amsterdam": { lat: 52.4, lon: 4.9 }, "Europe/Warsaw": { lat: 52.2, lon: 21.0 },
  "Europe/Prague": { lat: 50.1, lon: 14.4 }, "Europe/Vienna": { lat: 48.2, lon: 16.4 }, "Europe/Stockholm": { lat: 59.3, lon: 18.1 },
  "Europe/Athens": { lat: 38.0, lon: 23.7 }, "Europe/Istanbul": { lat: 41.0, lon: 29.0 }, "Europe/Moscow": { lat: 55.8, lon: 37.6 },
  "Europe/Kyiv": { lat: 50.5, lon: 30.5 }, "Europe/Kiev": { lat: 50.5, lon: 30.5 }, "Europe/Zurich": { lat: 47.4, lon: 8.5 },
  "America/New_York": { lat: 40.7, lon: -74.0 }, "America/Toronto": { lat: 43.7, lon: -79.4 }, "America/Chicago": { lat: 41.9, lon: -87.6 },
  "America/Denver": { lat: 39.7, lon: -105.0 }, "America/Phoenix": { lat: 33.4, lon: -112.1 }, "America/Los_Angeles": { lat: 34.1, lon: -118.2 },
  "America/Vancouver": { lat: 49.3, lon: -123.1 }, "America/Mexico_City": { lat: 19.4, lon: -99.1 }, "America/Bogota": { lat: 4.7, lon: -74.1 },
  "America/Lima": { lat: -12.0, lon: -77.0 }, "America/Santiago": { lat: -33.4, lon: -70.6 }, "America/Sao_Paulo": { lat: -23.5, lon: -46.6 },
  "America/Argentina/Buenos_Aires": { lat: -34.6, lon: -58.4 }, "America/Halifax": { lat: 44.6, lon: -63.6 }, "America/Anchorage": { lat: 61.2, lon: -149.9 },
  "Pacific/Honolulu": { lat: 21.3, lon: -157.9 }, "Pacific/Auckland": { lat: -36.9, lon: 174.8 },
  "Asia/Dubai": { lat: 25.2, lon: 55.3 }, "Asia/Riyadh": { lat: 24.7, lon: 46.7 }, "Asia/Jerusalem": { lat: 31.8, lon: 35.2 }, "Asia/Tel_Aviv": { lat: 32.1, lon: 34.8 },
  "Asia/Karachi": { lat: 24.9, lon: 67.0 }, "Asia/Kolkata": { lat: 19.1, lon: 72.9 }, "Asia/Calcutta": { lat: 19.1, lon: 72.9 }, "Asia/Dhaka": { lat: 23.8, lon: 90.4 },
  "Asia/Bangkok": { lat: 13.8, lon: 100.5 }, "Asia/Jakarta": { lat: -6.2, lon: 106.8 }, "Asia/Singapore": { lat: 1.3, lon: 103.8 }, "Asia/Kuala_Lumpur": { lat: 3.1, lon: 101.7 },
  "Asia/Manila": { lat: 14.6, lon: 121.0 }, "Asia/Hong_Kong": { lat: 22.3, lon: 114.2 }, "Asia/Shanghai": { lat: 31.2, lon: 121.5 }, "Asia/Taipei": { lat: 25.0, lon: 121.6 },
  "Asia/Seoul": { lat: 37.6, lon: 127.0 }, "Asia/Tokyo": { lat: 35.7, lon: 139.7 }, "Asia/Tehran": { lat: 35.7, lon: 51.4 }, "Asia/Baghdad": { lat: 33.3, lon: 44.4 },
  "Asia/Kathmandu": { lat: 27.7, lon: 85.3 }, "Asia/Colombo": { lat: 6.9, lon: 79.9 }, "Asia/Tashkent": { lat: 41.3, lon: 69.2 },
  "Africa/Cairo": { lat: 30.0, lon: 31.2 }, "Africa/Lagos": { lat: 6.5, lon: 3.4 }, "Africa/Nairobi": { lat: -1.3, lon: 36.8 }, "Africa/Johannesburg": { lat: -26.2, lon: 28.0 },
  "Africa/Casablanca": { lat: 33.6, lon: -7.6 }, "Africa/Algiers": { lat: 36.7, lon: 3.1 }, "Africa/Addis_Ababa": { lat: 9.0, lon: 38.7 },
  "Australia/Sydney": { lat: -33.9, lon: 151.2 }, "Australia/Melbourne": { lat: -37.8, lon: 145.0 }, "Australia/Perth": { lat: -32.0, lon: 115.9 }, "Australia/Brisbane": { lat: -27.5, lon: 153.0 },
  UTC: { lat: 51.5, lon: 0 }, "Etc/UTC": { lat: 51.5, lon: 0 },
};

/** Best-effort location for a time zone: table lookup, else longitude from the UTC offset. */
export function geoForZone(tz: string, offsetMinutes: number): Geo {
  return ZONE_GEO[tz] ?? { lat: 30, lon: Math.max(-180, Math.min(180, (offsetMinutes / 60) * 15)) };
}

// ------------------------------------------------------------------ solar maths (NOAA)
const rad = Math.PI / 180;
function julianDay(ms: number) {
  return ms / 86400000 + 2440587.5;
}
/** Returns the UTC ms of the moment the sun reaches `angle` degrees (negative = below horizon) on the given UTC day, or null. */
function sunTime(dayStartUtc: number, geo: Geo, angle: number, rising: boolean): number | null {
  const jd = julianDay(dayStartUtc + 43200000);
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const eps = 23.439 * rad;
  const decl = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const eqt = 4 * (L - (Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / rad)); // minutes
  const eq = ((eqt + 720) % 1440) - 720;
  const cosH = (Math.sin(angle * rad) - Math.sin(geo.lat * rad) * Math.sin(decl)) / (Math.cos(geo.lat * rad) * Math.cos(decl));
  if (cosH < -1 || cosH > 1) return null;
  const H = Math.acos(cosH) / rad; // degrees
  const noon = 720 - 4 * geo.lon - eq; // minutes UTC
  const t = rising ? noon - 4 * H : noon + 4 * H;
  return dayStartUtc + t * 60000;
}
function solarNoon(dayStartUtc: number, geo: Geo): number {
  const jd = julianDay(dayStartUtc + 43200000);
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const eps = 23.439 * rad;
  const eqt = 4 * (L - Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / rad);
  const eq = ((eqt + 720) % 1440) - 720;
  return dayStartUtc + (720 - 4 * geo.lon - eq) * 60000;
}
function asrTime(dayStartUtc: number, geo: Geo): number | null {
  // Shadow factor 1 (standard): sun altitude where shadow = object + noon shadow.
  const jd = julianDay(dayStartUtc + 43200000);
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const decl = Math.asin(Math.sin(23.439 * rad) * Math.sin(lambda));
  const alt = Math.atan(1 / (1 + Math.tan(Math.abs(geo.lat * rad - decl)))) / rad;
  return sunTime(dayStartUtc, geo, alt, false);
}

/** UTC midnight of the viewer's local calendar date; solar times are minutes from this. */
function localDayStart(now: number, offsetMinutes: number): number {
  const local = now + offsetMinutes * 60000;
  return Math.floor(local / 86400000) * 86400000;
}

export interface Clock {
  now: number;
  /** Minutes to add to UTC to get local time. */
  offsetMinutes: number;
  geo: Geo;
}

export function clockFor(now = Date.now(), tz?: string, geo?: Geo): Clock {
  let zone = tz;
  let offsetMinutes = 0;
  try {
    zone = zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(now));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
    offsetMinutes = Math.round((asUtc - Math.floor(now / 1000) * 1000) / 60000);
  } catch {
    zone = "UTC";
  }
  return { now, offsetMinutes, geo: geo ?? geoForZone(zone ?? "UTC", offsetMinutes) };
}

function localHM(c: Clock): { h: number; m: number; dow: number; minutes: number } {
  const local = new Date(c.now + c.offsetMinutes * 60000);
  const h = local.getUTCHours(), m = local.getUTCMinutes();
  return { h, m, dow: local.getUTCDay(), minutes: h * 60 + m };
}

const within = (minutes: number, from: string, to: string) => {
  const p = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  return minutes >= p(from) && minutes < p(to);
};

export interface PrayerTimes { fajr: number | null; sunrise: number | null; dhuhr: number; asr: number | null; maghrib: number | null; isha: number | null }

export function prayerTimes(c: Clock): PrayerTimes {
  const day = localDayStart(c.now, c.offsetMinutes);
  return {
    fajr: sunTime(day, c.geo, -18, true),
    sunrise: sunTime(day, c.geo, -0.833, true),
    dhuhr: solarNoon(day, c.geo),
    asr: asrTime(day, c.geo),
    maghrib: sunTime(day, c.geo, -0.833, false),
    isha: sunTime(day, c.geo, -17, false),
  };
}

export function fmtLocal(ms: number | null, c: Clock): string {
  if (ms == null) return "–";
  const d = new Date(ms + c.offsetMinutes * 60000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Shabbat: Friday sunset to Saturday nightfall (sun 8.5° below the horizon). */
export function isShabbat(c: Clock): boolean {
  const { dow } = localHM(c);
  const day = localDayStart(c.now, c.offsetMinutes);
  if (dow === 5) {
    const sunset = sunTime(day, c.geo, -0.833, false);
    return sunset != null && c.now >= sunset;
  }
  if (dow === 6) {
    const nightfall = sunTime(day, c.geo, -8.5, false);
    return nightfall == null || c.now < nightfall;
  }
  return false;
}

const WINDOW = 35 * 60000; // a prayer gathering lasts ~35 minutes

export function activityFor(slug: string, c: Clock): string {
  const { dow, minutes } = localHM(c);
  const day = localDayStart(c.now, c.offsetMinutes);
  const sunrise = sunTime(day, c.geo, -0.833, true);
  const sunset = sunTime(day, c.geo, -0.833, false);
  const inWin = (t: number | null, before = 0, after = WINDOW) => t != null && c.now >= t - before && c.now < t + after;
  switch (slug) {
    case "al-noor": {
      const p = prayerTimes(c);
      if (inWin(p.fajr)) return "Fajr prayer";
      if (inWin(p.dhuhr)) return "Dhuhr prayer";
      if (inWin(p.asr)) return "Asr prayer";
      if (inWin(p.maghrib)) return "Maghrib prayer";
      if (inWin(p.isha)) return "Isha prayer";
      if (dow === 5 && inWin(p.dhuhr, 20 * 60000, 70 * 60000)) return "Jumu'ah";
      return "Open for prayer";
    }
    case "beth-shalom": {
      if (isShabbat(c)) {
        if (dow === 5) return "Kabbalat Shabbat";
        if (within(minutes, "09:00", "12:00")) return "Shabbat service";
        return "Shabbat";
      }
      if (within(minutes, "07:00", "08:00")) return "Shacharit";
      if (inWin(sunset, 30 * 60000, 40 * 60000)) return "Mincha & Maariv";
      if (dow === 2 && within(minutes, "19:00", "20:30")) return "Torah study";
      return "Open for prayer";
    }
    case "st-clares":
      if (dow === 0 && (within(minutes, "09:00", "10:00") || within(minutes, "11:00", "12:00"))) return "Mass";
      if (dow === 6 && within(minutes, "17:00", "18:00")) return "Vigil Mass";
      if (dow >= 1 && dow <= 5 && within(minutes, "08:00", "08:45")) return "Mass";
      if (within(minutes, "17:30", "18:00")) return "Rosary";
      if (dow === 6 && within(minutes, "16:00", "17:00")) return "Confessions";
      return "Open for prayer";
    case "holy-trinity":
      if (dow === 0 && within(minutes, "09:00", "11:30")) return "Divine Liturgy";
      if (dow === 6 && within(minutes, "18:00", "19:30")) return "Vespers";
      if (dow >= 1 && dow <= 5 && within(minutes, "08:00", "09:00")) return "Matins";
      if (dow === 3 && within(minutes, "18:00", "19:00")) return "Akathist";
      return "Open for prayer";
    case "grace-chapel":
      if (dow === 0 && within(minutes, "10:00", "11:30")) return "Sunday worship";
      if (dow === 0 && within(minutes, "18:00", "19:30")) return "Evening worship";
      if (dow === 3 && within(minutes, "19:00", "20:30")) return "Bible study";
      if (dow === 2 && within(minutes, "07:00", "08:00")) return "Prayer meeting";
      return "Open for prayer";
    case "shree-ganesh":
      if (inWin(sunrise, 0, 45 * 60000)) return "Morning aarti";
      if (inWin(sunset, 15 * 60000, 45 * 60000)) return "Evening aarti";
      if (within(minutes, "10:00", "12:00")) return "Puja";
      if (dow === 2 && within(minutes, "18:30", "20:00")) return "Bhajans";
      return "Open for prayer";
    case "lotus-garden":
      if (within(minutes, "06:00", "07:00")) return "Morning chanting";
      if (within(minutes, "12:00", "12:30")) return "Sitting meditation";
      if (within(minutes, "18:00", "19:00")) return "Chanting and meditation";
      if (dow === 0 && within(minutes, "10:00", "11:30")) return "Dharma talk";
      return "Quiet";
    case "open-node":
      if (within(minutes, "08:00", "08:30")) return "Morning sync";
      if (within(minutes, "20:00", "21:00")) return "Evening reflection";
      if (dow === 0 && within(minutes, "11:00", "12:00")) return "Open forum";
      return "Quiet";
    case "common-grounds":
      if (dow === 0 && within(minutes, "11:00", "13:30")) return "Coffee after the service";
      if (within(minutes, "07:00", "10:00")) return "Morning rush";
      if (within(minutes, "14:00", "16:00")) return "Quiet hour";
      if (within(minutes, "20:00", "23:00")) return "Late shift";
      if (within(minutes, "06:00", "23:00")) return "Open";
      return "Closed";
    case "library":
      if (within(minutes, "09:00", "20:00")) return dow === 0 ? "Reading between services" : "Reading room open";
      return "Quiet";
    case "community-hall":
      if (within(minutes, "19:00", "21:30")) return dow === 4 ? "Interfaith choir practice" : "Neighbours' supper & talk";
      if (dow === 6 && within(minutes, "10:00", "13:00")) return "Town clean-up and picnic";
      return "Quiet";
    case "charity-house":
      return within(minutes, "09:00", "18:00") ? "Winter food drive" : "Quiet";
    case "post-office":
      return within(minutes, "08:00", "18:00") ? "Letters and prayer requests" : "Closed";
    case "bakery":
      if (within(minutes, "05:00", "07:00")) return "Baking";
      if (within(minutes, "07:00", "17:00")) return "Bread and treats after services";
      return "Closed";
    case "florist":
      return within(minutes, "08:00", "18:00") ? "Flowers and garlands for offering" : "Closed";
    case "peace-garden":
      if (within(minutes, "07:00", "08:00")) return "Silent hour";
      return sunrise != null && sunset != null && c.now > sunrise && c.now < sunset ? "Quiet reflection" : "Evening stillness";
    case "market-square":
      if (within(minutes, "08:00", "17:00")) return "Fruit, flowers, bread, books";
      if (within(minutes, "17:00", "18:00")) return "Packing up";
      return "Closed";
    case "rose-cottage":
    case "ivy-cottage":
      if (within(minutes, "23:00", "24:00") || within(minutes, "00:00", "06:00")) return "Charging";
      return "Between visits";
    default:
      return "Open";
  }
}

/** Upcoming entries for the mosque: next prayers today, formatted for the viewer. */
export function prayerList(c: Clock): { name: string; at: string; ms: number | null }[] {
  const p = prayerTimes(c);
  return [
    { name: "Fajr", at: fmtLocal(p.fajr, c), ms: p.fajr },
    { name: "Dhuhr", at: fmtLocal(p.dhuhr, c), ms: p.dhuhr },
    { name: "Asr", at: fmtLocal(p.asr, c), ms: p.asr },
    { name: "Maghrib", at: fmtLocal(p.maghrib, c), ms: p.maghrib },
    { name: "Isha", at: fmtLocal(p.isha, c), ms: p.isha },
  ];
}

// ------------------------------------------------------------------ service calls (bells, adhan, gongs)

export type CallKind = "bell" | "adhan" | "temple-bell" | "gong" | "chime" | "candles";
export interface ServiceCall { place: string; kind: CallKind; label: string; at: number }

const atLocal = (c: Clock, hhmm: string) => {
  const day = localDayStart(c.now, c.offsetMinutes) - c.offsetMinutes * 60000; // local midnight as UTC ms
  return day + (Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))) * 60000;
};

/** Today's calls to worship for the viewer's zone and location, in time order. */
export function serviceCalls(c: Clock): ServiceCall[] {
  const { dow } = localHM(c);
  const day = localDayStart(c.now, c.offsetMinutes);
  const sunrise = sunTime(day, c.geo, -0.833, true);
  const sunset = sunTime(day, c.geo, -0.833, false);
  const out: ServiceCall[] = [];
  const add = (place: string, kind: CallKind, label: string, at: number | null) => { if (at != null) out.push({ place, kind, label, at }); };
  // Al-Noor: adhan at the five prayers (and Jumu'ah)
  const p = prayerTimes(c);
  add("al-noor", "adhan", "Adhan for Fajr", p.fajr);
  add("al-noor", "adhan", dow === 5 ? "Adhan for Jumu'ah" : "Adhan for Dhuhr", p.dhuhr);
  add("al-noor", "adhan", "Adhan for Asr", p.asr);
  add("al-noor", "adhan", "Adhan for Maghrib", p.maghrib);
  add("al-noor", "adhan", "Adhan for Isha", p.isha);
  // St. Clare's bells
  if (dow === 0) { add("st-clares", "bell", "Bells for Mass", atLocal(c, "09:00")); add("st-clares", "bell", "Bells for Mass", atLocal(c, "11:00")); }
  if (dow === 6) add("st-clares", "bell", "Bells for Vigil Mass", atLocal(c, "17:00"));
  if (dow >= 1 && dow <= 5) add("st-clares", "bell", "Bells for Mass", atLocal(c, "08:00"));
  add("st-clares", "bell", "Angelus", atLocal(c, "12:00"));
  add("st-clares", "bell", "Angelus", atLocal(c, "18:00"));
  // Holy Trinity
  if (dow === 0) add("holy-trinity", "bell", "Bells for Divine Liturgy", atLocal(c, "09:00"));
  if (dow === 6) add("holy-trinity", "bell", "Bells for Vespers", atLocal(c, "18:00"));
  if (dow >= 1 && dow <= 5) add("holy-trinity", "bell", "Bells for Matins", atLocal(c, "08:00"));
  // Grace Chapel
  if (dow === 0) { add("grace-chapel", "bell", "Bell for Sunday worship", atLocal(c, "10:00")); add("grace-chapel", "bell", "Bell for evening worship", atLocal(c, "18:00")); }
  if (dow === 3) add("grace-chapel", "bell", "Bell for Bible study", atLocal(c, "19:00"));
  // Beth Shalom
  if (dow === 5 && sunset != null) add("beth-shalom", "candles", "Shabbat begins", sunset - 18 * 60000);
  if (dow === 6) add("beth-shalom", "chime", "Shabbat service", atLocal(c, "09:00"));
  if (dow >= 0 && dow <= 5) add("beth-shalom", "chime", "Shacharit", atLocal(c, "07:00")); // Sunday to Friday, matching activityFor
  // Shree Ganesh: temple bell at aarti
  add("shree-ganesh", "temple-bell", "Bell for morning aarti", sunrise);
  add("shree-ganesh", "temple-bell", "Bell for evening aarti", sunset == null ? null : sunset - 15 * 60000);
  // Lotus Garden: gong
  add("lotus-garden", "gong", "Gong for morning chanting", atLocal(c, "06:00"));
  add("lotus-garden", "gong", "Gong for sitting meditation", atLocal(c, "12:00"));
  add("lotus-garden", "gong", "Gong for evening chanting", atLocal(c, "18:00"));
  // Open Node: sync chime
  add("open-node", "chime", "Morning sync", atLocal(c, "08:00"));
  add("open-node", "chime", "Evening reflection", atLocal(c, "20:00"));
  out.sort((a, b) => a.at - b.at);
  return out;
}

/** Calls ringing right now (within `windowMs` after their time) and the next one coming. */
export function activeCalls(c: Clock, windowMs = 45000): { active: ServiceCall[]; next: ServiceCall | null } {
  const calls = serviceCalls(c);
  return { active: calls.filter((x) => c.now >= x.at && c.now < x.at + windowMs), next: calls.find((x) => x.at > c.now) ?? null };
}
