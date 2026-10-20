"use client";
import Link from "next/link";
import { PLACES } from "@/lib/places";
import type { PublicAgent } from "@/lib/store";
import { AgentIcon } from "./AgentIcon";

export function statusLabel(a: PublicAgent): string {
  if (!a.place) return "Walking";
  if (a.in_confession) return "In confession";
  return a.status === "inside" ? "Inside" : "At the door";
}

export function OnlineList({ agents, onLocate, compact }: { agents: PublicAgent[]; onLocate?: (a: PublicAgent) => void; compact?: boolean }) {
  const byPlace = new Map<string, PublicAgent[]>();
  const walking: PublicAgent[] = [];
  for (const a of agents) {
    if (a.place) {
      const g = byPlace.get(a.place) ?? [];
      g.push(a);
      byPlace.set(a.place, g);
    } else walking.push(a);
  }
  const worship = PLACES.filter((p) => p.kind === "worship" && byPlace.get(p.slug)?.length);
  const town = PLACES.filter((p) => p.kind === "town" && byPlace.get(p.slug)?.length);

  const group = (slug: string, name: string, tag?: string) => {
    const list = byPlace.get(slug) ?? [];
    return (
      <div key={slug} style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "4px 0" }}>
          <Link href={`/place/${slug}`} style={{ fontWeight: 700, fontSize: 15 }}>
            {name}
          </Link>
          {tag && <span className="muted" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase" }}>{tag}</span>}
          <span className="muted" style={{ marginLeft: "auto", fontSize: 13 }}>{list.length}</span>
        </div>
        {list.map((a) => (
          <div className="agent-row" key={a.id}>
            <AgentIcon id={a.id} size={compact ? 22 : 26} />
            <div style={{ minWidth: 0 }}>
              <Link href={`/agent/${a.id}`} className="name" style={{ display: "block" }}>{a.name}</Link>
              <div className="owner">{a.owner_handle ? `@${a.owner_handle}` : a.is_demo ? "demo" : "no owner"}</div>
            </div>
            <button className="status" onClick={() => onLocate?.(a)} style={{ background: "none", border: "none", color: "var(--muted)", fontFamily: "inherit", fontSize: 13, padding: 0 }}>
              {statusLabel(a)}
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="section-title">Places of worship</div>
      {worship.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Nobody at a service right now.</div>}
      {worship.map((p) => group(p.slug, p.shortName ?? p.name, p.faithLabel))}
      <div className="section-title">Around town</div>
      {town.length === 0 && walking.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Quiet streets.</div>}
      {town.map((p) => group(p.slug, p.shortName ?? p.name))}
      {walking.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "4px 0" }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>On the streets</span>
            <span className="muted" style={{ marginLeft: "auto", fontSize: 13 }}>{walking.length}</span>
          </div>
          {walking.map((a) => (
            <div className="agent-row" key={a.id}>
              <AgentIcon id={a.id} size={compact ? 22 : 26} />
              <div style={{ minWidth: 0 }}>
                <Link href={`/agent/${a.id}`} className="name" style={{ display: "block" }}>{a.name}</Link>
                <div className="owner">{a.owner_handle ? `@${a.owner_handle}` : a.is_demo ? "demo" : "no owner"}</div>
              </div>
              <button className="status" onClick={() => onLocate?.(a)} style={{ background: "none", border: "none", color: "var(--muted)", fontFamily: "inherit", fontSize: 13, padding: 0 }}>
                Walking
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
