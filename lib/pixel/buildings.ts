/**
 * One procedural drawing per place. Each function draws into the place rect (world px).
 * Respectful by design: the mosque uses only geometric ornament; symbols are simple and neutral.
 */
import { nodeGlyph } from "./interiors";
import { C, arch, bench, box, bush, cobbles, crate, crossSymbol, disc, door, fence, flower, gable, pond, px, shadow, stainedWindow, stall, tri, window, type Ctx } from "./draw";

export type Rect = { x: number; y: number; w: number; h: number };
type Drawer = (ctx: Ctx, r: Rect) => void;

function base(ctx: Ctx, r: Rect) {
  shadow(ctx, r.x + 8, r.y + r.h - 6, r.w - 8, 12);
}

// ---------------------------------------------------------------- places of worship

const stClares: Drawer = (ctx, r) => {
  base(ctx, r);
  const { x, y, w, h } = r;
  const bodyTop = y + 120;
  // nave
  box(ctx, x + 20, bodyTop, w - 40, h - 120, C.cream);
  gable(ctx, x + 12, bodyTop - 70, w - 24, 70, C.darkred);
  // tower
  box(ctx, x + w / 2 - 28, y + 40, 56, 110, C.cream);
  tri(ctx, x + w / 2 - 34, y - 4, 68, 50, C.out);
  tri(ctx, x + w / 2 - 28, y + 2, 56, 42, C.darkred);
  crossSymbol(ctx, x + w / 2, y - 18, 28, C.gold);
  arch(ctx, x + w / 2 - 10, y + 60, 20, 36, C.out);
  px(ctx, x + w / 2 - 6, y + 68, 12, 24, C.gold2);
  // rose window
  disc(ctx, x + w / 2, bodyTop - 24, 18, C.lightblue, C.out);
  px(ctx, x + w / 2 - 2, bodyTop - 38, 4, 28, C.out);
  px(ctx, x + w / 2 - 14, bodyTop - 26, 28, 4, C.out);
  // windows
  stainedWindow(ctx, x + 40, bodyTop + 30, 28, 60);
  stainedWindow(ctx, x + w - 68, bodyTop + 30, 28, 60);
  door(ctx, x + w / 2 - 18, y + h - 64, 36, 60, C.darkbrown);
  px(ctx, x + w / 2 - 22, y + h - 4, 44, 4, C.stone2);
  bush(ctx, x + 24, y + h - 6, 0.8, true);
  bush(ctx, x + w - 24, y + h - 6, 0.8, true);
};

const holyTrinity: Drawer = (ctx, r) => {
  base(ctx, r);
  const { x, y, w, h } = r;
  const bodyTop = y + 110;
  box(ctx, x + 10, bodyTop, w - 20, h - 110, C.cream);
  px(ctx, x + 14, bodyTop + 4, w - 28, 10, C.gold2);
  // three domes: big centre, two small
  const domes = [
    { cx: x + w / 2, cy: bodyTop - 10, r: 44 },
    { cx: x + 50, cy: bodyTop + 6, r: 26 },
    { cx: x + w - 50, cy: bodyTop + 6, r: 26 },
  ];
  for (const d of domes) {
    box(ctx, d.cx - d.r + 6, d.cy - 4, d.r * 2 - 12, 30, C.white);
    disc(ctx, d.cx, d.cy - 10, d.r, C.gold, C.out);
    disc(ctx, d.cx - d.r / 3, d.cy - d.r / 2 - 6, d.r / 4, C.gold2);
    px(ctx, d.cx - 6, d.cy - d.r - 18, 12, 14, C.out);
    px(ctx, d.cx - 3, d.cy - d.r - 16, 6, 10, C.gold);
    crossSymbol(ctx, d.cx, d.cy - d.r - 30, 22, C.gold);
    arch(ctx, d.cx - 6, d.cy + 2, 12, 20, C.navy);
  }
  arch(ctx, x + 36, bodyTop + 40, 24, 50, C.navy);
  arch(ctx, x + w - 60, bodyTop + 40, 24, 50, C.navy);
  px(ctx, x + 40, bodyTop + 50, 16, 10, C.lightblue);
  px(ctx, x + w - 56, bodyTop + 50, 16, 10, C.lightblue);
  door(ctx, x + w / 2 - 20, y + h - 60, 40, 56, C.darkbrown);
  px(ctx, x + w / 2 - 4, y + h - 50, 8, 8, C.gold);
  bush(ctx, x + 18, y + h - 4, 0.7);
  bush(ctx, x + w - 18, y + h - 4, 0.7);
};

const graceChapel: Drawer = (ctx, r) => {
  base(ctx, r);
  const { x, y, w, h } = r;
  const bodyTop = y + 150;
  box(ctx, x + 10, bodyTop, w - 20, h - 150, C.white);
  gable(ctx, x + 2, bodyTop - 50, w - 4, 50, C.red);
  // steeple
  box(ctx, x + w / 2 - 22, y + 60, 44, 100, C.white);
  tri(ctx, x + w / 2 - 28, y, 56, 64, C.out);
  tri(ctx, x + w / 2 - 22, y + 6, 44, 56, C.white);
  crossSymbol(ctx, x + w / 2, y - 14, 26, C.gold);
  box(ctx, x + w / 2 - 10, y + 90, 20, 28, C.darkstone);
  px(ctx, x + w / 2 - 6, y + 96, 12, 4, C.white);
  px(ctx, x + w / 2 - 6, y + 104, 12, 4, C.white);
  arch(ctx, x + 28, bodyTop + 24, 30, 60, C.lightblue);
  arch(ctx, x + w - 58, bodyTop + 24, 30, 60, C.lightblue);
  px(ctx, x + 41, bodyTop + 30, 4, 50, C.out);
  px(ctx, x + w - 45, bodyTop + 30, 4, 50, C.out);
  door(ctx, x + w / 2 - 16, y + h - 56, 32, 52, C.darkgreen);
  px(ctx, x + w / 2 - 20, y + h - 4, 40, 4, C.stone2);
  bush(ctx, x + 14, y + h - 6, 0.8, true);
  bush(ctx, x + w - 14, y + h - 6, 0.8, true);
};

const alNoor: Drawer = (ctx, r) => {
  base(ctx, r);
  const { x, y, w, h } = r;
  const bodyTop = y + 120;
  box(ctx, x + 10, bodyTop, w - 90, h - 120, C.white);
  // geometric band
  for (let i = x + 18; i < x + w - 90; i += 16) {
    px(ctx, i, bodyTop + 8, 8, 8, C.teal);
    px(ctx, i + 8, bodyTop + 16, 8, 8, C.teal2);
  }
  // main dome
  const cx = x + (w - 80) / 2;
  px(ctx, cx - 70, bodyTop - 24, 140, 30, C.out);
  px(ctx, cx - 66, bodyTop - 20, 132, 26, C.white);
  disc(ctx, cx, bodyTop - 24, 62, C.teal, C.out);
  disc(ctx, cx - 20, bodyTop - 56, 14, C.teal2);
  px(ctx, cx - 4, bodyTop - 100, 8, 20, C.out);
  px(ctx, cx - 2, bodyTop - 98, 4, 16, C.gold);
  // crescent (geometric, finial)
  disc(ctx, cx, bodyTop - 112, 12, C.gold, C.out);
  disc(ctx, cx + 6, bodyTop - 114, 9, C.white);
  px(ctx, cx + 2, bodyTop - 122, 12, 18, "rgba(0,0,0,0)");
  // arched windows and door
  arch(ctx, x + 28, bodyTop + 40, 24, 54, C.teal2);
  arch(ctx, x + w - 128, bodyTop + 40, 24, 54, C.teal2);
  arch(ctx, cx - 22, y + h - 70, 44, 66, C.darkbrown);
  px(ctx, cx - 10, y + h - 50, 20, 30, C.brown);
  // minaret
  const mx = x + w - 40;
  box(ctx, mx - 16, y + 50, 32, h - 50, C.white);
  px(ctx, mx - 20, y + 120, 40, 8, C.out);
  px(ctx, mx - 18, y + 122, 36, 4, C.teal);
  px(ctx, mx - 20, y + 60, 40, 8, C.out);
  px(ctx, mx - 18, y + 62, 36, 4, C.teal);
  disc(ctx, mx, y + 40, 20, C.teal, C.out);
  px(ctx, mx - 2, y + 4, 4, 18, C.out);
  disc(ctx, mx, y + 2, 7, C.gold, C.out);
  arch(ctx, mx - 6, y + 80, 12, 24, C.navy);
  arch(ctx, mx - 6, y + 140, 12, 24, C.navy);
  px(ctx, x + 8, y + h - 4, w - 16, 4, C.stone2);
};

const bethShalom: Drawer = (ctx, r) => {
  base(ctx, r);
  const { x, y, w, h } = r;
  const bodyTop = y + 70;
  box(ctx, x + 10, bodyTop, w - 20, h - 70, C.tan);
  // rounded tablets top
  px(ctx, x + 24, bodyTop - 30, w - 48, 34, C.out);
  px(ctx, x + 28, bodyTop - 26, w - 56, 30, C.tan);
  disc(ctx, x + 24 + (w - 48) / 4, bodyTop - 30, (w - 48) / 4, C.tan, C.out);
  disc(ctx, x + w - 24 - (w - 48) / 4, bodyTop - 30, (w - 48) / 4, C.tan, C.out);
  px(ctx, x + 28, bodyTop - 26, w - 56, 30, C.tan);
  px(ctx, x + w / 2 - 2, bodyTop - 40, 4, 44, C.out);
  // star of David (two triangles, outline)
  const sx = x + w / 2, sy = bodyTop - 14;
  tri(ctx, sx - 16, sy - 14, 32, 24, C.blue);
  ctx.save();
  ctx.translate(sx, sy + 2);
  ctx.scale(1, -1);
  tri(ctx, -16, -14 + 2, 32, 24, C.blue);
  ctx.restore();
  px(ctx, sx - 6, sy - 4, 12, 8, C.tan);
  // windows
  arch(ctx, x + 30, bodyTop + 30, 26, 46, C.lightblue);
  arch(ctx, x + w - 56, bodyTop + 30, 26, 46, C.lightblue);
  px(ctx, x + 41, bodyTop + 36, 4, 36, C.out);
  px(ctx, x + w - 45, bodyTop + 36, 4, 36, C.out);
  // double door
  box(ctx, x + w / 2 - 26, y + h - 60, 52, 56, C.darkbrown);
  px(ctx, x + w / 2 - 2, y + h - 56, 4, 52, C.out);
  px(ctx, x + w / 2 - 12, y + h - 36, 4, 6, C.gold);
  px(ctx, x + w / 2 + 8, y + h - 36, 4, 6, C.gold);
  px(ctx, x + 8, y + h - 4, w - 16, 4, C.stone2);
  bush(ctx, x + 18, y + h - 4, 0.7);
  bush(ctx, x + w - 18, y + h - 4, 0.7);
};

const shreeGanesh: Drawer = (ctx, r) => {
  base(ctx, r);
  const { x, y, w, h } = r;
  // stone plinth
  box(ctx, x, y + h - 60, w, 60, C.stone);
  px(ctx, x + 4, y + h - 56, w - 8, 6, C.stone2);
  // hall
  box(ctx, x + 20, y + 150, w - 40, h - 210, C.orange2);
  for (let i = x + 28; i < x + w - 28; i += 12) px(ctx, i, y + 160, 6, 6, C.darkred);
  // tiered shikhara
  const cx = x + w / 2;
  const tiers = [
    { w: w - 20, h: 30, top: y + 120 },
    { w: w - 60, h: 30, top: y + 90 },
    { w: w - 100, h: 30, top: y + 60 },
    { w: w - 140, h: 30, top: y + 30 },
  ];
  for (const t of tiers) {
    px(ctx, cx - t.w / 2 - 4, t.top - 4, t.w + 8, t.h + 8, C.out);
    px(ctx, cx - t.w / 2, t.top, t.w, t.h, C.orange);
    for (let i = cx - t.w / 2 + 6; i < cx + t.w / 2 - 6; i += 14) px(ctx, i, t.top + 8, 8, 10, C.orange2);
  }
  tri(ctx, cx - (w - 140) / 2 - 4, y - 4, w - 140 + 8, 36, C.out);
  tri(ctx, cx - (w - 140) / 2, y, w - 140, 32, C.orange);
  // kalash & flag
  px(ctx, cx - 6, y - 14, 12, 12, C.out);
  px(ctx, cx - 4, y - 12, 8, 8, C.gold);
  px(ctx, cx - 2, y - 40, 4, 28, C.out);
  px(ctx, cx + 2, y - 38, 16, 10, C.red);
  // side spires
  for (const sx of [x + 30, x + w - 30]) {
    px(ctx, sx - 14, y + 110, 28, 44, C.out);
    px(ctx, sx - 10, y + 114, 20, 40, C.orange);
    tri(ctx, sx - 14, y + 90, 28, 24, C.out);
    tri(ctx, sx - 10, y + 94, 20, 20, C.orange2);
  }
  // door (dark, arched) + steps + bell
  arch(ctx, cx - 26, y + h - 108, 52, 56, C.darkbrown);
  px(ctx, cx - 14, y + h - 92, 28, 34, C.black);
  box(ctx, cx - 40, y + h - 52, 80, 14, C.stone2);
  box(ctx, cx - 50, y + h - 38, 100, 14, C.stone2);
  box(ctx, cx - 60, y + h - 24, 120, 14, C.stone2);
  px(ctx, x + w - 36, y + h - 90, 4, 20, C.out);
  disc(ctx, x + w - 34, y + h - 66, 8, C.gold, C.out);
  // marigolds
  for (let i = 0; i < 6; i++) flower(ctx, x + 8 + i * 16, y + h - 8, i % 2 ? C.orange : C.yellow);
};

const lotusGarden: Drawer = (ctx, r) => {
  base(ctx, r);
  const { x, y, w, h } = r;
  const cx = x + w / 2;
  const slate = "#4a5f6e";
  // hall: cream walls with red trim and a red double door
  box(ctx, x + 30, y + 120, w - 60, h - 120, C.cream);
  px(ctx, x + 34, y + 124, w - 68, 6, C.red);
  for (const wx of [x + 50, x + w - 74]) { box(ctx, wx, y + 150, 24, 30, C.red); px(ctx, wx + 6, y + 156, 12, 18, C.gold2); }
  // two tiers of slate roof with red eaves and upturned corners
  const roofs = [
    { top: y + 92, w: w, h: 32 },
    { top: y + 40, w: w - 70, h: 36 },
  ];
  for (const rf of roofs) {
    tri(ctx, cx - rf.w / 2 - 6, rf.top - 6, rf.w + 12, rf.h + 6, C.out);
    tri(ctx, cx - rf.w / 2, rf.top, rf.w, rf.h, slate);
    px(ctx, cx - rf.w / 2 - 14, rf.top + rf.h - 10, 18, 6, C.out);
    px(ctx, cx + rf.w / 2 - 4, rf.top + rf.h - 10, 18, 6, C.out);
    px(ctx, cx - rf.w / 2 - 12, rf.top + rf.h - 8, 14, 4, slate);
    px(ctx, cx + rf.w / 2 - 2, rf.top + rf.h - 8, 14, 4, slate);
    px(ctx, cx - rf.w / 2 - 4, rf.top + rf.h, rf.w + 8, 8, C.out);
    px(ctx, cx - rf.w / 2 - 2, rf.top + rf.h + 1, rf.w + 4, 6, C.red);
  }
  box(ctx, cx - 24, y + 76, 48, 20, C.cream);
  px(ctx, cx - 3, y + 16, 6, 26, C.out);
  disc(ctx, cx, y + 14, 6, C.gold, C.out);
  door(ctx, cx - 20, y + h - 56, 40, 52, C.red, false);
  px(ctx, cx - 2, y + h - 54, 4, 48, C.out);
  px(ctx, cx - 30, y + h - 4, 60, 4, C.stone2);
};

const openNode: Drawer = (ctx, r) => {
  base(ctx, r);
  const { x, y, w, h } = r;
  const cx = x + w / 2;
  // rounded nave (screenshot 3)
  box(ctx, x + 10, y + 120, w - 20, h - 120, C.white);
  px(ctx, x + 14, y + 124, w - 28, 10, C.gold2);
  px(ctx, x + 10, y + 100, 60, 30, C.out);
  px(ctx, x + 14, y + 104, 52, 26, C.white);
  px(ctx, x + w - 70, y + 100, 60, 30, C.out);
  px(ctx, x + w - 66, y + 104, 52, 26, C.white);
  disc(ctx, cx, y + 110, 70, C.white, C.out);
  px(ctx, x + 50, y + 110, w - 100, 20, C.white);
  // node-network symbol (neutral): ring with connected nodes
  nodeGlyph(ctx, cx, y + 96, 36);
  // lamp finial
  px(ctx, cx - 2, y + 36, 4, 28, C.out);
  disc(ctx, cx, y + 26, 11, C.gold2, C.out);
  ctx.fillStyle = "rgba(245,211,90,0.25)";
  ctx.fillRect(cx - 24, y + 4, 48, 48);
  // tall windows with gold edges
  for (const wx of [x + 26, x + w - 50]) {
    arch(ctx, wx, y + 150, 24, 60, C.navy);
    px(ctx, wx + 4, y + 162, 16, 10, C.gold2);
    px(ctx, wx + 4, y + 182, 16, 4, C.gold2);
  }
  // door with gold pillars
  arch(ctx, cx - 20, y + h - 60, 40, 56, C.navy);
  px(ctx, cx - 30, y + h - 70, 6, 66, C.gold);
  px(ctx, cx + 24, y + h - 70, 6, 66, C.gold);
  px(ctx, cx - 10, y + h - 50, 20, 44, C.gold2);
  px(ctx, cx - 2, y + h - 50, 4, 44, C.navy);
};

// ---------------------------------------------------------------- town places

function house(ctx: Ctx, r: Rect, wall: string, roof: string, doorColor = C.darkbrown) {
  base(ctx, r);
  const { x, y, w, h } = r;
  const roofH = Math.min(70, h * 0.45);
  box(ctx, x + 8, y + roofH, w - 16, h - roofH, wall);
  gable(ctx, x, y, w, roofH, roof);
  px(ctx, x + w / 2 + 18, y + 10, 16, 30, C.out);
  px(ctx, x + w / 2 + 22, y + 14, 8, 26, C.brown);
  window(ctx, x + 22, y + roofH + 18, 28, 28, C.gold2);
  window(ctx, x + w - 50, y + roofH + 18, 28, 28, C.gold2);
  door(ctx, x + w / 2 - 14, y + h - 44, 28, 40, doorColor, false);
}

const commonGrounds: Drawer = (ctx, r) => {
  base(ctx, r);
  const { x, y, w, h } = r;
  box(ctx, x + 6, y + 40, w - 12, h - 40, C.brown2);
  box(ctx, x, y + 20, w, 30, C.darkbrown);
  // awning
  for (let i = 0; i < w; i += 12) px(ctx, x + i, y + 50, 12, 16, i % 24 === 0 ? C.red : C.white);
  px(ctx, x - 2, y + 66, w + 4, 4, C.out);
  // sign: cup
  box(ctx, x + w / 2 - 30, y - 4, 60, 28, C.cream);
  px(ctx, x + w / 2 - 10, y + 4, 16, 14, C.darkbrown);
  px(ctx, x + w / 2 + 6, y + 8, 6, 6, C.darkbrown);
  px(ctx, x + w / 2 - 6, y - 2, 2, 6, C.gray);
  px(ctx, x + w / 2, y - 2, 2, 6, C.gray);
  window(ctx, x + 18, y + 80, 44, 36, C.gold2);
  window(ctx, x + w - 62, y + 80, 44, 36, C.gold2);
  door(ctx, x + w / 2 - 14, y + h - 44, 28, 40, C.darkbrown, false);
  // outdoor table
  disc(ctx, x + w + 22, y + h - 10, 12, C.brown2, C.out);
};

const library: Drawer = (ctx, r) => {
  base(ctx, r);
  const { x, y, w, h } = r;
  box(ctx, x, y + 40, w, h - 40, C.tan);
  box(ctx, x - 4, y + 20, w + 8, 26, C.darkstone);
  px(ctx, x, y + 24, w, 4, C.stone);
  // pediment
  tri(ctx, x + w / 2 - 50, y - 8, 100, 34, C.out);
  tri(ctx, x + w / 2 - 44, y - 2, 88, 26, C.stone);
  // big windows showing bookshelves
  for (const wx of [x + 16, x + w - 66]) {
    box(ctx, wx, y + 60, 50, 90, C.brown);
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 5; i++) {
        const cols = [C.red, C.blue, C.green, C.gold, C.purple, C.teal, C.orange];
        px(ctx, wx + 6 + i * 8, y + 68 + row * 26, 6, 18, cols[(i + row) % cols.length]);
      }
      px(ctx, wx + 4, y + 86 + row * 26, 42, 3, C.darkbrown);
    }
  }
  arch(ctx, x + w / 2 - 20, y + h - 64, 40, 60, C.darkbrown);
  px(ctx, x + w / 2 - 2, y + h - 44, 4, 36, C.out);
  px(ctx, x + w / 2 - 50, y + h - 4, 100, 4, C.stone2);
};

const communityHall: Drawer = (ctx, r) => {
  base(ctx, r);
  const { x, y, w, h } = r;
  box(ctx, x + 6, y + 60, w - 12, h - 60, C.cream2);
  box(ctx, x, y + 40, w, 28, C.darkgreen);
  tri(ctx, x - 4, y - 4, w + 8, 48, C.out);
  tri(ctx, x, y, w, 44, C.green);
  for (let i = 0; i < 4; i++) window(ctx, x + 24 + i * ((w - 48) / 4), y + 84, 32, 30, C.lightblue);
  box(ctx, x + w / 2 - 30, y + h - 56, 60, 52, C.darkbrown);
  px(ctx, x + w / 2 - 2, y + h - 52, 4, 48, C.out);
  // banner: four coloured squares (interfaith, neutral)
  box(ctx, x + w / 2 - 34, y + 14, 68, 24, C.white);
  px(ctx, x + w / 2 - 28, y + 20, 12, 12, C.red);
  px(ctx, x + w / 2 - 12, y + 20, 12, 12, C.blue);
  px(ctx, x + w / 2 + 4, y + 20, 12, 12, C.gold);
  px(ctx, x + w / 2 + 20, y + 20, 12, 12, C.green);
};

const charityHouse: Drawer = (ctx, r) => {
  house(ctx, r, C.cream, C.teal, C.darkbrown);
  const { x, y, w } = r;
  // heart sign
  box(ctx, x + w / 2 - 24, y + 72, 48, 24, C.white);
  px(ctx, x + w / 2 - 10, y + 78, 6, 6, C.red);
  px(ctx, x + w / 2 + 4, y + 78, 6, 6, C.red);
  px(ctx, x + w / 2 - 10, y + 82, 20, 6, C.red);
  px(ctx, x + w / 2 - 6, y + 88, 12, 4, C.red);
  crate(ctx, x + w + 6, y + r.h - 24);
  crate(ctx, x + w + 6, y + r.h - 48);
};

const postOffice: Drawer = (ctx, r) => {
  house(ctx, r, C.white, C.blue, C.darkbrown);
  const { x, y, w } = r;
  // envelope sign
  box(ctx, x + w / 2 - 22, y + 10, 44, 28, C.white);
  px(ctx, x + w / 2 - 16, y + 16, 32, 16, C.red);
  px(ctx, x + w / 2 - 14, y + 18, 28, 12, C.white);
  px(ctx, x + w / 2 - 12, y + 18, 24, 2, C.red);
  for (let i = 0; i < 6; i++) px(ctx, x + w / 2 - 12 + i * 4, y + 20 + Math.min(i, 5 - i) * 2, 4, 2, C.red);
  // postbox
  box(ctx, x - 22, y + r.h - 40, 16, 36, C.red);
};

const bakery: Drawer = (ctx, r) => {
  house(ctx, r, C.cream, C.brown, C.darkbrown);
  const { x, y, w, h } = r;
  for (let i = 0; i < w - 16; i += 12) px(ctx, x + 8 + i, y + 64, 12, 12, i % 24 === 0 ? C.orange : C.white);
  // bread sign
  box(ctx, x + w / 2 - 24, y + 14, 48, 24, C.white);
  disc(ctx, x + w / 2, y + 26, 10, C.brown2, C.out);
  px(ctx, x + w / 2 - 6, y + 22, 12, 2, C.cream);
  // chimney smoke
  px(ctx, x + w / 2 + 24, y - 6, 6, 6, C.lightgray);
  px(ctx, x + w / 2 + 30, y - 16, 8, 8, C.lightgray);
  void h;
};

const florist: Drawer = (ctx, r) => {
  house(ctx, r, C.white, C.pink, C.darkbrown);
  const { x, y, w, h } = r;
  for (let i = 0; i < w - 16; i += 12) px(ctx, x + 8 + i, y + 62, 12, 12, i % 24 === 0 ? C.pink : C.white);
  for (let i = 0; i < 5; i++) flower(ctx, x - 14 + i * 6, y + h - 6, [C.pink, C.yellow, C.red, C.white, C.purple][i]);
  for (let i = 0; i < 5; i++) flower(ctx, x + w - 10 + i * 6, y + h - 6, [C.yellow, C.pink, C.white, C.red, C.purple][i]);
  box(ctx, x - 26, y + h - 30, 24, 26, C.brown2);
  for (let i = 0; i < 3; i++) flower(ctx, x - 20 + i * 7, y + h - 34, [C.red, C.yellow, C.pink][i]);
};

const peaceGarden: Drawer = (ctx, r) => {
  const { x, y, w, h } = r;
  const cx = x + w / 2, cy = y + h / 2;
  // hedge ring (oval) with a gap at the bottom for the entrance
  for (let a = 0; a < Math.PI * 2; a += 0.11) {
    if (a > Math.PI * 0.38 && a < Math.PI * 0.62) continue;
    bush(ctx, cx + Math.cos(a) * (w / 2 - 8), cy + Math.sin(a) * (h / 2 - 8), 0.55);
  }
  pond(ctx, cx - 20, cy + 10, 56, 30);
  px(ctx, cx - 26, cy - 50, 12, 36, C.darkbrown); // post
  bench(ctx, x + 36, cy - 30);
  bench(ctx, x + w - 90, cy - 40);
  bench(ctx, x + 40, cy + 50);
  // flower bed (round, dotted) and blossom trees
  disc(ctx, cx + 80, cy + 30, 20, C.darkbrown, C.out);
  for (let i = 0; i < 10; i++) px(ctx, cx + 66 + (i * 7) % 28, cy + 18 + (i * 11) % 24, 4, 4, [C.pink, C.yellow, C.red, C.white][i % 4]);
  for (const [tx, ty] of [[x + 28, cy + 40], [x + w - 36, y + 50], [cx + 20, y + 40]]) {
    px(ctx, tx - 4, ty - 14, 8, 16, C.darkbrown);
    disc(ctx, tx, ty - 30, 24, C.pink2, C.out);
    disc(ctx, tx - 8, ty - 38, 10, "#fbd3e3");
  }
  for (let i = 0; i < 10; i++) flower(ctx, x + 30 + i * 24, y + 24, [C.pink, C.yellow, C.white][i % 3]);
};

const marketSquare: Drawer = (ctx, r) => {
  const { x, y, w, h } = r;
  cobbles(ctx, x, y, w, h);
  for (let i = 0; i < w; i += 18) bush(ctx, x + i + 9, y - 2, 0.5);
  const bc = [C.red, C.gold, C.green, C.blue, C.pink, C.orange];
  px(ctx, x, y + 10, w, 2, C.out);
  for (let i = 0; i < w - 8; i += 14) tri(ctx, x + i + 2, y + 12, 8, 6, bc[(i / 14) % 6], 2);
  stall(ctx, x + 36, y + 30, C.red, C.white);
  stall(ctx, x + 166, y + 44, C.pink, C.white);
  stall(ctx, x + 296, y + 30, C.orange, C.gold2);
  stall(ctx, x + 50, y + 150, C.blue, C.white);
  crate(ctx, x + w - 80, y + h - 50);
  crate(ctx, x + w - 50, y + h - 50);
  crate(ctx, x + w - 65, y + h - 74);
  bench(ctx, x + w - 150, y + h - 40);
  for (let i = 0; i < 5; i++) px(ctx, x + 200 + i * 20, y + h - 24, 8, 8, [C.red, C.orange, C.green, C.yellow, C.purple][i]);
};

const roseCottage: Drawer = (ctx, r) => {
  house(ctx, r, C.cream, C.red, C.darkbrown);
  const { x, y, w, h } = r;
  for (let i = 0; i < 4; i++) flower(ctx, x + 12 + i * 10, y + h - 6, C.red);
  for (let i = 0; i < 4; i++) flower(ctx, x + w - 44 + i * 10, y + h - 6, C.pink);
  fence(ctx, x - 30, y + h - 14, 24);
  fence(ctx, x + w + 6, y + h - 14, 24);
};

const ivyCottage: Drawer = (ctx, r) => {
  house(ctx, r, C.cream2, C.darkgreen, C.darkbrown);
  const { x, y, w, h } = r;
  // ivy on the wall
  for (let i = 0; i < 6; i++) px(ctx, x + 10 + (i % 2) * 4, y + 70 + i * 10, 6, 6, C.green);
  for (let i = 0; i < 6; i++) px(ctx, x + w - 18 + (i % 2) * 4, y + 76 + i * 10, 6, 6, C.green2);
  bush(ctx, x + w + 14, y + h - 4, 0.8);
  fence(ctx, x - 30, y + h - 14, 24);
};

export const BUILDINGS: Record<string, Drawer> = {
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
  "rose-cottage": roseCottage,
  "ivy-cottage": ivyCottage,
};

export { lamp, bench, fence, tree as _tree } from "./draw";
