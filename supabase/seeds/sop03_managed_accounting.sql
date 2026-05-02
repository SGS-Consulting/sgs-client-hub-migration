-- =========================================================
-- SOP-03 Managed Accounting & Financial Operations — seed
--
-- Idempotent. Re-run safely.
-- Prereq: 20260429200021_sop03_slice_schema.sql migration applied.
--
-- Creates:
--   1. 4 service rows: 3 tiers of recurring "Managed Accounting"
--      keyed by # of companies, plus a one-time "Tax-Season
--      Bookkeeping" service (per Germain's pricing answer §11.1).
--      PRICES ARE PLACEHOLDERS — Germain still needs to provide
--      exact tier dollar amounts.
--   2. 4 onboarding task templates seeded against ALL three
--      recurring tiers (clients pick a tier at activation; the
--      same setup tasks spawn regardless).
--   3. 4 service_recurring_tasks: monthly meeting, quarterly
--      P&L prep, October P&L+IUL review, tax-firm doc handoff
--      (the last reads cadence per-client from
--      client_services.tax_firm_cadence).
--   4. 3 email templates for SOP-03 client-facing emails.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Services (4 rows)
-- ---------------------------------------------------------
DO $$
BEGIN
    -- Prices below are PLACEHOLDERS at $100 until SGS finalizes the v1
    -- pricing strategy (Karen + Abner + Germain). Original tier draft was
    -- $5000/$7500/$10000/$2000 — kept in git history for reference.
    INSERT INTO public.services (name, category, description, base_price, is_active)
    SELECT t.name, t.category, t.description, t.base_price, TRUE
    FROM (VALUES
        ('Managed Accounting — 1 Company', 'Accounting',
            'Recurring monthly bookkeeping, QuickBooks management, monthly meetings, quarterly P&L reporting, October IUL review, and tax-firm document handoff. Standard tier for clients with one company.',
            100.00),
        ('Managed Accounting — 2 Companies', 'Accounting',
            'Recurring monthly accounting service across two managed companies. Same scope as the single-company tier, scaled.',
            100.00),
        ('Managed Accounting — 3+ Companies', 'Accounting',
            'Recurring monthly accounting for clients with three or more managed companies. Includes consolidated reporting where applicable.',
            100.00),
        ('Tax-Season Bookkeeping (One-Time)', 'Accounting',
            'One-time bookkeeping service for clients who only engage SGS during tax season — gets the books in order and routes documents to the third-party accounting firm for filing. Single flat charge.',
            100.00)
    ) AS t(name, category, description, base_price)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.services existing WHERE existing.name = t.name
    );

    RAISE NOTICE 'SOP-03 services seeded (or already existed). Prices are PLACEHOLDERS at $100 — finalize with Germain before going live.';
END $$;

-- ---------------------------------------------------------
-- 2. One-time onboarding task templates for each recurring tier
-- ---------------------------------------------------------
DO $$
DECLARE
    tier_record RECORD;
BEGIN
    FOR tier_record IN
        SELECT id FROM public.services
        WHERE name IN (
            'Managed Accounting — 1 Company',
            'Managed Accounting — 2 Companies',
            'Managed Accounting — 3+ Companies'
        )
    LOOP
        IF EXISTS (SELECT 1 FROM public.service_task_templates WHERE service_id = tier_record.id) THEN
            CONTINUE;
        END IF;

        INSERT INTO public.service_task_templates
            (service_id, title, description, default_priority, default_due_offset_days, sort_order)
        VALUES
            (tier_record.id,
                'Request financial documents from client',
                'Ask the client to upload bank statements (last 3 months), prior-year tax return, payroll records, supplier contracts, and any other relevant financial docs. Free-form upload — no rigid checklist.',
                'high', 1, 1),
            (tier_record.id,
                'Configure QuickBooks + connect bank feeds',
                'Create the client''s QuickBooks account, connect bank/credit card feeds, set up the chart of accounts. Mark "QuickBooks configured" on the service card when done.',
                'high', 5, 2),
            (tier_record.id,
                'Schedule first monthly meeting',
                'Send the client your Calendly link to book the first monthly accounting review. Once they book, the meeting auto-creates via the Calendly webhook.',
                'medium', 14, 3),
            (tier_record.id,
                'Set tax-firm cadence for this client',
                'Pick the tax-prep doc handoff cadence based on the client''s tax filing pattern: quarterly OR semi-annual. Updates client_services.tax_firm_cadence so recurring "Send tax-prep docs" tasks spawn correctly.',
                'high', 2, 4);
    END LOOP;

    RAISE NOTICE 'SOP-03 one-time task templates seeded for the 3 recurring tiers.';
END $$;

-- ---------------------------------------------------------
-- Tax-Season Bookkeeping (one-time) — its own task templates
-- ---------------------------------------------------------
DO $$
DECLARE
    tax_season_id UUID;
BEGIN
    SELECT id INTO tax_season_id FROM public.services
    WHERE name = 'Tax-Season Bookkeeping (One-Time)' LIMIT 1;

    IF tax_season_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.service_task_templates WHERE service_id = tax_season_id
    ) THEN
        INSERT INTO public.service_task_templates
            (service_id, title, description, default_priority, default_due_offset_days, sort_order)
        VALUES
            (tax_season_id,
                'Request prior-year financial documents',
                'Client uploads bank statements, prior-year tax return, payroll records, supplier contracts, etc.',
                'high', 1, 1),
            (tax_season_id,
                'Catch-up bookkeeping for the tax year',
                'Reconcile and categorize all prior-year transactions to bring the books current.',
                'high', 14, 2),
            (tax_season_id,
                'Send tax-prep package to firm',
                'Bundle the client''s tax-prep documents and send to the third-party accounting firm.',
                'high', 21, 3),
            (tax_season_id,
                'Confirm filing completion with client',
                'Once the firm has filed, notify the client and close the engagement.',
                'medium', 35, 4);

        RAISE NOTICE 'Tax-Season Bookkeeping task templates seeded.';
    END IF;
END $$;

-- ---------------------------------------------------------
-- 3. Recurring tasks (cadence-driven)
--
-- Attached to all 3 recurring tier services. Tax-Season is one-time
-- so no recurring tasks for it.
-- ---------------------------------------------------------
DO $$
DECLARE
    tier_record RECORD;
BEGIN
    FOR tier_record IN
        SELECT id FROM public.services
        WHERE name IN (
            'Managed Accounting — 1 Company',
            'Managed Accounting — 2 Companies',
            'Managed Accounting — 3+ Companies'
        )
    LOOP
        IF EXISTS (SELECT 1 FROM public.service_recurring_tasks WHERE service_id = tier_record.id) THEN
            CONTINUE;
        END IF;

        INSERT INTO public.service_recurring_tasks
            (service_id, title, description, default_priority, cadence,
             cadence_config, read_per_client_setting, default_due_offset_days, sort_order)
        VALUES
            (tier_record.id,
                'Monthly accounting review meeting',
                'Schedule and hold the monthly accounting review with the client. Notes captured in the dashboard.',
                'medium',
                'monthly',
                '{"day_of_month": 1}'::jsonb,
                NULL,
                5, 1),
            (tier_record.id,
                'Quarterly P&L report',
                'Prepare and upload the quarterly P&L report to the client''s portal (category: quarterly_report). Present during the next monthly meeting.',
                'high',
                'quarterly',
                '{"day_of_quarter": 1}'::jsonb,
                NULL,
                10, 2),
            (tier_record.id,
                'October P&L + IUL contribution review',
                'Annual P&L analysis to evaluate IUL contribution capacity before year-end. Upload analysis to client portal (category: annual_iul_review) and present recommendation.',
                'high',
                'annually',
                '{"month": 10, "day": 1}'::jsonb,
                NULL,
                30, 3),
            (tier_record.id,
                'Send tax-prep documents to firm',
                'Bundle tax-prep package and send to the third-party accounting firm. Cadence varies per client (quarterly OR semi-annual based on the client''s filing pattern).',
                'high',
                'per_client_setting',
                '{}'::jsonb,
                'tax_firm_cadence',
                7, 4);
    END LOOP;

    RAISE NOTICE 'SOP-03 recurring tasks seeded for the 3 recurring tiers.';
END $$;

-- ---------------------------------------------------------
-- 4. Email templates (3 new SOP-03 templates)
-- ---------------------------------------------------------
INSERT INTO public.email_templates (template_key, subject, body_html, body_variables, description, is_active)
SELECT t.template_key, t.subject, t.body_html, t.body_variables::jsonb, t.description, TRUE
FROM (VALUES
    (
        'client_query_new',
        'Quick question about your books — {{company_name}}',
        $html$<p>Hi {{client_name}},</p>

<p>We have a quick question about a transaction in your books that we need help clarifying. You can review and answer directly in your SGS portal:</p>

<p><a href="{{portal_link}}">Open my pending questions →</a></p>

<p>Question: <em>{{question_preview}}</em></p>

<p>If you can answer within {{due_in_days}} business days, we can keep your books fully current. Reply directly if email is easier than the portal.</p>

<p>Thanks,<br/>
The SGS Accounting Team</p>$html$,
        '["client_name", "company_name", "portal_link", "question_preview", "due_in_days"]',
        'Sent to a client when Germain''s team creates a new bookkeeping query (SOP-03 §3.1).'
    ),
    (
        'query_overdue_reminder',
        'Reminder — your books need a quick answer',
        $html$<p>Hi {{client_name}},</p>

<p>We're following up on a question we sent you earlier about a transaction in your books that's now {{days_overdue}} business day(s) past due. Without your input we can''t finalize this period''s reconciliation.</p>

<p><a href="{{portal_link}}">Answer now in your portal →</a></p>

<p>Question: <em>{{question_preview}}</em></p>

<p>Reply to this email if email is easier — we just need the context.</p>

<p>Thanks,<br/>
The SGS Accounting Team</p>$html$,
        '["client_name", "portal_link", "question_preview", "days_overdue"]',
        'Auto-sent when a client_query is +3 business days past its due_date and still unanswered (SOP-03 §3.1 overdue handling).'
    ),
    (
        'quarterly_report_ready',
        'Your Q{{quarter}} {{year}} P&L is ready — {{company_name}}',
        $html$<p>Hi {{client_name}},</p>

<p>Your quarterly profit & loss report for {{quarter_label}} is now available in your SGS portal:</p>

<p><a href="{{report_link}}">Download the report →</a></p>

<p>We''ll walk through the highlights together at your next monthly review meeting. If anything jumps out at you in the meantime, reply directly and let me know.</p>

<p>Best,<br/>
Germain Tovar<br/>
SGS Consulting Group</p>$html$,
        '["client_name", "company_name", "quarter", "year", "quarter_label", "report_link"]',
        'Sent when the quarterly P&L report is uploaded to the client portal (SOP-03 §6.3).'
    )
) AS t(template_key, subject, body_html, body_variables, description)
WHERE NOT EXISTS (
    SELECT 1 FROM public.email_templates existing
    WHERE existing.template_key = t.template_key
);
