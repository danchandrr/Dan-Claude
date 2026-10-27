// Sends the Case of the day reminder. Runs once an hour (see README) and notifies every device
// whose chosen hour is now, skipping players who already posted today's result.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const APP = "https://playzebrashift.github.io/";

Deno.serve(async (req) => {
  // Only the scheduled job knows this secret
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) return new Response("Forbidden", { status: 403 });
  webpush.setVapidDetails(APP, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const hour = new Date().getUTCHours();
  const { data: subs, error } = await db.from("push_subs").select("*").eq("hour_utc", hour);
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0, skipped = 0, removed = 0;
  for (const s of subs ?? []) {
    // the player's own date: their offset is minutes behind UTC, as the browser reports it
    const local = new Date(Date.now() - s.tz_offset * 60000).toISOString().slice(0, 10);
    const { data: played } = await db.from("daily_scores").select("day").eq("user_id", s.user_id).eq("day", local).maybeSingle();
    if (played) { skipped++; continue; }
    const payload = JSON.stringify({ title: "Case of the day", body: "A new patient is waiting in the ER. Fewer clues, higher score.", url: APP + "#daily" });
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3 * 3600 });
      sent++;
    } catch (e) {
      // the browser dropped this subscription: forget it
      if (e?.statusCode === 404 || e?.statusCode === 410) { await db.from("push_subs").delete().eq("endpoint", s.endpoint); removed++; }
    }
  }
  return Response.json({ hour, sent, skipped, removed });
});
