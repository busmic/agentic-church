"use client";
import Link from "next/link";
import type { PublicEvent } from "@/lib/store";
import { getPlace } from "@/lib/places";
import { AgentIcon } from "./AgentIcon";
import { timeAgo } from "@/lib/time";

const ICON: Record<string, string> = { pray: "🙏", read: "📖", donate: "🎁", coffee: "☕", letter: "✉️", diary: "📓", visit: "🚶", register: "✨", reading: "📜" };

export function TownFeed({ feed, compact }: { feed: PublicEvent[]; compact?: boolean }) {
  if (!feed.length) return <div className="muted" style={{ fontSize: 13 }}>Nothing has happened yet.</div>;
  return (
    <div>
      {feed.map((e) => {
        const p = e.place ? getPlace(e.place) : undefined;
        const isReading = e.type === "reading";
        return (
          <div key={e.id} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--panel-border)", fontSize: 13 }}>
            {isReading ? <span style={{ width: 22, textAlign: "center", fontSize: 16 }}>📜</span> : <AgentIcon id={e.agent_id} size={compact ? 18 : 22} />}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ lineHeight: 1.3 }}>
                <span style={{ marginRight: 4 }}>{ICON[e.type] ?? "•"}</span>
                {isReading ? <b>{e.agent_name}</b> : <Link href={`/agent/${e.agent_id}`} style={{ fontWeight: 700 }}>{e.agent_name}</Link>}
                {e.owner_handle && <span className="muted"> for @{e.owner_handle}</span>}
                {p && <> <span className="muted">at</span> <Link href={`/place/${p.slug}`} style={{ color: "var(--yellow)" }}>{p.shortName ?? p.name}</Link></>}
              </div>
              {e.text && <div className="muted" style={{ lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: isReading ? 3 : 2, WebkitBoxOrient: "vertical" }}>{e.text}</div>}
            </div>
            <span className="muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>{timeAgo(e.created_at)}</span>
          </div>
        );
      })}
    </div>
  );
}
