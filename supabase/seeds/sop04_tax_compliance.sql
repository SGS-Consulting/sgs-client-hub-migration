-- =========================================================
-- SOP-04 Tax & Compliance Strategy — seed
--
-- Idempotent. Re-run safely.
-- Prereq: 20260501121841_sop04_slice_schema.sql migration applied.
--
-- Creates:
--   1. 1 service row: "Tax & Compliance Strategy" at base_price=0.
--      (Zero is intentional: bundled with SOP-03 recurring tiers at no
--      extra charge; standalone sales use client_services.price_override
--      set by Abner at activation — see sop04_design.md §11.1.)
--   2. 4 onboarding task templates for the SOP-04 service.
--   3. 3 service_recurring_tasks for the SOP-04 service.
--   4. 5 IRS Common Law Test classification questions.
--   5. 3 email templates: worker_w9_request, 1099_ready,
--      quarterly_strategy_review_summary.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Service
-- ---------------------------------------------------------
DO $$
DECLARE
    svc_id UUID;
BEGIN
    SELECT id INTO svc_id
    FROM public.services
    WHERE name = 'Tax & Compliance Strategy'
    LIMIT 1;

    IF svc_id IS NULL THEN
        INSERT INTO public.services (name, category, description, base_price, is_active)
        VALUES (
            'Tax & Compliance Strategy',
            'Tax',
            'Recurring tax strategy and compliance service. Includes initial and quarterly tax-strategy meetings (Abner + Germain), worker roster management with IRS Common Law Test classification, tokenized W-9 collection per contractor, year-end 1099 generation and delivery, and IRS filing tracking. '
            'base_price=0 is intentional: this service is auto-spawned alongside SOP-03 recurring tiers at no separate charge. Standalone sales use client_services.price_override, set by Abner case-by-case at activation.',
            0.00,
            TRUE
        )
        RETURNING id INTO svc_id;

        RAISE NOTICE 'SOP-04 service "Tax & Compliance Strategy" created (id=%)', svc_id;
    ELSE
        RAISE NOTICE 'SOP-04 service already exists (id=%) — skipping creation.', svc_id;
    END IF;

    -- ---------------------------------------------------------
    -- 2. Onboarding task templates (one-time, spawn on service activation)
    --    All admin-assigned — clients never see tasks (see sop04_design.md §9).
    -- ---------------------------------------------------------
    IF EXISTS (SELECT 1 FROM public.service_task_templates WHERE service_id = svc_id) THEN
        RAISE NOTICE 'SOP-04 task templates already exist — skipping.';
    ELSE
        INSERT INTO public.service_task_templates
            (service_id, title, description, default_priority, default_due_offset_days, sort_order)
        VALUES
            (svc_id,
                'Schedule initial tax-strategy meeting (Abner + Germain)',
                'Coordinate and book the one-time kick-off meeting between Abner and Germain to review the client''s existing tax posture, '
                'identify contractor vs. employee candidates, and define the strategy roadmap. '
                'This spawns a discovery_sessions row with kind=''tax_strategy_initial'' when the meeting is logged.',
                'high', 3, 1),

            (svc_id,
                'Collect existing worker list from client',
                'Ask the client to provide their current worker list (name, email, type, start date) so it can be entered into the Workers tab. '
                'Most clients will add workers directly via the portal going forward; this task covers the initial import.',
                'high', 5, 2),

            (svc_id,
                'Run IRS Common Law Test classification per worker',
                'For each worker on the roster, complete the IRS Common Law Test classification wizard (behavioral control, financial control, type of relationship). '
                'Answers stored in worker_classification_responses; is_contractor flag set on client_workers. '
                'This is the auditable classification decision — do not skip.',
                'high', 10, 3),

            (svc_id,
                'Confirm all required W-9s requested via tokenized form',
                'For each worker classified as contractor (is_contractor=true), verify a W-9 invite has been sent (worker_w9_invites row with status sent/completed). '
                'Use the "Request W-9" button on each worker record; the system emails the worker a tokenized link to /w9/<token>.',
                'high', 15, 4);

        RAISE NOTICE 'SOP-04 onboarding task templates seeded (4 tasks).';
    END IF;

    -- ---------------------------------------------------------
    -- 3. Recurring task definitions
    -- ---------------------------------------------------------
    IF EXISTS (SELECT 1 FROM public.service_recurring_tasks WHERE service_id = svc_id) THEN
        RAISE NOTICE 'SOP-04 recurring tasks already exist — skipping.';
    ELSE
        INSERT INTO public.service_recurring_tasks
            (service_id, title, description, default_priority, cadence,
             cadence_config, default_due_offset_days, sort_order)
        VALUES
            (svc_id,
                'Quarterly tax-strategy meeting (Abner + Germain)',
                'Internal-only quarterly review of active tax strategies. Abner and Germain log the outcome in the dashboard, update strategy status in tax_strategies (proposed → active → implemented), '
                'and spawn a discovery_sessions row with kind=''tax_strategy_quarterly''. No Calendly — scheduled out of band.',
                'high',
                'quarterly',
                '{"day_of_quarter": 5}'::jsonb,
                5, 1),

            (svc_id,
                'Monthly worker DB review',
                'Germain reviews client_workers for this client: adds new workers reported by the client, marks departed workers terminated (sets end_date + status=''terminated''), '
                'requests W-9s from any new contractors (is_contractor=true) who don''t yet have one, and confirms classification is current.',
                'medium',
                'monthly',
                '{"day_of_month": 1}'::jsonb,
                5, 2),

            (svc_id,
                'Year-end 1099 generation + send',
                'Germain generates 1099-NEC (or 1099-MISC where applicable) for each active contractor in QuickBooks or Track1099, uploads the PDF to the worker record '
                '(document category: 1099_form), and queues the 1099_ready email to the client. '
                'Marks filed_with_irs_at on tax_filings when IRS submission is complete. '
                'Electronic delivery only in v1 (no USPS paper mail). Auto-gen deferred to v1.5.',
                'high',
                'annually',
                '{"month": 12, "day": 1}'::jsonb,
                30, 3);

        RAISE NOTICE 'SOP-04 recurring tasks seeded (3 tasks).';
    END IF;
END $$;

-- ---------------------------------------------------------
-- 4. IRS Common Law Test classification questions
--
-- Standard IRS framing across 3 categories:
--   behavioral_control (how + when work is done)
--   financial_control (economic dependence indicators)
--   type_of_relationship (written agreements, permanency, benefits)
--
-- question_number is the canonical sort key and must be UNIQUE.
-- is_active=TRUE; admins can add more or deactivate via the dashboard.
-- ---------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.worker_classification_questions) THEN
        RAISE NOTICE 'worker_classification_questions already seeded — skipping.';
        RETURN;
    END IF;

    INSERT INTO public.worker_classification_questions
        (question_number, category, question_text, is_active, sort_order)
    VALUES
        (1,
         'behavioral_control',
         'Does the company control how the worker performs the work — for example, by providing specific instructions, requiring training, or evaluating the method (not just the result) of the work?',
         TRUE, 1),

        (2,
         'behavioral_control',
         'Does the company set the worker''s hours and schedule, or require the worker to be available during fixed times?',
         TRUE, 2),

        (3,
         'financial_control',
         'Does the worker invest in their own equipment, tools, or facilities used to perform the work (rather than relying on company-provided resources)?',
         TRUE, 3),

        (4,
         'financial_control',
         'Can the worker realize a profit or incur a loss based on their own business decisions and performance — for example, by managing costs or taking on multiple clients?',
         TRUE, 4),

        (5,
         'type_of_relationship',
         'Is there a written contract describing the relationship, or does the company provide the worker with employee-type benefits such as health insurance, paid time off, or a retirement plan?',
         TRUE, 5);

    RAISE NOTICE 'Seeded 5 IRS Common Law Test questions.';
END $$;

-- ---------------------------------------------------------
-- 5. Email templates (3 SOP-04 templates)
-- ---------------------------------------------------------
INSERT INTO public.email_templates
    (template_key, subject, body_html, body_variables, description, is_active)
SELECT
    t.template_key,
    t.subject,
    t.body_html,
    t.body_variables::jsonb,
    t.description,
    TRUE
FROM (VALUES
    (
        -- Sent to the WORKER (not the client) when a W-9 invite is created.
        'worker_w9_request',
        'Action required — {{client_company_name}} needs your W-9 information',
        $html$<p>Hi {{worker_name}},</p>

<p>{{client_company_name}} has engaged SGS Consulting Group to manage their contractor compliance, and we need your W-9 information on file before we can process your payments and issue your year-end 1099.</p>

<p>Please complete the secure online form using the link below. It takes about 3 minutes and no account is required:</p>

<p><a href="{{w9_link}}">Complete my W-9 →</a></p>

<p>This link is unique to you and expires in <strong>{{expires_in_days}} days</strong>. Please complete it as soon as possible to avoid any payment delays.</p>

<p>If you have questions about why this information is needed, please reach out to your contact at {{client_company_name}} or reply to this email and we'll help.</p>

<p>Thank you,<br/>
{{requester_name}}<br/>
SGS Consulting Group<br/>
On behalf of {{client_company_name}}</p>$html$,
        '["worker_name", "client_company_name", "requester_name", "w9_link", "expires_in_days"]',
        'Sent to a worker (not the client) when Germain or the client clicks "Request W-9" on a worker record. '
        'Links to the public /w9/<token> route. Variables: worker_name, client_company_name, requester_name (SGS staff member), w9_link, expires_in_days (SOP-04 §2.5).'
    ),
    (
        -- Sent to the CLIENT when Germain uploads their 1099s at year-end.
        '1099_ready',
        'Your {{tax_year}} 1099s are ready — {{client_name}}',
        $html$<p>Hi {{client_name}},</p>

<p>Your {{tax_year}} 1099 forms are ready and available in your SGS portal. We've prepared <strong>{{worker_count}} form(s)</strong> for your contractors this year.</p>

<p>You can download them directly from your portal:</p>

<p><a href="{{portal_link}}">View my 1099s →</a></p>

<p>Each contractor who provided a valid W-9 will receive their own 1099 electronically. If any contractor information is missing or needs a correction, please reach out to us promptly — IRS deadlines are strict.</p>

<p>Best,<br/>
Germain Tovar<br/>
SGS Consulting Group</p>$html$,
        '["client_name", "tax_year", "worker_count", "portal_link"]',
        'Sent to the client when Germain uploads year-end 1099 PDFs to the worker records (SOP-04 §3.1 / §3.2). '
        'Electronic delivery only in v1. Variables: client_name, tax_year, worker_count, portal_link.'
    ),
    (
        -- Optional internal summary after a quarterly tax-strategy meeting.
        -- Variables are flexible; body_html uses summary_html for rich content.
        'quarterly_strategy_review_summary',
        'Q{{quarter_label}} Tax Strategy Review — {{client_name}}',
        $html$<p>Hi team,</p>

<p>Here is a summary of the quarterly tax-strategy review for <strong>{{client_name}}</strong> — {{quarter_label}}.</p>

<p>{{summary_html}}</p>

<p>Please review and update the Tax Strategies section in the dashboard to reflect any status changes (proposed → active → implemented) discussed in the meeting.</p>

<p>— SGS Internal</p>$html$,
        '["client_name", "quarter_label", "summary_html"]',
        'Optional internal summary email sent after a quarterly tax-strategy meeting (SOP-04 §5.3 / §7.2 decision B). '
        'summary_html is a rich-text block with the meeting outcome. Not client-facing — sent to Abner + Germain only.'
    ),
    -- ---- W-9 confirmation emails (SOP-04 §2.5) ----
    (
        'w9_received_client',
        'W-9 received from {{worker_name}} — {{client_company_name}}',
        $html$<p>Hi,</p>

<p>Just confirming that <strong>{{worker_name}}</strong> has submitted their W-9 form. It is now on file for {{client_company_name}}.</p>

<p>You can review the worker's status anytime in your portal under Mi equipo.</p>

<p>— SGS</p>$html$,
        '["client_company_name", "worker_name"]',
        'Sent to the client (company) when one of their workers submits the W-9 form via the public tokenized link.'
    ),
    (
        'w9_received_worker',
        'Your W-9 was received — thanks',
        $html$<p>Hi {{worker_name}},</p>

<p>Thanks for filling out your W-9. We have received it and it is now on file for <strong>{{client_company_name}}</strong>'s tax records.</p>

<p>You don''t need to take any further action. If we need anything else from you in the future, you''ll receive another email.</p>

<p>— SGS Consulting Group</p>$html$,
        '["worker_name", "client_company_name"]',
        'Sent to the worker (not the client) when they successfully submit the W-9 form.'
    )
) AS t(template_key, subject, body_html, body_variables, description)
WHERE NOT EXISTS (
    SELECT 1 FROM public.email_templates existing
    WHERE existing.template_key = t.template_key
);
