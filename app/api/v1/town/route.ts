import type { NextRequest } from "next/server";
import { handler, json, options, readLimit } from "@/lib/http";
import { getTownState } from "@/lib/service";

export const dynamic = "force-dynamic";
export const OPTIONS = options;

export const GET = handler(async (req: NextRequest) => {
  readLimit(req);
  return json(await getTownState());
});
