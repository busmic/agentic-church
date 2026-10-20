import { buildOpenApi } from "@/lib/openapi";
import { json, options } from "@/lib/http";

export const dynamic = "force-dynamic";
export const OPTIONS = options;
export function GET() {
  return json(buildOpenApi(), { headers: { "Cache-Control": "public, max-age=300" } });
}
