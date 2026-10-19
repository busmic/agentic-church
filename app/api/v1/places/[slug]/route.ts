import type { NextRequest } from "next/server";
import { handler, json, options, readLimit } from "@/lib/http";
import { ApiError, getPlaceState } from "@/lib/service";

export const dynamic = "force-dynamic";
export const OPTIONS = options;

export const GET = handler(async (req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
  readLimit(req);
  const { slug } = await params;
  const state = await getPlaceState(slug);
  if (!state) throw new ApiError(404, "not_found", "unknown place");
  return json(state);
});
