/**
 * Pixel-art drawing primitives. Everything is drawn in "world pixels"; the town canvas scales the
 * result with image smoothing off so edges stay crisp. All art is original and procedural.
 */
export type Ctx = CanvasRenderingContext2D;

export const C = {
  out: "#2e2a26",
  white: "#f8f4ea",
  cream: "#efe2c2",
  cream2: "#e4d2a6",
  red: "#cf4a3d",
  darkred: "#9d3129",
  blue: "#3f7fd0",
  lightblue: "#93c5ef",
  navy: "#294a86",
  teal: "#2f8f8a",
  teal2: "#4fb3ac",
  gold: "#e6b63c",
  gold2: "#f3d67a",
  orange: "#e78a30",
  orange2: "#f0a95c",
  brown: "#8a5a33",
  brown2: "#a9743f",
  darkbrown: "#5a3a21",
  tan: "#dcc48f",
  stone: "#cfc7b4",
  stone2: "#b6ad98",
  darkstone: "#8f8878",
  green: "#4f9d3f",
  green2: "#67b954",
  darkgreen: "#3a7a2e",
  grass: "#74c95f",
  grass2: "#64b852",
  grass3: "#86d46e",
  road: "#e8d5a3",
  road2: "#d9c48d",
  pink: "#ea7fab",
  pink2: "#f4b7cf",
  purple: "#8c62c8",
  gray: "#8f8f8f",
  lightgray: "#c9c9c9",
  water: "#4fa8e6",
  water2: "#8fd0f5",
  yellow: "#f5d35a",
  black: "#1a1816",
  skin: "#f4d2a8",
};

export const px = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

/** Filled box with a 4px dark outline. */
export function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, outline = C.out, t = 4) {
  px(ctx, x, y, w, h, outline);
  px(ctx, x + t, y + t, w - 2 * t, h - 2 * t, fill);
}

/** Pixel "circle" (disc) made of rows, with optional outline. */
export function disc(ctx: Ctx, cx: number, cy: number, r: number, fill: string, outline?: string, step = 4) {
  if (outline) discRaw(ctx, cx, cy, r, outline, step);
  discRaw(ctx, cx, cy, Math.max(0, r - (outline ? step : 0)), fill, step);
}
function discRaw(ctx: Ctx, cx: number, cy: number, r: number, fill: string, step: number) {
  for (let y = -r; y < r; y += step) {
    const yy = y + step / 2;
    const half = Math.sqrt(Math.max(0, r * r - yy * yy));
    const hw = Math.round(half / step) * step;
    px(ctx, cx - hw, cy + y, hw * 2, step, fill);
  }
}

/** Upward pixel triangle (gable). base at (x,y+h) width w, apex at top centre. */
export function tri(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, step = 4) {
  for (let i = 0; i < h; i += step) {
    const frac = (i + step) / h;
    const rw = Math.round((w * frac) / step) * step;
    px(ctx, x + (w - rw) / 2, y + i, rw, step, fill);
  }
}

/** Gable roof with outline. */
export function gable(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, step = 4) {
  tri(ctx, x - step, y - step, w + 2 * step, h + step, C.out, step);
  tri(ctx, x + step, y + step * 1.5, w - 2 * step, h - step * 1.5, fill, step);
}

/** Arched window / door: rect with a rounded top. */
export function arch(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, outline = C.out, step = 4) {
  const r = w / 2;
  disc(ctx, x + r, y + r, r + step, outline, undefined, step);
  px(ctx, x - step, y + r, w + 2 * step, h - r + step, outline);
  disc(ctx, x + r, y + r, r, fill, undefined, step);
  px(ctx, x, y + r, w, h - r, fill);
}

export function crossSymbol(ctx: Ctx, cx: number, cy: number, size: number, color: string, t = 4) {
  px(ctx, cx - t / 2 - 2, cy - size / 2 - 2, t + 4, size + 4, C.out);
  px(ctx, cx - size / 3 - 2, cy - size / 6 - 2, (size * 2) / 3 + 4, t + 4, C.out);
  px(ctx, cx - t / 2, cy - size / 2, t, size, color);
  px(ctx, cx - size / 3, cy - size / 6, (size * 2) / 3, t, color);
}

export function stainedWindow(ctx: Ctx, x: number, y: number, w: number, h: number) {
  arch(ctx, x, y, w, h, C.lightblue);
  const cols = [C.red, C.gold, C.blue, C.green, C.purple, C.orange];
  let i = 0;
  for (let yy = y + w / 2; yy < y + h - 4; yy += 8) {
    for (let xx = x + 4; xx < x + w - 4; xx += 8) {
      px(ctx, xx, yy, 6, 6, cols[i++ % cols.length]);
    }
  }
}

export function window(ctx: Ctx, x: number, y: number, w: number, h: number, fill = C.lightblue) {
  box(ctx, x, y, w, h, fill);
  px(ctx, x + w / 2 - 2, y + 4, 4, h - 8, C.out);
  px(ctx, x + 4, y + h / 2 - 2, w - 8, 4, C.out);
  px(ctx, x + 6, y + 6, 6, 6, C.white);
}

export function door(ctx: Ctx, x: number, y: number, w: number, h: number, fill = C.brown, arched = true) {
  if (arched) arch(ctx, x, y, w, h, fill);
  else box(ctx, x, y, w, h, fill);
  px(ctx, x + w - 12, y + h / 2, 4, 4, C.gold);
}

export function shadow(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "rgba(20,40,10,0.18)";
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// ------------------------------------------------------------------ nature & props

export function tree(ctx: Ctx, x: number, y: number, size = 1, variant = 0) {
  // x,y = base centre
  const r = Math.round(26 * size);
  px(ctx, x - 6, y - 14, 12, 16, C.out);
  px(ctx, x - 3, y - 12, 6, 12, C.darkbrown);
  disc(ctx, x, y - r - 8, r + 4, C.out);
  disc(ctx, x, y - r - 8, r, variant ? C.green2 : C.green);
  disc(ctx, x - r / 3, y - r - 16, r / 2, C.grass3);
  px(ctx, x + r / 3, y - r - 2, 4, 4, variant ? C.red : C.darkgreen);
  px(ctx, x - r / 2, y - r + 6, 4, 4, C.darkgreen);
}

export function bush(ctx: Ctx, x: number, y: number, size = 1, flowers = false) {
  const r = Math.round(14 * size);
  disc(ctx, x, y, r + 4, C.out);
  disc(ctx, x, y, r, C.green2);
  disc(ctx, x - r / 3, y - r / 3, r / 2, C.grass3);
  if (flowers) {
    px(ctx, x + 2, y - 4, 4, 4, C.pink);
    px(ctx, x - 8, y + 2, 4, 4, C.yellow);
    px(ctx, x + 6, y + 4, 4, 4, C.white);
  }
}

export function flower(ctx: Ctx, x: number, y: number, color = C.pink) {
  px(ctx, x, y + 4, 2, 6, C.darkgreen);
  px(ctx, x - 2, y, 6, 4, color);
  px(ctx, x, y - 2, 2, 2, color);
}

export function lamp(ctx: Ctx, x: number, y: number) {
  px(ctx, x - 8, y - 4, 16, 6, C.out);
  px(ctx, x - 3, y - 50, 6, 48, C.out);
  box(ctx, x - 9, y - 66, 18, 20, C.gold2);
  px(ctx, x - 11, y - 70, 22, 6, C.out);
}

export function bench(ctx: Ctx, x: number, y: number) {
  box(ctx, x, y, 44, 10, C.brown2);
  box(ctx, x, y - 10, 44, 12, C.brown2);
  px(ctx, x + 4, y + 10, 4, 8, C.out);
  px(ctx, x + 36, y + 10, 4, 8, C.out);
}

export function fence(ctx: Ctx, x: number, y: number, w: number) {
  px(ctx, x, y + 6, w, 4, C.out);
  px(ctx, x, y + 7, w, 2, C.white);
  for (let i = 0; i < w; i += 10) {
    px(ctx, x + i, y, 6, 18, C.out);
    px(ctx, x + i + 1, y + 2, 4, 14, C.white);
    px(ctx, x + i + 1, y, 4, 2, C.white);
  }
}

export function crate(ctx: Ctx, x: number, y: number) {
  box(ctx, x, y, 24, 22, C.brown2);
  px(ctx, x + 4, y + 10, 16, 2, C.out);
  px(ctx, x + 11, y + 4, 2, 14, C.out);
}

export function fountain(ctx: Ctx, cx: number, cy: number) {
  disc(ctx, cx, cy, 66, C.stone, C.out);
  disc(ctx, cx, cy, 52, C.darkstone);
  disc(ctx, cx, cy, 44, C.water, C.out);
  disc(ctx, cx - 10, cy - 10, 10, C.water2);
  px(ctx, cx - 10, cy - 24, 20, 30, C.out);
  px(ctx, cx - 6, cy - 20, 12, 22, C.stone);
  px(ctx, cx - 14, cy - 30, 28, 8, C.out);
  px(ctx, cx - 10, cy - 28, 20, 4, C.stone);
  px(ctx, cx - 2, cy - 44, 4, 14, C.water2);
  px(ctx, cx - 10, cy - 38, 4, 8, C.water2);
  px(ctx, cx + 6, cy - 38, 4, 8, C.water2);
}

export function plaza(ctx: Ctx, cx: number, cy: number, r: number) {
  disc(ctx, cx, cy, r, C.stone2, C.darkstone, 8);
  for (let y = -r; y < r; y += 16) for (let x = -r; x < r; x += 16) {
    if (x * x + y * y < (r - 16) * (r - 16) && (x + y) % 32 === 0) px(ctx, cx + x, cy + y, 8, 8, C.stone);
  }
}

export function pond(ctx: Ctx, cx: number, cy: number, rx: number, ry: number) {
  for (let y = -ry; y < ry; y += 4) {
    const half = Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))) * rx;
    const hw = Math.round(half / 4) * 4;
    px(ctx, cx - hw - 4, cy + y, hw * 2 + 8, 4, C.out);
  }
  for (let y = -ry + 4; y < ry - 4; y += 4) {
    const half = Math.sqrt(Math.max(0, 1 - (y * y) / ((ry - 4) * (ry - 4)))) * (rx - 4);
    const hw = Math.round(half / 4) * 4;
    px(ctx, cx - hw, cy + y, hw * 2, 4, C.water);
  }
  px(ctx, cx - rx / 2, cy - ry / 3, 12, 4, C.water2);
  px(ctx, cx + rx / 4, cy + ry / 4, 8, 4, C.water2);
  // lily pads
  px(ctx, cx + rx / 3, cy - ry / 3, 8, 6, C.green2);
  px(ctx, cx - rx / 4, cy + ry / 3, 8, 6, C.green2);
  px(ctx, cx - rx / 4 + 2, cy + ry / 3 - 4, 4, 4, C.pink);
}

export function stall(ctx: Ctx, x: number, y: number, a: string, b: string) {
  // awning
  for (let i = 0; i < 80; i += 10) px(ctx, x + i, y, 10, 14, i % 20 === 0 ? a : b);
  px(ctx, x - 4, y - 4, 88, 4, C.out);
  for (let i = 0; i < 80; i += 10) px(ctx, x + i, y + 14, 10, 4, C.out);
  px(ctx, x - 4, y, 4, 18, C.out);
  px(ctx, x + 80, y, 4, 18, C.out);
  // posts
  px(ctx, x - 2, y + 14, 4, 46, C.out);
  px(ctx, x + 78, y + 14, 4, 46, C.out);
  // counter
  box(ctx, x, y + 36, 80, 24, C.brown2);
  // goods
  px(ctx, x + 8, y + 26, 10, 10, C.red);
  px(ctx, x + 22, y + 26, 10, 10, C.orange);
  px(ctx, x + 36, y + 26, 10, 10, C.green);
  px(ctx, x + 50, y + 26, 10, 10, C.yellow);
  px(ctx, x + 64, y + 26, 10, 10, C.purple);
}

export function cobbles(ctx: Ctx, x: number, y: number, w: number, h: number) {
  px(ctx, x, y, w, h, C.stone2);
  for (let yy = 0; yy < h; yy += 12) for (let xx = (yy / 12) % 2 ? 6 : 0; xx < w; xx += 12) px(ctx, x + xx + 1, y + yy + 1, 10, 10, C.stone);
}

export function sign(ctx: Ctx, x: number, y: number, w: number, color: string, glyph: (cx: number, cy: number) => void) {
  box(ctx, x, y, w, 24, color);
  glyph(x + w / 2, y + 12);
}

// ------------------------------------------------------------------ agents

const BODY_COLORS = [C.blue, C.pink, C.green, C.orange, C.purple, C.teal, C.red, C.gold, C.navy, C.brown2, C.darkgreen, C.lightblue];

export function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return BODY_COLORS[h % BODY_COLORS.length];
}

/**
 * Robot agent sprite, ~22x30 world px, drawn with its feet at (x,y).
 * frame: 0..3 walk cycle. facing: -1 left, 1 right.
 */
export function agentSprite(ctx: Ctx, x: number, y: number, body: string, frame = 0, facing = 1) {
  const legOff = frame === 1 ? 2 : frame === 3 ? -2 : 0;
  const bob = frame % 2 === 1 ? -1 : 0;
  const top = y - 30 + bob;
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(x - 10, y - 3, 20, 5);
  // legs
  px(ctx, x - 8, y - 8, 6, 8, C.out);
  px(ctx, x + 2, y - 8, 6, 8, C.out);
  px(ctx, x - 7 + legOff, y - 7, 4, 5, C.darkbrown);
  px(ctx, x + 3 - legOff, y - 7, 4, 5, C.darkbrown);
  // body
  px(ctx, x - 9, top + 16, 18, 10, C.out);
  px(ctx, x - 7, top + 18, 14, 6, body);
  // arms
  px(ctx, x - 12, top + 18, 4, 6, C.out);
  px(ctx, x + 8, top + 18, 4, 6, C.out);
  px(ctx, x - 11, top + 19, 2, 4, body);
  px(ctx, x + 9, top + 19, 2, 4, body);
  // head
  px(ctx, x - 9, top + 2, 18, 15, C.out);
  px(ctx, x - 7, top + 4, 14, 11, C.white);
  // visor / eyes
  px(ctx, x - 5, top + 7, 10, 5, C.navy);
  px(ctx, x - 4 + (facing < 0 ? 0 : 2), top + 8, 2, 2, C.lightblue);
  px(ctx, x + 1 + (facing < 0 ? 0 : 2), top + 8, 2, 2, C.lightblue);
  // antenna
  px(ctx, x - 1, top - 3, 2, 5, C.out);
  px(ctx, x - 2, top - 5, 4, 3, body);
  // ears
  px(ctx, x - 11, top + 7, 2, 5, C.out);
  px(ctx, x + 9, top + 7, 2, 5, C.out);
}

/** Leader sprite: a human-ish figure in a robe of a given colour, feet at (x,y). */
export function leaderSprite(ctx: Ctx, x: number, y: number, robe: string, accent: string, frame = 0) {
  const bob = frame % 2 === 1 ? -1 : 0;
  const top = y - 34 + bob;
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(x - 10, y - 3, 20, 5);
  // robe
  px(ctx, x - 10, top + 14, 20, 20, C.out);
  px(ctx, x - 8, top + 16, 16, 16, robe);
  px(ctx, x - 2, top + 18, 4, 12, accent);
  // head
  px(ctx, x - 7, top + 2, 14, 13, C.out);
  px(ctx, x - 5, top + 4, 10, 9, C.skin);
  px(ctx, x - 3, top + 7, 2, 2, C.out);
  px(ctx, x + 1, top + 7, 2, 2, C.out);
  // hair/hat
  px(ctx, x - 6, top + 2, 12, 3, accent);
  // arms
  px(ctx, x - 13, top + 17, 3, 8, C.out);
  px(ctx, x + 10, top + 17, 3, 8, C.out);
}
