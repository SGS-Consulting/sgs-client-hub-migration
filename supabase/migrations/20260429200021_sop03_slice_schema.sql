-- =========================================================
-- SOP-03 Managed Accounting & Financial Operations — schema
--
-- Per sop03_design.md (locked with Germain 2026-04-29). Adds:
--   - 3 document_category enum values: quarterly_report,
--     annual_iul_review, tax_prep_package.
--   - client_services.qb_configured_at — when Germain marks the
--     client's QuickBooks setup complete.
--   - client_services.tax_firm_cadence — per-client cadence for
--     sending docs to the third-party accounting firm
--     (quarterly | semi_annual | tax_season_only | NULL).
--   - discovery_sessions.kind — extends the table to capture
--     non-discovery meetings (monthly accounting reviews,
--     quarterly P&L presentations, advisory check-ins). Avoids a
--     full table rename so existing SOP-00 code stays intact.
--   - client_queries — daily bookkeeping back-and-forth between
--     Germain's team and the client (Step 3.1 of the SOP).
--   - service_recurring_tasks — first recurring-task mechanic;
--     reusable across SOP-03/SOP-04/SOP-07.
--   - answer_client_query RPC — SECURITY DEFINER so clients can
--     respond to a query they own without needing a full UPDATE
--     policy on the table.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Document category enum additions
-- ---------------------------------------------------------
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'quarterly_report';
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'annual_iul_review';
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'tax_prep_package';

-- ---------------------------------------------------------
-- 2. client_services additions
-- ---------------------------------------------------------
ALTER TABLE public.client_services
    ADD COLUMN IF NOT EXISTS qb_configured_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tax_firm_cadence TEXT
        CHECK (tax_firm_cadence IS NULL OR tax_firm_cadence IN (
            'quarterly', 'semi_annual', 'tax_season_only'
        ));

COMMENT ON COLUMN public.client_services.qb_configured_at IS
    'Set by admin when QuickBooks setup is complete for this service (SOP-03).';
COMMENT ON COLUMN public.client_services.tax_firm_cadence IS
    'Per-client cadence for sending tax-prep documents to the third-party accounting firm (SOP-03 §8.1). Read by service_recurring_tasks rows whose read_per_client_setting=''tax_firm_cadence''.';

-- ---------------------------------------------------------
-- 3. discovery_sessions.kind
--
-- Reuse the table for all client meetings, not just SOP-00
-- discovery sessions. SOP-03 adds 'monthly_accounting' and
-- 'quarterly_review'; SOP-07 will add 'advisory_checkin' later.
-- ---------------------------------------------------------
ALTER TABLE public.discovery_sessions
    ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'discovery'
        CHECK (kind IN (
            'discovery',
            'monthly_accounting',
            'quarterly_review',
            'advisory_checkin'
        ));

CREATE INDEX IF NOT EXISTS idx_discovery_sessions_kind ON public.discovery_sessions(kind);

-- ---------------------------------------------------------
-- 4. client_queries — daily bookkeeping Q&A workflow (SOP-03 §3.1)
-- ---------------------------------------------------------
CREATE TABLE public.client_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    client_service_id UUID REFERENCES public.client_services(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    context TEXT,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'answered', 'overdue')),
    response TEXT,
    response_attachment_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    responded_at TIMESTAMPTZ,
    responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_queries_client ON public.client_queries(client_id);
CREATE INDEX idx_client_queries_service ON public.client_queries(client_service_id);
CREATE INDEX idx_client_queries_status ON public.client_queries(status);
CREATE INDEX idx_client_queries_owner ON public.client_queries(owner_id);
CREATE INDEX idx_client_queries_due_date ON public.client_queries(due_date)
    WHERE status = 'open';

CREATE TRIGGER trg_client_queries_updated_at BEFORE UPDATE ON public.client_queries
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.client_queries ENABLE ROW LEVEL SECURITY;

-- Admins manage everything
CREATE POLICY "admins manage client_queries" ON public.client_queries
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Clients see their own queries
CREATE POLICY "clients view own client_queries" ON public.client_queries
    FOR SELECT TO authenticated
    USING (client_id = public.current_client_id());

-- Clients answer via the answer_client_query RPC; no direct UPDATE policy.

-- ---------------------------------------------------------
-- 5. service_recurring_tasks — cadence-driven task spawning
--
-- Reusable across all recurring SOPs. A scheduled function
-- (built in a follow-up session) reads this table daily and
-- spawns rows in `tasks` for each active client_service whose
-- next-due date has arrived.
--
-- cadence + cadence_config drive the spawn schedule.
-- read_per_client_setting (when not NULL) names a column on
-- client_services to read the actual cadence from — used by the
-- tax-firm handoff per SOP-03 §8.1.
-- ---------------------------------------------------------
CREATE TABLE public.service_recurring_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    default_priority task_priority NOT NULL DEFAULT 'medium',
    cadence TEXT NOT NULL
        CHECK (cadence IN ('monthly', 'quarterly', 'semi_annually', 'annually', 'custom', 'per_client_setting')),
    cadence_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_per_client_setting TEXT,
    default_due_offset_days INT NOT NULL DEFAULT 7,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_recurring_tasks_service ON public.service_recurring_tasks(service_id);

ALTER TABLE public.service_recurring_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage service_recurring_tasks" ON public.service_recurring_tasks
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated view service_recurring_tasks" ON public.service_recurring_tasks
    FOR SELECT TO authenticated USING (TRUE);

-- ---------------------------------------------------------
-- 6. answer_client_query RPC
--
-- Mirrors the acknowledge_client_service pattern from SOP-01.
-- Lets a client respond to a query they own without needing a
-- broader UPDATE policy on client_queries.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.answer_client_query(
    p_id UUID,
    p_response TEXT,
    p_attachment_id UUID DEFAULT NULL
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_responded_at TIMESTAMPTZ;
    v_owns BOOLEAN;
BEGIN
    IF p_response IS NULL OR length(trim(p_response)) = 0 THEN
        RAISE EXCEPTION 'Response cannot be empty' USING ERRCODE = '22023';
    END IF;

    -- Verify the caller owns this query (via clients.user_id).
    SELECT EXISTS (
        SELECT 1 FROM public.client_queries cq
        JOIN public.clients c ON c.id = cq.client_id
        WHERE cq.id = p_id
          AND c.user_id = auth.uid()
    ) INTO v_owns;

    IF NOT v_owns THEN
        RAISE EXCEPTION 'Not authorized to answer this query' USING ERRCODE = '42501';
    END IF;

    -- Idempotent: if already answered, return the existing timestamp.
    SELECT responded_at INTO v_responded_at
    FROM public.client_queries
    WHERE id = p_id;

    IF v_responded_at IS NOT NULL THEN
        RETURN v_responded_at;
    END IF;

    UPDATE public.client_queries
    SET response = p_response,
        response_attachment_id = p_attachment_id,
        responded_at = now(),
        responded_by = auth.uid(),
        status = 'answered'
    WHERE id = p_id
    RETURNING responded_at INTO v_responded_at;

    RETURN v_responded_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.answer_client_query(UUID, TEXT, UUID) TO authenticated;
