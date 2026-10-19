/**
 * Interior rooms, one per place, matching the design references in design/.
 * Each drawer paints the room into a 400x320 canvas and returns where agents and hosts stand.
 */
import { C, arch, bench, box, crate, crossSymbol, disc, flower, pond, px, stall, tri, type Ctx } from "./draw";

export const ROOM = { w: 400, h: 320 };
export type Pt = [number, number];
export interface Npc { name: string; pos: Pt; robe: string; accent: string }
export interface RoomSpots {
  leader: Pt;
  agents: Pt[];
  confession?: Pt;
  queue?: Pt[];
  confessionBadge?: Pt;
  robe: string;
  accent: string;
  /** Extra static hosts (e.g. stall-keepers). */
  npcs?: Npc[];
}
type Drawer = (ctx: Ctx, occupied: { confessing: boolean }) => RoomSpots;

// ---------------------------------------------------------------- shared bits
function floorTiles(ctx: Ctx, a: string, b: string, size = 20, y0 = 90) {
  px(ctx, 0, y0, ROOM.w, ROOM.h - y0, a);
  for (let y = y0; y < ROOM.h; y += size) for (let x = 0; x < ROOM.w; x += size) if (((x + y) / size) % 2 === 0) px(ctx, x, y, size, size, b);
}
function planks(ctx: Ctx, y0: number, a = "#c9975f", b = "#b8884f") {
  px(ctx, 0, y0, ROOM.w, ROOM.h - y0, a);
  for (let y = y0; y < ROOM.h; y += 14) {
    px(ctx, 0, y, ROOM.w, 2, b);
    for (let x = ((y / 14) % 2) * 40; x < ROOM.w; x += 80) px(ctx, x, y + 2, 2, 12, b);
  }
}
function wall(ctx: Ctx, color: string, trim: string, h = 90) {
  px(ctx, 0, 0, ROOM.w, h, color);
  px(ctx, 0, h - 8, ROOM.w, 8, trim);
  px(ctx, 0, h - 2, ROOM.w, 2, C.out);
}
function doorMat(ctx: Ctx) {
  px(ctx, 176, ROOM.h - 8, 48, 8, C.brown);
  px(ctx, 176, ROOM.h - 8, 48, 2, C.out);
}
function stainedGlass(ctx: Ctx, x: number, y: number, w: number, h: number) {
  arch(ctx, x, y, w, h, C.navy);
  const cols = [C.red, C.gold, C.blue, C.green, C.purple, C.orange, C.pink];
  let i = 0;
  for (let yy = y + w / 2; yy < y + h - 4; yy += 6) for (let xx = x + 3; xx < x + w - 3; xx += 6) px(ctx, xx, yy, 5, 5, cols[i++ % cols.length]);
  px(ctx, x + w / 2 - 1, y + 4, 2, h - 8, C.out);
}
function paneWindow(ctx: Ctx, x: number, y: number, w: number, h: number, frame = C.brown2, glass = C.lightblue) {
  box(ctx, x, y, w, h, glass, frame, 3);
  px(ctx, x + w / 2 - 1, y + 3, 2, h - 6, frame);
  px(ctx, x + 3, y + h / 2 - 1, w - 6, 2, frame);
}
function candle(ctx: Ctx, x: number, y: number, h = 14) {
  px(ctx, x, y, 4, h, C.white);
  px(ctx, x + 1, y - 4, 2, 4, C.gold);
  px(ctx, x + 1, y - 6, 2, 2, C.orange);
}
function pew(ctx: Ctx, x: number, y: number, w = 90) {
  box(ctx, x, y, w, 10, C.brown2);
  box(ctx, x, y + 10, w, 8, C.brown);
}
function table(ctx: Ctx, x: number, y: number, w = 40, h = 24) {
  box(ctx, x, y, w, h, C.brown2);
  px(ctx, x + 4, y + h, 4, 6, C.out);
  px(ctx, x + w - 8, y + h, 4, 6, C.out);
}
function chair(ctx: Ctx, x: number, y: number, color = C.brown) {
  box(ctx, x, y, 14, 12, color, C.out, 2);
}
function shelf(ctx: Ctx, x: number, y: number, w: number, h: number) {
  box(ctx, x, y, w, h, C.brown);
  const cols = [C.red, C.blue, C.green, C.gold, C.purple, C.teal, C.orange, C.pink];
  for (let row = 0; row < Math.floor((h - 8) / 20); row++) {
    for (let i = 0; i < Math.floor((w - 8) / 8); i++) px(ctx, x + 5 + i * 8, y + 6 + row * 20, 6, 12, cols[(i * 3 + row) % cols.length]);
    px(ctx, x + 3, y + 18 + row * 20, w - 6, 2, C.darkbrown);
  }
}
function lantern(ctx: Ctx, x: number, y: number) {
  px(ctx, x + 3, y - 10, 2, 10, C.out);
  box(ctx, x - 2, y, 12, 16, C.gold, C.out, 2);
  px(ctx, x + 2, y + 4, 4, 8, C.gold2);
}
function plant(ctx: Ctx, x: number, y: number, pot = C.orange) {
  disc(ctx, x, y - 8, 10, C.green, C.out, 2);
  disc(ctx, x - 4, y - 12, 5, C.green2, undefined, 2);
  box(ctx, x - 7, y, 14, 12, pot, C.out, 2);
}
function glow(ctx: Ctx, x: number, y: number, r: number, color = "rgba(245,211,90,0.28)") {
  ctx.fillStyle = color;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function text(ctx: Ctx, t: string, x: number, y: number, color = "#f1ecdc", size = 8, align: CanvasTextAlign = "center") {
  ctx.font = `700 ${size}px "Pixelify Sans", monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(t, x, y);
}
function label(ctx: Ctx, t: string, cx: number, y: number, bg = "#2b332b") {
  ctx.font = '700 9px "Pixelify Sans", monospace';
  const tw = ctx.measureText(t).width;
  const w = tw + 10;
  px(ctx, cx - w / 2 - 1, y - 1, w + 2, 13, C.black);
  px(ctx, cx - w / 2, y, w, 11, bg);
  text(ctx, t, cx, y + 6, "#f1ecdc", 9);
}
export { label as roomLabel };
function bunting(ctx: Ctx, y: number) {
  px(ctx, 0, y, ROOM.w, 1, C.out);
  const cols = [C.red, C.gold, C.green, C.blue, C.pink, C.orange, C.purple];
  for (let x = 4; x < ROOM.w; x += 18) tri(ctx, x, y + 1, 10, 8, cols[(x / 18) % cols.length], 2);
}
function hedge(ctx: Ctx, y: number) {
  for (let i = 0; i < ROOM.w; i += 18) disc(ctx, i + 9, y, 9, C.green2, C.out, 2);
}
function blossom(ctx: Ctx, x: number, y: number) {
  px(ctx, x - 3, y - 10, 6, 12, C.darkbrown);
  disc(ctx, x, y - 22, 18, C.pink2, C.out, 2);
  disc(ctx, x - 6, y - 28, 8, "#fbd3e3", undefined, 2);
}
function chairGrid(ctx: Ctx, x0: number, y0: number, cols: number, rows: number, dx: number, dy: number, color: string) {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) chair(ctx, x0 + c * dx, y0 + r * dy, color);
}
const grid = (x0: number, y0: number, cols: number, rows: number, dx: number, dy: number): Pt[] => {
  const out: Pt[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push([x0 + c * dx, y0 + r * dy]);
  return out;
};

/** Official Open Node glyph: three pale-mint nodes linked to a warm gold centre inside a navy ring. */
export function nodeGlyph(ctx: Ctx, cx: number, cy: number, r: number) {
  disc(ctx, cx, cy, r, C.navy, C.out, 2);
  disc(ctx, cx, cy, r - 5, "#1f2a4a", undefined, 2);
  const k = r / 18;
  const nodes: Pt[] = [[cx, cy - 9 * k], [cx - 8 * k, cy + 6 * k], [cx + 8 * k, cy + 6 * k]];
  for (const [nx, ny] of nodes) px(ctx, Math.min(cx, nx), Math.min(cy, ny), Math.abs(nx - cx) || 2, Math.abs(ny - cy) || 2, "#8fd6c0");
  for (const [nx, ny] of nodes) px(ctx, nx - 2 * k, ny - 2 * k, 4 * k, 4 * k, "#b8f0dd");
  px(ctx, cx - 3 * k, cy - 3 * k, 6 * k, 6 * k, C.gold);
}

// ---------------------------------------------------------------- worship

const stClares: Drawer = (ctx, occ) => {
  wall(ctx, C.stone, C.stone2, 96);
  for (let i = 0; i < ROOM.w; i += 24) for (let j = 0; j < 90; j += 12) if ((i / 24 + j / 12) % 2 === 0) px(ctx, i, j, 24, 12, "#c6bea9");
  stainedGlass(ctx, 24, 14, 30, 64);
  stainedGlass(ctx, 70, 14, 30, 64);
  stainedGlass(ctx, 300, 14, 30, 64);
  stainedGlass(ctx, 346, 14, 30, 64);
  // crucifix: pale figure on a wooden cross (no facial features)
  crossSymbol(ctx, 200, 44, 56, C.brown2, 8);
  px(ctx, 196, 26, 8, 8, C.skin); // head
  px(ctx, 197, 34, 6, 18, C.skin); // body
  px(ctx, 184, 36, 32, 4, C.skin); // arms
  px(ctx, 196, 52, 3, 10, C.skin); px(ctx, 201, 52, 3, 10, C.skin); // legs
  px(ctx, 196, 44, 8, 4, C.white); // cloth
  floorTiles(ctx, "#d8cdb6", "#cfc3aa", 20, 96);
  px(ctx, 184, 96, 32, ROOM.h - 96, C.darkred);
  px(ctx, 188, 96, 24, ROOM.h - 96, C.red);
  box(ctx, 150, 100, 100, 26, C.white);
  px(ctx, 154, 104, 92, 6, C.green);
  px(ctx, 154, 112, 92, 4, C.gold);
  candle(ctx, 160, 90, 14);
  candle(ctx, 236, 90, 14);
  disc(ctx, 200, 92, 6, C.gold, C.out, 2);
  for (let r = 0; r < 4; r++) {
    pew(ctx, 60, 150 + r * 36, 110);
    pew(ctx, 230, 150 + r * 36, 110);
  }
  box(ctx, 326, 130, 64, 120, C.darkbrown);
  px(ctx, 332, 136, 52, 50, C.brown);
  px(ctx, 334, 190, 48, 54, C.purple);
  for (let i = 0; i < 6; i++) px(ctx, 336 + i * 8, 194, 4, 46, "#6f4aa8");
  px(ctx, 352, 150, 12, 12, C.gold2);
  crossSymbol(ctx, 358, 146, 12, C.gold, 2);
  px(ctx, 374, 136, 8, 8, occ.confessing ? C.red : C.darkgreen);
  flower(ctx, 120, 118, C.white);
  flower(ctx, 280, 118, C.white);
  doorMat(ctx);
  return {
    leader: [200, 150],
    agents: [[80, 150], [120, 150], [250, 150], [290, 150], [80, 186], [120, 186], [250, 186], [290, 186], [80, 222], [120, 222], [250, 222], [290, 222], [80, 258], [120, 258], [250, 258], [290, 258]],
    confession: [358, 236],
    queue: [[358, 280], [320, 290], [284, 296]],
    confessionBadge: [358, 118],
    robe: C.white,
    accent: C.green,
  };
};

const holyTrinity: Drawer = (ctx) => {
  wall(ctx, C.gold, C.brown2, 110);
  px(ctx, 0, 0, ROOM.w, 110, "#d9a93a");
  for (let i = 0; i < ROOM.w; i += 16) px(ctx, i, 0, 8, 10, C.gold2);
  const panels = [20, 70, 120, 230, 280, 330];
  const cols = [C.red, C.blue, C.teal, C.red, C.blue, C.teal];
  panels.forEach((x, i) => {
    // icon: gold ground, halo, simple face shape (no features), coloured robe
    box(ctx, x, 30, 42, 60, C.gold2, C.out, 3);
    disc(ctx, x + 21, 50, 11, C.gold, C.out, 2);
    px(ctx, x + 16, 44, 10, 12, C.skin);
    px(ctx, x + 9, 58, 24, 28, cols[i]);
    px(ctx, x + 19, 62, 4, 20, C.gold2);
  });
  arch(ctx, 176, 24, 48, 80, C.darkred);
  px(ctx, 198, 40, 4, 60, C.gold);
  px(ctx, 184, 50, 10, 14, C.gold2);
  px(ctx, 206, 50, 10, 14, C.gold2);
  floorTiles(ctx, "#d6cbb2", "#cabea4", 20, 110);
  disc(ctx, 200, 230, 70, C.navy, C.out, 4);
  disc(ctx, 200, 230, 58, C.white, undefined, 4);
  disc(ctx, 200, 230, 44, C.navy, undefined, 4);
  disc(ctx, 200, 230, 30, C.gold, undefined, 4);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    px(ctx, 200 + Math.cos(a) * 52 - 2, 230 + Math.sin(a) * 52 - 2, 4, 4, C.gold2);
  }
  for (const cx of [130, 270]) {
    px(ctx, cx - 2, 130, 4, 24, C.gold);
    box(ctx, cx - 12, 120, 24, 10, C.gold, C.out, 2);
    for (let i = 0; i < 5; i++) candle(ctx, cx - 10 + i * 5, 110, 8);
  }
  box(ctx, 40, 200, 30, 26, C.brown2);
  px(ctx, 46, 204, 18, 14, C.gold2);
  px(ctx, 50, 208, 10, 8, C.red);
  box(ctx, 8, 130, 14, 160, C.darkbrown);
  box(ctx, 378, 130, 14, 160, C.darkbrown);
  doorMat(ctx);
  return {
    leader: [200, 150],
    agents: [[150, 270], [250, 270], [120, 230], [280, 230], [160, 300], [240, 300], [100, 290], [300, 290], [90, 170], [310, 170], [200, 300], [140, 180]],
    confession: [36, 240],
    queue: [[70, 270], [100, 300]],
    confessionBadge: [60, 182],
    robe: C.gold2,
    accent: C.darkred,
  };
};

const graceChapel: Drawer = (ctx) => {
  wall(ctx, "#f3eee0", C.stone2, 96);
  // organ pipes
  for (let i = 0; i < 9; i++) {
    const h = 30 + Math.abs(4 - i) * 6;
    px(ctx, 24 + i * 7, 76 - h, 5, h, C.lightgray);
    px(ctx, 24 + i * 7, 76 - h, 2, h, C.white);
  }
  px(ctx, 20, 76, 68, 6, C.brown2);
  // windows and cross
  for (const x of [124, 258, 318]) paneWindow(ctx, x, 20, 36, 56, C.brown2, "#e4f0fb");
  crossSymbol(ctx, 206, 46, 54, C.brown2, 8);
  planks(ctx, 96);
  // piano (left) and altar table with flowers (right)
  box(ctx, 26, 104, 70, 26, C.black, C.out, 2);
  for (let i = 0; i < 12; i++) px(ctx, 30 + i * 5, 108, 4, 10, i % 3 === 1 ? C.black : C.white);
  box(ctx, 40, 134, 44, 8, C.brown2, C.out, 2);
  box(ctx, 258, 110, 70, 18, C.brown2, C.out, 2);
  for (let i = 0; i < 2; i++) {
    disc(ctx, 300 + i * 26, 104, 7, C.white, C.out, 2);
    px(ctx, 298 + i * 26, 102, 4, 4, C.gold);
  }
  flower(ctx, 272, 100, C.white);
  // pulpit
  box(ctx, 216, 102, 40, 24, C.brown2, C.out, 2);
  px(ctx, 222, 106, 28, 6, C.white);
  // pews
  for (let r = 0; r < 4; r++) {
    pew(ctx, 44, 150 + r * 40, 130);
    pew(ctx, 226, 150 + r * 40, 130);
  }
  doorMat(ctx);
  return {
    leader: [200, 150],
    agents: [[70, 150], [110, 150], [150, 150], [250, 150], [290, 150], [330, 150], [70, 190], [110, 190], [150, 190], [250, 190], [290, 190], [330, 190], [70, 230], [110, 230], [250, 230], [290, 230], [90, 270], [310, 270]],
    robe: C.navy,
    accent: C.white,
  };
};

const alNoor: Drawer = (ctx) => {
  px(ctx, 0, 0, ROOM.w, 100, "#f4efe4");
  // geometric mosaic bands
  for (const y of [8, 76]) for (let x = 0; x < ROOM.w; x += 12) {
    px(ctx, x, y, 6, 6, C.teal);
    px(ctx, x + 6, y + 6, 6, 6, C.teal2);
    px(ctx, x + 6, y, 6, 6, C.gold2);
    px(ctx, x, y + 6, 6, 6, C.white);
  }
  // mihrab: navy arch with gold frame and hanging lamp
  arch(ctx, 170, 22, 60, 76, C.gold, C.out, 2);
  arch(ctx, 178, 32, 44, 66, C.navy, C.gold, 2);
  for (let y = 44; y < 92; y += 8) for (let x = 182; x < 218; x += 8) if (((x + y) / 8) % 2 === 0) px(ctx, x, y, 3, 3, C.gold2);
  px(ctx, 199, 30, 2, 20, C.gold);
  box(ctx, 194, 50, 12, 14, C.gold2, C.out, 2);
  px(ctx, 0, 96, ROOM.w, 4, C.out);
  // red carpet with rug rows
  px(ctx, 0, 100, ROOM.w, 190, "#b3433a");
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
    const x = 14 + c * 47, y = 110 + r * 44;
    const green = (r + c) % 2 === 1;
    box(ctx, x, y, 38, 34, green ? C.darkgreen : "#c9544a", C.gold2, 2);
    if (green) tri(ctx, x + 11, y + 8, 16, 14, C.green2, 2);
    else arch(ctx, x + 12, y + 8, 14, 20, "#e77a6c", C.gold2, 2);
  }
  // shoe rack and tiled strip
  floorTiles(ctx, "#e7dcc0", "#ddd0b2", 16, 290);
  box(ctx, 20, 292, 120, 24, C.brown2, C.out, 2);
  for (let i = 0; i < 10; i++) px(ctx, 26 + i * 11, 296 + (i % 2) * 8, 8, 6, [C.black, C.brown, C.gray, C.navy, C.white][i % 5]);
  for (let i = 0; i < 6; i++) px(ctx, 300 + (i % 3) * 14, 298 + Math.floor(i / 3) * 9, 8, 6, [C.darkbrown, C.blue, C.white][i % 3]);
  doorMat(ctx);
  return {
    leader: [200, 138],
    agents: [[33, 150], [127, 150], [80, 194], [174, 194], [221, 194], [268, 194], [315, 194], [362, 194], [33, 238], [80, 238], [127, 238], [221, 238], [268, 238], [315, 238], [362, 238], [174, 282], [80, 282]],
    robe: C.white,
    accent: C.teal,
  };
};

const bethShalom: Drawer = (ctx) => {
  wall(ctx, "#efe7d2", C.stone2, 100);
  // side stained windows, menorah, round star window
  stainedGlass(ctx, 24, 16, 30, 54);
  stainedGlass(ctx, 346, 16, 30, 54);
  for (let i = 0; i < 7; i++) {
    px(ctx, 82 + i * 7, 46 - (i === 3 ? 8 : 0), 3, 26 + (i === 3 ? 8 : 0), C.gold);
    px(ctx, 82 + i * 7, 42 - (i === 3 ? 8 : 0), 3, 4, C.orange);
  }
  px(ctx, 80, 72, 48, 4, C.gold);
  px(ctx, 102, 76, 4, 8, C.gold);
  disc(ctx, 302, 40, 18, C.lightblue, C.out, 2);
  tri(ctx, 292, 30, 20, 16, C.blue, 2);
  ctx.save(); ctx.translate(302, 50); ctx.scale(1, -1); tri(ctx, -10, -16, 20, 16, C.blue, 2); ctx.restore();
  px(ctx, 297, 36, 10, 8, C.lightblue);
  // ark: gold frame, navy curtain, open scroll above
  box(ctx, 160, 14, 80, 76, C.gold, C.out, 3);
  px(ctx, 168, 34, 64, 50, C.navy);
  for (let i = 0; i < 8; i++) px(ctx, 170 + i * 8, 36, 3, 46, C.blue);
  box(ctx, 178, 18, 44, 16, C.white, C.out, 2);
  px(ctx, 199, 20, 2, 12, C.out);
  for (let i = 0; i < 3; i++) { px(ctx, 182, 22 + i * 4, 14, 1, C.out); px(ctx, 204, 22 + i * 4, 14, 1, C.out); }
  // ner tamid (eternal lamp) below ark
  px(ctx, 199, 90, 2, 10, C.gold);
  disc(ctx, 200, 106, 6, C.red, C.out, 2);
  glow(ctx, 200, 106, 10, "rgba(224,83,61,0.25)");
  planks(ctx, 100, "#c9975f", "#b8884f");
  // bimah: raised platform with reading desk
  box(ctx, 150, 180, 100, 64, "#a97a4a", C.out, 2);
  px(ctx, 156, 186, 88, 52, "#b8884f");
  box(ctx, 178, 182, 44, 20, C.white, C.out, 2);
  px(ctx, 182, 186, 36, 4, C.navy);
  // pews: 2 columns x 6 rows
  for (let r = 0; r < 6; r++) {
    pew(ctx, 30, 120 + r * 30, 100);
    pew(ctx, 270, 120 + r * 30, 100);
  }
  doorMat(ctx);
  return {
    leader: [200, 208],
    agents: [[55, 120], [95, 120], [295, 120], [335, 120], [55, 150], [95, 150], [295, 150], [335, 150], [55, 180], [95, 180], [295, 180], [335, 180], [55, 210], [335, 210], [55, 240], [335, 240], [75, 270], [315, 270]],
    robe: C.navy,
    accent: C.white,
  };
};

const shreeGanesh: Drawer = (ctx) => {
  // marigold garland band
  px(ctx, 0, 0, ROOM.w, 12, C.red);
  for (let x = 0; x < ROOM.w; x += 10) px(ctx, x + 2, 3, 6, 6, x % 20 ? C.orange : C.yellow);
  px(ctx, 0, 12, ROOM.w, 86, "#f6ebd2");
  // shrine arch
  box(ctx, 150, 20, 100, 78, C.orange, C.out, 3);
  arch(ctx, 166, 30, 68, 68, C.darkred, C.gold, 2);
  arch(ctx, 176, 42, 48, 56, C.gold2, C.orange, 2);
  // Ganesha murti: crown, head with trunk, body, garland (chunky, no facial features)
  tri(ctx, 190, 36, 20, 10, C.gold, 2); px(ctx, 190, 44, 20, 4, C.gold);
  disc(ctx, 200, 56, 10, C.orange, C.out, 2);
  px(ctx, 186, 52, 6, 8, C.orange); px(ctx, 208, 52, 6, 8, C.orange); // ears
  px(ctx, 198, 60, 4, 12, C.orange); px(ctx, 198, 70, 8, 4, C.orange); // trunk
  disc(ctx, 200, 80, 12, C.orange, C.out, 2); // body
  for (let i = 0; i < 7; i++) px(ctx, 186 + i * 4, 70 + (i % 2) * 2 + 2, 3, 3, i % 2 ? C.yellow : C.red); // garland
  for (let i = 0; i < 4; i++) px(ctx, 180 + i * 12, 92, 6, 6, i % 2 ? C.orange : C.yellow);
  px(ctx, 0, 92, ROOM.w, 6, C.red);
  px(ctx, 0, 98, ROOM.w, 2, C.out);
  // pillars
  for (const [x, y] of [[36, 110], [36, 220], [356, 110], [356, 220]] as Pt[]) box(ctx, x, y, 16, 16, C.orange2, C.out, 2);
  floorTiles(ctx, "#e9dfc6", "#dfd4b6", 20, 100);
  // diyas (lamps) with glow flanking the pandit
  for (const x of [150, 250]) {
    glow(ctx, x, 136, 14);
    box(ctx, x - 8, 136, 16, 8, C.gold, C.out, 2);
    px(ctx, x - 2, 128, 4, 8, C.orange);
    px(ctx, x - 1, 124, 2, 4, C.yellow);
  }
  // marigold strip and mats
  for (let i = 0; i < 8; i++) px(ctx, 168 + i * 8, 124, 6, 6, i % 2 ? C.orange : C.yellow);
  for (let r = 0; r < 3; r++) for (const x of [60, 220]) {
    box(ctx, x, 200 + r * 32, 120, 16, "#d94c3a", C.out, 2);
    px(ctx, x + 4, 206 + r * 32, 112, 4, C.orange);
  }
  // bells
  for (const x of [120, 280]) { px(ctx, x, 104, 2, 12, C.out); disc(ctx, x + 1, 120, 6, C.gold, C.out, 2); }
  doorMat(ctx);
  return {
    leader: [200, 152],
    agents: [[100, 200], [140, 200], [260, 200], [300, 200], [100, 232], [140, 232], [260, 232], [300, 232], [100, 264], [140, 264], [260, 264], [300, 264], [200, 290]],
    robe: C.orange,
    accent: C.gold,
  };
};

const lotusGarden: Drawer = (ctx) => {
  px(ctx, 0, 0, ROOM.w, 100, "#f1e8d2");
  px(ctx, 0, 0, ROOM.w, 14, C.darkred);
  // prayer flags
  const fc = [C.blue, C.white, C.red, C.green, C.gold];
  for (let x = 6; x < ROOM.w; x += 20) box(ctx, x, 16, 14, 12, fc[(x / 20) % 5], C.out, 1);
  px(ctx, 0, 14, ROOM.w, 2, C.out);
  // red pillars
  for (const x of [20, 110, 276, 366]) box(ctx, x, 30, 14, 68, C.darkred, C.out, 2);
  // Buddha statue in gold with halo on a lotus
  glow(ctx, 200, 60, 40, "rgba(245,211,90,0.3)");
  disc(ctx, 200, 54, 30, C.gold2, C.gold, 2);
  disc(ctx, 200, 42, 9, C.gold, C.out, 2);
  px(ctx, 198, 32, 4, 4, C.gold);
  box(ctx, 186, 50, 28, 22, C.gold, C.out, 2);
  px(ctx, 180, 66, 40, 8, C.gold);
  for (let i = 0; i < 5; i++) tri(ctx, 176 + i * 10, 74, 10, 8, C.pink, 2);
  px(ctx, 170, 82, 60, 6, C.pink2);
  px(ctx, 0, 92, ROOM.w, 6, C.darkred);
  px(ctx, 0, 98, ROOM.w, 2, C.out);
  planks(ctx, 100);
  // gong (left), shrine table (centre), candles (right)
  box(ctx, 40, 110, 32, 28, C.brown, C.out, 2);
  disc(ctx, 56, 124, 9, C.gold, C.out, 2);
  box(ctx, 160, 104, 80, 14, C.darkred, C.out, 2);
  for (let i = 0; i < 4; i++) flower(ctx, 168 + i * 20, 100, C.pink);
  for (let r = 0; r < 6; r++) { box(ctx, 376, 150 + r * 26, 14, 14, C.gold2, C.out, 2); px(ctx, 382, 146 + r * 26, 2, 4, C.orange); }
  // incense
  px(ctx, 230, 136, 2, 10, C.gray); px(ctx, 230, 132, 2, 4, C.orange);
  // cushions: red squares with darker centre
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
    const x = 44 + c * 56 + (c > 2 ? 16 : 0), y = 164 + r * 52;
    box(ctx, x, y, 22, 18, C.red, C.out, 2);
    px(ctx, x + 7, y + 5, 8, 8, C.darkred);
  }
  doorMat(ctx);
  return {
    leader: [200, 150],
    agents: grid(55, 176, 3, 3, 56, 52).concat(grid(239, 176, 3, 3, 56, 52)),
    robe: C.orange,
    accent: C.darkred,
  };
};

const openNode: Drawer = (ctx) => {
  px(ctx, 0, 0, ROOM.w, 100, "#2d2b5a");
  // circuit traces
  ctx.fillStyle = C.gold;
  for (const [x, y, w, h] of [[20, 30, 60, 2], [80, 30, 2, 30], [40, 60, 70, 2], [20, 76, 40, 2], [300, 30, 70, 2], [300, 30, 2, 40], [320, 70, 60, 2], [350, 50, 30, 2]]) px(ctx, x, y, w, h, C.gold);
  for (const [x, y] of [[20, 30], [80, 60], [110, 60], [60, 76], [300, 30], [370, 30], [380, 70], [350, 50]]) px(ctx, x - 2, y - 2, 5, 5, C.gold2);
  // node ring with glow
  glow(ctx, 200, 48, 44, "rgba(147,197,239,0.18)");
  nodeGlyph(ctx, 200, 48, 36);
  px(ctx, 0, 92, ROOM.w, 8, C.gold);
  px(ctx, 0, 98, ROOM.w, 2, C.out);
  // floor: dark purple grid, teal aisle
  px(ctx, 0, 100, ROOM.w, ROOM.h - 100, "#3b3a72");
  for (let x = 0; x < ROOM.w; x += 20) px(ctx, x, 100, 1, ROOM.h - 100, "#4a4986");
  for (let y = 100; y < ROOM.h; y += 20) px(ctx, 0, y, ROOM.w, 1, "#4a4986");
  px(ctx, 198, 150, 4, 170, C.teal2);
  glow(ctx, 200, 140, 24, "rgba(79,179,172,0.18)");
  // pews: navy with teal highlight, two columns of pairs
  for (let r = 0; r < 3; r++) for (const x of [36, 102, 232, 298]) {
    box(ctx, x, 158 + r * 50, 60, 26, "#5b5aa8", C.out, 2);
    px(ctx, x + 4, 162 + r * 50, 52, 3, C.teal2);
    px(ctx, x + 8, 170 + r * 50, 4, 4, C.teal2);
  }
  plant(ctx, 26, 128); plant(ctx, 374, 128); plant(ctx, 26, 304); plant(ctx, 374, 304);
  doorMat(ctx);
  return {
    leader: [200, 140],
    agents: [[66, 160], [132, 160], [262, 160], [328, 160], [66, 210], [132, 210], [262, 210], [328, 210], [66, 260], [132, 260], [262, 260], [328, 260]],
    robe: C.lightblue,
    accent: C.navy,
  };
};

// ---------------------------------------------------------------- town

const commonGrounds: Drawer = (ctx) => {
  wall(ctx, "#e6d3b3", C.brown, 96);
  // cup shelf, menu board, window
  box(ctx, 12, 20, 90, 36, C.brown2, C.out, 2);
  for (let i = 0; i < 7; i++) px(ctx, 18 + i * 12, 26, 8, 8, [C.red, C.blue, C.yellow, C.green, C.pink, C.orange, C.white][i]);
  px(ctx, 16, 36, 82, 2, C.darkbrown);
  for (let i = 0; i < 7; i++) px(ctx, 18 + i * 12, 42, 8, 8, [C.white, C.teal, C.purple, C.red, C.gold, C.blue, C.green][i]);
  box(ctx, 120, 14, 170, 60, "#1f3a2a", C.out, 2);
  text(ctx, "MENU", 205, 26, C.gold2, 9);
  text(ctx, "Flat white · Chai latte", 205, 42, "#f1ecdc", 8);
  text(ctx, "Espresso · Cinnamon bun", 205, 56, "#f1ecdc", 8);
  paneWindow(ctx, 306, 14, 76, 60, C.brown2, "#e4f0fb");
  plant(ctx, 318, 40, C.white);
  // counter with espresso machine, pastry case, cups
  box(ctx, 30, 118, 220, 20, C.darkbrown, C.out, 2);
  px(ctx, 34, 122, 212, 6, C.brown2);
  box(ctx, 46, 100, 44, 20, C.gray, C.out, 2);
  px(ctx, 52, 106, 10, 6, C.red); px(ctx, 68, 110, 14, 4, C.black);
  box(ctx, 136, 102, 60, 18, C.cream, C.out, 2);
  for (let i = 0; i < 4; i++) px(ctx, 142 + i * 13, 108, 9, 6, [C.gold, C.pink, C.brown2, C.gold][i]);
  for (let i = 0; i < 3; i++) px(ctx, 208 + i * 12, 108, 8, 8, C.white);
  planks(ctx, 96);
  // big red oval rug
  for (let y = -36; y < 36; y += 4) {
    const half = Math.sqrt(Math.max(0, 1 - (y * y) / (36 * 36))) * 120;
    const hw = Math.round(half / 4) * 4;
    px(ctx, 240 - hw, 226 + y, hw * 2, 4, y % 8 === 0 ? "#c0453a" : "#cc5146");
  }
  // round tables with chairs
  for (const [tx, ty] of [[120, 200], [300, 180], [150, 282], [300, 282]] as Pt[]) {
    disc(ctx, tx, ty, 14, C.brown2, C.out, 2);
    chair(ctx, tx - 28, ty - 6); chair(ctx, tx + 14, ty - 6);
  }
  plant(ctx, 26, 300); plant(ctx, 376, 300); plant(ctx, 376, 150, C.blue);
  doorMat(ctx);
  return {
    leader: [100, 150],
    agents: [[92, 196], [148, 196], [272, 176], [328, 176], [122, 278], [178, 278], [272, 278], [328, 278], [220, 150], [60, 240], [360, 240]],
    robe: C.brown2,
    accent: C.white,
  };
};

const library: Drawer = (ctx) => {
  px(ctx, 0, 0, ROOM.w, 96, "#e8dcc3");
  const names = ["Sutras", "Bible", "Vedas · Gita", "Tanakh", "Qur'an"];
  names.forEach((n, i) => {
    shelf(ctx, 8 + i * 78, 8, 72, 72);
    label(ctx, n, 44 + i * 78, 70, "#2b332b");
  });
  px(ctx, 0, 92, ROOM.w, 4, C.brown);
  planks(ctx, 96);
  shelf(ctx, 4, 100, 22, 216);
  shelf(ctx, 374, 100, 22, 216);
  // red carpet aisle
  px(ctx, 182, 96, 36, ROOM.h - 96, "#b23e35");
  for (let y = 104; y < ROOM.h; y += 14) px(ctx, 199, y, 2, 6, C.gold2);
  // reading tables with books and green lamps
  for (const [tx, ty] of [[50, 170], [236, 170], [50, 240], [236, 240]] as Pt[]) {
    table(ctx, tx, ty, 116, 24);
    px(ctx, tx + 10, ty + 7, 14, 10, C.white); px(ctx, tx + 12, ty + 9, 10, 2, C.out);
    px(ctx, tx + 92, ty + 7, 14, 10, C.white); px(ctx, tx + 94, ty + 9, 10, 2, C.out);
    px(ctx, tx + 56, ty - 2, 4, 10, C.out); px(ctx, tx + 50, ty - 8, 16, 6, C.green);
    chair(ctx, tx + 12, ty - 14); chair(ctx, tx + 88, ty - 14);
  }
  doorMat(ctx);
  return {
    leader: [200, 150],
    agents: [[62, 160], [138, 160], [248, 160], [324, 160], [62, 230], [138, 230], [248, 230], [324, 230], [90, 290], [300, 290]],
    robe: C.teal,
    accent: C.white,
  };
};

const communityHall: Drawer = (ctx) => {
  wall(ctx, "#eee6cf", C.brown2, 96);
  bunting(ctx, 6);
  for (const x of [24, 66, 300, 342]) paneWindow(ctx, x, 24, 32, 44, C.brown2, C.gold2);
  box(ctx, 110, 30, 180, 34, "#1f3a2a", C.out, 2);
  text(ctx, "Neighbours' supper & talk", 200, 47, "#f1ecdc", 9);
  px(ctx, 116, 44, 6, 6, C.green); px(ctx, 278, 44, 6, 6, C.blue);
  planks(ctx, 96);
  // stage with red curtains
  box(ctx, 60, 100, 280, 56, "#a97a4a", C.out, 2);
  px(ctx, 64, 104, 272, 48, "#b8884f");
  px(ctx, 64, 104, 14, 48, C.darkred); px(ctx, 322, 104, 14, 48, C.darkred);
  disc(ctx, 236, 130, 9, C.gold, C.out, 2);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; px(ctx, 236 + Math.cos(a) * 6 - 1, 130 + Math.sin(a) * 6 - 1, 3, 3, [C.red, C.blue, C.green, C.pink, C.orange, C.purple][i]); }
  // chairs: two blocks of 5 x 4
  chairGrid(ctx, 40, 176, 5, 4, 26, 30, C.blue);
  chairGrid(ctx, 240, 176, 5, 4, 26, 30, C.blue);
  // balloons at right
  [C.red, C.orange, C.green, C.brown2, C.pink, C.gold, C.purple].forEach((c, i) => disc(ctx, 384, 172 + i * 20, 6, c, C.out, 2));
  plant(ctx, 20, 306);
  doorMat(ctx);
  return {
    leader: [200, 150],
    agents: [[86, 176], [138, 176], [286, 176], [338, 176], [60, 206], [112, 206], [260, 206], [312, 206], [86, 236], [138, 236], [286, 236], [338, 236], [60, 266], [112, 266], [260, 266], [312, 266]],
    robe: C.pink,
    accent: C.white,
  };
};

const charityHouse: Drawer = (ctx) => {
  floorTiles(ctx, "#eae2cc", "#e1d8bf", 20, 0);
  paneWindow(ctx, 20, 20, 50, 44, C.brown2, "#e4f0fb");
  paneWindow(ctx, 330, 20, 50, 44, C.brown2, "#e4f0fb");
  box(ctx, 100, 12, 200, 76, C.brown2, C.out, 2);
  ["Winter food drive", "Warm coats", "Clean water"].forEach((t, i) => {
    px(ctx, 110, 22 + i * 22, 180, 12, C.cream);
    px(ctx, 110, 32 + i * 22, 180, 2, [C.green, C.orange, C.blue][i]);
    text(ctx, t, 200, 28 + i * 22, "#1a1816", 8);
  });
  px(ctx, 0, 92, ROOM.w, 6, C.blue);
  px(ctx, 0, 98, ROOM.w, 2, C.out);
  floorTiles(ctx, "#eae2cc", "#e1d8bf", 20, 100);
  // volunteer desk with box and sign
  box(ctx, 30, 112, 150, 20, C.brown2, C.out, 2);
  box(ctx, 40, 100, 20, 14, C.white, C.out, 2);
  for (let i = 0; i < 3; i++) px(ctx, 44, 104 + i * 3, 12, 1, C.gray);
  box(ctx, 150, 96, 22, 18, C.gold2, C.out, 2);
  // crates with food and clothes
  const goods = [[C.red, C.green, C.gold], [C.orange, C.blue, C.pink], [C.yellow, C.red, C.orange]];
  for (let i = 0; i < 3; i++) {
    box(ctx, 236 + i * 46, 108, 40, 28, C.brown2, C.out, 2);
    goods[i].forEach((c, k) => px(ctx, 242 + i * 46 + k * 10, 116, 8, 8, c));
  }
  for (let i = 0; i < 2; i++) {
    box(ctx, 236 + i * 46, 144, 40, 28, C.brown2, C.out, 2);
    px(ctx, 242 + i * 46, 150, 28, 5, C.purple); px(ctx, 242 + i * 46, 158, 28, 5, C.orange);
  }
  box(ctx, 348, 176, 40, 28, C.brown2, C.out, 2);
  px(ctx, 354, 182, 28, 5, C.blue); px(ctx, 354, 190, 28, 5, C.green);
  // sorting table
  box(ctx, 236, 232, 100, 26, C.brown2, C.out, 2);
  px(ctx, 244, 238, 14, 8, C.purple); px(ctx, 262, 238, 14, 8, C.orange); px(ctx, 290, 240, 6, 6, C.red); px(ctx, 300, 240, 6, 6, C.gold);
  doorMat(ctx);
  return {
    leader: [100, 152],
    agents: [[80, 210], [140, 230], [286, 218], [60, 280], [160, 290], [300, 290], [220, 200], [200, 260]],
    robe: C.teal,
    accent: C.white,
  };
};

const postOffice: Drawer = (ctx) => {
  floorTiles(ctx, "#eae2cc", "#e1d8bf", 20, 0);
  // pigeonholes with envelopes
  box(ctx, 14, 10, 170, 76, C.brown2, C.out, 2);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    box(ctx, 20 + c * 33, 16 + r * 23, 30, 20, C.brown, C.out, 1);
    if ((r + c) % 2 === 0) px(ctx, 26 + c * 33, 22 + r * 23, 18, 10, C.white);
  }
  // clock
  disc(ctx, 230, 48, 16, C.white, C.out, 2);
  px(ctx, 229, 38, 2, 10, C.out); px(ctx, 230, 47, 8, 2, C.out);
  // prayer requests board
  box(ctx, 266, 12, 120, 76, C.brown2, C.out, 2);
  px(ctx, 276, 18, 100, 12, C.cream);
  text(ctx, "Prayer requests", 326, 24, "#1a1816", 8);
  for (let i = 0; i < 6; i++) px(ctx, 276 + (i % 3) * 34, 38 + Math.floor(i / 3) * 22, 28, 16, i % 2 ? C.gold2 : C.white);
  px(ctx, 0, 92, ROOM.w, 6, C.blue);
  px(ctx, 0, 98, ROOM.w, 2, C.out);
  floorTiles(ctx, "#eae2cc", "#e1d8bf", 20, 100);
  // counter with parcel and stamps
  box(ctx, 26, 112, 190, 22, C.brown2, C.out, 2);
  box(ctx, 36, 100, 20, 14, C.orange2, C.out, 2);
  px(ctx, 150, 118, 20, 6, C.red); px(ctx, 180, 118, 10, 6, C.white);
  // parcels
  for (const [x, y] of [[262, 108], [318, 108], [276, 140], [330, 150]] as Pt[]) {
    box(ctx, x, y, 44, 26, C.brown2, C.out, 2);
    px(ctx, x + 20, y + 2, 4, 22, C.cream); px(ctx, x + 2, y + 11, 40, 4, C.cream);
  }
  // bench, postbox, mail bag
  box(ctx, 20, 200, 18, 80, C.brown2, C.out, 2);
  box(ctx, 304, 236, 28, 36, C.red, C.out, 2);
  px(ctx, 310, 244, 16, 3, C.black);
  disc(ctx, 352, 296, 14, C.tan, C.out, 2);
  doorMat(ctx);
  return {
    leader: [120, 148],
    agents: [[320, 200], [110, 220], [190, 200], [250, 250], [100, 280], [200, 290], [60, 180]],
    robe: C.blue,
    accent: C.white,
  };
};

const bakery: Drawer = (ctx) => {
  floorTiles(ctx, "#eae2cc", "#e1d8bf", 20, 0);
  // brick oven
  box(ctx, 14, 8, 120, 84, C.darkred, C.out, 2);
  for (let y = 12; y < 88; y += 10) for (let x = ((y / 10) % 2) * 10 + 18; x < 130; x += 20) px(ctx, x, y, 16, 6, "#b3433a");
  arch(ctx, 40, 36, 68, 56, C.black, C.out, 2);
  px(ctx, 50, 64, 48, 16, C.orange); px(ctx, 58, 58, 32, 8, C.yellow);
  for (let i = 0; i < 3; i++) disc(ctx, 58 + i * 16, 74, 6, C.brown2, undefined, 2);
  // menu board
  box(ctx, 150, 12, 100, 70, "#1f3a2a", C.out, 2);
  ["Challah", "Prosphora", "Cinnamon buns"].forEach((t, i) => text(ctx, t, 200, 28 + i * 16, "#f1ecdc", 8));
  // bread shelves
  box(ctx, 270, 12, 116, 76, C.brown2, C.out, 2);
  for (let r = 0; r < 3; r++) { px(ctx, 276, 30 + r * 22, 104, 3, C.darkbrown); for (let i = 0; i < 6; i++) disc(ctx, 284 + i * 16, 24 + r * 22, 6, i % 2 ? C.tan : C.brown2, C.out, 1); }
  px(ctx, 0, 92, ROOM.w, 6, C.brown2);
  px(ctx, 0, 98, ROOM.w, 2, C.out);
  floorTiles(ctx, "#eae2cc", "#e1d8bf", 20, 100);
  // display counter
  box(ctx, 110, 110, 200, 24, C.cream, C.out, 2);
  for (let i = 0; i < 8; i++) px(ctx, 118 + i * 24, 116, 14, 8, [C.pink, C.tan, C.brown2, C.gold][i % 4]);
  box(ctx, 300, 100, 30, 14, C.green, C.out, 2);
  // cakes on side table
  disc(ctx, 40, 130, 10, C.white, C.out, 2); px(ctx, 36, 128, 8, 4, C.red);
  disc(ctx, 64, 140, 10, C.white, C.out, 2); px(ctx, 60, 138, 8, 4, C.red);
  // round table with chairs
  disc(ctx, 110, 240, 16, C.brown2, C.out, 2);
  chair(ctx, 78, 234); chair(ctx, 128, 234);
  plant(ctx, 26, 306, C.blue); plant(ctx, 376, 306);
  doorMat(ctx);
  return {
    leader: [200, 150],
    agents: [[85, 230], [135, 230], [250, 200], [300, 240], [200, 280], [320, 290], [70, 290]],
    robe: C.white,
    accent: C.brown2,
  };
};

const florist: Drawer = (ctx) => {
  floorTiles(ctx, "#eae2cc", "#e1d8bf", 20, 0);
  // marigold garland + hanging strings
  for (let x = 0; x < ROOM.w; x += 8) px(ctx, x, 4, 6, 6, x % 16 ? C.orange : C.yellow);
  for (let i = 0; i < 6; i++) for (let y = 14; y < 80; y += 6) px(ctx, 20 + i * 14, y, 4, 4, y % 12 ? C.orange : C.yellow);
  paneWindow(ctx, 120, 20, 90, 54, C.brown2, "#e4f0fb");
  for (let i = 0; i < 5; i++) flower(ctx, 128 + i * 18, 66, [C.pink, C.red, C.yellow, C.white, C.purple][i]);
  box(ctx, 250, 40, 130, 20, C.brown2, C.out, 2);
  for (let i = 0; i < 8; i++) { px(ctx, 258 + i * 15, 30, 4, 12, C.purple); px(ctx, 259 + i * 15, 27, 2, 3, C.orange); }
  px(ctx, 0, 92, ROOM.w, 6, C.pink);
  px(ctx, 0, 98, ROOM.w, 2, C.out);
  floorTiles(ctx, "#eae2cc", "#e1d8bf", 20, 100);
  // counter with wrapped flowers
  box(ctx, 250, 112, 130, 20, C.cream, C.out, 2);
  for (let i = 0; i < 4; i++) flower(ctx, 262 + i * 28, 108, [C.pink, C.white, C.red, C.yellow][i]);
  // buckets
  const buckets: [string, string, number, number][] = [["Marigolds", C.orange, 60, 150], ["Lotus", C.pink, 130, 150], ["Roses", C.red, 60, 220], ["Jasmine", C.white, 130, 220], ["Tulips", C.pink2, 200, 220]];
  for (const [n, c, x, y] of buckets) {
    box(ctx, x - 14, y - 6, 28, 18, C.gray, C.out, 2);
    for (let k = 0; k < 4; k++) flower(ctx, x - 10 + k * 7, y - 16 + (k % 2) * 4, c);
    label(ctx, n, x, y + 14);
  }
  plant(ctx, 26, 306, C.red); plant(ctx, 376, 306);
  doorMat(ctx);
  return {
    leader: [300, 150],
    agents: [[260, 200], [320, 200], [200, 280], [100, 280], [300, 270], [160, 190], [260, 290]],
    robe: C.green,
    accent: C.pink,
  };
};

const peaceGarden: Drawer = (ctx) => {
  px(ctx, 0, 0, ROOM.w, ROOM.h, C.grass);
  for (let i = 0; i < 500; i++) px(ctx, (i * 37) % 400, (i * 53) % 320, 4, 4, i % 3 ? C.grass2 : C.grass3);
  hedge(ctx, 6);
  // winding paths
  ctx.strokeStyle = C.road; ctx.lineWidth = 22; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(400, 60); ctx.quadraticCurveTo(330, 170, 260, 240); ctx.quadraticCurveTo(220, 290, 200, 320); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 290); ctx.quadraticCurveTo(100, 250, 230, 250); ctx.stroke();
  pond(ctx, 140, 160, 70, 42);
  blossom(ctx, 40, 70); blossom(ctx, 280, 60); blossom(ctx, 370, 220); blossom(ctx, 30, 300);
  bench(ctx, 56, 214); bench(ctx, 300, 180);
  for (let i = 0; i < 12; i++) flower(ctx, 20 + ((i * 53) % 360), 100 + ((i * 97) % 200), [C.pink, C.yellow, C.white][i % 3]);
  box(ctx, 330, 136, 12, 10, C.blue, C.out, 2); // watering can
  return {
    leader: [310, 140],
    agents: [[78, 208], [322, 174], [160, 230], [240, 120], [90, 120], [200, 290], [340, 290], [60, 270]],
    robe: C.green,
    accent: C.brown2,
  };
};

const marketSquare: Drawer = (ctx) => {
  px(ctx, 0, 0, ROOM.w, ROOM.h, "#e4d8bf");
  for (let y = 0; y < ROOM.h; y += 12) for (let x = (y / 12) % 2 ? 6 : 0; x < ROOM.w; x += 12) px(ctx, x + 1, y + 1, 10, 10, "#d9ccb0");
  px(ctx, 0, 0, ROOM.w, 20, C.grass);
  hedge(ctx, 10);
  bunting(ctx, 28);
  const stalls: [string, string, string, number, number][] = [["Fig", C.red, C.white, 30, 50], ["Posy", C.pink, C.white, 220, 50], ["Crumb", C.orange, C.gold2, 30, 190], ["Leaf", C.blue, C.white, 220, 190]];
  for (const [, a, b, x, y] of stalls) {
    stall(ctx, x, y, a, b);
    px(ctx, x - 4, y + 36, 88, 4, C.out);
  }
  // goods details
  for (let i = 0; i < 5; i++) px(ctx, 40 + i * 14, 70, 8, 8, [C.red, C.green, C.orange, C.red, C.yellow][i]);
  for (let i = 0; i < 5; i++) flower(ctx, 232 + i * 14, 72, [C.pink, C.yellow, C.white, C.red, C.purple][i]);
  for (let i = 0; i < 5; i++) disc(ctx, 44 + i * 14, 214, 5, i % 2 ? C.tan : C.brown2, C.out, 1);
  for (let i = 0; i < 7; i++) px(ctx, 230 + i * 10, 212, 6, 10, [C.red, C.blue, C.green, C.gold, C.purple, C.teal, C.orange][i]);
  disc(ctx, 200, 262, 10, C.brown2, C.out, 2);
  crate(ctx, 44, 290); bench(ctx, 280, 292); crate(ctx, 350, 290);
  const keeperAt = (x: number, y: number): Pt => [x + 40, y + 34];
  return {
    leader: keeperAt(30, 50),
    agents: [[70, 110], [260, 110], [110, 150], [300, 150], [70, 250], [260, 250], [150, 300], [220, 300], [340, 240], [360, 120]],
    robe: C.red,
    accent: C.white,
    npcs: [
      { name: "Posy", pos: keeperAt(220, 50), robe: C.pink, accent: C.white },
      { name: "Crumb", pos: keeperAt(30, 190), robe: C.orange, accent: C.white },
      { name: "Leaf", pos: keeperAt(220, 190), robe: C.blue, accent: C.white },
    ],
  };
};

const cottage = (roof: string): Drawer => (ctx) => {
  // striped wallpaper
  px(ctx, 0, 0, ROOM.w, 96, "#efe3c9");
  for (let x = 0; x < ROOM.w; x += 12) px(ctx, x, 0, 4, 90, "#e6d8b8");
  // pictures and shelf
  box(ctx, 26, 20, 40, 30, C.gold2, C.out, 2); px(ctx, 34, 28, 24, 14, C.green); px(ctx, 42, 32, 8, 6, C.red);
  box(ctx, 76, 24, 24, 24, C.gold2, C.out, 2); px(ctx, 82, 30, 12, 12, C.orange);
  box(ctx, 110, 36, 70, 8, C.brown2, C.out, 2);
  for (let i = 0; i < 8; i++) px(ctx, 114 + i * 8, 26, 6, 10, [C.red, C.blue, C.green, C.gold, C.purple, C.teal, C.orange, C.pink][i]);
  // window with brick frame and plants
  box(ctx, 206, 10, 110, 80, C.darkred, C.out, 2);
  paneWindow(ctx, 218, 18, 86, 50, C.brown2, "#e4f0fb");
  disc(ctx, 236, 74, 8, C.green, C.out, 2); disc(ctx, 286, 74, 8, C.green, C.out, 2);
  px(ctx, 0, 90, ROOM.w, 6, C.brown);
  px(ctx, 0, 96, ROOM.w, 2, C.out);
  planks(ctx, 98);
  // bed with quilt
  box(ctx, 26, 110, 90, 130, C.brown2, C.out, 2);
  px(ctx, 32, 116, 78, 24, C.white);
  px(ctx, 32, 144, 78, 90, "#b3433a");
  for (let i = 0; i < 12; i++) px(ctx, 38 + (i % 3) * 24, 150 + Math.floor(i / 3) * 20, 10, 10, C.gold2);
  box(ctx, 40, 258, 50, 36, C.green, C.out, 2); // doormat
  // blue round rug with gold ring
  disc(ctx, 200, 240, 68, C.navy, C.out, 4);
  disc(ctx, 200, 240, 48, C.gold, undefined, 4);
  disc(ctx, 200, 240, 36, C.navy, undefined, 4);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; px(ctx, 200 + Math.cos(a) * 58 - 1, 240 + Math.sin(a) * 58 - 1, 3, 3, C.gold2); }
  // desk + lamp, charging pad
  box(ctx, 230, 108, 110, 22, C.brown2, C.out, 2);
  box(ctx, 130, 110, 14, 14, C.gold2, C.out, 2);
  px(ctx, 250, 114, 16, 10, C.white);
  box(ctx, 310, 236, 60, 42, C.purple, C.out, 2);
  disc(ctx, 340, 257, 12, "#6f4aa8", C.teal2, 2);
  plant(ctx, 376, 150); plant(ctx, 26, 306);
  doorMat(ctx);
  return {
    leader: [-100, -100],
    agents: [[160, 250], [340, 268], [240, 250], [100, 300], [300, 300], [60, 250], [380, 200]],
    robe: C.white,
    accent: C.white,
  };
};

export const INTERIORS: Record<string, Drawer> = {
  "st-clares": stClares,
  "holy-trinity": holyTrinity,
  "grace-chapel": graceChapel,
  "al-noor": alNoor,
  "beth-shalom": bethShalom,
  "shree-ganesh": shreeGanesh,
  "lotus-garden": lotusGarden,
  "open-node": openNode,
  "common-grounds": commonGrounds,
  library,
  "community-hall": communityHall,
  "charity-house": charityHouse,
  "post-office": postOffice,
  bakery,
  florist,
  "peace-garden": peaceGarden,
  "market-square": marketSquare,
  "rose-cottage": cottage(C.red),
  "ivy-cottage": cottage(C.darkgreen),
};
