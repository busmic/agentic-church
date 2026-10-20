/** Ambient life drawn every frame on the town map: birds, cats, fountain water, market bustle, ripples. */
import { C, disc, leaderSprite, px, type Ctx } from "./draw";
import { PROPS, WORLD } from "../places";

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const r01 = (s: string) => hash(s) / 4294967296;

/** Flocks of birds crossing the sky; each flock is a deterministic function of time. */
export function drawBirds(ctx: Ctx, now: number) {
  for (let f = 0; f < 3; f++) {
    const period = 70000 + f * 23000;
    const k = Math.floor(now / period);
    const t = (now % period) / period;
    const dir = hash("dir" + f + k) % 2 ? 1 : -1;
    const y0 = 120 + r01("y" + f + k) * (WORLD.h - 240);
    const x = dir > 0 ? -80 + t * (WORLD.w + 160) : WORLD.w + 80 - t * (WORLD.w + 160);
    const n = 3 + (hash("n" + f + k) % 4);
    for (let i = 0; i < n; i++) {
      const bx = x - dir * i * 22;
      const by = y0 + Math.abs(i - (n - 1) / 2) * 10 + Math.sin(now / 300 + i) * 3;
      const flap = Math.floor(now / 160 + i) % 2;
      px(ctx, bx - 6, by + (flap ? 0 : 3), 5, 2, C.out);
      px(ctx, bx + 1, by + (flap ? 0 : 3), 5, 2, C.out);
      px(ctx, bx - 1, by + 2, 2, 2, C.out);
    }
  }
}

const CAT_HOMES: [number, number][] = [[2150, 290], [1790, 940], [1210, 900], [600, 920], [1560, 300]];

export interface CatState { x: number; y: number; facing: number; sitting: boolean }
export function catState(i: number, now: number): CatState {
  const [hx, hy] = CAT_HOMES[i % CAT_HOMES.length];
  const period = 24000 + i * 5000;
  const k = Math.floor(now / period);
  const t = (now % period) / period;
  const a0 = r01("ca" + i + k) * Math.PI * 2, a1 = r01("ca" + i + (k + 1)) * Math.PI * 2;
  const p0: [number, number] = [hx + Math.cos(a0) * 70, hy + Math.sin(a0) * 40];
  const p1: [number, number] = [hx + Math.cos(a1) * 70, hy + Math.sin(a1) * 40];
  const sitting = t > 0.45; // walk for the first part, then sit
  const u = sitting ? 1 : t / 0.45;
  return { x: p0[0] + (p1[0] - p0[0]) * u, y: p0[1] + (p1[1] - p0[1]) * u, facing: p1[0] >= p0[0] ? 1 : -1, sitting };
}
export function drawCat(ctx: Ctx, s: CatState, now: number, color = C.orange) {
  const x = Math.round(s.x), y = Math.round(s.y);
  const step = s.sitting ? 0 : Math.floor(now / 150) % 2;
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x - 8, y - 2, 16, 3);
  // body
  px(ctx, x - 8, y - 9 + (s.sitting ? 2 : 0), 16, 7, C.out);
  px(ctx, x - 7, y - 8 + (s.sitting ? 2 : 0), 14, 5, color);
  // head
  const hx = x + s.facing * 7;
  px(ctx, hx - 4, y - 13, 8, 7, C.out);
  px(ctx, hx - 3, y - 12, 6, 5, color);
  px(ctx, hx - 4, y - 15, 2, 3, C.out); px(ctx, hx + 2, y - 15, 2, 3, C.out);
  px(ctx, hx - 2 + (s.facing > 0 ? 1 : 0), y - 10, 1, 1, C.green2); px(ctx, hx + 1 + (s.facing > 0 ? 1 : 0), y - 10, 1, 1, C.green2);
  // tail and legs
  px(ctx, x - s.facing * 9, y - 12 + (s.sitting ? 4 : 0), 2, 6, C.out);
  if (!s.sitting) { px(ctx, x - 5 + step, y - 3, 2, 3, C.out); px(ctx, x + 3 - step, y - 3, 2, 3, C.out); }
}

/** Animated water on top of the static fountain. */
export function drawFountainWater(ctx: Ctx, now: number) {
  const { x: cx, y: cy } = PROPS.fountain;
  const f = Math.floor(now / 180) % 4;
  // spray
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + f * 0.3;
    const r = 8 + f * 5;
    px(ctx, cx + Math.cos(a) * r - 1, cy - 44 + Math.sin(a) * 4 - f * 3, 3, 3, C.water2);
  }
  px(ctx, cx - 1, cy - 56 - f * 2, 3, 6, C.white);
  // ripples on the basin
  for (let i = 0; i < 3; i++) {
    const rr = 10 + ((now / 400 + i * 11) % 32);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  // sparkles
  const sx = cx - 30 + ((now / 90) % 60), sy = cy - 8 + Math.sin(now / 200) * 6;
  px(ctx, sx, sy, 2, 2, C.white);
}

/** Expanding rings from a building when its bell rings or a call is made. */
export function drawRipple(ctx: Ctx, x: number, y: number, phase: number, color = "rgba(245,211,90,0.8)") {
  for (let i = 0; i < 3; i++) {
    const p = (phase + i * 0.33) % 1;
    ctx.strokeStyle = color.replace("0.8", String((1 - p) * 0.8));
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 20 + p * 120, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Stall-keepers behind their stalls and a few floating items to make the market look busy. */
export function drawMarketBustle(ctx: Ctx, now: number) {
  const base = { x: 1330, y: 650 };
  const keepers = [
    { n: "Fig", x: base.x + 76, y: base.y + 86, robe: C.red },
    { n: "Posy", x: base.x + 206, y: base.y + 100, robe: C.pink },
    { n: "Crumb", x: base.x + 336, y: base.y + 86, robe: C.orange },
    { n: "Leaf", x: base.x + 90, y: base.y + 206, robe: C.blue },
  ];
  keepers.forEach((k, i) => leaderSprite(ctx, k.x, k.y, k.robe, C.white, Math.floor(now / 700 + i) % 2));
  // tossed apple / paper bag between Fig and a customer
  const t = (now % 1800) / 1800;
  const ax = base.x + 100 + t * 40, ay = base.y + 70 - Math.sin(t * Math.PI) * 24;
  px(ctx, ax, ay, 5, 5, C.red);
  // bunting flutter
  const cols = [C.red, C.gold, C.green, C.blue, C.pink];
  for (let i = 0; i < 20; i++) {
    const fx = base.x + 12 + i * 20, fy = base.y - 4 + Math.sin(now / 250 + i) * 2;
    px(ctx, fx, fy, 6, 5, cols[i % 5]);
  }
  // steam from Crumb's bread
  const s = Math.floor(now / 300) % 3;
  px(ctx, base.x + 350, base.y + 56 - s * 4, 3, 3, "rgba(255,255,255,0.7)");
  disc(ctx, base.x + 400, base.y + 240, 0, C.out);
}
