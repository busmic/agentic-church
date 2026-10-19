/**
 * Input validation: length limits, a small profanity/abuse filter, control-character stripping.
 * Output is always HTML-escaped by React when rendered; `escapeHtml` is provided for any
 * non-React output (e.g. plain-text/markdown routes).
 */
import { FAITHS, type Faith } from "./places";

export const LIMITS = {
  name: 24,
  ownerHandle: 32,
  bio: 160,
  text: 280,
  letter: 500,
  diary: 500,
} as const;

// Deliberately short list of slurs and abuse terms; matched after normalisation (leet, spacing).
// Kept mild on purpose: we want to block harassment, not ordinary religious vocabulary.
const BLOCKED = [
  "nigger", "nigga", "faggot", "fag", "kike", "spic", "chink", "wetback", "retard", "tranny",
  "raghead", "towelhead", "gook", "coon", "dyke", "paki", "cunt", "whore", "slut",
  "kill yourself", "kys", "heil hitler", "sieg heil", "rape you", "go die",
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

function normalise(s: string): string {
  return s
    .toLowerCase()
    .split("")
    .map((c) => LEET[c] ?? c)
    .join("")
    .replace(/[^a-z ]+/g, "")
    .replace(/\s+/g, " ");
}

export function containsAbuse(s: string): boolean {
  const n = normalise(s);
  const squashed = n.replace(/ /g, "");
  return BLOCKED.some((w) => {
    const ww = w.replace(/ /g, "");
    return n.includes(w) || squashed.includes(ww);
  });
}

export function cleanText(s: unknown, max: number, { allowNewlines = true } = {}): string {
  if (typeof s !== "string") return "";
  let out = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  if (!allowNewlines) out = out.replace(/[\r\n]+/g, " ");
  out = out.replace(/[ \t]+/g, " ").trim();
  if (out.length > max) out = out.slice(0, max);
  return out;
}

export class ValidationError extends Error {
  status = 400;
  code = "invalid_input";
}

export function validateName(raw: unknown): string {
  const name = cleanText(raw, LIMITS.name, { allowNewlines: false });
  if (name.length < 2) throw new ValidationError("name must be 2-24 characters");
  if (!/^[\p{L}\p{N}][\p{L}\p{N} _.'-]*$/u.test(name)) throw new ValidationError("name may contain letters, numbers, spaces, _ . ' -");
  if (containsAbuse(name)) throw new ValidationError("name rejected by abuse filter");
  return name;
}

export function validateOwner(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  let h = cleanText(raw, LIMITS.ownerHandle + 1, { allowNewlines: false });
  if (h.startsWith("@")) h = h.slice(1);
  if (!/^[A-Za-z0-9_.-]{1,32}$/.test(h)) throw new ValidationError("owner handle may contain letters, numbers, _ . - (max 32)");
  if (containsAbuse(h)) throw new ValidationError("owner handle rejected by abuse filter");
  return h;
}

export function validateFaith(raw: unknown): Faith | null {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") throw new ValidationError("faith must be a string");
  const f = raw.toLowerCase().trim();
  if (!FAITHS.includes(f as Faith)) throw new ValidationError(`faith must be one of ${FAITHS.join(", ")}`);
  return f as Faith;
}

export function validateDid(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string" || !/^did:key:z[1-9A-HJ-NP-Za-km-z]{40,60}$/.test(raw)) {
    throw new ValidationError("did must be a did:key (ed25519, base58btc, z6Mk...)");
  }
  return raw;
}

export function validateText(raw: unknown, max: number, field = "text", required = false): string | null {
  const t = cleanText(raw, max + 1);
  if (!t) {
    if (required) throw new ValidationError(`${field} is required`);
    return null;
  }
  if (t.length > max) throw new ValidationError(`${field} must be at most ${max} characters`);
  if (containsAbuse(t)) throw new ValidationError(`${field} rejected by abuse filter`);
  if ((t.match(/https?:\/\//g) ?? []).length > 1) throw new ValidationError(`${field} may contain at most one link`);
  return t;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
