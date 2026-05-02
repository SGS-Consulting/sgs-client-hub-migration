import { supabase } from "@/integrations/supabase/client";

export const W9_TOKEN_TTL_DAYS = 30;

const generateToken = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const substitute = (template: string, vars: Record<string, string>): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);

export type W9Worker = {
  id: string;
  client_id: string;
  full_name: string;
  email: string | null;
};

export type W9Requester = {
  user_id: string | null;
  display_name: string;
};

export type RequestW9Result =
  | { ok: true; token: string; link: string }
  | { ok: false; error: string };

/**
 * Issue a fresh W-9 invite for a worker:
 *   1. Expire any pending/viewed invites for this worker (Q1=A: always replace).
 *   2. Generate token, insert worker_w9_invites row with TTL = 30 days.
 *   3. Fetch worker_w9_request email template, substitute vars, queue to email_log.
 *
 * Caller is admin OR client — both have the right RLS to do all three steps.
 */
export async function requestWorkerW9(
  worker: W9Worker,
  clientCompanyName: string,
  requester: W9Requester,
): Promise<RequestW9Result> {
  if (!worker.email) {
    return { ok: false, error: "El worker necesita un email para recibir la solicitud" };
  }

  // 1. Expire any prior live invites
  await supabase
    .from("worker_w9_invites")
    .update({ status: "expired" })
    .eq("worker_id", worker.id)
    .in("status", ["sent", "viewed"]);

  // 2. Insert new invite
  const token = generateToken();
  const expiresAt = new Date(Date.now() + W9_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: invErr } = await supabase.from("worker_w9_invites").insert({
    worker_id: worker.id,
    token,
    expires_at: expiresAt,
    status: "sent",
    sent_at: new Date().toISOString(),
  });
  if (invErr) return { ok: false, error: invErr.message };

  // 3. Queue the email
  const { data: tpl } = await supabase
    .from("email_templates")
    .select("subject, body_html")
    .eq("template_key", "worker_w9_request")
    .eq("is_active", true)
    .maybeSingle();

  const link = `${window.location.origin}/w9/${token}`;

  if (tpl) {
    const vars: Record<string, string> = {
      worker_name: worker.full_name,
      client_company_name: clientCompanyName,
      requester_name: requester.display_name,
      w9_link: link,
      expires_in_days: String(W9_TOKEN_TTL_DAYS),
    };
    await supabase.from("email_log").insert({
      template_key: "worker_w9_request",
      recipient_email: worker.email,
      subject: substitute(tpl.subject, vars),
      body: substitute(tpl.body_html, vars),
      status: "pending",
      client_id: worker.client_id,
    });
  } else {
    console.warn("worker_w9_request template missing — invite created but no email queued");
  }

  return { ok: true, token, link };
}
