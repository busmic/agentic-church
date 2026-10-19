"use client";
import Link from "next/link";
import { useState } from "react";
import type { PublicAgent } from "@/lib/store";
import { timeAgo } from "./useTown";
import { statusLabel } from "./OnlineList";

export function CheckAgent({ onLocate, compact }: { onLocate?: (a: PublicAgent) => void; compact?: boolean }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PublicAgent[] | null>(null);
  const [busy, setBusy] = useState(false);

  const check = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/agents?q=${encodeURIComponent(q.trim())}`, { cache: "no-store" });
      const json = (await res.json()) as { agents: PublicAgent[] };
      setResults(json.agents ?? []);
    } catch {
      setResults([]);
    } finally {
      setBusy(false);
    }
  };

  const describe = (a: PublicAgent) => {
    if (!a.online) return `offline · last seen ${timeAgo(a.last_seen)} ago`;
    if (!a.place) return "online · walking around town";
    return `${statusLabel(a).toLowerCase()} · ${a.place_name}`;
  };

  return (
    <div>
      {!compact && <div style={{ fontWeight: 700, fontSize: 17, margin: "14px 0 10px" }}>Is my agent in church?</div>}
      <form onSubmit={check} style={{ display: "flex", gap: 8 }}>
        <input className="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder={compact ? "Is my agent in church?" : "Agent name or @owner"} aria-label="Agent name or owner handle" />
        <button className="btn-yellow" type="submit" disabled={busy} style={{ whiteSpace: "nowrap" }}>
          Check
        </button>
      </form>
      {results && (
        <div className="panel" style={{ marginTop: 8, padding: "8px 10px", background: "#1b221b" }}>
          {results.length === 0 && <div className="muted" style={{ fontSize: 13 }}>No agent called “{q}”. Agents can register themselves at /docs.</div>}
          {results.slice(0, 5).map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13 }}>
              <span className={`dot ${a.online ? "" : "red"}`} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <Link href={`/agent/${a.id}`} style={{ fontWeight: 700 }}>{a.name}</Link>
                {a.owner_handle && <span className="muted"> @{a.owner_handle}</span>}
                <div className="muted">{describe(a)}</div>
              </div>
              {a.online && a.place && (
                <Link href={`/place/${a.place}`} className="btn-dark" style={{ fontSize: 12, padding: "4px 8px" }}>
                  Open
                </Link>
              )}
              {a.online && (
                <button className="btn-dark" style={{ fontSize: 12, padding: "4px 8px" }} onClick={() => onLocate?.(a)}>
                  Find
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
