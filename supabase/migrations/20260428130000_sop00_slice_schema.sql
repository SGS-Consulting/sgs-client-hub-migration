-- =========================================================
-- SOP-00 vertical slice — schema additions
--
-- - discovery_sessions: onboarding kickoff calls
-- - service_task_templates: standard tasks per service (auto-created on activation)
-- - document_category gains 'proposal' value
-- - invoices.payment_link_url: Stripe payment link
-- - handle_new_user trigger auto-links clients by email on signup
-- =========================================================

-- ---------------------------------------------------------
-- Enum addition: 'proposal' to document_category
-- ---------------------------------------------------------
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'proposal';

-- ---------------------------------------------------------
-- discovery_sessions
-- ---------------------------------------------------------
CREATE TABLE public.discovery_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 30,
    attendees TEXT[] NOT NULL DEFAULT '{}',
    outcome_notes TEXT,
    calendly_event_id TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discovery_sessions_client ON public.discovery_sessions(client_id);
CREATE INDEX idx_discovery_sessions_scheduled ON public.discovery_sessions(scheduled_at);

ALTER TABLE public.discovery_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage discovery_sessions" ON public.discovery_sessions
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "clients view own discovery_sessions" ON public.discovery_sessions
    FOR SELECT TO authenticated
    USING (client_id = public.current_client_id());

-- ---------------------------------------------------------
-- service_task_templates
-- When a service is activated for a client, every template
-- here becomes a real task linked to that client+service.
-- ---------------------------------------------------------
CREATE TABLE public.service_task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    default_priority task_priority NOT NULL DEFAULT 'medium',
    default_due_offset_days INT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_task_templates_service ON public.service_task_templates(service_id);

ALTER TABLE public.service_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage service_task_templates" ON public.service_task_templates
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Internal users need to read templates to run the activation flow
CREATE POLICY "authenticated view service_task_templates" ON public.service_task_templates
    FOR SELECT TO authenticated USING (TRUE);

-- ---------------------------------------------------------
-- invoices.payment_link_url (Stripe payment link)
-- ---------------------------------------------------------
ALTER TABLE public.invoices ADD COLUMN payment_link_url TEXT;

-- ---------------------------------------------------------
-- handle_new_user — auto-link existing client by email on signup
-- (preserves existing profile + role behavior)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client');

    -- Link the oldest unlinked client with matching email, if any.
    -- (clients.email is not unique; deterministic pick avoids ambiguity.)
    WITH target AS (
        SELECT id FROM public.clients
        WHERE email = NEW.email AND user_id IS NULL
        ORDER BY created_at ASC
        LIMIT 1
    )
    UPDATE public.clients
    SET user_id = NEW.id
    WHERE id IN (SELECT id FROM target);

    RETURN NEW;
END;
$$;
