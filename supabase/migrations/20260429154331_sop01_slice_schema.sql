-- =========================================================
-- SOP-01 Business Formation & Structure — schema additions
--
-- Adds:
--   - 3 document_category enum values (corporate_kit, current_structure,
--     completion_certificate).
--   - client_services.acknowledged_at — timestamp set when client
--     clicks "Acknowledge & close" in the portal.
--   - client_services.ghl_pipeline_stage — placeholder for Phase 2 GHL
--     bridge; stores which stage of the SOP's GHL pipeline this service
--     is currently in.
--   - client_services.business_profile_data — JSONB for the §2.2
--     questionnaire when a client is forming an entity from scratch
--     (owners, state, business type, industry, etc.).
--   - email_templates — reusable templated emails (SOP-01 kit delivery
--     is the first; portal invite + future SOPs reuse the table).
--   - email_log — audit trail of all emails sent from the dashboard.
--
-- See Processos_internos/_specs/client_dashboard/sop01_design.md for
-- the design decisions behind each field.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Document category enum additions
-- ---------------------------------------------------------
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'corporate_kit';
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'current_structure';
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'completion_certificate';

-- ---------------------------------------------------------
-- 2. client_services: closure, GHL stage, business profile
-- ---------------------------------------------------------
ALTER TABLE public.client_services
    ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ghl_pipeline_stage TEXT,
    ADD COLUMN IF NOT EXISTS business_profile_data JSONB;

-- ---------------------------------------------------------
-- 3. email_templates
--
-- One row per templated email (e.g., "sop01_kit_delivery",
-- "portal_invite", "sop00_welcome"). body_html supports simple
-- {{variable}} substitution at send time.
-- ---------------------------------------------------------
CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_templates_key ON public.email_templates(template_key);

CREATE TRIGGER trg_email_templates_updated_at BEFORE UPDATE ON public.email_templates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage email_templates" ON public.email_templates
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 4. email_log
--
-- Audit trail of every email sent. Captures the rendered subject/body
-- (after variable substitution) plus delivery status. Immutable from
-- the app's perspective — admins can read but not edit.
-- ---------------------------------------------------------
CREATE TABLE public.email_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key TEXT,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed')),
    provider_message_id TEXT,
    error_message TEXT,
    sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_service_id UUID REFERENCES public.client_services(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_log_client ON public.email_log(client_id);
CREATE INDEX idx_email_log_template ON public.email_log(template_key);
CREATE INDEX idx_email_log_status ON public.email_log(status);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins view email_log" ON public.email_log
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins insert email_log" ON public.email_log
    FOR INSERT TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update email_log" ON public.email_log
    FOR UPDATE TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
