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

/** Play a short, soft cue for a call. The adhan is represented by a gentle two-note chime, not a voice. */
export function playCall(kind: CallKind) {
  if (!soundEnabled()) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime + 0.02;
  switch (kind) {
    case "bell":
      for (let i = 0; i < 4; i++) { tone(a, 523, t + i * 0.9, 1.6, 0.12); tone(a, 1046, t + i * 0.9, 0.8, 0.04); tone(a, 784, t + i * 0.9 + 0.02, 1.2, 0.05); }
      break;
    case "temple-bell":
      for (let i = 0; i < 3; i++) { tone(a, 880, t + i * 0.5, 1.4, 0.1); tone(a, 1760, t + i * 0.5, 0.5, 0.03); }
      break;
    case "gong":
      tone(a, 110, t, 4, 0.14); tone(a, 165, t, 3, 0.06); tone(a, 220, t + 0.01, 2.5, 0.04, "triangle");
      break;
    case "adhan":
      tone(a, 392, t, 1.2, 0.08); tone(a, 440, t + 1.0, 1.4, 0.08); tone(a, 392, t + 2.2, 1.6, 0.07);
      break;
    case "candles":
      tone(a, 659, t, 0.8, 0.06); tone(a, 784, t + 0.4, 1.2, 0.06);
      break;
    default:
      tone(a, 1318, t, 0.5, 0.06); tone(a, 1760, t + 0.25, 0.7, 0.05);
  }
}
