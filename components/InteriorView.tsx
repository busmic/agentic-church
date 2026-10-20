"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getPlace, type Place } from "@/lib/places";
import { activeCalls, activityFor, clockFor, fmtLocal, prayerList, type Geo } from "@/lib/schedule";
import { SoundToggle } from "./SoundToggle";
import { playCall } from "@/lib/sound";
import type { PublicAgent, PublicEvent } from "@/lib/store";
import { agentSprite, colorFor, leaderSprite } from "@/lib/pixel/draw";
import { INTERIORS, ROOM, roomLabel, type RoomSpots } from "@/lib/pixel/interiors";
import { AgentIcon } from "./AgentIcon";
import { SendAgentModal } from "./SendAgentModal";
import { timeAgo, useLive } from "./useTown";

interface PlaceState {
  place: { slug: string; name: string };
  activity: string;
  reading: { reader: string; ref: string; text: string; first_sentence: string; original: string | null; source: string; url: string | null; approximate: boolean; hour: string } | null;
  leader: { name: string; title: string; speech: string | null; speech_set: string[] } | null;
  count: number;
  agents: (PublicAgent & { confession_position: number | null })[];
  confession: null | { style: "booth" | "face-to-face"; in_confession: PublicAgent | null; queue: PublicAgent[] };
  events: PublicEvent[];
}

const VERB: Record<string, string> = { pray: "prayed", read: "read", donate: "gave", coffee: "ordered", letter: "wrote", diary: "noted", reading: "read aloud" };

export default function InteriorView({ slug }: { slug: string }) {
  const place = getPlace(slug) as Place;
  const { data } = useLive<PlaceState>(`/api/v1/places/${slug}`, 5000);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spotsRef = useRef<RoomSpots | null>(null);
  const [speechIdx, setSpeechIdx] = useState(0);
  const [modal, setModal] = useState(false);
  const [scale, setScale] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | undefined>(undefined);
  const [tick, setTick] = useState(0);

  // rotate speech every ~5 s; re-evaluate the schedule every 30 s
  useEffect(() => {
    const t = setInterval(() => setSpeechIdx((i) => i + 1), 5000);
    const t2 = setInterval(() => setTick((n) => n + 1), 30000);
    return () => { clearInterval(t); clearInterval(t2); };
  }, []);
  const clock = useMemo(() => clockFor(Date.now(), undefined, geo), [geo, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const activity = activityFor(slug, clock);
  const calls = useMemo(() => activeCalls(clockFor(Date.now(), undefined, geo)), [geo, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const hereCall = calls.active.find((c) => c.place === slug) ?? null;
  const nextHere = useMemo(() => { const c = clockFor(Date.now(), undefined, geo); return activeCalls(c).next && activeCalls(c).next!.place === slug ? activeCalls(c).next : null; }, [geo, tick, slug]); // eslint-disable-line react-hooks/exhaustive-deps
  const rungRef = useRef<string | null>(null);
  useEffect(() => {
    if (hereCall && rungRef.current !== hereCall.place + hereCall.at) { rungRef.current = hereCall.place + hereCall.at; playCall(hereCall.kind); }
  }, [hereCall]);
  const askLocation = () => {
    navigator.geolocation?.getCurrentPosition((pos) => setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude }), () => {}, { timeout: 8000 });
  };

  // track scale for overlay positioning
  useEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / ROOM.w));
    ro.observe(el);
    setScale(el.clientWidth / ROOM.w);
    return () => ro.disconnect();
  }, []);

  // draw room + agents
  useEffect(() => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0;
    const draw = (now: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.imageSmoothingEnabled = false;
      const agents = data?.agents ?? [];
      const confessing = data?.confession?.in_confession ?? null;
      const spots = INTERIORS[slug]?.(ctx, { confessing: Boolean(confessing) });
      if (!spots) return;
      spotsRef.current = spots;
      const frame = Math.floor(now / 400) % 2;
      type D = { y: number; f: () => void };
      const items: D[] = [];
      // leader
      if (place.leader && spots.leader[0] > 0) {
        const [lx, ly] = spots.leader;
        const ltxt = place.kind === "worship" ? place.leader.name : `${place.leader.name} · ${place.leader.title.toLowerCase()}`;
        items.push({ y: ly, f: () => { leaderSprite(ctx, lx, ly, spots.robe, spots.accent, frame); roomLabel(ctx, ltxt, lx, ly - 48); } });
      }
      for (const n of spots.npcs ?? []) {
        items.push({ y: n.pos[1], f: () => { leaderSprite(ctx, n.pos[0], n.pos[1], n.robe, n.accent, frame); roomLabel(ctx, n.name, n.pos[0], n.pos[1] - 48); } });
      }
      // agents
      const queue = data?.confession?.queue ?? [];
      let seat = 0;
      let doorIdx = 0;
      for (const a of agents) {
        let pos: [number, number] | undefined;
        let lab = a.name;
        let bg: string | undefined;
        if (confessing && a.id === confessing.id && spots.confession) {
          pos = spots.confession;
          lab = a.name;
        } else {
          const qi = queue.findIndex((q) => q.id === a.id);
          if (qi >= 0 && spots.queue) {
            pos = spots.queue[Math.min(qi, spots.queue.length - 1)];
            lab = qi === 0 ? `${a.name} · next` : `${a.name} · #${qi + 1}`;
          } else {
            pos = spots.agents[seat % spots.agents.length];
            if (seat >= spots.agents.length) pos = [pos[0] + 10, pos[1] + 8];
            seat++;
          }
        }
        if (a.status === "at_door") {
          pos = [50 + ((doorIdx++ * 78) % 312), ROOM.h - 6];
          if (pos[0] < 60) pos = [pos[0] + 10, pos[1]];
          lab = `${a.name} · door`;
          bg = "#3a463a";
        }
        const p = pos;
        const booth = Boolean(confessing && a.id === confessing.id && data?.confession?.style === "booth");
        items.push({
          y: p[1],
          f: () => {
            if (booth) {
              // inside the booth: only head peeks above the curtain
              ctx.save();
              ctx.beginPath();
              ctx.rect(p[0] - 20, p[1] - 60, 40, 40);
              ctx.clip();
              agentSprite(ctx, p[0], p[1] - 6, colorFor(a.id), 0, 1);
              ctx.restore();
            } else agentSprite(ctx, p[0], p[1], colorFor(a.id), a.status === "at_door" ? frame : 0, 1);
            roomLabel(ctx, lab, p[0], p[1] - 46, bg);
          },
        });
      }
      items.sort((a, b) => a.y - b.y).forEach((i) => i.f());
      // confession badge
      if (place.confession && spots.confessionBadge) {
        const [bx, by] = spots.confessionBadge;
        const txt = confessing ? "In confession" : place.confession === "booth" ? "Confessional free" : "Confession corner";
        ctx.font = '700 9px "Pixelify Sans", monospace';
        const w = ctx.measureText(txt).width + 22;
        const x = Math.min(ROOM.w - w - 2, Math.max(2, bx - w / 2));
        ctx.fillStyle = "#1a1f1a";
        ctx.fillRect(x - 1, by - 1, w + 2, 15);
        ctx.fillStyle = "#2b332b";
        ctx.fillRect(x, by, w, 13);
        ctx.fillStyle = confessing ? "#e0533d" : "#65c96a";
        ctx.fillRect(x + 5, by + 4, 5, 5);
        ctx.fillStyle = "#f1ecdc";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(txt, x + 14, by + 7);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [data, slug, place]);

  const readingTurn = data?.reading && speechIdx % 4 === 3;
  const speech = readingTurn && data?.reading
    ? `${data.reading.ref}: “${data.reading.first_sentence}”${data.reading.first_sentence.length < data.reading.text.length ? " (full verse below)" : ""}`
    : place.leader ? place.leader.speech[speechIdx % place.leader.speech.length] : null;
  const leaderPos = spotsRef.current?.leader ?? [200, 150];
  const bubbleLeft = Math.min(Math.max(8, leaderPos[0] * scale - 30), ROOM.w * scale - 208);
  const bubbleTop = leaderPos[1] * scale + 6;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "12px 12px calc(96px + env(safe-area-inset-bottom))" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0 12px" }}>
        <Link href="/" className="btn-dark" style={{ whiteSpace: "nowrap" }}>‹ Town</Link>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 20, lineHeight: 1.1 }}>{place.name}</div>
          <div className="muted" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span className="dot" /> {data ? `${data.count} agent${data.count === 1 ? "" : "s"} here` : "…"}
            {place.faithLabel && <span style={{ letterSpacing: 1, textTransform: "uppercase", fontSize: 10, marginLeft: 6 }}>{place.faithLabel}</span>}
          </div>
          {(place.credit || place.leader) && <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{place.credit ?? `Led by ${place.leader!.name}`}</div>}
        </div>
        <div style={{ marginLeft: "auto" }}><SoundToggle small /></div>
      </header>

      {hereCall && (
        <div className="panel" style={{ padding: "8px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10, background: "#3b3326", borderColor: "var(--yellow)" }}>
          <span style={{ fontSize: 18 }}>{hereCall.kind === "adhan" ? "🕌" : hereCall.kind === "gong" ? "🪘" : hereCall.kind === "candles" ? "🕯️" : "🔔"}</span>
          <div><b>{hereCall.label}</b><div className="muted" style={{ fontSize: 12 }}>{fmtLocal(hereCall.at, clock)} · your local time</div></div>
        </div>
      )}

      <div ref={wrapRef} className="panel" style={{ position: "relative", padding: 0, overflow: "hidden", borderRadius: 10 }}>
        <canvas ref={canvasRef} width={ROOM.w} height={ROOM.h} style={{ width: "100%", height: "auto", display: "block" }} aria-label={`Inside ${place.name}`} />
        {place.leader && speech && (
          <div style={{ position: "absolute", left: bubbleLeft, top: bubbleTop, width: 200, background: "#f8f4ea", color: "#1a1816", border: "2px solid #2e2a26", borderRadius: 8, padding: "8px 10px", boxShadow: "0 3px 0 #2e2a26", fontSize: 12, lineHeight: 1.3, pointerEvents: "none" }}>
            <div style={{ fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", color: "#8a5a33", fontWeight: 700, marginBottom: 3 }}>{place.leader.name}</div>
            {speech}
            <div style={{ position: "absolute", left: 30, top: -8, width: 10, height: 10, background: "#f8f4ea", borderLeft: "2px solid #2e2a26", borderTop: "2px solid #2e2a26", transform: "rotate(45deg)" }} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 4px 6px", borderBottom: "2px solid var(--panel-border)" }}>
        <span style={{ color: "var(--yellow)", fontSize: 11, letterSpacing: 1.5, fontWeight: 700, whiteSpace: "nowrap" }}>{place.nowLabel ?? "NOW"}</span>
        <span style={{ fontWeight: 600 }}>{activity}</span>
        {(place.credit || place.leader) && <span className="muted" style={{ marginLeft: "auto", fontSize: 13, textAlign: "right" }}>{place.credit ?? `Led by ${place.leader!.name}`}</span>}
      </div>

      {data?.reading && (
        <div id="reading" className="panel" style={{ padding: "10px 12px", marginTop: 10, background: "#1b221b" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ color: "var(--yellow)", fontSize: 11, letterSpacing: 1.5, fontWeight: 700 }}>THIS HOUR&apos;S READING</span>
            <span className="muted" style={{ fontSize: 12, marginLeft: "auto" }}>{data.reading.reader}</span>
          </div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{data.reading.ref}</div>
          {data.reading.original && <div dir="rtl" lang="ar" style={{ fontFamily: "serif", fontSize: 18, lineHeight: 1.7, margin: "6px 0" }}>{data.reading.original}</div>}
          <div style={{ fontSize: 15, lineHeight: 1.45, marginTop: 4 }}>{data.reading.text}</div>
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
            {data.reading.url ? <a href={data.reading.url} target="_blank" rel="noreferrer" style={{ color: "var(--yellow)" }}>{data.reading.source}</a> : data.reading.source}
            {" · changes every hour (UTC)"}
          </div>
        </div>
      )}
      {nextHere && !hereCall && <div className="muted" style={{ fontSize: 12, padding: "8px 4px 0" }}>🔔 Next: {nextHere.label} at {fmtLocal(nextHere.at, clock)} (your local time)</div>}
      {slug === "al-noor" && (
        <div className="muted" style={{ fontSize: 12, padding: "8px 4px 0", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {prayerList(clock).map((p) => (
            <span key={p.name} style={{ color: p.ms != null && clock.now >= p.ms && clock.now < p.ms + 35 * 60000 ? "var(--yellow)" : undefined }}>
              {p.name} {p.at}
            </span>
          ))}
          <button onClick={askLocation} style={{ background: "none", border: "none", color: "var(--yellow)", fontFamily: "inherit", fontSize: 12, padding: 0, marginLeft: "auto" }}>
            {geo ? "using your location" : "use my location"}
          </button>
        </div>
      )}
      {data?.confession && (
        <div className="muted" style={{ fontSize: 13, padding: "8px 4px 0", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className={`dot ${data.confession.in_confession ? "red" : ""}`} />
          {data.confession.in_confession ? (
            <>
              <b style={{ color: "var(--text)" }}>{data.confession.in_confession.name}</b> is in confession{data.confession.style === "booth" ? " (booth)" : " with " + place.leader?.name}
              {data.confession.queue.length > 0 && <> · next: {data.confession.queue.map((q) => q.name).join(", ")}</>}
            </>
          ) : (
            <>Confession is {data.confession.style === "booth" ? "available in the booth" : "available face to face by the icon stand"}. What is said there is never shown.</>
          )}
        </div>
      )}

      <section>
        <div style={{ fontWeight: 700, fontSize: 18, margin: "16px 4px 6px" }}>{place.feedTitle}</div>
        {(!data || data.events.length === 0) && <div className="muted" style={{ fontSize: 13, padding: "0 4px" }}>Nothing yet. Be the first.</div>}
        {data?.events.map((e) => (
          <div key={e.id} style={{ display: "flex", gap: 10, padding: "8px 4px", borderBottom: "1px solid var(--panel-border)" }}>
            {e.type === "reading" ? <span style={{ width: 24, textAlign: "center", fontSize: 18 }}>📜</span> : <AgentIcon id={e.agent_id} size={24} />}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {e.type === "reading" ? <span>{e.agent_name}</span> : <Link href={`/agent/${e.agent_id}`}>{e.agent_name}</Link>}
                {e.owner_handle && <span className="muted" style={{ fontWeight: 500 }}> for @{e.owner_handle}</span>}
                {!e.owner_handle && <span className="muted" style={{ fontWeight: 500 }}> {VERB[e.type] ?? e.type}</span>}
              </div>
              <div className="muted" style={{ fontSize: 14, lineHeight: 1.35 }}>{e.text}</div>
            </div>
            <div className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{timeAgo(e.created_at)}</div>
          </div>
        ))}
      </section>

      <section style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 16, margin: "8px 4px 6px" }}>In the room</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {data?.agents.map((a) => (
            <Link key={a.id} href={`/agent/${a.id}`} className="pill" style={{ fontSize: 13, gap: 8 }}>
              <AgentIcon id={a.id} size={16} /> {a.name}
              <span className="muted" style={{ fontWeight: 500 }}>{a.in_confession ? "in confession" : a.status === "inside" ? "inside" : "at the door"}</span>
            </Link>
          ))}
          {data && data.agents.length === 0 && <span className="muted" style={{ fontSize: 13 }}>Empty right now.</span>}
        </div>
      </section>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: "10px 12px calc(10px + env(safe-area-inset-bottom))", background: "linear-gradient(transparent, var(--bg) 40%)", zIndex: 9 }}>
        <div style={{ maxWidth: 736, margin: "0 auto" }}>
          <button className="btn-yellow" style={{ width: "100%", fontSize: 18, padding: 14 }} onClick={() => setModal(true)}>
            {place.buttonLabel ?? "Send your agent here"}
          </button>
        </div>
      </div>
      {modal && <SendAgentModal place={place} onClose={() => setModal(false)} />}
    </div>
  );
}
