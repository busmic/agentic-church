/**
 * Interior rooms, one per place. Each drawer paints the room into a 400x320 canvas and returns
 * where agents, the leader and (where relevant) confession stand.
 */
import { C, arch, bench, box, crate, crossSymbol, disc, flower, pond, px, stall, tri, type Ctx } from "./draw";

export const ROOM = { w: 400, h: 320 };
export type Pt = [number, number];
export interface RoomSpots {
  leader: Pt;
  agents: Pt[];
  /** Where the agent "in confession" stands (booth or icon corner). */
  confession?: Pt;
  /** Queue positions for confession. */
  queue?: Pt[];
  /** Red "in confession" badge anchor. */
  confessionBadge?: Pt;
  /** Leader robe colours. */
  robe: string;
  accent: string;
}
type Drawer = (ctx: Ctx, occupied: { confessing: boolean }) => RoomSpots;

function floorTiles(ctx: Ctx, a: string, b: string, size = 20, y0 = 90) {
  px(ctx, 0, y0, ROOM.w, ROOM.h - y0, a);
  for (let y = y0; y < ROOM.h; y += size) for (let x = 0; x < ROOM.w; x += size) if (((x + y) / size) % 2 === 0) px(ctx, x, y, size, size, b);
}
function wall(ctx: Ctx, color: string, trim: string, h = 90) {
  px(ctx, 0, 0, ROOM.w, h, color);
  px(ctx, 0, h - 8, ROOM.w, 8, trim);
  px(ctx, 0, h - 2, ROOM.w, 2, C.out);
}
function stainedGlass(ctx: Ctx, x: number, y: number, w: number, h: number) {
  arch(ctx, x, y, w, h, C.navy);
  const cols = [C.red, C.gold, C.blue, C.green, C.purple, C.orange, C.pink];
  let i = 0;
  for (let yy = y + w / 2; yy < y + h - 4; yy += 6) for (let xx = x + 3; xx < x + w - 3; xx += 6) px(ctx, xx, yy, 5, 5, cols[i++ % cols.length]);
  px(ctx, x + w / 2 - 1, y + 4, 2, h - 8, C.out);
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
function rug(ctx: Ctx, x: number, y: number, w: number, h: number, a: string, b: string) {
  box(ctx, x, y, w, h, a, C.out, 2);
  px(ctx, x + 6, y + 6, w - 12, h - 12, b);
  px(ctx, x + 10, y + 10, w - 20, h - 20, a);
  tri(ctx, x + w / 2 - 8, y + 12, 16, 10, b, 2);
}
function table(ctx: Ctx, x: number, y: number, w = 40, h = 24) {
  box(ctx, x, y, w, h, C.brown2);
  px(ctx, x + 4, y + h, 4, 6, C.out);
  px(ctx, x + w - 8, y + h, 4, 6, C.out);
}
function chair(ctx: Ctx, x: number, y: number) {
  box(ctx, x, y, 14, 12, C.brown);
}
function shelf(ctx: Ctx, x: number, y: number, w: number, h: number) {
  box(ctx, x, y, w, h, C.brown);
  const cols = [C.red, C.blue, C.green, C.gold, C.purple, C.teal, C.orange, C.pink];
  for (let row = 0; row < Math.floor((h - 8) / 20); row++) {
    for (let i = 0; i < Math.floor((w - 8) / 8); i++) px(ctx, x + 5 + i * 8, y + 6 + row * 20, 6, 12, cols[(i + row) % cols.length]);
    px(ctx, x + 3, y + 18 + row * 20, w - 6, 2, C.darkbrown);
  }
}
function lantern(ctx: Ctx, x: number, y: number) {
  px(ctx, x + 3, y - 10, 2, 10, C.out);
  box(ctx, x - 2, y, 12, 16, C.gold, C.out, 2);
  px(ctx, x + 2, y + 4, 4, 8, C.gold2);
}
function label(ctx: Ctx, text: string, cx: number, y: number, bg = "#2b332b") {
  ctx.font = '700 9px "Pixelify Sans", monospace';
  const tw = ctx.measureText(text).width;
  const w = tw + 10;
  px(ctx, cx - w / 2 - 1, y - 1, w + 2, 13, C.black);
  px(ctx, cx - w / 2, y, w, 11, bg);
  ctx.fillStyle = "#f1ecdc";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, cx, y + 6);
}
export { label as roomLabel };

const grid = (x0: number, y0: number, cols: number, rows: number, dx: number, dy: number): Pt[] => {
  const out: Pt[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push([x0 + c * dx, y0 + r * dy]);
  return out;
};

// ---------------------------------------------------------------- worship

const stClares: Drawer = (ctx, occ) => {
  wall(ctx, C.stone, C.stone2, 96);
  for (let i = 0; i < ROOM.w; i += 24) for (let j = 0; j < 90; j += 12) if ((i / 24 + j / 12) % 2 === 0) px(ctx, i, j, 24, 12, "#c6bea9");
  stainedGlass(ctx, 24, 14, 30, 64);
  stainedGlass(ctx, 70, 14, 30, 64);
  stainedGlass(ctx, 300, 14, 30, 64);
  stainedGlass(ctx, 346, 14, 30, 64);
  // crucifix (simple cross with a figure outline is avoided: plain cross)
  crossSymbol(ctx, 200, 40, 44, C.brown2, 6);
  floorTiles(ctx, "#d8cdb6", "#cfc3aa", 20, 96);
  // red carpet aisle
  px(ctx, 184, 96, 32, ROOM.h - 96, C.darkred);
  px(ctx, 188, 96, 24, ROOM.h - 96, C.red);
  // altar with candles and cloth
  box(ctx, 150, 100, 100, 26, C.white);
  px(ctx, 154, 104, 92, 6, C.green);
  px(ctx, 154, 112, 92, 4, C.gold);
  candle(ctx, 160, 90, 14);
  candle(ctx, 236, 90, 14);
  disc(ctx, 200, 92, 6, C.gold, C.out, 2);
  // pews
  for (let r = 0; r < 4; r++) {
    pew(ctx, 60, 150 + r * 36, 110);
    pew(ctx, 230, 150 + r * 36, 110);
  }
  // confessional booth (right side)
  box(ctx, 326, 130, 64, 120, C.darkbrown);
  px(ctx, 332, 136, 52, 50, C.brown);
  px(ctx, 334, 190, 48, 54, C.purple);
  for (let i = 0; i < 6; i++) px(ctx, 336 + i * 8, 194, 4, 46, "#6f4aa8");
  px(ctx, 352, 150, 12, 12, C.gold2);
  crossSymbol(ctx, 358, 146, 12, C.gold, 2);
  // occupied light
  px(ctx, 374, 136, 8, 8, occ.confessing ? C.red : C.darkgreen);
  flower(ctx, 120, 118, C.white);
  flower(ctx, 280, 118, C.white);
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
  // iconostasis: gold band with icon panels and royal doors
  wall(ctx, C.gold, C.brown2, 110);
  px(ctx, 0, 0, ROOM.w, 110, "#d9a93a");
  for (let i = 0; i < ROOM.w; i += 16) px(ctx, i, 0, 8, 10, C.gold2);
  const panels = [20, 70, 120, 230, 280, 330];
  const cols = [C.red, C.blue, C.teal, C.red, C.blue, C.teal];
  panels.forEach((x, i) => {
    box(ctx, x, 30, 42, 60, C.gold2, C.out, 3);
    px(ctx, x + 8, 40, 26, 40, cols[i]);
    px(ctx, x + 14, 46, 14, 14, C.gold);
  });
  // royal doors
  arch(ctx, 176, 24, 48, 80, C.darkred);
  px(ctx, 198, 40, 4, 60, C.gold);
  px(ctx, 184, 50, 10, 14, C.gold2);
  px(ctx, 206, 50, 10, 14, C.gold2);
  floorTiles(ctx, "#d6cbb2", "#cabea4", 20, 110);
  // round carpet with blue ring
  disc(ctx, 200, 230, 70, C.navy, C.out, 4);
  disc(ctx, 200, 230, 58, C.white, undefined, 4);
  disc(ctx, 200, 230, 44, C.navy, undefined, 4);
  disc(ctx, 200, 230, 30, C.gold, undefined, 4);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    px(ctx, 200 + Math.cos(a) * 52 - 2, 230 + Math.sin(a) * 52 - 2, 4, 4, C.gold2);
  }
  // candle stands
  for (const cx of [130, 270]) {
    px(ctx, cx - 2, 130, 4, 24, C.gold);
    box(ctx, cx - 12, 120, 24, 10, C.gold, C.out, 2);
    for (let i = 0; i < 5; i++) candle(ctx, cx - 10 + i * 5, 110, 8);
  }
  // icon stand (analogion) for face-to-face confession, left corner
  box(ctx, 40, 200, 30, 26, C.brown2);
  px(ctx, 46, 204, 18, 14, C.gold2);
  px(ctx, 50, 208, 10, 8, C.red);
  // side benches (stasidia)
  box(ctx, 8, 130, 14, 160, C.darkbrown);
  box(ctx, 378, 130, 14, 160, C.darkbrown);
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
  wall(ctx, C.white, C.stone2, 90);
  px(ctx, 0, 0, ROOM.w, 90, "#f1ebdc");
  crossSymbol(ctx, 200, 42, 48, C.brown2, 8);
  arch(ctx, 40, 14, 28, 60, C.lightblue);
  arch(ctx, 332, 14, 28, 60, C.lightblue);
  floorTiles(ctx, "#b98a5a", "#ad7f52", 40, 90);
  // pulpit + flowers
  box(ctx, 176, 96, 48, 30, C.brown2);
  px(ctx, 180, 100, 40, 6, C.white);
  for (let i = 0; i < 4; i++) flower(ctx, 130 + i * 8, 112, [C.pink, C.yellow, C.white, C.red][i]);
  for (let i = 0; i < 4; i++) flower(ctx, 246 + i * 8, 112, [C.red, C.white, C.yellow, C.pink][i]);
  // rows of chairs
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    chair(ctx, 60 + c * 24, 150 + r * 38);
    chair(ctx, 240 + c * 24, 150 + r * 38);
  }
  // guitar + piano corner
  box(ctx, 330, 100, 56, 30, C.black);
  for (let i = 0; i < 7; i++) px(ctx, 334 + i * 7, 110, 5, 14, C.white);
  return {
    leader: [200, 150],
    agents: [[80, 148], [128, 148], [260, 148], [308, 148], [80, 186], [128, 186], [260, 186], [308, 186], [80, 224], [128, 224], [260, 224], [308, 224], [80, 262], [128, 262], [260, 262], [308, 262]],
    robe: C.navy,
    accent: C.white,
  };
};

const alNoor: Drawer = (ctx) => {
  // geometric only: tiles, arches, mihrab niche, lanterns, rugs
  wall(ctx, "#f4efe4", C.teal, 100);
  for (let i = 0; i < ROOM.w; i += 20) {
    px(ctx, i, 10, 10, 10, C.teal);
    px(ctx, i + 10, 20, 10, 10, C.teal2);
    px(ctx, i, 30, 10, 10, C.gold2);
  }
  // mihrab (arched niche) centre
  arch(ctx, 168, 30, 64, 70, C.teal);
  arch(ctx, 178, 42, 44, 58, "#eaf6f5");
  for (let y = 56; y < 96; y += 8) for (let x = 182; x < 218; x += 8) if (((x + y) / 8) % 2 === 0) px(ctx, x, y, 6, 6, C.teal2);
  // side arches
  arch(ctx, 40, 44, 36, 56, C.teal2);
  arch(ctx, 324, 44, 36, 56, C.teal2);
  lantern(ctx, 110, 50);
  lantern(ctx, 280, 50);
  // carpet rows (prayer rugs)
  px(ctx, 0, 100, ROOM.w, ROOM.h - 100, "#b64a3a");
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) rug(ctx, 22 + c * 60, 112 + r * 50, 50, 40, r % 2 ? C.darkred : "#9b3b2e", C.gold2);
  // shoe rack by the door
  box(ctx, 350, 280, 44, 30, C.brown2);
  for (let i = 0; i < 4; i++) px(ctx, 354 + i * 10, 286, 8, 6, [C.black, C.brown, C.gray, C.navy][i]);
  // minbar steps (left)
  box(ctx, 8, 60, 40, 44, C.brown2);
  px(ctx, 12, 76, 32, 4, C.darkbrown);
  px(ctx, 12, 90, 32, 4, C.darkbrown);
  return {
    leader: [200, 140],
    agents: grid(47, 180, 6, 3, 60, 50),
    robe: C.white,
    accent: C.teal,
  };
};

const bethShalom: Drawer = (ctx) => {
  wall(ctx, "#efe7d2", C.stone2, 100);
  // ark with curtain and ner tamid
  box(ctx, 160, 20, 80, 80, C.brown2);
  px(ctx, 168, 28, 64, 66, C.navy);
  for (let i = 0; i < 8; i++) px(ctx, 170 + i * 8, 30, 4, 62, C.blue);
  px(ctx, 196, 60, 8, 8, C.gold);
  disc(ctx, 200, 10, 6, C.gold, C.out, 2);
  px(ctx, 199, 2, 2, 6, C.out);
  // tablets shape above ark
  disc(ctx, 188, 24, 10, C.stone, C.out, 2);
  disc(ctx, 212, 24, 10, C.stone, C.out, 2);
  // menorah (seven branches), geometric
  for (let i = 0; i < 7; i++) {
    px(ctx, 60 + i * 6, 70 - Math.abs(3 - i) * 0, 2, 20, C.gold);
    px(ctx, 60 + i * 6, 64, 2, 4, C.orange);
  }
  px(ctx, 60, 90, 38, 3, C.gold);
  px(ctx, 78, 90, 2, 8, C.gold);
  for (let i = 0; i < 7; i++) {
    px(ctx, 302 + i * 6, 70, 2, 20, C.gold);
    px(ctx, 302 + i * 6, 64, 2, 4, C.orange);
  }
  px(ctx, 302, 90, 38, 3, C.gold);
  px(ctx, 320, 90, 2, 8, C.gold);
  floorTiles(ctx, "#cdbd95", "#c2b189", 20, 100);
  // bimah (reading platform) centre
  box(ctx, 160, 190, 80, 50, C.brown2);
  box(ctx, 176, 180, 48, 24, C.white);
  px(ctx, 180, 184, 40, 4, C.navy);
  // benches around
  for (let r = 0; r < 3; r++) {
    pew(ctx, 30, 130 + r * 56, 100);
    pew(ctx, 270, 130 + r * 56, 100);
  }
  pew(ctx, 130, 270, 140);
  return {
    leader: [200, 170],
    agents: [[50, 130], [90, 130], [290, 130], [330, 130], [50, 186], [90, 186], [290, 186], [330, 186], [50, 242], [90, 242], [290, 242], [330, 242], [160, 270], [240, 270]],
    robe: C.navy,
    accent: C.white,
  };
};

const shreeGanesh: Drawer = (ctx) => {
  wall(ctx, C.orange2, C.darkred, 104);
  for (let i = 0; i < ROOM.w; i += 20) px(ctx, i, 0, 10, 8, C.red);
  // shrine alcove with lamps and marigold garlands (no deity depiction)
  arch(ctx, 150, 20, 100, 84, C.darkred);
  arch(ctx, 160, 32, 80, 72, "#f4c76a");
  box(ctx, 176, 70, 48, 26, C.red);
  px(ctx, 180, 74, 40, 4, C.gold);
  disc(ctx, 200, 60, 10, C.gold, C.out, 2);
  px(ctx, 198, 44, 4, 10, C.orange);
  px(ctx, 199, 40, 2, 4, C.gold2);
  for (let i = 0; i < 10; i++) px(ctx, 152 + i * 10, 26 + (i % 2) * 4, 6, 6, i % 2 ? C.orange : C.yellow);
  // bells
  for (const bx of [110, 290]) {
    px(ctx, bx, 10, 2, 16, C.out);
    disc(ctx, bx + 1, 32, 7, C.gold, C.out, 2);
  }
  // pillars
  box(ctx, 40, 20, 18, 84, C.red);
  box(ctx, 342, 20, 18, 84, C.red);
  // colourful floor + rangoli
  floorTiles(ctx, "#e9d9b8", "#dfcca6", 20, 104);
  disc(ctx, 200, 210, 44, C.red, C.out, 4);
  disc(ctx, 200, 210, 32, C.yellow, undefined, 4);
  disc(ctx, 200, 210, 20, C.orange, undefined, 4);
  disc(ctx, 200, 210, 8, C.white, undefined, 4);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    px(ctx, 200 + Math.cos(a) * 38 - 3, 210 + Math.sin(a) * 38 - 3, 6, 6, C.white);
  }
  // offering trays
  box(ctx, 90, 120, 40, 14, C.gold);
  for (let i = 0; i < 4; i++) px(ctx, 94 + i * 9, 114, 6, 6, [C.orange, C.yellow, C.red, C.pink][i]);
  box(ctx, 270, 120, 40, 14, C.gold);
  for (let i = 0; i < 4; i++) px(ctx, 274 + i * 9, 114, 6, 6, [C.yellow, C.orange, C.pink, C.red][i]);
  // shoe shelf
  box(ctx, 8, 280, 44, 30, C.brown2);
  return {
    leader: [200, 150],
    agents: [[120, 190], [280, 190], [100, 240], [300, 240], [140, 280], [260, 280], [200, 290], [70, 200], [330, 200], [160, 250], [240, 250], [90, 290], [310, 290]],
    robe: C.orange,
    accent: C.gold,
  };
};

const lotusGarden: Drawer = (ctx) => {
  wall(ctx, "#f1e8d2", C.darkred, 96);
  // wooden lattice
  for (let i = 0; i < ROOM.w; i += 30) px(ctx, i, 0, 4, 88, C.brown2);
  for (let j = 0; j < 88; j += 22) px(ctx, 0, j, ROOM.w, 3, C.brown2);
  // altar with lotus, incense and a small bell (no statue depiction)
  box(ctx, 150, 50, 100, 46, C.darkred);
  px(ctx, 156, 56, 88, 6, C.gold);
  disc(ctx, 200, 44, 12, C.pink, C.out, 2);
  disc(ctx, 200, 40, 6, C.pink2, undefined, 2);
  px(ctx, 170, 70, 2, 14, C.gray);
  px(ctx, 170, 66, 2, 4, C.orange);
  px(ctx, 228, 70, 2, 14, C.gray);
  px(ctx, 228, 66, 2, 4, C.orange);
  candle(ctx, 180, 72, 10);
  candle(ctx, 216, 72, 10);
  // lanterns
  lantern(ctx, 80, 40);
  lantern(ctx, 310, 40);
  // wooden floor
  px(ctx, 0, 96, ROOM.w, ROOM.h - 96, "#b58a5c");
  for (let y = 96; y < ROOM.h; y += 16) px(ctx, 0, y, ROOM.w, 2, "#a67c50");
  // meditation cushions grid
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    const x = 60 + c * 70, y = 150 + r * 56;
    disc(ctx, x, y, 14, r % 2 ? C.darkred : C.purple, C.out, 2);
    disc(ctx, x, y - 2, 8, r % 2 ? C.red : "#a37ad8", undefined, 2);
  }
  // bowl / singing bell
  disc(ctx, 40, 120, 10, C.gold, C.out, 2);
  pond(ctx, 350, 290, 36, 18);
  return {
    leader: [200, 130],
    agents: grid(60, 148, 5, 3, 70, 56),
    robe: C.orange,
    accent: C.darkred,
  };
};

const openNode: Drawer = (ctx) => {
  px(ctx, 0, 0, ROOM.w, 100, "#1d2433");
  px(ctx, 0, 92, ROOM.w, 8, C.gold);
  // glowing node ring symbol
  ctx.fillStyle = "rgba(147,197,239,0.15)";
  ctx.fillRect(140, 0, 120, 100);
  disc(ctx, 200, 48, 40, C.navy, C.lightblue, 4);
  disc(ctx, 200, 48, 28, "#1d2433", undefined, 4);
  const nodes: Pt[] = [[200, 26], [180, 60], [220, 60]];
  for (const [nx, ny] of nodes) disc(ctx, nx, ny, 6, C.white, C.out, 2);
  px(ctx, 199, 32, 2, 22, C.lightblue);
  px(ctx, 180, 59, 40, 2, C.lightblue);
  px(ctx, 189, 42, 2, 16, C.lightblue);
  px(ctx, 209, 42, 2, 16, C.lightblue);
  // gold-trimmed side lamps
  for (const lx of [50, 350]) {
    px(ctx, lx - 2, 20, 4, 60, C.gold);
    disc(ctx, lx, 16, 8, C.gold2, C.out, 2);
  }
  // dark floor with grid lines
  px(ctx, 0, 100, ROOM.w, ROOM.h - 100, "#2a3142");
  for (let x = 0; x < ROOM.w; x += 40) px(ctx, x, 100, 1, ROOM.h - 100, "#3a4458");
  for (let y = 100; y < ROOM.h; y += 40) px(ctx, 0, y, ROOM.w, 1, "#3a4458");
  // benches (pews) in navy with gold trim
  for (let r = 0; r < 4; r++) {
    box(ctx, 60, 150 + r * 38, 110, 14, C.navy, C.out, 2);
    px(ctx, 64, 152 + r * 38, 102, 2, C.gold);
    box(ctx, 230, 150 + r * 38, 110, 14, C.navy, C.out, 2);
    px(ctx, 234, 152 + r * 38, 102, 2, C.gold);
  }
  // lectern
  box(ctx, 184, 104, 32, 24, C.navy, C.out, 2);
  px(ctx, 190, 108, 20, 4, C.lightblue);
  return {
    leader: [200, 150],
    agents: [[80, 150], [120, 150], [250, 150], [290, 150], [80, 188], [120, 188], [250, 188], [290, 188], [80, 226], [120, 226], [250, 226], [290, 226], [80, 264], [120, 264], [250, 264], [290, 264]],
    robe: C.lightblue,
    accent: C.navy,
  };
};

// ---------------------------------------------------------------- town

const commonGrounds: Drawer = (ctx) => {
  wall(ctx, "#e6d3b3", C.brown, 90);
  // menu board
  box(ctx, 150, 14, 100, 50, C.black);
  for (let i = 0; i < 4; i++) px(ctx, 158, 22 + i * 10, 50 + (i % 2) * 20, 4, C.white);
  // counter + espresso machine
  box(ctx, 230, 96, 160, 40, C.darkbrown);
  px(ctx, 236, 100, 148, 8, C.brown2);
  box(ctx, 300, 70, 50, 30, C.gray, C.out, 2);
  px(ctx, 310, 78, 12, 8, C.red);
  for (let i = 0; i < 5; i++) px(ctx, 240 + i * 12, 84, 8, 10, C.white);
  floorTiles(ctx, "#c9a575", "#bd9a6b", 20, 90);
  // tables and chairs
  for (const [tx, ty] of [[40, 150], [130, 150], [40, 240], [130, 240], [250, 230]] as Pt[]) {
    disc(ctx, tx + 20, ty + 12, 18, C.brown2, C.out, 2);
    chair(ctx, tx - 6, ty + 6);
    chair(ctx, tx + 34, ty + 6);
  }
  // plant
  disc(ctx, 376, 290, 12, C.green, C.out, 2);
  box(ctx, 368, 298, 16, 14, C.orange, C.out, 2);
  return {
    leader: [330, 150],
    agents: [[40, 170], [90, 170], [130, 170], [180, 170], [40, 260], [90, 260], [130, 260], [180, 260], [250, 250], [300, 250], [220, 200], [340, 290]],
    robe: C.brown2,
    accent: C.white,
  };
};

const library: Drawer = (ctx) => {
  wall(ctx, "#e8dcc3", C.brown, 96);
  shelf(ctx, 10, 6, 110, 86);
  shelf(ctx, 280, 6, 110, 86);
  // window
  arch(ctx, 180, 10, 40, 70, C.lightblue);
  px(ctx, 199, 14, 2, 62, C.out);
  floorTiles(ctx, "#b7855a", "#ad7d54", 40, 96);
  shelf(ctx, 6, 110, 24, 180);
  shelf(ctx, 370, 110, 24, 180);
  // reading tables with lamps
  for (const [tx, ty] of [[80, 150], [230, 150], [80, 240], [230, 240]] as Pt[]) {
    table(ctx, tx, ty, 90, 26);
    px(ctx, tx + 40, ty - 10, 4, 10, C.out);
    px(ctx, tx + 36, ty - 16, 12, 6, C.green);
    px(ctx, tx + 10, ty + 6, 16, 10, C.white);
    px(ctx, tx + 60, ty + 6, 16, 10, C.red);
  }
  return {
    leader: [200, 120],
    agents: [[90, 190], [150, 190], [240, 190], [300, 190], [90, 280], [150, 280], [240, 280], [300, 280], [50, 160], [350, 160]],
    robe: C.teal,
    accent: C.white,
  };
};

const communityHall: Drawer = (ctx) => {
  wall(ctx, "#eee6cf", C.green, 90);
  // stage and banner
  box(ctx, 120, 20, 160, 40, C.white);
  for (let i = 0; i < 4; i++) px(ctx, 140 + i * 36, 30, 20, 20, [C.red, C.blue, C.gold, C.green][i]);
  box(ctx, 100, 90, 200, 24, C.brown2);
  floorTiles(ctx, "#d2bf9a", "#c7b48f", 40, 114);
  // long tables with chairs
  for (const ty of [150, 220]) {
    table(ctx, 50, ty, 300, 22);
    for (let i = 0; i < 6; i++) {
      chair(ctx, 60 + i * 50, ty - 14);
      chair(ctx, 60 + i * 50, ty + 26);
    }
  }
  // soup pot
  disc(ctx, 370, 140, 12, C.gray, C.out, 2);
  return {
    leader: [200, 140],
    agents: [[67, 160], [117, 160], [167, 160], [217, 160], [267, 160], [317, 160], [67, 262], [117, 262], [167, 262], [217, 262], [267, 262], [317, 262]],
    robe: C.green,
    accent: C.white,
  };
};

const charityHouse: Drawer = (ctx) => {
  wall(ctx, "#eae2cc", C.teal, 90);
  shelf(ctx, 20, 10, 100, 76);
  shelf(ctx, 280, 10, 100, 76);
  // heart sign
  box(ctx, 170, 20, 60, 40, C.white);
  px(ctx, 184, 30, 8, 8, C.red);
  px(ctx, 208, 30, 8, 8, C.red);
  px(ctx, 184, 36, 32, 8, C.red);
  px(ctx, 192, 44, 16, 6, C.red);
  floorTiles(ctx, "#c8c0ad", "#bdb5a2", 20, 90);
  // donation bins and boxes
  for (let i = 0; i < 4; i++) crate(ctx, 40 + i * 30, 120);
  for (let i = 0; i < 3; i++) crate(ctx, 300 + i * 28, 120);
  box(ctx, 150, 200, 100, 30, C.brown2);
  px(ctx, 160, 190, 20, 10, C.red);
  px(ctx, 190, 188, 20, 12, C.blue);
  px(ctx, 220, 192, 20, 8, C.green);
  return {
    leader: [200, 160],
    agents: [[60, 200], [100, 200], [300, 200], [340, 200], [80, 270], [140, 280], [260, 280], [320, 270], [200, 290]],
    robe: C.teal,
    accent: C.white,
  };
};

const postOffice: Drawer = (ctx) => {
  wall(ctx, "#e9e1cf", C.blue, 90);
  // pigeonholes
  for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) {
    box(ctx, 40 + c * 32, 14 + r * 24, 30, 22, C.brown2, C.out, 2);
    if ((r + c) % 3 === 0) px(ctx, 48 + c * 32, 20 + r * 24, 14, 10, C.white);
  }
  floorTiles(ctx, "#cfd3cf", "#c3c8c3", 20, 90);
  // counter
  box(ctx, 60, 130, 280, 30, C.blue);
  px(ctx, 66, 134, 268, 8, C.lightblue);
  // mail bags
  for (let i = 0; i < 3; i++) {
    disc(ctx, 50 + i * 30, 290, 12, C.tan, C.out, 2);
    px(ctx, 46 + i * 30, 274, 8, 6, C.out);
  }
  // postbox
  box(ctx, 350, 250, 24, 50, C.red);
  px(ctx, 356, 258, 12, 4, C.black);
  return {
    leader: [200, 125],
    agents: [[100, 200], [160, 200], [240, 200], [300, 200], [120, 260], [200, 260], [280, 260], [200, 300]],
    robe: C.blue,
    accent: C.white,
  };
};

const bakery: Drawer = (ctx) => {
  wall(ctx, "#f1e6cf", C.brown, 90);
  // oven
  box(ctx, 290, 10, 90, 76, C.darkstone);
  arch(ctx, 312, 36, 46, 44, C.black);
  px(ctx, 322, 56, 26, 14, C.orange);
  px(ctx, 328, 50, 14, 8, C.yellow);
  // shelves with loaves
  for (let r = 0; r < 2; r++) {
    px(ctx, 20, 30 + r * 30, 220, 4, C.brown2);
    for (let i = 0; i < 7; i++) disc(ctx, 36 + i * 30, 24 + r * 30, 9, i % 2 ? C.brown2 : C.tan, C.out, 2);
  }
  floorTiles(ctx, "#e4c9a0", "#d9bd94", 20, 90);
  // display counter
  box(ctx, 60, 150, 200, 40, C.brown2);
  px(ctx, 66, 156, 188, 10, C.lightblue);
  for (let i = 0; i < 8; i++) px(ctx, 72 + i * 23, 158, 14, 6, [C.pink, C.tan, C.brown, C.white][i % 4]);
  // sacks
  disc(ctx, 340, 280, 14, C.tan, C.out, 2);
  disc(ctx, 370, 280, 14, C.tan, C.out, 2);
  return {
    leader: [160, 130],
    agents: [[80, 230], [130, 230], [190, 230], [240, 230], [100, 290], [200, 290], [280, 290], [40, 260]],
    robe: C.white,
    accent: C.brown2,
  };
};

const florist: Drawer = (ctx) => {
  wall(ctx, "#f3e7ea", C.pink, 90);
  for (let r = 0; r < 2; r++) {
    px(ctx, 20, 36 + r * 30, 360, 4, C.brown2);
    for (let i = 0; i < 12; i++) {
      box(ctx, 26 + i * 30, 20 + r * 30, 16, 16, C.orange, C.out, 2);
      flower(ctx, 32 + i * 30, 14 + r * 30, [C.pink, C.red, C.yellow, C.white, C.purple][(i + r) % 5]);
    }
  }
  floorTiles(ctx, "#cfd8c4", "#c4ceb9", 20, 90);
  // buckets of flowers on the floor
  for (let i = 0; i < 6; i++) {
    box(ctx, 30 + i * 60, 200, 24, 26, C.gray, C.out, 2);
    for (let k = 0; k < 3; k++) flower(ctx, 34 + i * 60 + k * 8, 190, [C.pink, C.yellow, C.red, C.white, C.purple][(i + k) % 5]);
  }
  box(ctx, 240, 110, 120, 30, C.brown2);
  return {
    leader: [300, 150],
    agents: [[60, 260], [120, 260], [180, 260], [240, 260], [300, 260], [100, 300], [220, 300], [340, 300]],
    robe: C.green,
    accent: C.pink,
  };
};

const peaceGarden: Drawer = (ctx) => {
  px(ctx, 0, 0, ROOM.w, ROOM.h, C.grass);
  for (let i = 0; i < 400; i++) px(ctx, ((i * 37) % 400), ((i * 53) % 320), 4, 4, i % 3 ? C.grass2 : C.grass3);
  for (let i = 0; i < ROOM.w; i += 18) disc(ctx, i + 9, 8, 9, C.green2, C.out, 2);
  px(ctx, 190, 20, 20, 300, C.stone);
  px(ctx, 20, 150, 360, 20, C.stone);
  pond(ctx, 200, 160, 50, 30);
  bench(ctx, 50, 60);
  bench(ctx, 300, 60);
  bench(ctx, 50, 240);
  bench(ctx, 300, 240);
  for (let i = 0; i < 10; i++) flower(ctx, 30 + i * 14, 120, [C.pink, C.yellow, C.white][i % 3]);
  for (let i = 0; i < 10; i++) flower(ctx, 240 + i * 14, 200, [C.purple, C.yellow, C.white][i % 3]);
  // bell frame
  px(ctx, 60, 190, 4, 30, C.out);
  px(ctx, 100, 190, 4, 30, C.out);
  px(ctx, 58, 186, 48, 4, C.out);
  disc(ctx, 82, 204, 8, C.gold, C.out, 2);
  for (let i = 0; i < 6; i++) disc(ctx, 330 + (i % 3) * 22, 280 + Math.floor(i / 3) * 20, 10, C.green, C.out, 2);
  return {
    leader: [120, 220],
    agents: [[72, 100], [322, 100], [72, 280], [322, 280], [150, 240], [250, 240], [120, 110], [280, 110], [200, 290]],
    robe: C.green,
    accent: C.brown2,
  };
};

const marketSquare: Drawer = (ctx) => {
  px(ctx, 0, 0, ROOM.w, ROOM.h, C.stone2);
  for (let y = 0; y < ROOM.h; y += 12) for (let x = (y / 12) % 2 ? 6 : 0; x < ROOM.w; x += 12) px(ctx, x + 1, y + 1, 10, 10, C.stone);
  stall(ctx, 30, 30, C.red, C.white);
  stall(ctx, 160, 30, C.pink, C.white);
  stall(ctx, 290, 30, C.orange, C.gold2);
  stall(ctx, 60, 170, C.blue, C.white);
  stall(ctx, 260, 170, C.green, C.white);
  crate(ctx, 350, 270);
  crate(ctx, 376, 270);
  bench(ctx, 170, 280);
  return {
    leader: [200, 160],
    agents: [[70, 130], [200, 130], [330, 130], [100, 270], [300, 270], [40, 220], [360, 220], [200, 230], [140, 300], [260, 300]],
    robe: C.purple,
    accent: C.gold2,
  };
};

const cottage = (roof: string): Drawer => (ctx) => {
  wall(ctx, "#efe3c9", roof, 90);
  // window with curtains
  box(ctx, 160, 14, 80, 60, C.lightblue);
  px(ctx, 199, 18, 2, 52, C.out);
  px(ctx, 164, 18, 14, 52, roof);
  px(ctx, 222, 18, 14, 52, roof);
  // fireplace
  box(ctx, 300, 20, 80, 70, C.darkstone);
  px(ctx, 316, 50, 48, 36, C.black);
  px(ctx, 326, 66, 28, 12, C.orange);
  px(ctx, 334, 60, 12, 8, C.yellow);
  shelf(ctx, 20, 10, 100, 76);
  // wooden floor
  px(ctx, 0, 90, ROOM.w, ROOM.h - 90, "#b58a5c");
  for (let y = 90; y < ROOM.h; y += 16) px(ctx, 0, y, ROOM.w, 2, "#a67c50");
  // bed
  box(ctx, 20, 110, 80, 120, C.brown2);
  px(ctx, 26, 116, 68, 24, C.white);
  px(ctx, 26, 144, 68, 80, roof);
  // rug + table + chairs + plant
  rug(ctx, 150, 180, 120, 80, roof, C.cream);
  table(ctx, 180, 200, 60, 30);
  chair(ctx, 160, 206);
  chair(ctx, 246, 206);
  disc(ctx, 370, 290, 12, C.green, C.out, 2);
  box(ctx, 362, 298, 16, 14, C.orange, C.out, 2);
  // desk with diary
  box(ctx, 300, 120, 80, 30, C.brown2);
  px(ctx, 320, 126, 20, 14, C.white);
  px(ctx, 322, 128, 16, 2, C.out);
  return {
    leader: [-100, -100],
    agents: [[170, 270], [250, 270], [60, 260], [340, 190], [210, 160], [120, 160], [300, 280], [60, 170]],
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
