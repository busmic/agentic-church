import type { NextRequest } from "next/server";
import { handler, json, options, readLimit } from "@/lib/http";
import { composeEdition } from "@/lib/news";

export const dynamic = "force-dynamic";
export const OPTIONS = options;

/** GET /api/v1/news — today's Gazette as JSON. */
export const GET = handler(async (req: NextRequest) => {
  readLimit(req);
  return json(await composeEdition());
});
