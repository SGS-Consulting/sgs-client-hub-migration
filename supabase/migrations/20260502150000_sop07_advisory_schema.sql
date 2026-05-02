-- =========================================================
-- SOP-07 Business Advisory — schema additions
--
-- Adds:
--   - advisory_cases: one engagement per client, four-phase lifecycle
--   - advisory_checkins: Abner logs each follow-up date
--
-- Design decisions (2026-05-02):
--   No subscription gate — all active clients can have a case.
--   Client portal is read-only (status + check-in dates).
--   Abner opens cases and logs check-ins from the admin panel.
-- =========================================================

-- ---------------------------------------------------------
-- advisory_cases
-- ---------------------------------------------------------
CREATE TABLE public.advisory_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'initial_meeting'
        CHECK (status IN (
            'initial_meeting',
            'internal_strategy',
            'recommendation',
            'check_ins',
            'closed'
        )),
    abner_notes TEXT,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_advisory_cases_client ON public.advisory_cases(client_id);
CREATE INDEX idx_advisory_cases_status ON public.advisory_cases(status)
    WHERE status != 'closed';

CREATE TRIGGER trg_advisory_cases_updated_at
    BEFORE UPDATE ON public.advisory_cases
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.advisory_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage advisory_cases" ON public.advisory_cases
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "clients view own advisory_cases" ON public.advisory_cases
    FOR SELECT TO authenticated
    USING (client_id = public.current_client_id());

-- ---------------------------------------------------------
-- advisory_checkins
-- Denormalized client_id for RLS without a join.
-- ---------------------------------------------------------
CREATE TABLE public.advisory_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.advisory_cases(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id),
    session_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_advisory_checkins_case ON public.advisory_checkins(case_id);

ALTER TABLE public.advisory_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage advisory_checkins" ON public.advisory_checkins
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "clients view own advisory_checkins" ON public.advisory_checkins
    FOR SELECT TO authenticated
    USING (client_id = public.current_client_id());
