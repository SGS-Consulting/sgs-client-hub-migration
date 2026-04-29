-- =========================================================
-- SOP-01 Business Formation & Structure — seed
--
-- Idempotent. Re-run safely.
-- Prereq: 20260429154331_sop01_slice_schema.sql migration applied.
--
-- Creates:
--   1. "Business Formation & Structure" service ($500, Business Formation
--      category). Single service that covers any-state entity formation
--      or restructuring (per SOP-01 §Información General).
--   2. 6 task templates spawned when the service is activated for a
--      client. Order + due offsets reflect Abner's design decisions
--      from sop01_design.md (locked 2026-04-29).
--   3. Two email templates: sop01_kit_delivery and portal_invite.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Service
-- ---------------------------------------------------------
DO $$
DECLARE
    service_id_var UUID;
BEGIN
    SELECT id INTO service_id_var
    FROM public.services
    WHERE name = 'Business Formation & Structure'
    LIMIT 1;

    IF service_id_var IS NULL THEN
        INSERT INTO public.services (name, category, description, base_price, is_active)
        VALUES (
            'Business Formation & Structure',
            'Business Formation',
            'One-time service: evaluate and implement the most efficient corporate structure for the client in any state. Includes coordination with SGS''s standing legal partner and delivery of a complete corporate kit. Standard $500 fixed price, billed upfront.',
            500.00,
            TRUE
        )
        RETURNING id INTO service_id_var;

        RAISE NOTICE 'Created service "Business Formation & Structure" (id=%)', service_id_var;
    ELSE
        UPDATE public.services
        SET base_price = 500.00, is_active = TRUE
        WHERE id = service_id_var;
        RAISE NOTICE 'Service "Business Formation & Structure" already existed — price reasserted to $500.';
    END IF;

    -- ---------------------------------------------------------
    -- 2. Task templates (skip if already seeded)
    -- ---------------------------------------------------------
    IF EXISTS (SELECT 1 FROM public.service_task_templates WHERE service_id = service_id_var) THEN
        RAISE NOTICE 'SOP-01 task templates already exist — skipping.';
    ELSE
        INSERT INTO public.service_task_templates
            (service_id, title, description, default_priority, default_due_offset_days, sort_order)
        VALUES
            (service_id_var,
                'Request current structure docs (or questionnaire)',
                'Ask the client to upload current entity documents (articles, operating agreement/bylaws, EIN letter). If the client is forming from scratch, send the short business-profile questionnaire instead.',
                'high', 1, 1),

            (service_id_var,
                'Confirm payment received',
                'Service is billed upfront. Confirm the $500 invoice is paid before proceeding to law-firm coordination — task #3 is gated on this.',
                'high', 3, 2),

            (service_id_var,
                'Evaluate structure & coordinate with law firm',
                'Review the client''s current structure (or questionnaire) and brief the standing legal firm on the recommended new structure. Email is the channel; same firm every time.',
                'high', 5, 3),

            (service_id_var,
                'Track law firm response',
                'Standing turnaround is 5–10 business days. Follow up if no response by day 10. Once the firm returns the organized structure, upload it to the client''s documents.',
                'medium', 14, 4),

            (service_id_var,
                'Upload corporate kit + send delivery email',
                'Upload the 5 standard kit documents (articles, bylaws/operating agreement, stock ledger, initial resolutions, EIN letter) under category "corporate_kit". Open the dashboard send-email dialog → review the SOP-01 kit-delivery template → personalize and send.',
                'high', 16, 5),

            (service_id_var,
                'Generate completion certificate + await client acknowledgment',
                'Trigger the dashboard to auto-generate the branded completion certificate (PDF). The client receives notification, reviews the kit, and clicks "Acknowledge & close" in their portal — service closes automatically on acknowledgment.',
                'medium', 18, 6);

        RAISE NOTICE 'Seeded 6 SOP-01 task templates.';
    END IF;
END $$;

-- ---------------------------------------------------------
-- 3. Email templates
-- ---------------------------------------------------------
INSERT INTO public.email_templates (template_key, subject, body_html, body_variables, description, is_active)
SELECT t.template_key, t.subject, t.body_html, t.body_variables::jsonb, t.description, TRUE
FROM (VALUES
    (
        'sop01_kit_delivery',
        'Your Corporate Kit is ready — {{company_name}}',
        $html$<p>Hi {{client_name}},</p>

<p>Your new corporate structure is complete. I''ve uploaded the full corporate kit to your SGS portal — you can review and download each document at any time:</p>

<ul>
  <li>Articles of incorporation</li>
  <li>Bylaws / operating agreement</li>
  <li>Stock ledger</li>
  <li>Initial resolutions</li>
  <li>EIN confirmation letter</li>
</ul>

<p>A formal certificate of completion will follow shortly. Once you''ve reviewed everything, please click <strong>"Acknowledge & close"</strong> in your portal to formally close the engagement.</p>

<p>If anything is unclear or you have questions about the structure, just reply to this email.</p>

<p>Best,<br/>
Abner Quiroga<br/>
SGS Consulting Group</p>$html$,
        '["client_name", "company_name"]',
        'SOP-01 corporate kit delivery — sent when admin uploads the kit and triggers the delivery email step.'
    ),
    (
        'portal_invite',
        'Welcome to SGS — set up your portal access',
        $html$<p>Hi {{client_name}},</p>

<p>Welcome to SGS Consulting Group. Your client portal is ready — you can use it to view documents, track the services we''re running for {{company_name}}, see invoices, and message us directly.</p>

<p>Click the link below to set your password and access your portal:</p>

<p><a href="{{invite_link}}">Set my password and access the portal</a></p>

<p>If you didn''t expect this email or have any questions, reply directly and we''ll help.</p>

<p>Best,<br/>
The SGS Team</p>$html$,
        '["client_name", "company_name", "invite_link"]',
        'Sent when staff clicks "Invite to portal" on a client who has not yet set up their account.'
    )
) AS t(template_key, subject, body_html, body_variables, description)
WHERE NOT EXISTS (
    SELECT 1 FROM public.email_templates existing
    WHERE existing.template_key = t.template_key
);
