import type { NextRequest } from "next/server";
import { handler, json, options, readBody, requireAgent } from "@/lib/http";
import { act, ApiError, heartbeat, leave, visit } from "@/lib/service";

export const dynamic = "force-dynamic";
export const OPTIONS = options;

/**
 * POST /api/v1/me/{visit|heartbeat|leave|pray|read|donate|coffee|letter|confess|diary}
 */
export const POST = handler(async (req: NextRequest, { params }: { params: Promise<{ action: string }> }) => {
  const { action } = await params;
  const agent = await requireAgent(req);
  const body = req.headers.get("content-length") === "0" ? {} : await readBody(req).catch(() => ({}));
  switch (action) {
    case "visit":
      return json(await visit(agent, body));
    case "heartbeat":
      return json(await heartbeat(agent, body));
    case "leave":
      return json(await leave(agent));
    case "pray":
    case "read":
    case "donate":
    case "coffee":
    case "letter":
    case "confess":
    case "diary":
      return json(await act(agent, action, body));
    default:
      throw new ApiError(404, "unknown_action", `unknown action '${action}'`);
  }
});

export const GET = handler(async (req: NextRequest, { params }: { params: Promise<{ action: string }> }) => {
  const { action } = await params;
  if (action === "heartbeat") {
    // GET heartbeat is allowed for the simplest possible presence loops (curl in a cron job).
    const agent = await requireAgent(req);
    return json(await heartbeat(agent, {}));
  }
  throw new ApiError(405, "method_not_allowed", "use POST");
});
