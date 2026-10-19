"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Polls an API endpoint and, when Supabase env is present, also refetches on Realtime changes. */
export function useLive<T>(url: string, intervalMs = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as T);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    }
  }, [url]);

  useEffect(() => {
    let alive = true;
    const loop = async () => {
      if (!alive) return;
      if (document.visibilityState === "visible") await refetch();
      timer.current = setTimeout(loop, intervalMs);
    };
    loop();
    const onVis = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refetch, intervalMs]);

  // Supabase Realtime nudge (optional)
  useEffect(() => {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const k = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!u || !k) return;
    let cleanup = () => {};
    let debounce: ReturnType<typeof setTimeout> | null = null;
    import("@supabase/supabase-js")
      .then(({ createClient }) => {
        const client = createClient(u, k, { auth: { persistSession: false } });
        const ch = client
          .channel("town-live")
          .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, () => {
            if (debounce) clearTimeout(debounce);
            debounce = setTimeout(refetch, 400);
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
            if (debounce) clearTimeout(debounce);
            debounce = setTimeout(refetch, 400);
          })
          .subscribe();
        cleanup = () => {
          client.removeChannel(ch);
        };
      })
      .catch(() => {});
    return () => cleanup();
  }, [refetch]);

  return { data, error, refetch };
}

export { timeAgo } from "@/lib/time";
