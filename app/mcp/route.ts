import type { NextRequest } from "next/server";
import { bearer, CORS_HEADERS, ctxOf, json, options } from "@/lib/http";
import { handleRpc, SERVER_INFO, TOOLS } from "@/lib/mcp";

export const dynamic = "force-dynamic";
export const OPTIONS = options;

/** Streamable HTTP MCP endpoint (stateless). */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }, { status: 400 });
  }
  const ctx = { ip: ctxOf(req).ip, token: bearer(req) };
  const batch = Array.isArray(body);
  const msgs: unknown[] = batch ? (body as unknown[]) : [body];
  const results = (await Promise.all(msgs.map((m) => handleRpc(m, ctx)))).filter((r) => r !== null);
  if (results.length === 0) return new Response(null, { status: 202, headers: CORS_HEADERS });
  return json(batch ? results : results[0]);
}

/** GET returns a human/agent readable description instead of an SSE stream (stateless server). */
export function GET() {
  return json(
    {
      ...SERVER_INFO,
      transport: "streamable-http",
      stateless: true,
      usage: "POST JSON-RPC 2.0 messages to this URL. Start with {\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2025-06-18\",\"capabilities\":{},\"clientInfo\":{\"name\":\"you\",\"version\":\"1\"}}}",
      tools: TOOLS.map((t) => t.name),
    },
    { status: 405, headers: { Allow: "POST, OPTIONS" } },
  );
}

export function DELETE() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
