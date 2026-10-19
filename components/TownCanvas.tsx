"use client";
import { useEffect, useRef, useState } from "react";
import { PLACES, WORLD, getPlace } from "@/lib/places";
import type { PublicAgent } from "@/lib/store";
import { agentSprite, colorFor } from "@/lib/pixel/draw";
import { hitPlace, renderBackground, ROAD_NODES } from "@/lib/pixel/world";

export interface TownCanvasProps {
  agents: PublicAgent[];
  counts: Record<string, number>;
  onSelectPlace: (slug: string) => void;
  /** Agent id to centre the camera on (changes trigger a pan). */
  focusAgentId?: string | null;
  focusNonce?: number;
  /** Phone layout: smaller minimap placed above the bottom sheet. */
  mobile?: boolean;
}

interface AState {
  id: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  facing: number;
  walkT: number;
  visible: boolean;
  wanderAt: number;
  color: string;
  name: string;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const SPEED = 70; // world px / s

export default function TownCanvas({ agents, counts, onSelectPlace, focusAgentId, focusNonce, mobile = false }: TownCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const cam = useRef({ x: 1100, y: 700, zoom: 0.8 });
  const states = useRef<Map<string, AState>>(new Map());
  const agentsRef = useRef(agents);
  const countsRef = useRef(counts);
  const hoverRef = useRef<string | null>(null);
  const [miniOpen, setMiniOpen] = useState(true);
  useEffect(() => {
    try { setMiniOpen(localStorage.getItem("ac.minimap") !== "closed"); } catch {}
  }, []);
  const toggleMini = () => {
    setMiniOpen((o) => {
      try { localStorage.setItem("ac.minimap", o ? "closed" : "open"); } catch {}
      return !o;
    });
  };
  agentsRef.current = agents;
  countsRef.current = counts;

  // ---------------------------------------------------------- sync agent targets
  useEffect(() => {
    const map = states.current;
    const seen = new Set<string>();
    const doorGroups = new Map<string, PublicAgent[]>();
    for (const a of agents) {
      if (a.place && a.status !== "inside") {
        const g = doorGroups.get(a.place) ?? [];
        g.push(a);
        doorGroups.set(a.place, g);
      }
    }
    for (const a of agents) {
      seen.add(a.id);
      let s = map.get(a.id);
      if (!s) {
        const n = ROAD_NODES[hash(a.id) % ROAD_NODES.length];
        s = { id: a.id, x: n[0], y: n[1], tx: n[0], ty: n[1], facing: 1, walkT: 0, visible: true, wanderAt: 0, color: colorFor(a.id), name: a.name };
        // if the agent is already somewhere, spawn at the door instead of walking across town
        if (a.place) {
          const p = getPlace(a.place);
          if (p) {
            s.x = p.door.x;
            s.y = p.door.y;
          }
        }
        map.set(a.id, s);
      }
      s.name = a.name;
      if (a.place) {
        const p = getPlace(a.place);
        if (p) {
          const group = doorGroups.get(a.place) ?? [];
          const idx = Math.max(0, group.findIndex((g) => g.id === a.id));
          const n = group.length || 1;
          const off = (idx - (n - 1) / 2) * 26;
          s.tx = p.door.x + (a.status === "inside" ? 0 : off);
          s.ty = p.door.y + (a.status === "inside" ? -10 : 0);
          s.visible = a.status !== "inside" || Math.hypot(s.x - s.tx, s.y - s.ty) > 6;
          s.wanderAt = 0;
        }
      } else {
        s.visible = true;
        if (!s.wanderAt) s.wanderAt = 1; // start wandering
      }
    }
    for (const id of [...map.keys()]) if (!seen.has(id)) map.delete(id);
  }, [agents]);

  // ---------------------------------------------------------- focus on agent
  useEffect(() => {
    if (!focusAgentId) return;
    const s = states.current.get(focusAgentId);
    const a = agentsRef.current.find((x) => x.id === focusAgentId);
    if (s) {
      cam.current.x = s.x;
      cam.current.y = s.y;
      cam.current.zoom = Math.max(cam.current.zoom, 1.1);
    } else if (a?.place) {
      const p = getPlace(a.place);
      if (p) {
        cam.current.x = p.door.x;
        cam.current.y = p.door.y - 60;
        cam.current.zoom = Math.max(cam.current.zoom, 1.1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusAgentId, focusNonce]);

  // ---------------------------------------------------------- main loop + input
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    bgRef.current ??= renderBackground();
    const bg = bgRef.current;
    let raf = 0;
    let last = performance.now();
    let w = 0, h = 0, dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      // initial zoom: show roughly 1700 world px on desktop, ~850 on phones
      if (!initialised) {
        initialised = true;
        cam.current.zoom = Math.max(0.42, Math.min(1.1, w / 1800));
        if (w < 700) {
          cam.current.zoom = Math.max(0.48, Math.min(0.7, w / 760));
          cam.current.x = 1000;
          cam.current.y = 560;
        } else {
          cam.current.x = 1150;
          cam.current.y = 700;
        }
      }
    };
    let initialised = false;
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const clampCam = () => {
      const c = cam.current;
      c.zoom = Math.max(0.3, Math.min(2.5, c.zoom));
      const halfW = w / 2 / c.zoom, halfH = h / 2 / c.zoom;
      c.x = Math.max(halfW - 100, Math.min(WORLD.w - halfW + 100, c.x));
      c.y = Math.max(halfH - 100, Math.min(WORLD.h - halfH + 100, c.y));
    };

    const toScreen = (x: number, y: number) => {
      const c = cam.current;
      return [(x - c.x) * c.zoom + w / 2, (y - c.y) * c.zoom + h / 2] as const;
    };
    const toWorld = (sx: number, sy: number) => {
      const c = cam.current;
      return [(sx - w / 2) / c.zoom + c.x, (sy - h / 2) / c.zoom + c.y] as const;
    };

    // pointer input: pan / click / pinch
    const pointers = new Map<number, { x: number; y: number }>();
    let dragStart: { x: number; y: number; cx: number; cy: number } | null = null;
    let moved = 0;
    let pinchDist = 0;

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        dragStart = { x: e.clientX, y: e.clientY, cx: cam.current.x, cy: cam.current.y };
        moved = 0;
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        dragStart = null;
      }
    };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) {
          const mid = [(a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top];
          const [wx, wy] = toWorld(mid[0], mid[1]);
          cam.current.zoom *= d / pinchDist;
          clampCam();
          const [nx, ny] = toWorld(mid[0], mid[1]);
          cam.current.x += wx - nx;
          cam.current.y += wy - ny;
          clampCam();
        }
        pinchDist = d;
        moved = 100;
        return;
      }
      if (dragStart && pointers.size === 1) {
        const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
        moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
        cam.current.x = dragStart.cx - dx / cam.current.zoom;
        cam.current.y = dragStart.cy - dy / cam.current.zoom;
        clampCam();
      } else if (pointers.size === 0) {
        const [wx, wy] = toWorld(e.clientX - rect.left, e.clientY - rect.top);
        const p = hitPlace(wx, wy);
        hoverRef.current = p?.slug ?? null;
        canvas.style.cursor = p ? "pointer" : "grab";
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (dragStart && moved < 8 && pointers.size === 0) {
        const rect = canvas.getBoundingClientRect();
        const [wx, wy] = toWorld(e.clientX - rect.left, e.clientY - rect.top);
        const p = hitPlace(wx, wy);
        if (p) onSelectPlace(p.slug);
      }
      if (pointers.size === 0) dragStart = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const [wx, wy] = toWorld(sx, sy);
      const factor = Math.exp(-e.deltaY * 0.0015);
      cam.current.zoom *= factor;
      clampCam();
      const [nx, ny] = toWorld(sx, sy);
      cam.current.x += wx - nx;
      cam.current.y += wy - ny;
      clampCam();
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    // minimap click
    const mini = miniRef.current;
    const onMini = (e: PointerEvent) => {
      if (!mini) return;
      const r = mini.getBoundingClientRect();
      cam.current.x = ((e.clientX - r.left) / r.width) * WORLD.w;
      cam.current.y = ((e.clientY - r.top) / r.height) * WORLD.h;
      clampCam();
    };
    mini?.addEventListener("pointerdown", onMini);

    const pill = (text: string, cx: number, top: number, opts: { chip?: string; small?: boolean; bg?: string } = {}) => {
      const fs = opts.small ? 11 : 13;
      ctx.font = `700 ${fs}px "Pixelify Sans", monospace`;
      const tw = ctx.measureText(text).width;
      let chipW = 0;
      if (opts.chip) {
        ctx.font = `700 ${fs - 1}px "Pixelify Sans", monospace`;
        chipW = ctx.measureText(opts.chip).width + 12;
      }
      const padX = 8, hgt = opts.small ? 18 : 24;
      const bw = tw + padX * 2 + (chipW ? chipW + 6 : 0);
      const x = Math.round(cx - bw / 2), y = Math.round(top);
      ctx.fillStyle = "#1a1f1a";
      ctx.fillRect(x - 2, y - 2, bw + 4, hgt + 4);
      ctx.fillStyle = opts.bg ?? "#2b332b";
      ctx.fillRect(x, y, bw, hgt);
      ctx.fillStyle = "#f1ecdc";
      ctx.font = `700 ${fs}px "Pixelify Sans", monospace`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(text, x + padX, y + hgt / 2 + 1);
      if (opts.chip) {
        const cx2 = x + padX + tw + 6;
        ctx.fillStyle = "#f5d35a";
        ctx.fillRect(cx2, y + 4, chipW, hgt - 8);
        ctx.fillStyle = "#2a2300";
        ctx.font = `700 ${fs - 1}px "Pixelify Sans", monospace`;
        ctx.fillText(opts.chip, cx2 + 6, y + hgt / 2 + 1);
      }
      return { x, y, w: bw, h: hgt };
    };

    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      // update agents
      for (const s of states.current.values()) {
        const a = agentsRef.current.find((x) => x.id === s.id);
        if (a && !a.place) {
          // wander between road nodes
          if (now > s.wanderAt || Math.hypot(s.tx - s.x, s.ty - s.y) < 2) {
            if (Math.hypot(s.tx - s.x, s.ty - s.y) < 2) {
              const near = ROAD_NODES.filter((n) => Math.hypot(n[0] - s.x, n[1] - s.y) < 420 && Math.hypot(n[0] - s.x, n[1] - s.y) > 40);
              const pool = near.length ? near : ROAD_NODES;
              const n = pool[(hash(s.id + Math.floor(now / 1000)) >>> 0) % pool.length];
              s.tx = n[0];
              s.ty = n[1];
              s.wanderAt = now + 6000 + (hash(s.id) % 6000);
            } else s.wanderAt = now + 4000;
          }
        }
        const dx = s.tx - s.x, dy = s.ty - s.y;
        const d = Math.hypot(dx, dy);
        if (d > 1) {
          const stepLen = Math.min(d, SPEED * dt);
          s.x += (dx / d) * stepLen;
          s.y += (dy / d) * stepLen;
          s.facing = dx < 0 ? -1 : 1;
          s.walkT += dt * 8;
        } else if (a?.place && a.status === "inside") {
          s.visible = false;
        }
      }

      // draw
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#4f9d3f";
      ctx.fillRect(0, 0, w, h);
      const c = cam.current;
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(dpr * c.zoom, 0, 0, dpr * c.zoom, dpr * (w / 2 - c.x * c.zoom), dpr * (h / 2 - c.y * c.zoom));
      ctx.drawImage(bg, 0, 0);
      // hover highlight
      if (hoverRef.current) {
        const p = getPlace(hoverRef.current);
        if (p) {
          ctx.fillStyle = "rgba(245,211,90,0.12)";
          ctx.fillRect(p.rect.x - 8, p.rect.y - 8, p.rect.w + 16, p.rect.h + 16);
        }
      }
      const visible = [...states.current.values()].filter((s) => s.visible).sort((a, b) => a.y - b.y);
      for (const s of visible) {
        const frame = Math.hypot(s.tx - s.x, s.ty - s.y) > 1 ? Math.floor(s.walkT) % 4 : 0;
        agentSprite(ctx, Math.round(s.x), Math.round(s.y), s.color, frame, s.facing);
      }

      // labels in screen space
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const counts = countsRef.current;
      for (const p of PLACES) {
        const [sx, sy] = toScreen(p.rect.x + p.rect.w / 2, p.rect.y);
        if (sx < -200 || sx > w + 200 || sy < -60 || sy > h + 60) continue;
        const n = counts[p.slug] ?? 0;
        pill(p.shortName ?? p.name, sx, sy - 34, { chip: n ? String(n) : undefined, bg: hoverRef.current === p.slug ? "#3a463a" : undefined });
      }
      if (c.zoom > 0.55) {
        for (const s of visible) {
          const [sx, sy] = toScreen(s.x, s.y);
          if (sx < -100 || sx > w + 100 || sy < -60 || sy > h + 60) continue;
          pill(s.name, sx, sy - 40 * c.zoom - 20, { small: true });
        }
      }

      // minimap
      if (mini) {
        const mctx = mini.getContext("2d")!;
        const mw = mini.width, mh = mini.height;
        mctx.imageSmoothingEnabled = true;
        mctx.drawImage(bg, 0, 0, mw, mh);
        for (const s of visible) {
          mctx.fillStyle = "#1a1f1a";
          mctx.fillRect((s.x / WORLD.w) * mw - 2, (s.y / WORLD.h) * mh - 2, 4, 4);
          mctx.fillStyle = "#ffffff";
          mctx.fillRect((s.x / WORLD.w) * mw - 1, (s.y / WORLD.h) * mh - 1, 2, 2);
        }
        const vw = (w / c.zoom / WORLD.w) * mw, vh = (h / c.zoom / WORLD.h) * mh;
        const vx = ((c.x - w / 2 / c.zoom) / WORLD.w) * mw, vy = ((c.y - h / 2 / c.zoom) / WORLD.h) * mh;
        mctx.strokeStyle = "#ffffff";
        mctx.lineWidth = 2;
        mctx.strokeRect(vx, vy, vw, vh);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      mini?.removeEventListener("pointerdown", onMini);
    };
  }, [onSelectPlace]);

  return (
    <>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", touchAction: "none", cursor: "grab", display: "block" }} aria-label="Town map. Drag to look around, click a building to see who is there." />
      <div className="minimap panel" style={mobile ? { position: "absolute", right: 10, bottom: 262, padding: 5, zIndex: 5 } : { position: "absolute", right: 12, top: 12, padding: 6, zIndex: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 13, fontWeight: 700, padding: miniOpen ? "2px 4px 6px" : "2px 4px" }}>
          <span>Town map</span>
          <button onClick={toggleMini} aria-label={miniOpen ? "Collapse map" : "Expand map"} className="muted" style={{ background: "none", border: "none", fontSize: 16, lineHeight: 1, padding: "0 2px", color: "var(--muted)" }}>
            {miniOpen ? "–" : "+"}
          </button>
        </div>
        <canvas ref={miniRef} width={208} height={130} style={{ width: mobile ? 150 : 208, height: mobile ? 94 : 130, borderRadius: 4, border: "2px solid #3a443a", cursor: "pointer", display: miniOpen ? "block" : "none" }} />
      </div>
    </>
  );
}
