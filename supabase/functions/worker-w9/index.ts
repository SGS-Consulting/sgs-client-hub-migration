// Edge Function: worker-w9
//
// Public endpoint (no JWT) that powers the tokenized W-9 form for SOP-04.
// The flow:
//   1. Admin or client clicks "Solicitar W-9" on a worker → app code creates
//      a worker_w9_invites row + queues a worker_w9_request email_log row.
//   2. The worker receives an email with a link to /w9/<token>.
//   3. The public form (src/pages/WorkerW9Form.tsx) calls:
//      - GET  /functions/v1/worker-w9?token=...  → fetch context (worker name,
//        client name, expires_at, invite status).
//      - POST /functions/v1/worker-w9            → submit the structured W-9.
//   4. On submit, this function:
//      - Validates the token (exists, not expired, not already completed).
//      - Inserts/updates client_workers_w9_data with the structured fields.
//      - Marks the invite completed.
//      - Queues TWO confirmation emails to email_log:
//        * w9_received_client → goes to the client (Q3=A)
//        * w9_received_worker → goes to the worker (Javi's add-on)
//
// JWT verification is disabled in supabase/config.toml so the worker
// (an external party with no Supabase account) can hit it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type FederalClassification =
  | "individual_sole_prop"
  | "c_corp"
  | "s_corp"
  | "partnership"
  | "trust_estate"
  | "llc_c"
  | "llc_s"
  | "llc_p"
  | "other";

const VALID_CLASSIFICATIONS: FederalClassification[] = [
  "individual_sole_prop",
  "c_corp",
  "s_corp",
  "partnership",
  "trust_estate",
  "llc_c",
  "llc_s",
  "llc_p",
  "other",
];

type Submission = {
  token: string;
  legal_name: string;
  business_name?: string | null;
  federal_tax_classification: FederalClassification;
  llc_classification_letter?: string | null;
  other_classification_text?: string | null;
  exempt_payee_code?: string | null;
  exempt_fatca_code?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  zip: string;
  requester_name_address?: string | null;
  account_numbers?: string | null;
  tin_type: "ssn" | "ein";
  tin_full: string;
  signature_typed_name: string;
};

function substitute(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

async function queueEmail(
  client: ReturnType<typeof createClient>,
  templateKey: string,
  recipientEmail: string,
  vars: Record<string, string>,
  clientId: string | null,
) {
  const { data: tpl } = await client
    .from("email_templates")
    .select("subject, body_html")
    .eq("template_key", templateKey)
    .eq("is_active", true)
    .maybeSingle();

  if (!tpl) {
    console.warn(`worker-w9: email template "${templateKey}" not found — skipping email`);
    return;
  }

  const subject = substitute(tpl.subject, vars);
  const body = substitute(tpl.body_html, vars);

  const { error } = await client.from("email_log").insert({
    template_key: templateKey,
    recipient_email: recipientEmail,
    subject,
    body,
    status: "pending",
    client_id: clientId,
  });

  if (error) console.error(`worker-w9: failed to queue ${templateKey}: ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ---------------- GET: fetch form context ----------------
  if (req.method === "GET") {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return json({ error: "missing token" }, 400);

    const { data: invite, error: invErr } = await admin
      .from("worker_w9_invites")
      .select("id, worker_id, status, expires_at, viewed_at, completed_at")
      .eq("token", token)
      .maybeSingle();

    if (invErr) {
      console.error("invite lookup error:", invErr.message);
      return json({ error: "lookup failed" }, 500);
    }
    if (!invite) return json({ error: "token not found" }, 404);

    if (invite.status === "expired") return json({ error: "token expired" }, 410);
    const expired = new Date(invite.expires_at).getTime() < Date.now();
    if (expired) return json({ error: "token expired" }, 410);

    // Mark first view (informational; doesn't block re-views)
    if (!invite.viewed_at) {
      await admin
        .from("worker_w9_invites")
        .update({ viewed_at: new Date().toISOString(), status: invite.status === "sent" ? "viewed" : invite.status })
        .eq("id", invite.id);
    }

    const { data: worker } = await admin
      .from("client_workers")
      .select("id, full_name, email, client_id, clients(company_name)")
      .eq("id", invite.worker_id)
      .maybeSingle();

    if (!worker) return json({ error: "worker not found" }, 404);

    return json({
      ok: true,
      already_completed: invite.status === "completed",
      worker: { full_name: worker.full_name, email: worker.email },
      client: { company_name: (worker.clients as any)?.company_name ?? null },
      expires_at: invite.expires_at,
    });
  }

  // ---------------- POST: submit the W-9 ----------------
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  let body: Submission;
  try {
    body = (await req.json()) as Submission;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  // Required-field validation
  const requiredString = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  const required: Array<keyof Submission> = [
    "token",
    "legal_name",
    "federal_tax_classification",
    "address_line1",
    "city",
    "state",
    "zip",
    "tin_type",
    "tin_full",
    "signature_typed_name",
  ];
  for (const k of required) {
    if (!requiredString(body[k] as any)) {
      return json({ error: `missing or empty field: ${k}` }, 400);
    }
  }
  if (!VALID_CLASSIFICATIONS.includes(body.federal_tax_classification)) {
    return json({ error: "invalid federal_tax_classification" }, 400);
  }
  if (body.tin_type !== "ssn" && body.tin_type !== "ein") {
    return json({ error: "tin_type must be 'ssn' or 'ein'" }, 400);
  }
  // LLC variant requires the letter
  if (
    ["llc_c", "llc_s", "llc_p"].includes(body.federal_tax_classification) &&
    !requiredString(body.llc_classification_letter as any)
  ) {
    return json({ error: "llc_classification_letter required when classification is an LLC variant" }, 400);
  }
  if (
    body.federal_tax_classification === "other" &&
    !requiredString(body.other_classification_text as any)
  ) {
    return json({ error: "other_classification_text required when classification is 'other'" }, 400);
  }

  // Look up the invite + worker context
  const { data: invite } = await admin
    .from("worker_w9_invites")
    .select("id, worker_id, status, expires_at")
    .eq("token", body.token)
    .maybeSingle();

  if (!invite) return json({ error: "token not found" }, 404);
  if (invite.status === "expired") return json({ error: "token expired" }, 410);
  if (new Date(invite.expires_at).getTime() < Date.now()) return json({ error: "token expired" }, 410);
  if (invite.status === "completed") return json({ error: "this W-9 has already been submitted" }, 409);

  const { data: worker } = await admin
    .from("client_workers")
    .select("id, full_name, email, client_id, clients(company_name, email)")
    .eq("id", invite.worker_id)
    .maybeSingle();

  if (!worker) return json({ error: "worker not found" }, 404);

  // Capture submitter IP from headers (Supabase forwards client IP via x-forwarded-for)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("cf-connecting-ip") ?? null;

  // Upsert structured W-9 data (one row per worker — UNIQUE constraint on worker_id)
  const w9Row = {
    worker_id: worker.id,
    legal_name: body.legal_name.trim(),
    business_name: body.business_name?.trim() || null,
    federal_tax_classification: body.federal_tax_classification,
    llc_classification_letter: body.llc_classification_letter?.trim() || null,
    other_classification_text: body.other_classification_text?.trim() || null,
    exempt_payee_code: body.exempt_payee_code?.trim() || null,
    exempt_fatca_code: body.exempt_fatca_code?.trim() || null,
    address_line1: body.address_line1.trim(),
    address_line2: body.address_line2?.trim() || null,
    city: body.city.trim(),
    state: body.state.trim(),
    zip: body.zip.trim(),
    requester_name_address: body.requester_name_address?.trim() || null,
    account_numbers: body.account_numbers?.trim() || null,
    tin_type: body.tin_type,
    tin_full: body.tin_full.trim(),
    signature_typed_name: body.signature_typed_name.trim(),
    signature_acknowledged_at: new Date().toISOString(),
    signature_ip: ip,
    submitted_at: new Date().toISOString(),
  };

  const { error: w9Err } = await admin
    .from("client_workers_w9_data")
    .upsert(w9Row, { onConflict: "worker_id" });

  if (w9Err) {
    console.error("w9 upsert error:", w9Err.message);
    return json({ error: w9Err.message }, 500);
  }

  // Mark invite completed
  await admin
    .from("worker_w9_invites")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", invite.id);

  // Queue confirmation emails (best effort — don't fail submission if email queueing fails)
  const clientCompany = (worker.clients as any)?.company_name ?? "your company";
  const clientEmail = (worker.clients as any)?.email ?? null;

  if (clientEmail) {
    await queueEmail(admin, "w9_received_client", clientEmail, {
      client_company_name: clientCompany,
      worker_name: worker.full_name,
    }, worker.client_id);
  }

  if (worker.email) {
    await queueEmail(admin, "w9_received_worker", worker.email, {
      worker_name: worker.full_name,
      client_company_name: clientCompany,
    }, worker.client_id);
  }

  return json({ ok: true, message: "W-9 received" });
});
