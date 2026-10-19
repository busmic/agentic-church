/**
 * Renders the static town background (grass, roads, trees, props, buildings) to an offscreen
 * canvas once. Agents and labels are drawn on top every frame by the TownCanvas component.
 */
import { PLACES, PROPS, ROADS, WORLD, type Place } from "../places";
import { BUILDINGS, type Rect } from "./buildings";
import { C, bench, bush, fence, flower, fountain, lamp, plaza, px, tree, type Ctx } from "./draw";

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Smooth polyline through points using quadratic curves. */
function roadPath(ctx: Ctx, pts: [number, number][]) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 2) {
    ctx.lineTo(pts[1][0], pts[1][1]);
    return;
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
}

function distToSeg(px0: number, py0: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px0 - ax) * dx + (py0 - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const x = ax + t * dx, y = ay + t * dy;
  return Math.hypot(px0 - x, py0 - y);
}

export function distToRoads(x: number, y: number): number {
  let best = Infinity;
  for (const r of ROADS) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      best = Math.min(best, distToSeg(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]));
    }
  }
  return best;
}

/** All road vertices: used as wander waypoints for agents without a place. */
export const ROAD_NODES: [number, number][] = ROADS.flatMap((r) => r.pts).filter(([x, y]) => x > 60 && x < WORLD.w - 60 && y > 60 && y < WORLD.h - 60);

function inAnyBuilding(x: number, y: number, margin: number): boolean {
  for (const p of PLACES) {
    const r = p.rect;
    if (x > r.x - margin && x < r.x + r.w + margin && y > r.y - margin - 40 && y < r.y + r.h + margin) return true;
  }
  if (Math.hypot(x - PROPS.fountain.x, y - PROPS.fountain.y) < 150) return true;
  return false;
}

export interface Tree { x: number; y: number; size: number; variant: number }

export function generateTrees(): Tree[] {
  const rnd = seeded(20251019);
  const trees: Tree[] = [];
  // dense woods around the edges and in clusters
  const attempts = 3200;
  for (let i = 0; i < attempts; i++) {
    const x = rnd() * WORLD.w;
    const y = rnd() * WORLD.h;
    const edge = Math.min(x, y, WORLD.w - x, WORLD.h - y);
    const nearOpenNode = Math.hypot(x - 1760, y - 150) < 260;
    const density = edge < 140 ? 0.95 : nearOpenNode ? 0.85 : 0.34;
    if (rnd() > density) continue;
    if (inAnyBuilding(x, y, 36)) continue;
    if (distToRoads(x, y) < 58) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.y - y) < 44)) continue;
    trees.push({ x, y, size: 0.85 + rnd() * 0.4, variant: rnd() < 0.15 ? 1 : 0 });
  }
  return trees;
}

export function renderBackground(): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = WORLD.w;
  cv.height = WORLD.h;
  const ctx = cv.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  // grass + texture
  px(ctx, 0, 0, WORLD.w, WORLD.h, C.grass);
  const rnd = seeded(7);
  for (let i = 0; i < 9000; i++) {
    const x = Math.floor((rnd() * WORLD.w) / 4) * 4;
    const y = Math.floor((rnd() * WORLD.h) / 4) * 4;
    const k = rnd();
    px(ctx, x, y, 4, 4, k < 0.5 ? C.grass2 : k < 0.9 ? C.grass3 : C.darkgreen);
    if (k > 0.97) px(ctx, x + 4, y, 4, 4, C.grass2);
  }
  // wild flowers
  for (let i = 0; i < 260; i++) {
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h;
    if (inAnyBuilding(x, y, 10) || distToRoads(x, y) < 40) continue;
    flower(ctx, x, y, [C.pink, C.yellow, C.white, C.red][i % 4]);
  }

  // roads
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const r of ROADS) {
    ctx.strokeStyle = C.road2;
    ctx.lineWidth = (r.width ?? 64) + 10;
    roadPath(ctx, r.pts);
    ctx.stroke();
  }
  for (const r of ROADS) {
    ctx.strokeStyle = C.road;
    ctx.lineWidth = r.width ?? 64;
    roadPath(ctx, r.pts);
    ctx.stroke();
  }
  // road speckle
  for (let i = 0; i < 1500; i++) {
    const x = Math.floor((rnd() * WORLD.w) / 4) * 4, y = Math.floor((rnd() * WORLD.h) / 4) * 4;
    if (distToRoads(x, y) < 26) px(ctx, x, y, 4, 4, C.road2);
  }

  // fountain plaza
  plaza(ctx, PROPS.fountain.x, PROPS.fountain.y, 120);
  fountain(ctx, PROPS.fountain.x, PROPS.fountain.y);
  lamp(ctx, PROPS.fountain.x - 150, PROPS.fountain.y - 60);
  lamp(ctx, PROPS.fountain.x + 150, PROPS.fountain.y - 60);
  lamp(ctx, PROPS.fountain.x - 150, PROPS.fountain.y + 90);
  lamp(ctx, PROPS.fountain.x + 150, PROPS.fountain.y + 90);
  bench(ctx, PROPS.fountain.x - 110, PROPS.fountain.y + 10);
  bench(ctx, PROPS.fountain.x + 70, PROPS.fountain.y + 10);

  // misc props
  lamp(ctx, 1040, 690);
  lamp(ctx, 1480, 500);
  lamp(ctx, 760, 460);
  lamp(ctx, 1300, 1000);
  lamp(ctx, 1650, 900);
  lamp(ctx, 350, 700);
  bench(ctx, 1230, 520);
  bench(ctx, 1760, 1000);
  bench(ctx, 720, 1140);
  fence(ctx, 700, 1080, 120);
  fence(ctx, 860, 1080, 120);
  fence(ctx, 2180, 940, 90);
  for (let i = 0; i < 6; i++) bush(ctx, 1180 + i * 30, 700, 0.7, i % 2 === 0);

  // drawables sorted by base y so taller things overlap correctly
  const trees = generateTrees();
  type D = { y: number; draw: () => void };
  const items: D[] = [];
  for (const t of trees) items.push({ y: t.y, draw: () => tree(ctx, t.x, t.y, t.size, t.variant) });
  for (const p of PLACES) {
    const draw = BUILDINGS[p.slug];
    if (draw) items.push({ y: p.rect.y + p.rect.h, draw: () => draw(ctx, p.rect) });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  return cv;
}

/** Returns the place whose rect (plus a label margin) contains the world point. */
export function hitPlace(x: number, y: number): Place | undefined {
  for (const p of PLACES) {
    const r = p.rect;
    if (x >= r.x - 10 && x <= r.x + r.w + 10 && y >= r.y - 60 && y <= r.y + r.h + 24) return p;
  }
  return undefined;
}

export const rectOf = (p: Place): Rect => p.rect;
