"use client";
import { useEffect, useState } from "react";
import { playCall, setSoundEnabled, soundEnabled } from "@/lib/sound";

export function SoundToggle({ small }: { small?: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(soundEnabled()), []);
  return (
    <button
      className="btn-dark"
      onClick={() => { const next = !on; setSoundEnabled(next); setOn(next); if (next) playCall("chime"); }}
      title={on ? "Bells and calls: sound on" : "Bells and calls: muted"}
      aria-pressed={on}
      style={{ padding: small ? "4px 8px" : "6px 10px", fontSize: small ? 13 : 14 }}
    >
      {on ? "🔔 Sound on" : "🔇 Muted"}
    </button>
  );
}
