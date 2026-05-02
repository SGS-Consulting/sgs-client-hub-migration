-- =========================================================
-- Dev seed — team users (heads + analysts)
--
-- Idempotent. Creates auth users + role assignments for testing
-- the new role hierarchy (admin → heads → analysts).
--
-- Test accounts:
--   germain@sgs.test   / team123!  → head_accounting
--   jesus@sgs.test     / team123!  → head_branding
--   karen@sgs.test     / team123!  → head_it
--   ana_acct@sgs.test  / team123!  → analyst_accounting
--   ana_brand@sgs.test / team123!  → analyst_branding
--   ana_it@sgs.test    / team123!  → analyst_it
-- =========================================================

DO $$
DECLARE
    team_users CONSTANT TEXT[][] := ARRAY[
        ['germain@sgs.test',   'Germain Head Accounting',   'head_accounting'],
        ['jesus@sgs.test',     'Jesus Head Branding',       'head_branding'],
        ['karen@sgs.test',     'Karen Head IT',             'head_it'],
        ['ana_acct@sgs.test',  'Ana Analyst Accounting',    'analyst_accounting'],
        ['ana_brand@sgs.test', 'Ana Analyst Branding',      'analyst_branding'],
        ['ana_it@sgs.test',    'Ana Analyst IT',            'analyst_it']
    ];
    v_email TEXT;
    v_full_name TEXT;
    v_role TEXT;
    v_user_id UUID;
    v_password TEXT := 'team123!';
    i INT;
BEGIN
    FOR i IN 1..array_length(team_users, 1) LOOP
        v_email := team_users[i][1];
        v_full_name := team_users[i][2];
        v_role := team_users[i][3];

        SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;

        IF v_user_id IS NULL THEN
            v_user_id := gen_random_uuid();

            INSERT INTO auth.users (
                instance_id, id, aud, role,
                email, encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data,
                created_at, updated_at,
                confirmation_token, recovery_token,
                email_change, email_change_token_new
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                v_user_id,
                'authenticated', 'authenticated',
                v_email,
                crypt(v_password, gen_salt('bf')),
                now(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                jsonb_build_object('full_name', v_full_name),
                now(), now(),
                '', '', '', ''
            );

            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id,
                last_sign_in_at, created_at, updated_at
            ) VALUES (
                gen_random_uuid(),
                v_user_id,
                jsonb_build_object(
                    'sub', v_user_id::text,
                    'email', v_email,
                    'email_verified', true
                ),
                'email',
                v_user_id::text,
                now(), now(), now()
            );

            -- handle_new_user trigger inserted role='client'. Replace with the team role.
            UPDATE public.user_roles
            SET role = v_role::app_role
            WHERE user_id = v_user_id;

            RAISE NOTICE 'Created team user: % (%)', v_email, v_role;
        ELSE
            -- Make sure existing user has the right role (and only that role)
            DELETE FROM public.user_roles WHERE user_id = v_user_id;
            INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, v_role::app_role);
            RAISE NOTICE 'Re-asserted role on existing user: % → %', v_email, v_role;
        END IF;
    END LOOP;
END $$;
