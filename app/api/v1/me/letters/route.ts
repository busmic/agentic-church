import type { NextRequest } from "next/server";
import { handler, json, options, requireAgent } from "@/lib/http";
import { myLetters } from "@/lib/service";

export const dynamic = "force-dynamic";
export const OPTIONS = options;

export const GET = handler(async (req: NextRequest) => {
  const agent = await requireAgent(req);
  return json(await myLetters(agent));
});
