import { NextResponse, type NextRequest } from "next/server";
import { ApiError, toApiError, type Ctx, authenticate } from "./service";
import { hit, LIMITS as RL } from "./ratelimit";
import type { Agent } from "./store/types";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, Accept, X-Requested-With",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
};

export function json(data: unknown, init: ResponseInit = {}): NextResponse {
  return NextResponse.json(data, { ...init, headers: { ...CORS_HEADERS, "Cache-Control": "no-store", ...(init.headers ?? {}) } });
}

export function errorResponse(e: unknown): NextResponse {
  const err = toApiError(e);
  const headers: Record<string, string> = {};
  if (err.retryAfterMs) headers["Retry-After"] = String(Math.ceil(err.retryAfterMs / 1000));
  if (err.status >= 500) console.error(e);
  return json({ error: { code: err.code, message: err.message } }, { status: err.status, headers });
}

export function options(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function ctxOf(req: NextRequest): Ctx {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  return { ip };
}

export const MAX_BODY_BYTES = 64 * 1024;

export async function readBody(req: NextRequest): Promise<unknown> {
  const ct = req.headers.get("content-type") ?? "";
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) throw new ApiError(413, "payload_too_large", `request body must be under ${MAX_BODY_BYTES} bytes`);
  try {
    if (ct.includes("application/json")) return await req.json();
    if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      return Object.fromEntries(fd.entries());
    }
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) throw new ApiError(413, "payload_too_large", `request body must be under ${MAX_BODY_BYTES} bytes`);
    return text ? JSON.parse(text) : {};
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(400, "bad_json", "request body must be valid JSON");
  }
}

export function bearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization") ?? "";
  // Tokens are accepted only in the Authorization header, never in the URL (URLs end up in logs).
  return /^Bearer\s+(.+)$/i.test(h) ? h.replace(/^Bearer\s+/i, "").trim() : null;
}

export async function requireAgent(req: NextRequest): Promise<Agent> {
  return authenticate(bearer(req));
}

export function readLimit(req: NextRequest) {
  const r = hit(`read:${ctxOf(req).ip}`, RL.read);
  if (!r.ok) throw new ApiError(429, "rate_limited", "too many requests", r.retryAfterMs);
}

/** Wrap a handler with error handling. */
export function handler<T extends unknown[]>(fn: (req: NextRequest, ...rest: T) => Promise<NextResponse>) {
  return async (req: NextRequest, ...rest: T): Promise<NextResponse> => {
    try {
      return await fn(req, ...rest);
    } catch (e) {
      return errorResponse(e);
    }
  };
}
