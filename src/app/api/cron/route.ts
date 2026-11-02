import { safeEqual } from "@/server/crypto";
import { autoCompleteDueOrders } from "@/server/orders";

/*
  Scheduled maintenance: completes delivered orders past their protection window
  and expires stale unpaid orders. Call every 10–15 minutes, e.g. a Railway cron
  service running:  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron
*/
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!secret || !token || !safeEqual(token, secret)) return new Response("Unauthorized", { status: 401 });
  const result = await autoCompleteDueOrders();
  return Response.json({ ok: true, ...result, at: new Date().toISOString() });
}

export const GET = run;
export const POST = run;
