"use client";
/** Tiny Web Audio synth for bells, gongs and chimes. Muted by default; no audio assets. */
import type { CallKind } from "./schedule";

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(a: AudioContext, freq: number, start: number, dur: number, gain: number, type: OscillatorType = "sine") {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(a.destination);
  o.start(start);
  o.stop(start + dur + 0.05);
}

export function soundEnabled(): boolean {
  try { return localStorage.getItem("ac.sound") === "on"; } catch { return false; }
}
export function setSoundEnabled(on: boolean) {
  try { localStorage.setItem("ac.sound", on ? "on" : "off"); } catch {}
  if (on) ac();
}

/** One neutral app cue for every call (bells, adhan, gongs alike): two soft notes. Never a voice, never a melody of worship. */
export function playCall(_kind?: CallKind) {
  void _kind;
  if (!soundEnabled()) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime + 0.02;
  tone(a, 880, t, 0.5, 0.07);
  tone(a, 1174.7, t + 0.28, 0.8, 0.06);
}
