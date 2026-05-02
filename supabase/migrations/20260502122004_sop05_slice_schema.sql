-- =========================================================
-- SOP-05 Legal & Corporate Support — schema additions
--
-- Adds:
--   - legal_cases table (event-driven case workflow: client submits a
--     legal query → Abner reviews + optionally consults law firm →
--     advisory meeting → close)
--   - documents.legal_case_id (per the worker_id/tax_year pattern)
--   - 2 new document_category values
--   - 1 new discovery_sessions.kind value (legal_advisory) for Step 3 meeting
--   - submit_legal_case RPC (SECURITY DEFINER — gates submission on
--     active SOP-05 subscription for the calling client)
--   - close_legal_case RPC (SECURITY DEFINER — admin-only, marks resolved)
--
-- Per Processos_internos/_specs/client_dashboard/sop05_design.md (LOCKED 2026-05-02
-- by Claude orchestrator).
-- =========================================================

-- Enum extensions
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'legal_query_attachments';
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'advisory_documents';

-- discovery_sessions.kind extension (drop + recreate the CHECK constraint —
-- name is auto-assigned by Postgres when defined inline; verified in earlier slices).
ALTER TABLE public.discovery_sessions DROP CONSTRAINT IF EXISTS discovery_sessions_kind_check;
ALTER TABLE public.discovery_sessions ADD CONSTRAINT discovery_sessions_kind_check
    CHECK (kind IN (
        'discovery',
        'monthly_accounting',
        'quarterly_review',
        'advisory_checkin',
        'tax_strategy_initial',
        'tax_strategy_quarterly',
        'legal_advisory'
    ));

-- ---------------------------------------------------------
-- legal_cases
-- ---------------------------------------------------------
CREATE TABLE public.legal_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    client_service_id UUID REFERENCES public.client_services(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'received'
        CHECK (status IN ('received', 'under_review', 'advisory_delivered', 'closed')),
    law_firm_consulted BOOLEAN NOT NULL DEFAULT FALSE,
    abner_notes TEXT,
    advisory_meeting_id UUID REFERENCES public.discovery_sessions(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_cases_client ON public.legal_cases(client_id);
CREATE INDEX idx_legal_cases_status ON public.legal_cases(status)
    WHERE status != 'closed';
CREATE INDEX idx_legal_cases_assigned ON public.legal_cases(assigned_to)
    WHERE status != 'closed';

CREATE TRIGGER trg_legal_cases_updated_at BEFORE UPDATE ON public.legal_cases
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;

-- Admins manage everything
CREATE POLICY "admins manage legal_cases" ON public.legal_cases
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Clients see their own cases (but cannot read abner_notes — column-level
-- isolation is not natively supported, so admin-only fields stay readable
-- by clients who own the row; UI must be careful not to expose abner_notes
-- to client-side rendering. For v1 we live with this — client UI just
-- doesn't query abner_notes. If a client queries the column directly via
-- supabase-js they'd see it; this is acceptable since abner_notes is the
-- admin's working notes, not a true secret.)
CREATE POLICY "clients view own legal_cases" ON public.legal_cases
    FOR SELECT TO authenticated
    USING (client_id = public.current_client_id());

-- Clients submit via the RPC, not direct INSERT
-- Clients respond/close via the RPC, not direct UPDATE

-- ---------------------------------------------------------
-- documents.legal_case_id — per the worker_id/tax_year link pattern
-- ---------------------------------------------------------
ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS legal_case_id UUID REFERENCES public.legal_cases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_legal_case ON public.documents(legal_case_id)
    WHERE legal_case_id IS NOT NULL;

COMMENT ON COLUMN public.documents.legal_case_id IS
    'For documents tied to a specific legal case (categories: legal_query_attachments, advisory_documents). NULL otherwise.';

-- ---------------------------------------------------------
-- submit_legal_case RPC
--
-- Gates submission on the calling client having an active SOP-05
-- subscription ("Legal & Corporate Support" service). Returns the new
-- case id so the client UI can attach uploaded documents.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_legal_case(
    p_subject TEXT,
    p_description TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_client_id UUID;
    v_client_service_id UUID;
    v_case_id UUID;
BEGIN
    IF p_subject IS NULL OR length(trim(p_subject)) = 0 THEN
        RAISE EXCEPTION 'subject is required' USING ERRCODE = '22023';
    END IF;
    IF p_description IS NULL OR length(trim(p_description)) = 0 THEN
        RAISE EXCEPTION 'description is required' USING ERRCODE = '22023';
    END IF;

    -- Look up the calling client
    SELECT id INTO v_client_id FROM public.clients WHERE user_id = auth.uid() LIMIT 1;
    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'caller is not a client' USING ERRCODE = '42501';
    END IF;

    -- Subscription gate — must have an active SOP-05 service
    SELECT cs.id INTO v_client_service_id
    FROM public.client_services cs
    JOIN public.services s ON s.id = cs.service_id
    WHERE cs.client_id = v_client_id
      AND cs.is_active = TRUE
      AND s.name = 'Legal & Corporate Support'
    LIMIT 1;
    IF v_client_service_id IS NULL THEN
        RAISE EXCEPTION 'Legal & Corporate Support is not active for this client'
            USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.legal_cases (client_id, client_service_id, subject, description, submitted_by, status)
    VALUES (v_client_id, v_client_service_id, trim(p_subject), trim(p_description), auth.uid(), 'received')
    RETURNING id INTO v_case_id;

    RETURN v_case_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_legal_case(TEXT, TEXT) TO authenticated;

-- ---------------------------------------------------------
-- close_legal_case RPC — admin-only convenience (mirrors the closure
-- pattern from SOP-01's acknowledge_client_service)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_legal_case(p_case_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_resolved_at TIMESTAMPTZ;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'only admins can close legal cases' USING ERRCODE = '42501';
    END IF;

    UPDATE public.legal_cases
    SET status = 'closed',
        resolved_at = now(),
        abner_notes = COALESCE(NULLIF(trim(COALESCE(p_notes, '')), ''), abner_notes)
    WHERE id = p_case_id
    RETURNING resolved_at INTO v_resolved_at;

    IF v_resolved_at IS NULL THEN
        RAISE EXCEPTION 'legal case % not found', p_case_id USING ERRCODE = '02000';
    END IF;

    RETURN v_resolved_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_legal_case(UUID, TEXT) TO authenticated;
