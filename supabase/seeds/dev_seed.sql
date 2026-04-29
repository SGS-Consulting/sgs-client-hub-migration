-- =========================================================
-- Dev seed — SGS Client Hub local/dev Supabase
--
-- Idempotent: safe to re-run.
--
-- Creates:
--   1. Test admin user      → admin@sgs.test / admin123!
--   2. Standard SGS services (LLC, C-Corp, EIN, bookkeeping, etc.)
--   3. A few sample clients to populate the admin views
--
-- After running, sign in at /auth with the admin credentials above.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Admin user (auth.users + auth.identities + role)
-- ---------------------------------------------------------
DO $$
DECLARE
    v_admin_id UUID;
    v_admin_email TEXT := 'admin@sgs.test';
    v_admin_password TEXT := 'admin123!';
BEGIN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = v_admin_email LIMIT 1;

    IF v_admin_id IS NULL THEN
        v_admin_id := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id, id, aud, role,
            email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at,
            confirmation_token, recovery_token,
            email_change, email_change_token_new
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_admin_id,
            'authenticated', 'authenticated',
            v_admin_email,
            crypt(v_admin_password, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', 'Test Admin'),
            now(), now(),
            '', '', '', ''
        );

        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id,
            last_sign_in_at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            v_admin_id,
            jsonb_build_object(
                'sub', v_admin_id::text,
                'email', v_admin_email,
                'email_verified', true
            ),
            'email',
            v_admin_id::text,
            now(), now(), now()
        );

        -- handle_new_user trigger inserted role='client'. Promote to admin.
        UPDATE public.user_roles SET role = 'admin' WHERE user_id = v_admin_id;

        RAISE NOTICE 'Created admin user: % (id=%)', v_admin_email, v_admin_id;
    ELSE
        -- Make sure existing user has admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_admin_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;

        DELETE FROM public.user_roles
        WHERE user_id = v_admin_id AND role = 'client';

        RAISE NOTICE 'Admin user already existed: % — role re-asserted.', v_admin_email;
    END IF;
END $$;

-- ---------------------------------------------------------
-- 2. Services (idempotent on name)
--
-- NOTE 2026-04-29: Bookkeeping (Monthly), Tax Filing — Federal, and
-- Tax Filing — State are seeded as INACTIVE because they're
-- superseded by the SOP-03 "Managed Accounting" tier services
-- (sop03_managed_accounting.sql) and (eventually) the SOP-04
-- service rows. They stayed in this seed only so that earlier
-- demo scenarios that referenced them don't break.
-- ---------------------------------------------------------
INSERT INTO public.services (name, category, description, base_price, is_active)
SELECT s.name, s.category, s.description, s.base_price, s.is_active
FROM (VALUES
    ('LLC Formation', 'Business Formation',
        'Delaware LLC formation including state filing and operating agreement.',
        500.00, TRUE),
    ('C-Corp Formation', 'Business Formation',
        'Delaware C-Corp formation including state filing and bylaws.',
        700.00, TRUE),
    ('EIN Application', 'Business Formation',
        'Federal Employer Identification Number application with the IRS.',
        100.00, TRUE),
    ('Registered Agent (Annual)', 'Compliance',
        'Delaware registered agent service, billed annually.',
        150.00, TRUE),
    ('Bookkeeping (Monthly)', 'Accounting',
        'Legacy generic bookkeeping service — superseded by SOP-03 Managed Accounting tiers. Kept inactive for backward compat.',
        350.00, FALSE),
    ('Tax Filing — Federal', 'Tax',
        'Legacy federal tax filing service — will be superseded by SOP-04 once that slice ships. Kept inactive.',
        800.00, FALSE),
    ('Tax Filing — State', 'Tax',
        'Legacy state tax filing service — will be superseded by SOP-04 once that slice ships. Kept inactive.',
        300.00, FALSE),
    ('Business Banking Setup', 'Banking',
        'Guidance and assistance opening US business bank accounts (Mercury, Relay, etc.).',
        200.00, TRUE)
) AS s(name, category, description, base_price, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM public.services existing WHERE existing.name = s.name
);

-- Force-deactivate legacy services if they were previously seeded as active
-- (covers the case where dev_seed.sql ran before this comment was added).
UPDATE public.services
SET is_active = FALSE
WHERE name IN ('Bookkeeping (Monthly)', 'Tax Filing — Federal', 'Tax Filing — State')
  AND is_active = TRUE;

-- ---------------------------------------------------------
-- 3. Sample clients (idempotent on email)
-- ---------------------------------------------------------
INSERT INTO public.clients (
    company_name, contact_name, email, phone,
    entity_type, status, country, internal_notes
)
SELECT c.company_name, c.contact_name, c.email, c.phone,
       c.entity_type::entity_type, c.status::client_status, c.country, c.internal_notes
FROM (VALUES
    ('Acme Coffee Roasters LLC', 'Maria López', 'maria@acmecoffee.example',
        '+1-555-0101', 'LLC', 'active', 'US',
        'Active client since Jan. Bookkeeping + annual tax.'),
    ('Sunrise Logistics Inc.', 'Diego Hernández', 'diego@sunrise.example',
        '+1-555-0102', 'C_Corp', 'active', 'US',
        'Delaware C-Corp. Founder is Mexican national; needs ITIN follow-up.'),
    ('PixelForge Studio', 'Lucía Pérez', 'lucia@pixelforge.example',
        '+1-555-0103', 'LLC', 'prospect', 'US',
        'Discovery call done. Awaiting proposal.'),
    ('Andes Imports SA', 'Carlos Ramírez', 'carlos@andesimports.example',
        '+1-555-0104', 'LLC', 'inactive', 'US',
        'Paused engagement Q2 — revisit in fall.')
) AS c(company_name, contact_name, email, phone,
       entity_type, status, country, internal_notes)
WHERE NOT EXISTS (
    SELECT 1 FROM public.clients existing WHERE existing.email = c.email
);
