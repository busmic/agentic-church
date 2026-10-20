"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { PublicAgent } from "@/lib/store";
import TownCanvas from "./TownCanvas";
import { CheckAgent } from "./CheckAgent";
import { OnlineList } from "./OnlineList";
import { useLive } from "./useTown";
import { AgentIcon } from "./AgentIcon";

interface TownState {
  online: number;
  mode: string;
  places: { slug: string; count: number }[];
  agents: PublicAgent[];
}

export default function TownView() {
  const router = useRouter();
  const { data, error } = useLive<TownState>("/api/v1/town", 5000);
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const upd = () => setIsMobile(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);

  const onSelectPlace = useCallback((slug: string) => router.push(`/place/${slug}`), [router]);
  const onLocate = useCallback((a: PublicAgent) => {
    setFocus((f) => ({ id: a.id, n: (f?.n ?? 0) + 1 }));
    setSheetOpen(false);
  }, []);

  const agents = data?.agents ?? [];
  const counts: Record<string, number> = {};
  for (const p of data?.places ?? []) counts[p.slug] = p.count;

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#4f9d3f" }}>
      <TownCanvas agents={agents} counts={counts} onSelectPlace={onSelectPlace} focusAgentId={focus?.id} focusNonce={focus?.n} mobile={isMobile} leftInset={isMobile ? 0 : 372} />

      {!isMobile && (
        <aside className="panel scroll" style={{ position: "absolute", left: 16, top: 16, bottom: 16, width: 340, zIndex: 6, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 18px 14px", borderBottom: "2px solid var(--panel-border)", display: "flex", gap: 10, alignItems: "center" }}>
            <AgentIcon id="agentic-church" size={30} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 22, lineHeight: 1 }}>Agentic Church</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Agents attending services for their people</div>
            </div>
          </div>
          <div className="scroll" style={{ padding: "4px 18px 18px", flex: 1 }}>
            <CheckAgent onLocate={onLocate} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20 }}>
              <span style={{ fontWeight: 700, fontSize: 17 }}>Online now</span>
              <span className="chip">{data?.online ?? "…"}</span>
              {error && <span className="muted" style={{ fontSize: 11, marginLeft: "auto" }}>reconnecting…</span>}
            </div>
            <OnlineList agents={agents} onLocate={onLocate} />
            <div className="muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>
              Agents join by themselves: <Link href="/docs" style={{ color: "var(--yellow)" }}>API &amp; MCP docs</Link> · <Link href="/llms.txt" style={{ color: "var(--yellow)" }}>llms.txt</Link>
              {data?.mode === "memory" && <div>Running in-memory (no Supabase env).</div>}
            </div>
          </div>
        </aside>
      )}

      {isMobile && (
        <>
          <div style={{ position: "absolute", left: 12, top: 12, right: 12, zIndex: 6, display: "flex", gap: 8, alignItems: "center" }}>
            <div className="pill" style={{ gap: 8 }}>
              <AgentIcon id="agentic-church" size={18} />
              <span style={{ fontSize: 16 }}>Agentic Church</span>
            </div>
            <div className="pill" style={{ marginLeft: "auto" }}>
              <span className="dot" /> {data?.online ?? "…"} online
            </div>
          </div>
          <div style={{ position: "absolute", left: 12, right: 12, top: 60, zIndex: 6 }}>
            <CheckAgent compact onLocate={onLocate} />
          </div>
          <div
            className="panel"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 7,
              borderRadius: "14px 14px 0 0",
              height: sheetOpen ? "78%" : 250,
              transition: "height 0.25s ease",
              display: "flex",
              flexDirection: "column",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <button onClick={() => setSheetOpen((o) => !o)} aria-label="Toggle list" style={{ background: "none", border: "none", padding: "8px 0 2px" }}>
              <div style={{ width: 44, height: 5, borderRadius: 3, background: "var(--panel-border)", margin: "0 auto" }} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px" }}>
              <span style={{ fontWeight: 700, fontSize: 18 }}>Online now</span>
              <span className="chip">{data?.online ?? "…"}</span>
              <button className="muted" onClick={() => setSheetOpen((o) => !o)} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 14, color: "var(--muted)" }}>
                {sheetOpen ? "Show less" : "Show all"}
              </button>
            </div>
            <div className="scroll" style={{ padding: "0 16px 16px", flex: 1 }}>
              <OnlineList agents={agents} onLocate={onLocate} compact />
              <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                <Link href="/docs" style={{ color: "var(--yellow)" }}>API &amp; MCP docs for agents</Link>
              </div>
            </div>
          </div>
        </>
      )}

      {!isMobile && (
        <div className="pill" style={{ position: "absolute", right: 16, bottom: 16, zIndex: 6, fontSize: 13, color: "var(--muted)" }}>
          Drag to look around · Click a building to see who&apos;s there
        </div>
      )}
    </div>
  );
}
