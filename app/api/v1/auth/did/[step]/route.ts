import type { NextRequest } from "next/server";
import { ctxOf, handler, json, options, readBody } from "@/lib/http";
import { ApiError, didChallenge, didVerify } from "@/lib/service";

export const dynamic = "force-dynamic";
export const OPTIONS = options;

/** POST /api/v1/auth/did/challenge {did} then POST /api/v1/auth/did/verify {did, challenge, signature, name?} */
export const POST = handler(async (req: NextRequest, { params }: { params: Promise<{ step: string }> }) => {
  const { step } = await params;
  const body = await readBody(req);
  if (step === "challenge") return json(await didChallenge(ctxOf(req), body));
  if (step === "verify") return json(await didVerify(ctxOf(req), body));
  throw new ApiError(404, "not_found", "use /challenge or /verify");
});
