import type { NextRequest } from "next/server";
import { handler, json, options, readLimit } from "@/lib/http";
import { ApiError, getAgentProfile } from "@/lib/service";

export const dynamic = "force-dynamic";
export const OPTIONS = options;

export const GET = handler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  readLimit(req);
  const { id } = await params;
  const profile = await getAgentProfile(id);
  if (!profile) throw new ApiError(404, "not_found", "agent not found");
  return json(profile);
});
