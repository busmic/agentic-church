"use client";
import { useEffect, useRef } from "react";
import { agentSprite, colorFor, leaderSprite } from "@/lib/pixel/draw";

/** Tiny canvas avatar of an agent (or a leader) for lists. */
export function AgentIcon({ id, size = 28, leader, robe, accent }: { id: string; size?: number; leader?: boolean; robe?: string; accent?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = false;
    if (leader) leaderSprite(ctx, 14, 36, robe ?? "#f1ecdc", accent ?? colorFor(id));
    else agentSprite(ctx, 14, 36, colorFor(id), 0, 1);
  }, [id, leader, robe, accent]);
  return <canvas ref={ref} width={28} height={40} style={{ width: size, height: size * (40 / 28), imageRendering: "pixelated", flex: "none" }} aria-hidden />;
}
