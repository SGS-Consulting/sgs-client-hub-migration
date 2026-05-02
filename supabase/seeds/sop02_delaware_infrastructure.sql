-- =========================================================
-- SOP-02 Delaware Infrastructure — seed
--
-- Idempotent. Re-run safely.
-- Prereq: 20260502121033_sop02_slice_schema.sql migration applied.
--
-- Creates:
--   1. "Delaware Infrastructure Platform" service @ base_price 0
--      (case-by-case pricing — Abner enters price_override at activation
--      via the standalone price prompt, same mechanic as SOP-04 standalone).
--   2. 7 task templates spawned at activation (Steps 1–6 + the kit
--      delivery wrap-up; Step 7 acknowledgment is client-side).
--   3. 1 email template `sop02_kit_delivery`.
-- =========================================================

DO $$
DECLARE
    v_service_id UUID;
BEGIN
    SELECT id INTO v_service_id FROM public.services WHERE name = 'Delaware Infrastructure Platform' LIMIT 1;

    IF v_service_id IS NULL THEN
        INSERT INTO public.services (name, category, description, base_price, is_active)
        VALUES (
            'Delaware Infrastructure Platform',
            'Business Formation',
            'One-time Delaware-specific infrastructure setup: entity formation in Delaware (with our standing law firm), corporate HQ address assignment, registered agent assignment, and general liability insurance activation. Closes with delivery of a complete corporate kit. Case-by-case pricing — Abner sets the price per client at activation.',
            0.00,
            TRUE
        )
        RETURNING id INTO v_service_id;
        RAISE NOTICE 'Created service "Delaware Infrastructure Platform" (id=%)', v_service_id;
    ELSE
        UPDATE public.services SET is_active = TRUE WHERE id = v_service_id;
    END IF;

    -- Task templates (skip if already seeded)
    IF EXISTS (SELECT 1 FROM public.service_task_templates WHERE service_id = v_service_id) THEN
        RAISE NOTICE 'SOP-02 task templates already seeded — skipping.';
    ELSE
        INSERT INTO public.service_task_templates
            (service_id, title, description, default_priority, default_due_offset_days, sort_order)
        VALUES
            (v_service_id,
                'Evaluate Delaware eligibility for client',
                'Confirm the client meets the Delaware-eligibility criteria (NOT a brick-and-mortar in another state). Capture the rationale in the task notes. If ineligible, deactivate this service and propose SOP-01 as the alternative path. Gating: tasks 2–6 cannot start until this is marked done.',
                'high', 1, 1),

            (v_service_id,
                'Coordinate Delaware entity formation with law firm',
                'Brief our standing legal partner on the new Delaware entity. Standard turnaround 5–10 business days. Once the law firm returns the formation documents, upload them under category "delaware_formation_docs".',
                'high', 5, 2),

            (v_service_id,
                'Assign Delaware corporate HQ address',
                'Assign the Delaware physical-address-of-record. Upload the address confirmation letter under "corporate_address_confirmation".',
                'high', 10, 3),

            (v_service_id,
                'Assign registered agent',
                'Confirm the registered agent assignment. Upload the agent confirmation letter under "registered_agent_confirmation".',
                'high', 12, 4),

            (v_service_id,
                'Activate GL insurance policy',
                'Coordinate GL insurance activation through the brokerage. Upload the certificate of insurance under "gl_insurance_certificate". (Open question: same brokerage as SOP-06? — see sop02_design.md.)',
                'high', 14, 5),

            (v_service_id,
                'Upload corporate kit + send delivery email',
                'Bundle all 4 confirmations + formation docs into the corporate kit and upload under category "corporate_kit". Open the dashboard send-email dialog → review the SOP-02 kit-delivery template → personalize and send.',
                'high', 20, 6),

            (v_service_id,
                'Await client acknowledgment + close',
                'Client receives the kit, reviews everything, and clicks "Acknowledge & close" in their portal. Service closes automatically on acknowledgment.',
                'medium', 25, 7);

        RAISE NOTICE 'Seeded 7 SOP-02 task templates.';
    END IF;
END $$;

-- ---------------------------------------------------------
-- Email template
-- ---------------------------------------------------------
INSERT INTO public.email_templates (template_key, subject, body_html, body_variables, description, is_active)
SELECT t.template_key, t.subject, t.body_html, t.body_variables::jsonb, t.description, TRUE
FROM (VALUES
    (
        'sop02_kit_delivery',
        'Your Delaware Infrastructure is ready — {{company_name}}',
        $html$<p>Hi {{client_name}},</p>

<p>Your Delaware infrastructure setup is complete. I've uploaded the full corporate kit to your SGS portal — you can review and download each document at any time:</p>

<ul>
  <li>Delaware entity formation documents</li>
  <li>Corporate headquarters address confirmation ({{delaware_address}})</li>
  <li>Registered agent confirmation ({{registered_agent}})</li>
  <li>General liability insurance certificate</li>
  <li>Bundled corporate kit (PDF)</li>
</ul>

<p>Once you've reviewed everything, please click <strong>"Acknowledge & close"</strong> in your portal to formally close the engagement.</p>

<p>If anything is unclear or you have questions about the Delaware setup, just reply to this email.</p>

<p>Best,<br/>
Abner Quiroga<br/>
SGS Consulting Group</p>$html$,
        '["client_name", "company_name", "delaware_address", "registered_agent"]',
        'SOP-02 corporate-kit delivery email — sent when admin uploads the kit and triggers the delivery email step. Variables include the assigned Delaware address + registered agent so the email is personalized.'
    )
) AS t(template_key, subject, body_html, body_variables, description)
WHERE NOT EXISTS (
    SELECT 1 FROM public.email_templates existing WHERE existing.template_key = t.template_key
);
