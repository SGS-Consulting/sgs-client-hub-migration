// Edge Function: calendly-webhook
//
// Receives Calendly's invitee.created webhook and creates a
// discovery_sessions row for the matching client. Closes out the SOP-03
// vertical slice: clients self-schedule monthly accounting reviews
// (Germain), discovery sessions (Abner), or advisory check-ins (Abner)
// in Calendly, and the dashboard records the booking automatically.
//
// Flow:
//   1. Calendly POSTs invitee.created to this function.
//   2. Function verifies the Authorization: Bearer <CALENDLY_WEBHOOK_SECRET>
//      header — Calendly is configured to send this on every request.
//   3. Parses the payload, extracts invitee email + scheduled-event details.
//   4. Looks up the client by case-insensitive email match against clients.email.
//      Unknown email → 200 OK with {status: "client_not_found"} so Calendly
//      doesn't retry forever; the orphan is logged for admin review.
//   5. Picks the meeting kind from the event type name:
//        contains "mensual"     → monthly_accounting
//        contains "discovery"   → discovery
//        contains "asesoría" / "asesoria" / "checkin" / "check-in"
//                                → advisory_checkin
//        otherwise              → discovery (logged as a warning)
//   6. Inserts the row into discovery_sessions. The migration
//      20260430164930_calendly_event_id_unique adds a partial unique
//      index so retries from Calendly become a no-op (caught as 23505).
//
// Karen sets CALENDLY_WEBHOOK_SECRET via:
//   npx supabase secrets set CALENDLY_WEBHOOK_SECRET=...
// and configures the webhook subscription on the Calendly side per
// Processos_internos/_specs/client_dashboard/karen_integrations.md §5.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Kind =
  | "discovery"
  | "monthly_accounting"
  | "quarterly_review"
  | "advisory_checkin";

function pickKind(eventTypeName: string): { kind: Kind; matched: boolean } {
  const n = eventTypeName.toLowerCase();
  if (n.includes("mensual") || n.includes("monthly")) {
    return { kind: "monthly_accounting", matched: true };
  }
  if (n.includes("discovery")) {
    return { kind: "discovery", matched: true };
  }
  if (
    n.includes("asesoría") ||
    n.includes("asesoria") ||
    n.includes("checkin") ||
    n.includes("check-in")
  ) {
    return { kind: "advisory_checkin", matched: true };
  }
  return { kind: "discovery", matched: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CALENDLY_WEBHOOK_SECRET = Deno.env.get("CALENDLY_WEBHOOK_SECRET");

  if (!CALENDLY_WEBHOOK_SECRET) {
    console.error("CALENDLY_WEBHOOK_SECRET is not configured");
    return json({ error: "server misconfigured" }, 500);
  }

  // ---- 1. Verify caller is Calendly (custom bearer token) ----
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${CALENDLY_WEBHOOK_SECRET}`) {
    return json({ error: "unauthorized" }, 401);
  }

  // ---- 2. Parse body ----
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  // Calendly may send other event kinds (invitee.canceled, etc.) if the
  // subscription includes them. Ack anything else without acting on it.
  if (body?.event !== "invitee.created") {
    return json({ ok: true, ignored: body?.event ?? "unknown" });
  }

  const p = body?.payload;
  const inviteeEmail: string | undefined = p?.email;
  const inviteeUri: string | undefined = p?.uri;
  const scheduled = p?.scheduled_event;

  if (
    !inviteeEmail ||
    !inviteeUri ||
    !scheduled?.start_time ||
    !scheduled?.end_time ||
    !scheduled?.name
  ) {
    return json(
      { error: "missing required fields (email/uri/scheduled_event.*)" },
      400,
    );
  }

  const start = new Date(scheduled.start_time);
  const end = new Date(scheduled.end_time);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return json({ error: "invalid start_time or end_time" }, 400);
  }
  const durationMinutes = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 60000),
  );

  const { kind, matched } = pickKind(scheduled.name);
  if (!matched) {
    console.warn(
      `calendly-webhook: no kind keyword matched event type "${scheduled.name}" — defaulting to "discovery"`,
    );
  }

  // ---- 3. Look up the client by email (service role bypasses RLS) ----
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Escape LIKE wildcards (% and _) so ilike behaves as case-insensitive
  // equality. Underscore-in-email is rare but valid (e.g. john_doe@x.com).
  const escapedEmail = inviteeEmail.replace(/[%_\\]/g, "\\$&");
  const { data: client, error: clientErr } = await adminClient
    .from("clients")
    .select("id, email")
    .ilike("email", escapedEmail)
    .maybeSingle();

  if (clientErr) {
    console.error("client lookup error:", clientErr.message);
    return json({ error: "client lookup failed" }, 500);
  }

  if (!client) {
    console.warn(
      `calendly-webhook: no client matched invitee email "${inviteeEmail}" (event "${scheduled.name}", uri ${inviteeUri})`,
    );
    return json({
      ok: true,
      status: "client_not_found",
      invitee_email: inviteeEmail,
    });
  }

  // ---- 4. Insert the discovery_sessions row (idempotent on calendly_event_id) ----
  const { data: session, error: insertErr } = await adminClient
    .from("discovery_sessions")
    .insert({
      client_id: client.id,
      scheduled_at: start.toISOString(),
      duration_minutes: durationMinutes,
      attendees: [inviteeEmail],
      calendly_event_id: inviteeUri,
      kind,
    })
    .select("id")
    .single();

  if (insertErr) {
    // 23505 = unique_violation — Calendly retried; we already recorded it.
    if ((insertErr as { code?: string }).code === "23505") {
      return json({
        ok: true,
        status: "already_recorded",
        calendly_event_id: inviteeUri,
      });
    }
    console.error("discovery_sessions insert error:", insertErr.message);
    return json({ error: insertErr.message }, 500);
  }

  return json({
    ok: true,
    session_id: session?.id ?? null,
    client_id: client.id,
    kind,
    kind_matched: matched,
  });
});
