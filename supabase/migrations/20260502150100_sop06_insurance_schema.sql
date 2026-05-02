-- =========================================================
-- SOP-06 Risk Management & Insurance — schema additions
--
-- Adds:
--   - client_insurance: one record per client tracking GL/WC
--     coverage status (UNIQUE on client_id — one row per client)
--   - document_category value 'wc_insurance_certificate'
--     (gl_insurance_certificate already exists from SOP-02)
--
-- Design decisions (2026-05-02):
--   v1 covers GL + WC flags and a four-state coverage_status.
--   Step 3 (client approval of insurance package) is deferred —
--   Abner has not yet defined that flow. Admin manages records
--   directly; client portal is read-only.
-- =========================================================

ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'wc_insurance_certificate';

-- ---------------------------------------------------------
-- client_insurance
-- ---------------------------------------------------------
CREATE TABLE public.client_insurance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
    has_gl_insurance BOOLEAN NOT NULL DEFAULT FALSE,
    has_wc_insurance BOOLEAN NOT NULL DEFAULT FALSE,
    coverage_status TEXT NOT NULL DEFAULT 'needs_assessment'
        CHECK (coverage_status IN (
            'needs_assessment',
            'needs_coverage',
            'quote_requested',
            'covered'
        )),
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_insurance_client ON public.client_insurance(client_id);

CREATE TRIGGER trg_client_insurance_updated_at
    BEFORE UPDATE ON public.client_insurance
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.client_insurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage client_insurance" ON public.client_insurance
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "clients view own insurance" ON public.client_insurance
    FOR SELECT TO authenticated
    USING (client_id = public.current_client_id());
