// Edge Function: invite-portal-user
//
// Sends a Supabase auth invite to a client so they can set up their portal
// account. Replaces the old "copy /auth URL" stub which had no signup form
// behind it.
//
// Flow:
//   1. Admin clicks "Invite to portal" in AdminClientDetail.
//   2. This function verifies the caller is an admin.
//   3. Looks up the client; refuses if the client already has user_id set.
//   4. Calls supabase.auth.admin.inviteUserByEmail() — Supabase sends the
//      invite email and creates the auth.users row.
//   5. handle_new_user trigger (already in DB) inserts profile + 'client'
//      role and links clients.user_id by email.
//   6. Logs the send to email_log for audit trail.
//   7. When the recipient clicks the email link, they land at /auth/callback
//      where they set a password, then are routed to /portal.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let payload: { client_id?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  const clientId = payload.client_id;
  if (!clientId) return json({ error: "client_id is required" }, 400);

  // ---- 1. Verify caller is an admin ----
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "missing Authorization header" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });
  if (roleErr) return json({ error: roleErr.message }, 500);
  if (!isAdmin) return json({ error: "admins only" }, 403);

  // ---- 2. Look up the client (service role bypasses RLS for the read) ----
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: client, error: clientErr } = await adminClient
    .from("clients")
    .select("id, email, contact_name, company_name, user_id")
    .eq("id", clientId)
    .single();

  if (clientErr || !client) return json({ error: "client not found" }, 404);
  if (client.user_id) {
    return json(
      { error: "client already has a portal account linked" },
      400,
    );
  }

  // ---- 3. Send the Supabase invite ----
  const origin =
    req.headers.get("origin") ?? req.headers.get("referer")?.replace(/\/$/, "") ??
    "http://localhost:8080";
  const redirectTo = `${origin}/auth/callback`;

  const { data: inviteData, error: inviteErr } =
    await adminClient.auth.admin.inviteUserByEmail(client.email, {
      redirectTo,
      data: {
        full_name: client.contact_name ?? client.company_name,
        client_id: client.id,
      },
    });

  if (inviteErr) {
    // Common cases: rate-limited, already a user, malformed email
    await adminClient.from("email_log").insert({
      template_key: "portal_invite",
      recipient_email: client.email,
      subject: "Welcome to SGS — set up your portal access",
      body: "(Supabase invite send failed — see error_message)",
      status: "failed",
      error_message: inviteErr.message,
      sent_by: user.id,
      client_id: client.id,
    });
    return json({ error: inviteErr.message }, 500);
  }

  // ---- 4. Audit-log the send ----
  await adminClient.from("email_log").insert({
    template_key: "portal_invite",
    recipient_email: client.email,
    subject: "Welcome to SGS — set up your portal access",
    body:
      "(Sent via Supabase auth invite. The actual email content is rendered " +
      "from the Supabase auth template — customize at " +
      "https://supabase.com/dashboard/project/_/auth/templates)",
    status: "sent",
    sent_at: new Date().toISOString(),
    sent_by: user.id,
    client_id: client.id,
  });

  return json({
    ok: true,
    email: client.email,
    invited_user_id: inviteData?.user?.id ?? null,
  });
});
