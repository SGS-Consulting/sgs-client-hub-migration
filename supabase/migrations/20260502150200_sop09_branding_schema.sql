-- =========================================================
-- SOP-09 Branding & Business Identity — schema additions
--
-- Adds:
--   - branding_projects: multi-phase branding project per client
--     with optional web development track
--   - documents.branding_project_id FK (same pattern as legal_case_id)
--   - document_category values 'brand_kit', 'brand_brief'
--
-- Design decisions (2026-05-02):
--   web_included is per-project (not always bundled).
--   Client portal is read-only status view; admin uploads
--   deliverables to documents (category: brand_kit).
--   Brief intake happens offline — Abner marks brief_received
--   from the admin panel.
-- =========================================================

ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'brand_kit';
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'brand_brief';

-- ---------------------------------------------------------
-- branding_projects
-- ---------------------------------------------------------
CREATE TABLE public.branding_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    web_included BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'brief_received'
        CHECK (status IN (
            'brief_received',
            'in_design',
            'presented_to_client',
            'client_approved',
            'web_development',
            'digital_profiles_updated',
            'delivered',
            'support'
        )),
    abner_notes TEXT,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_branding_projects_client ON public.branding_projects(client_id);
CREATE INDEX idx_branding_projects_status ON public.branding_projects(status)
    WHERE status NOT IN ('delivered', 'support');

CREATE TRIGGER trg_branding_projects_updated_at
    BEFORE UPDATE ON public.branding_projects
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.branding_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage branding_projects" ON public.branding_projects
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "clients view own branding_projects" ON public.branding_projects
    FOR SELECT TO authenticated
    USING (client_id = public.current_client_id());

-- ---------------------------------------------------------
-- documents.branding_project_id — per the legal_case_id pattern
-- ---------------------------------------------------------
ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS branding_project_id UUID
        REFERENCES public.branding_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_branding_project ON public.documents(branding_project_id)
    WHERE branding_project_id IS NOT NULL;

COMMENT ON COLUMN public.documents.branding_project_id IS
    'For documents tied to a branding project (categories: brand_kit, brand_brief). NULL otherwise.';
