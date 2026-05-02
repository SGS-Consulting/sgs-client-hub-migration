-- =========================================================
-- SOP-04 Tax & Compliance Strategy — schema
--
-- Per sop04_design.md (locked 2026-05-01 with Germain + Abner via Javi).
-- Adds:
--   1. Enum extensions: document_category gains 'w9_form', '1099_form';
--      discovery_sessions.kind CHECK extended with 'tax_strategy_initial'
--      and 'tax_strategy_quarterly'.
--   2. client_services.price_override NUMERIC — nullable per-client price
--      override for standalone SOP-04 sales (bundled SOP-04 is $0).
--   3. client_workers — per-client worker roster with symmetric client +
--      admin CRUD. No tax_id_last4 column (last-4 TIN lives in the
--      admin-only client_workers_w9_data table; see §4 comment).
--   4. client_workers_history — trigger-based full audit log of every
--      INSERT/UPDATE/DELETE on client_workers. Admin SELECT only; writes
--      only via trigger (SECURITY DEFINER).
--   5. worker_classification_questions — canonical IRS Common Law Test
--      question bank. Authenticated SELECT; admin manage.
--   6. worker_classification_responses — per-worker IRS test answers.
--      Admin only (decision audit trail).
--   7. worker_w9_invites — tokenized form invites sent to workers.
--      Admin only; the /w9/<token> public route uses service role via
--      Edge Function (worker-w9-submit).
--   8. client_workers_w9_data — structured W-9 fields submitted by the
--      worker through the token form. Admin only; sensitive PII.
--      SECURITY NOTE: tin_full is stored plaintext with admin-only RLS
--      for v1 (see §8 comment below). Encrypted storage deferred to v1.5.
--   9. tax_strategies — internal per-client strategy log. Admin only.
--  10. tax_filings — small IRS-filing audit log. Admin only.
--
-- RLS posture (summary):
--   All tables: RLS enabled.
--   client_workers — admin ALL; client SELECT / INSERT / UPDATE on own
--                    rows; DELETE admin only. No sensitive columns on
--                    this table (TIN data is in client_workers_w9_data).
--   client_workers_history — admin SELECT only; no direct write policy.
--   worker_classification_questions — admin ALL; authenticated SELECT.
--   worker_classification_responses — admin only.
--   worker_w9_invites — admin only.
--   client_workers_w9_data — admin only.
--   tax_strategies — admin only.
--   tax_filings — admin only.
--
-- Prerequisites: all prior migrations applied (baseline through
--   20260429205220_sop03_cron_schedulers.sql).
-- =========================================================

-- ---------------------------------------------------------
-- 1. Document category enum additions
-- ---------------------------------------------------------
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'w9_form';
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS '1099_form';

-- ---------------------------------------------------------
-- 2. discovery_sessions.kind — extend CHECK to include SOP-04 kinds
--
-- The existing inline CHECK was auto-named discovery_sessions_kind_check
-- by Postgres (added in SOP-03 migration). We drop and recreate it with
-- the two new values so Postgres validates the broader set consistently.
-- DROP CONSTRAINT IF EXISTS makes the drop safe; the re-add will error
-- on a second run if the constraint already exists with the new values
-- (acceptable for a migration that should run exactly once).
-- ---------------------------------------------------------
ALTER TABLE public.discovery_sessions
    DROP CONSTRAINT IF EXISTS discovery_sessions_kind_check;

ALTER TABLE public.discovery_sessions
    ADD CONSTRAINT discovery_sessions_kind_check
    CHECK (kind IN (
        'discovery',
        'monthly_accounting',
        'quarterly_review',
        'advisory_checkin',
        'tax_strategy_initial',
        'tax_strategy_quarterly'
    ));

-- ---------------------------------------------------------
-- 3. client_services.price_override
--
-- Nullable NUMERIC: when set, overrides services.base_price for this
-- client_service. Used for standalone SOP-04 sales where Abner sets
-- the case-by-case price at activation. NULL = use base_price.
-- ---------------------------------------------------------
ALTER TABLE public.client_services
    ADD COLUMN IF NOT EXISTS price_override NUMERIC;

COMMENT ON COLUMN public.client_services.price_override IS
    'Per-client price override (SOP-04 §11.1). When set, supersedes services.base_price '
    'for this client_service. NULL = use base_price. Used for standalone Tax & Compliance '
    'Strategy sales where Abner sets case-by-case pricing at activation.';

-- ---------------------------------------------------------
-- 4. client_workers
--
-- Per-client worker roster. Symmetric CRUD: both the client (via portal
-- Workers tab) and admin/Germain can add/edit/terminate workers.
--
-- COLUMN SECURITY NOTE — tax_id_last4 and the original spec:
-- The spec asks for tax_id_last4 to be admin-only via a view or column
-- grant. Neither approach works cleanly here: in Supabase, admins and
-- clients are the same Postgres role ("authenticated") — the distinction
-- is only in JWT claims checked by RLS policies. Column-level GRANTs are
-- Postgres-role-level, so revoking a column from "authenticated" would
-- block admins too. A view with SECURITY INVOKER enforces RLS through
-- the view but doesn't let us hide a column per-role.
--
-- Solution: tax_id_last4 is NOT stored on this table at all. The full
-- TIN and a generated tin_last4 convenience column live in
-- client_workers_w9_data (admin-only RLS table). Admin UI joins there
-- when it needs to display last 4. Client portal never sees the W-9
-- table, so last-4 stays hidden from clients by RLS — no column grant
-- needed. This removes the redundancy the spec described and is cleaner.
--
-- The trigger on this table writes every mutation to client_workers_history.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_workers (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    full_name           TEXT        NOT NULL,
    email               TEXT,
    worker_type         TEXT        CHECK (worker_type IN ('employee', 'contractor')),
    is_contractor       BOOLEAN,
    -- No tax_id_last4 here. Full TIN + tin_last4 (generated) are in
    -- client_workers_w9_data (admin-only). See COLUMN SECURITY NOTE above.
    w9_document_id      UUID        REFERENCES public.documents(id) ON DELETE SET NULL,
    start_date          DATE,
    end_date            DATE,
    status              TEXT        NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'terminated')),
    notes               TEXT,
    created_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_workers_client_id
    ON public.client_workers(client_id);
CREATE INDEX IF NOT EXISTS idx_client_workers_status
    ON public.client_workers(status);

CREATE TRIGGER trg_client_workers_updated_at
    BEFORE UPDATE ON public.client_workers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.client_workers ENABLE ROW LEVEL SECURITY;

-- Admin: full access to all rows and all columns.
CREATE POLICY "admins manage client_workers" ON public.client_workers
    FOR ALL TO authenticated
    USING  (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Client: SELECT on own rows. The table contains no sensitive columns
-- (last-4 TIN is in the admin-only client_workers_w9_data table), so
-- clients can safely SELECT every column here.
CREATE POLICY "clients view own client_workers" ON public.client_workers
    FOR SELECT TO authenticated
    USING (client_id = public.current_client_id());

-- Client: INSERT own workers (client self-service via portal Workers tab).
CREATE POLICY "clients insert own client_workers" ON public.client_workers
    FOR INSERT TO authenticated
    WITH CHECK (
        client_id = public.current_client_id()
        AND public.has_role(auth.uid(), 'client')
    );

-- Client: UPDATE own workers (edit / terminate). Admin UPDATE is covered by
-- the ALL policy above; this adds client self-service.
CREATE POLICY "clients update own client_workers" ON public.client_workers
    FOR UPDATE TO authenticated
    USING  (client_id = public.current_client_id() AND public.has_role(auth.uid(), 'client'))
    WITH CHECK (client_id = public.current_client_id() AND public.has_role(auth.uid(), 'client'));

-- DELETE is admin-only (covered by the ALL policy). No client DELETE policy.

-- ---------------------------------------------------------
-- 5. client_workers_history — trigger-based audit log
--
-- One row per INSERT/UPDATE/DELETE on client_workers. Never written
-- directly by app code — the trigger function is SECURITY DEFINER and
-- inserts unconditionally. No INSERT/UPDATE/DELETE policy is defined;
-- this is intentional (triggers bypass RLS when defined as SECURITY DEFINER).
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_workers_history (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id   UUID        NOT NULL,           -- not a FK: history survives deleted workers
    action      TEXT        NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
    old_row     JSONB,
    new_row     JSONB,
    changed_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_workers_history_worker_changed
    ON public.client_workers_history(worker_id, changed_at);

ALTER TABLE public.client_workers_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins view client_workers_history" ON public.client_workers_history
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Audit trigger function. SECURITY DEFINER so it can write to
-- client_workers_history regardless of the calling user's role.
-- auth.uid() returns the JWT subject even under SECURITY DEFINER
-- because Supabase injects it as a session setting.
CREATE OR REPLACE FUNCTION public.audit_client_workers_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_action     TEXT;
    v_old_row    JSONB;
    v_new_row    JSONB;
    v_changed_by UUID;
BEGIN
    v_changed_by := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

    IF TG_OP = 'INSERT' THEN
        v_action  := 'insert';
        v_old_row := NULL;
        v_new_row := row_to_json(NEW)::jsonb;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action  := 'update';
        v_old_row := row_to_json(OLD)::jsonb;
        v_new_row := row_to_json(NEW)::jsonb;
    ELSIF TG_OP = 'DELETE' THEN
        v_action  := 'delete';
        v_old_row := row_to_json(OLD)::jsonb;
        v_new_row := NULL;
    END IF;

    INSERT INTO public.client_workers_history
        (worker_id, action, old_row, new_row, changed_by, changed_at)
    VALUES
        (COALESCE(NEW.id, OLD.id), v_action, v_old_row, v_new_row, v_changed_by, now());

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_client_workers_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.client_workers
    FOR EACH ROW EXECUTE FUNCTION public.audit_client_workers_change();

-- ---------------------------------------------------------
-- 6. worker_classification_questions
--
-- Canonical IRS Common Law Test question bank. Not sensitive — all
-- authenticated users can read (questions are static lookup data needed
-- to render the classification wizard). Admins manage.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.worker_classification_questions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    question_number INT         UNIQUE NOT NULL,
    category        TEXT        NOT NULL,     -- 'behavioral_control' | 'financial_control' | 'type_of_relationship'
    question_text   TEXT        NOT NULL,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    sort_order      INT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_classification_questions_active
    ON public.worker_classification_questions(is_active, sort_order);

ALTER TABLE public.worker_classification_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage worker_classification_questions"
    ON public.worker_classification_questions
    FOR ALL TO authenticated
    USING  (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated view worker_classification_questions"
    ON public.worker_classification_questions
    FOR SELECT TO authenticated USING (TRUE);

-- ---------------------------------------------------------
-- 7. worker_classification_responses
--
-- Per-worker IRS test answers (one row per question per worker).
-- Admin only — this is the decision audit trail for classification.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.worker_classification_responses (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id   UUID        NOT NULL REFERENCES public.client_workers(id) ON DELETE CASCADE,
    question_id UUID        NOT NULL REFERENCES public.worker_classification_questions(id) ON DELETE CASCADE,
    answer      TEXT,       -- 'yes' | 'no' or free text for open-ended questions
    notes       TEXT,
    answered_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_classification_responses_worker
    ON public.worker_classification_responses(worker_id);

ALTER TABLE public.worker_classification_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage worker_classification_responses"
    ON public.worker_classification_responses
    FOR ALL TO authenticated
    USING  (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 8. worker_w9_invites
--
-- Tokenized W-9 form invites. One row per "Request W-9" click.
-- Admin only via authenticated JWT. The public /w9/<token> route
-- validates the token using service role via Edge Function
-- (worker-w9-submit) — that connection bypasses RLS entirely.
-- Tokens are long random strings generated in application code.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.worker_w9_invites (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id    UUID        NOT NULL REFERENCES public.client_workers(id) ON DELETE CASCADE,
    token        TEXT        UNIQUE NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    status       TEXT        NOT NULL DEFAULT 'sent'
        CHECK (status IN ('sent', 'viewed', 'completed', 'expired')),
    sent_at      TIMESTAMPTZ,
    viewed_at    TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- token is already unique; add a covering index for the common lookup:
-- token lookup for validation + worker/status for list views.
CREATE INDEX IF NOT EXISTS idx_worker_w9_invites_worker_status
    ON public.worker_w9_invites(worker_id, status);

ALTER TABLE public.worker_w9_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage worker_w9_invites" ON public.worker_w9_invites
    FOR ALL TO authenticated
    USING  (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 9. client_workers_w9_data
--
-- Structured W-9 fields submitted by the worker through the
-- tokenized form route. One row per worker (UNIQUE on worker_id).
-- Admin-only RLS. Edge Function uses service role.
--
-- SECURITY NOTE — tin_full:
--   Full TIN (SSN or EIN) is stored as plaintext TEXT in v1.
--   Protection is admin-only RLS + table-level revoke below.
--   pgcrypto-based encryption at rest is deferred to v1.5: it requires
--   a key-management strategy (where the key lives, rotation, etc.) not
--   yet decided. When implemented, the tin_last4 generated column must
--   be replaced with a separately captured column (you can't derive
--   last4 from ciphertext). Until then, treat this table as highly
--   sensitive and ensure service-role access is audited.
--
-- tin_last4 is a generated column derived from tin_full (plaintext).
-- When pgcrypto encryption is added, drop this generated column and add
-- a plain stored column populated at write time before encryption.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_workers_w9_data (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id                   UUID        UNIQUE NOT NULL
        REFERENCES public.client_workers(id) ON DELETE CASCADE,

    -- IRS W-9 form fields (Part I — Name + classification)
    legal_name                  TEXT        NOT NULL,
    business_name               TEXT,       -- DBA / optional
    federal_tax_classification  TEXT        NOT NULL
        CHECK (federal_tax_classification IN (
            'individual_sole_prop',
            'c_corp',
            's_corp',
            'partnership',
            'trust_estate',
            'llc_c',
            'llc_s',
            'llc_p',
            'other'
        )),
    -- Set only when federal_tax_classification is one of the LLC variants.
    llc_classification_letter   TEXT
        CHECK (llc_classification_letter IS NULL OR llc_classification_letter IN ('C', 'S', 'P')),
    -- Set only when federal_tax_classification = 'other'.
    other_classification_text   TEXT,

    -- Part II — Exemptions (optional)
    exempt_payee_code           TEXT,
    exempt_fatca_code           TEXT,

    -- Part III — Address
    address_line1               TEXT        NOT NULL,
    address_line2               TEXT,
    city                        TEXT        NOT NULL,
    state                       TEXT        NOT NULL,
    zip                         TEXT        NOT NULL,

    -- Optional fields
    requester_name_address      TEXT,       -- requester's name and address (Line 7)
    account_numbers             TEXT,       -- Line 8 (optional)

    -- TIN — SENSITIVE PII
    tin_type                    TEXT        NOT NULL CHECK (tin_type IN ('ssn', 'ein')),
    -- tin_full: plaintext in v1. See SECURITY NOTE above.
    tin_full                    TEXT        NOT NULL,
    -- tin_last4: convenience display column. Must be replaced by a stored
    -- non-generated column when pgcrypto encryption is introduced.
    tin_last4                   TEXT        GENERATED ALWAYS AS (right(tin_full, 4)) STORED,

    -- Electronic signature acknowledgment
    signature_typed_name        TEXT        NOT NULL,
    signature_acknowledged_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    signature_ip                TEXT,       -- captured by Edge Function

    -- Timestamps
    submitted_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_by                 UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_client_workers_w9_data_updated_at
    BEFORE UPDATE ON public.client_workers_w9_data
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.client_workers_w9_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage client_workers_w9_data"
    ON public.client_workers_w9_data
    FOR ALL TO authenticated
    USING  (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 10. tax_strategies
--
-- Internal per-client tax strategy log. Germain/Abner record strategies
-- identified in the initial tax-strategy meeting (Step 3) and update
-- status each quarter (Step 4). Admin-only. Never visible to client —
-- portal surfaces only a count badge (§7.2 decision: high-level only).
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tax_strategies (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id               UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    client_service_id       UUID        REFERENCES public.client_services(id) ON DELETE SET NULL,
    identified_at           DATE,
    strategy_summary        TEXT        NOT NULL,
    rationale               TEXT,
    expected_savings_usd    NUMERIC,
    status                  TEXT        NOT NULL DEFAULT 'proposed'
        CHECK (status IN ('proposed', 'active', 'implemented', 'retired')),
    created_by              UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_strategies_client_status
    ON public.tax_strategies(client_id, status);

CREATE TRIGGER trg_tax_strategies_updated_at
    BEFORE UPDATE ON public.tax_strategies
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tax_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage tax_strategies" ON public.tax_strategies
    FOR ALL TO authenticated
    USING  (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 11. tax_filings
--
-- Small audit log capturing IRS filing dates and method per client.
-- Germain handles the actual e-filing/paper outside the dashboard;
-- this table is the "filed on X date" record only (SOP-04 §3.3).
-- Admin only.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tax_filings (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id               UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    client_service_id       UUID        REFERENCES public.client_services(id) ON DELETE SET NULL,
    filing_year             INT         NOT NULL,
    filing_type             TEXT,       -- e.g. '1099_batch', 'tax_return'
    filed_with_irs_at       TIMESTAMPTZ,
    extension_requested_at  TIMESTAMPTZ,
    filing_method           TEXT,       -- e.g. 'e-file', 'paper'
    notes                   TEXT,
    created_by              UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_filings_client_year
    ON public.tax_filings(client_id, filing_year);

CREATE TRIGGER trg_tax_filings_updated_at
    BEFORE UPDATE ON public.tax_filings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tax_filings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage tax_filings" ON public.tax_filings
    FOR ALL TO authenticated
    USING  (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
