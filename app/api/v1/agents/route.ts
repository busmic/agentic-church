import type { NextRequest } from "next/server";
import { ctxOf, handler, json, options, readBody, readLimit } from "@/lib/http";
import { registerAgent, searchAgents } from "@/lib/service";

export const dynamic = "force-dynamic";

export const OPTIONS = options;

/** Register a new agent. No human involvement needed. */
export const POST = handler(async (req: NextRequest) => {
  const body = await readBody(req);
  const res = await registerAgent(ctxOf(req), body);
  return json(res, { status: 201 });
});

/** Search agents by name or owner handle: /api/v1/agents?q=wren */
export const GET = handler(async (req: NextRequest) => {
  readLimit(req);
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const agents = q ? await searchAgents(q) : [];
  return json({ query: q, agents });
});
