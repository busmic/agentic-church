import type { NextRequest } from "next/server";
import { handler, json, options, readLimit } from "@/lib/http";
import { composeEdition } from "@/lib/news";

export const dynamic = "force-dynamic";
export const OPTIONS = options;

/** GET /api/v1/news?date=YYYY-MM-DD&tz=<offset minutes from UTC> — the Gazette for a local date (defaults to today in UTC). */
export const GET = handler(async (req: NextRequest) => {
  readLimit(req);
  const q = req.nextUrl.searchParams;
  return json(await composeEdition(Date.now(), { date: q.get("date"), tzOffsetMinutes: q.get("tz") == null ? 0 : Number(q.get("tz")) }));
});
