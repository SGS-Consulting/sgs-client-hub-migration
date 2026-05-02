-- =========================================================
-- SOP-05 Legal & Corporate Support — seed
--
-- Idempotent. Re-run safely.
-- Prereq: 20260502122004_sop05_slice_schema.sql migration applied.
-- =========================================================

DO $$
DECLARE
    v_service_id UUID;
BEGIN
    SELECT id INTO v_service_id FROM public.services WHERE name = 'Legal & Corporate Support' LIMIT 1;

    IF v_service_id IS NULL THEN
        INSERT INTO public.services (name, category, description, base_price, is_active)
        VALUES (
            'Legal & Corporate Support',
            'Legal',
            'Subscription for on-demand corporate legal advisory. Client submits legal queries through the portal at any time; Abner reviews each, optionally coordinates with our standing law firm, and delivers advisory in a scheduled meeting. Case-by-case retainer pricing — Abner sets the price per client at activation.',
            0.00,
            TRUE
        )
        RETURNING id INTO v_service_id;
        RAISE NOTICE 'Created service "Legal & Corporate Support" (id=%)', v_service_id;
    ELSE
        UPDATE public.services SET is_active = TRUE WHERE id = v_service_id;
    END IF;

    -- One onboarding task template (the subscription is mostly passive — the work is per-query)
    IF NOT EXISTS (SELECT 1 FROM public.service_task_templates WHERE service_id = v_service_id) THEN
        INSERT INTO public.service_task_templates
            (service_id, title, description, default_priority, default_due_offset_days, sort_order)
        VALUES
            (v_service_id,
                'Welcome client to Legal Support subscription',
                'Send the client a welcome note explaining the subscription scope: what kinds of queries are covered, expected response time, how to submit via the portal. Future legal queries spawn their own per-case tasks (not via this template).',
                'medium', 2, 1);
        RAISE NOTICE 'Seeded SOP-05 onboarding task template.';
    END IF;
END $$;

-- ---------------------------------------------------------
-- Email templates (2 new)
-- ---------------------------------------------------------
INSERT INTO public.email_templates (template_key, subject, body_html, body_variables, description, is_active)
SELECT t.template_key, t.subject, t.body_html, t.body_variables::jsonb, t.description, TRUE
FROM (VALUES
    (
        'legal_query_received',
        'We received your legal query — {{company_name}}',
        $html$<p>Hi {{client_name}},</p>

<p>We received your legal query: <strong>{{subject}}</strong>.</p>

<p>Abner will review it and reach out to schedule the advisory meeting. If the case requires it, we will also coordinate with our standing law firm — you do not need to contact them directly.</p>

<p>You can track the status of this case in your SGS portal under Consulta legal.</p>

<p>Best,<br/>
SGS Consulting Group</p>$html$,
        '["client_name", "company_name", "subject"]',
        'Auto-confirmation sent to the client when they submit a new legal case via the portal (SOP-05).'
    ),
    (
        'legal_advisory_ready',
        'Legal advisory ready — {{subject}}',
        $html$<p>Hi {{client_name}},</p>

<p>Our advisory on your legal query <strong>{{subject}}</strong> is ready. The full write-up is available in your SGS portal under Consulta legal.</p>

<p>If you have follow-up questions, you can submit a new query at any time as part of your subscription.</p>

<p>Best,<br/>
Abner Quiroga<br/>
SGS Consulting Group</p>$html$,
        '["client_name", "subject"]',
        'Sent to the client when admin closes a legal case (SOP-05). Includes a portal link to download the advisory documents.'
    )
) AS t(template_key, subject, body_html, body_variables, description)
WHERE NOT EXISTS (
    SELECT 1 FROM public.email_templates existing WHERE existing.template_key = t.template_key
);
