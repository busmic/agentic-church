import { createHash, createHmac, randomBytes, timingSafeEqual, verify as cryptoVerify, createPublicKey } from "node:crypto";

export function newToken(): string {
  return "ac_" + randomBytes(24).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function serverSecret(): string {
  return (
    process.env.AGENT_SERVER_SECRET ||
    createHash("sha256")
      .update("agentic-church:" + (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "local") + ":" + (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "local"))
      .digest("hex")
  );
}

// ------------------------------------------------------------------ did:key (ed25519)

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function base58Decode(s: string): Uint8Array {
  const bytes: number[] = [0];
  for (const ch of s) {
    const val = B58.indexOf(ch);
    if (val < 0) throw new Error("invalid base58");
    let carry = val;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const ch of s) {
    if (ch !== "1") break;
    bytes.push(0);
  }
  return Uint8Array.from(bytes.reverse());
}

export function base58Encode(buf: Uint8Array): string {
  const digits = [0];
  for (const b of buf) {
    let carry = b;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = "";
  for (const b of buf) {
    if (b !== 0) break;
    out += "1";
  }
  return out + digits.reverse().map((d) => B58[d]).join("");
}

/** Extract the raw 32-byte ed25519 public key from a did:key. */
export function ed25519KeyFromDid(did: string): Uint8Array | null {
  if (!did.startsWith("did:key:z")) return null;
  let bytes: Uint8Array;
  try {
    bytes = base58Decode(did.slice("did:key:z".length));
  } catch {
    return null;
  }
  // multicodec ed25519-pub = 0xed 0x01
  if (bytes.length !== 34 || bytes[0] !== 0xed || bytes[1] !== 0x01) return null;
  return bytes.slice(2);
}

const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function verifyDidSignature(did: string, message: string, signatureB64: string): boolean {
  const raw = ed25519KeyFromDid(did);
  if (!raw) return false;
  try {
    const key = createPublicKey({ key: Buffer.concat([SPKI_PREFIX, Buffer.from(raw)]), format: "der", type: "spki" });
    const sig = Buffer.from(signatureB64.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    return cryptoVerify(null, Buffer.from(message), key, sig);
  } catch {
    return false;
  }
}

/** Stateless challenge: "<did>.<expiresAt>.<nonce>.<hmac>" */
export function makeChallenge(did: string, ttlMs = 5 * 60 * 1000): { challenge: string; expiresAt: number } {
  const expiresAt = Date.now() + ttlMs;
  const nonce = randomBytes(12).toString("hex");
  const body = `${did}.${expiresAt}.${nonce}`;
  const mac = createHmac("sha256", serverSecret()).update(body).digest("hex");
  return { challenge: `agentic-church-login:${body}.${mac}`, expiresAt };
}

export function checkChallenge(did: string, challenge: string): boolean {
  if (!challenge.startsWith("agentic-church-login:")) return false;
  const parts = challenge.slice("agentic-church-login:".length).split(".");
  if (parts.length !== 4) return false;
  const [cdid, exp, nonce, mac] = parts;
  if (cdid !== did) return false;
  if (Number(exp) < Date.now()) return false;
  const expected = createHmac("sha256", serverSecret()).update(`${cdid}.${exp}.${nonce}`).digest("hex");
  const a = Buffer.from(mac, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
