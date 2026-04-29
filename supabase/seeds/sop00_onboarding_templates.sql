-- =========================================================
-- SOP-00 onboarding seed — idempotent, paste into the Supabase SQL editor.
--
-- Prereq: apply 20260428130000_sop00_slice_schema.sql first.
--
-- Creates an "Onboarding" service (category=Internal) and its standard
-- task templates. Activating Onboarding for a new client from
-- AdminClientDetail → Services spawns the SOP-00 steps as tasks.
-- =========================================================

DO $$
DECLARE
    onboarding_id UUID;
BEGIN
    SELECT id INTO onboarding_id
    FROM public.services
    WHERE name = 'Onboarding'
    LIMIT 1;

    IF onboarding_id IS NULL THEN
        INSERT INTO public.services (name, category, description, base_price, is_active)
        VALUES (
            'Onboarding',
            'Internal',
            'SOP-00 client onboarding workflow. Activate for every new client to spawn standard onboarding tasks.',
            0,
            TRUE
        )
        RETURNING id INTO onboarding_id;
    END IF;

    IF EXISTS (SELECT 1 FROM public.service_task_templates WHERE service_id = onboarding_id) THEN
        RAISE NOTICE 'Onboarding templates already exist — skipping.';
        RETURN;
    END IF;

    INSERT INTO public.service_task_templates
        (service_id, title, description, default_priority, default_due_offset_days, sort_order)
    VALUES
        (onboarding_id, 'Schedule discovery session',
            'Send Calendly link to prospect; once booked, log the session under Discovery.',
            'high', 2, 1),
        (onboarding_id, 'Prepare and send proposal',
            'Draft proposal presentation from discovery notes. Upload to Documents (category=proposal) and email to prospect.',
            'high', 7, 2),
        (onboarding_id, 'Send contract for signature',
            'Send service contract via DocuSign (or in-portal signing once available).',
            'high', 9, 3),
        (onboarding_id, 'Confirm initial payment',
            'Generate Stripe payment link on the invoice; confirm payment and record it under Invoices.',
            'high', 11, 4),
        (onboarding_id, 'Send welcome email',
            'Send welcome email confirming account active and team assigned.',
            'medium', 13, 5);

    RAISE NOTICE 'Seeded Onboarding service and 5 task templates.';
END $$;
