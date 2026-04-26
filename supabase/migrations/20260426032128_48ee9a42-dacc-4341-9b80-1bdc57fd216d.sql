-- =========================================================
-- SGS Consulting Group — Initial schema
-- =========================================================

-- Enums --------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

CREATE TYPE public.client_status AS ENUM ('prospect', 'active', 'inactive');

CREATE TYPE public.entity_type AS ENUM ('LLC', 'S_Corp', 'C_Corp', 'Sole_Proprietor', 'Partnership', 'Other');

CREATE TYPE public.task_status AS ENUM ('open', 'in_progress', 'pending', 'blocked', 'closed');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE public.document_category AS ENUM ('contract', 'identification', 'tax', 'financial', 'legal', 'other');
CREATE TYPE public.document_status AS ENUM ('pending_review', 'approved', 'rejected');

CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('bank_transfer', 'check', 'cash', 'card', 'other');

CREATE TYPE public.support_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- =========================================================
-- profiles
-- =========================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- user_roles + has_role()
-- =========================================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- =========================================================
-- updated_at trigger helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- =========================================================
-- clients
-- =========================================================
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    entity_type entity_type,
    ein TEXT,
    formation_date DATE,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT DEFAULT 'US',
    status client_status NOT NULL DEFAULT 'prospect',
    internal_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_clients_status ON public.clients(status);

CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- services + client_services
-- =========================================================
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    base_price NUMERIC(12,2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.client_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    started_at DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_services_client ON public.client_services(client_id);

-- =========================================================
-- tasks (project management)
-- =========================================================
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'open',
    priority task_priority NOT NULL DEFAULT 'medium',
    assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    due_date DATE,
    tags TEXT[] DEFAULT '{}',
    sort_order INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_client ON public.tasks(client_id);
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subtasks_task ON public.subtasks(task_id);

CREATE TABLE public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_comments_task ON public.task_comments(task_id);

CREATE TABLE public.task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_attachments_task ON public.task_attachments(task_id);

CREATE TABLE public.time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    minutes INT NOT NULL CHECK (minutes > 0),
    note TEXT,
    logged_on DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_time_entries_task ON public.time_entries(task_id);
CREATE INDEX idx_time_entries_user ON public.time_entries(user_id);

-- =========================================================
-- documents
-- =========================================================
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    category document_category NOT NULL DEFAULT 'other',
    status document_status NOT NULL DEFAULT 'pending_review',
    rejection_reason TEXT,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_client ON public.documents(client_id);
CREATE INDEX idx_documents_status ON public.documents(status);

-- =========================================================
-- invoices, invoice_items, payments
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1000;

CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE DEFAULT ('INV-' || nextval('public.invoice_number_seq')),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    status invoice_status NOT NULL DEFAULT 'draft',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax NUMERIC(12,2) NOT NULL DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_client ON public.invoices(client_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    method payment_method NOT NULL DEFAULT 'bank_transfer',
    reference TEXT,
    paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);

-- =========================================================
-- support_requests
-- =========================================================
CREATE TABLE public.support_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status support_status NOT NULL DEFAULT 'open',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_support_requests_client ON public.support_requests(client_id);

-- =========================================================
-- activity_log
-- =========================================================
CREATE TABLE public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_log_client ON public.activity_log(client_id);

-- =========================================================
-- notifications
-- =========================================================
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);

-- =========================================================
-- Auto-create profile + assign default 'client' role on signup
-- =========================================================
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

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- Helper: get current user's client_id
-- =========================================================
CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.clients WHERE user_id = auth.uid() LIMIT 1
$$;

-- =========================================================
-- ENABLE RLS on all tables
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- profiles
CREATE POLICY "users view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "admins view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "admins update profiles" ON public.profiles
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "users view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins view all roles" ON public.user_roles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- clients
CREATE POLICY "admins manage clients" ON public.clients
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "clients view own client record" ON public.clients
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "clients update own client record" ON public.clients
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- services
CREATE POLICY "anyone authenticated views active services" ON public.services
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "admins manage services" ON public.services
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- client_services
CREATE POLICY "admins manage client_services" ON public.client_services
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "clients view own client_services" ON public.client_services
    FOR SELECT USING (client_id = public.current_client_id());

-- tasks
CREATE POLICY "admins manage tasks" ON public.tasks
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Clients do NOT see internal tasks

-- subtasks
CREATE POLICY "admins manage subtasks" ON public.subtasks
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- task_comments
CREATE POLICY "admins manage task_comments" ON public.task_comments
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- task_attachments
CREATE POLICY "admins manage task_attachments" ON public.task_attachments
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- time_entries
CREATE POLICY "admins manage time_entries" ON public.time_entries
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- documents
CREATE POLICY "admins manage documents" ON public.documents
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "clients view own documents" ON public.documents
    FOR SELECT USING (client_id = public.current_client_id());
CREATE POLICY "clients upload own documents" ON public.documents
    FOR INSERT WITH CHECK (
        client_id = public.current_client_id()
        AND uploaded_by = auth.uid()
    );

-- invoices
CREATE POLICY "admins manage invoices" ON public.invoices
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "clients view own invoices" ON public.invoices
    FOR SELECT USING (client_id = public.current_client_id());

-- invoice_items
CREATE POLICY "admins manage invoice_items" ON public.invoice_items
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "clients view items of own invoices" ON public.invoice_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_id AND i.client_id = public.current_client_id()
        )
    );

-- payments
CREATE POLICY "admins manage payments" ON public.payments
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "clients view payments of own invoices" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_id AND i.client_id = public.current_client_id()
        )
    );

-- support_requests
CREATE POLICY "admins manage support_requests" ON public.support_requests
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "clients view own support_requests" ON public.support_requests
    FOR SELECT USING (client_id = public.current_client_id());
CREATE POLICY "clients create own support_requests" ON public.support_requests
    FOR INSERT WITH CHECK (
        client_id = public.current_client_id()
        AND created_by = auth.uid()
    );

-- activity_log
CREATE POLICY "admins view activity_log" ON public.activity_log
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert activity_log" ON public.activity_log
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "clients view own activity_log" ON public.activity_log
    FOR SELECT USING (client_id = public.current_client_id());

-- notifications
CREATE POLICY "users view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins create notifications" ON public.notifications
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Storage buckets (private)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('client-documents', 'client-documents', false),
    ('task-attachments', 'task-attachments', false),
    ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: client-documents
CREATE POLICY "admins all client-documents" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'client-documents' AND public.has_role(auth.uid(), 'admin'))
    WITH CHECK (bucket_id = 'client-documents' AND public.has_role(auth.uid(), 'admin'));

-- Path convention for client-documents: {client_id}/{filename}
CREATE POLICY "clients read own client-documents" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'client-documents'
        AND (storage.foldername(name))[1] = public.current_client_id()::text
    );

CREATE POLICY "clients upload own client-documents" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'client-documents'
        AND (storage.foldername(name))[1] = public.current_client_id()::text
    );

-- task-attachments: admins only
CREATE POLICY "admins all task-attachments" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'task-attachments' AND public.has_role(auth.uid(), 'admin'))
    WITH CHECK (bucket_id = 'task-attachments' AND public.has_role(auth.uid(), 'admin'));

-- avatars: public read, user writes own folder
CREATE POLICY "public read avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "users upload own avatar" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "users update own avatar" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
