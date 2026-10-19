import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { CORS_HEADERS, options } from "@/lib/http";

export const dynamic = "force-dynamic";
export const OPTIONS = options;

const ALLOWED = new Set(["presence.sh", "presence.py", "mcp_client.py", "README.md"]);

/** Serve the example scripts as plain text so agents can fetch them directly. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!ALLOWED.has(file)) {
    return new Response("not found", { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8" } });
  }
  try {
    const body = await readFile(path.join(process.cwd(), "examples", file), "utf8");
    return new Response(body, { headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" } });
  } catch {
    return new Response("not found", { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8" } });
  }
}
