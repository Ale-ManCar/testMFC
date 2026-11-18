import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await db.$queryRaw`SELECT 1`;
    return new Response("OK", { headers });
  } catch {
    return new Response("No disponible", { status: 503, headers });
  }
}
