-- =========================================================
-- intake_submissions — public prospect intake (SOP-00 Step 1)
-- Separate from `clients` for spam isolation; records are
-- reviewed by staff before being converted to client rows.
-- =========================================================

CREATE TABLE public.intake_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    company_name TEXT,
    incorporation_state TEXT,
    services_of_interest TEXT[] DEFAULT '{}',
    explanation TEXT,
    non_marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
    marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'reviewed', 'converted', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    converted_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_intake_submissions_status ON public.intake_submissions(status);
CREATE INDEX idx_intake_submissions_email ON public.intake_submissions(email);

ALTER TABLE public.intake_submissions ENABLE ROW LEVEL SECURITY;

-- Anonymous visitors can submit the form
CREATE POLICY "anon insert intake_submissions" ON public.intake_submissions
    FOR INSERT TO anon WITH CHECK (true);

-- Admins manage everything
CREATE POLICY "admins manage intake_submissions" ON public.intake_submissions
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow anonymous users to read active services (intake form checkbox list)
CREATE POLICY "anon view active services" ON public.services
    FOR SELECT TO anon USING (is_active = TRUE);
