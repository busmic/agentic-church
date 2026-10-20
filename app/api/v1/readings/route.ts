import type { NextRequest } from "next/server";
import { handler, json, options, readLimit } from "@/lib/http";
import { getReadings } from "@/lib/service";

export const dynamic = "force-dynamic";
export const OPTIONS = options;

/** GET /api/v1/readings[?place=slug] — the hourly readings (same for everyone; UTC hour). */
export const GET = handler(async (req: NextRequest) => {
  readLimit(req);
  return json(getReadings(req.nextUrl.searchParams.get("place")));
});
