import { db } from "@/server/db";

export const dynamic = "force-dynamic";

// Railway health check: the app is up and can reach the database.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
