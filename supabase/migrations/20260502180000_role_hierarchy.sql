-- =========================================================
-- Role hierarchy: admin → heads → analysts (per dept)
--
-- Decisions (2026-05-02):
--   - admin (Abner) is the only true admin. Sees everything,
--     including pricing and revenue.
--   - 3 departments: accounting, branding, it
--   - Each dept has a head + N analysts. Same scope of
--     visibility (all clients, since user picked Q2=B); writes
--     scoped to their dept.
--   - Analysts: same scope as heads, with read-only on critical
--     write actions (service activation, pricing). Analysts can
--     INSERT client_queries, respond to queries, upload docs.
--   - "Abner-only" content: invoices, payments, services
--     pricing, legal/advisory/insurance/onboarding SOPs.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Extend the app_role enum with the new role values
-- ---------------------------------------------------------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'head_accounting';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'head_branding';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'head_it';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'analyst_accounting';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'analyst_branding';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'analyst_it';

-- ---------------------------------------------------------
-- 2. Helper functions: has_dept(), is_head()
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_dept(_user_id UUID, _dept TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id
          AND role::text IN ('head_' || _dept, 'analyst_' || _dept)
    )
$$;

CREATE OR REPLACE FUNCTION public.is_head(_user_id UUID, _dept TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id
          AND role::text = 'head_' || _dept
    )
$$;

-- ---------------------------------------------------------
-- 3. Update is_internal_user() to recognize the new roles
--    (existing definition probably checks for 'admin'/'finance'/
--    'operations'/'staff' — extend to include heads + analysts)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_internal_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id
          AND role::text != 'client'
    )
$$;

-- ---------------------------------------------------------
-- 4. Open SELECT to all internal staff on operational tables.
--    Existing "admin manage X" policies stay (they cover writes).
--    These new policies add SELECT for non-admin internal users.
--
--    Per Q2=B: heads see ALL clients (visibility total), but
--    write access is scoped per dept.
-- ---------------------------------------------------------

-- clients
CREATE POLICY "internal staff view clients" ON public.clients
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));

-- profiles
CREATE POLICY "internal staff view profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));

-- services (UI hides base_price for non-admin)
CREATE POLICY "internal staff view services" ON public.services
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));

-- client_services (UI hides price_override for non-admin)
CREATE POLICY "internal staff view client_services" ON public.client_services
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));

-- tasks, subtasks, task_attachments, task_comments, time_entries
CREATE POLICY "internal staff view tasks" ON public.tasks
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));
CREATE POLICY "internal staff view subtasks" ON public.subtasks
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));
CREATE POLICY "internal staff view task_attachments" ON public.task_attachments
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));
CREATE POLICY "internal staff view task_comments" ON public.task_comments
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));
CREATE POLICY "internal staff view time_entries" ON public.time_entries
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));

-- documents
CREATE POLICY "internal staff view documents" ON public.documents
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));

-- discovery_sessions
CREATE POLICY "internal staff view discovery_sessions" ON public.discovery_sessions
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));

-- email_log, email_templates
CREATE POLICY "internal staff view email_log" ON public.email_log
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));
CREATE POLICY "internal staff view email_templates" ON public.email_templates
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));

-- workspaces, workspace_columns, workspace_members
CREATE POLICY "internal staff view workspaces" ON public.workspaces
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));
CREATE POLICY "internal staff view workspace_columns" ON public.workspace_columns
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));
CREATE POLICY "internal staff view workspace_members" ON public.workspace_members
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));

-- service_recurring_tasks, service_task_templates (config tables)
CREATE POLICY "internal staff view recurring_tasks" ON public.service_recurring_tasks
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));
CREATE POLICY "internal staff view task_templates" ON public.service_task_templates
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));

-- activity_log, support_requests
CREATE POLICY "internal staff view activity_log" ON public.activity_log
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));
CREATE POLICY "internal staff view support_requests" ON public.support_requests
    FOR SELECT TO authenticated
    USING (public.is_internal_user(auth.uid()));

-- ---------------------------------------------------------
-- 5. Department-scoped write access — accounting can manage
--    worker/tax tables; branding can manage branding_projects.
-- ---------------------------------------------------------

-- Accounting: workers + tax tables
CREATE POLICY "accounting manage client_workers" ON public.client_workers
    FOR ALL TO authenticated
    USING (public.has_dept(auth.uid(), 'accounting'))
    WITH CHECK (public.has_dept(auth.uid(), 'accounting'));

CREATE POLICY "accounting manage workers_w9_data" ON public.client_workers_w9_data
    FOR ALL TO authenticated
    USING (public.has_dept(auth.uid(), 'accounting'))
    WITH CHECK (public.has_dept(auth.uid(), 'accounting'));

CREATE POLICY "accounting manage worker_w9_invites" ON public.worker_w9_invites
    FOR ALL TO authenticated
    USING (public.has_dept(auth.uid(), 'accounting'))
    WITH CHECK (public.has_dept(auth.uid(), 'accounting'));

CREATE POLICY "accounting manage classification_responses" ON public.worker_classification_responses
    FOR ALL TO authenticated
    USING (public.has_dept(auth.uid(), 'accounting'))
    WITH CHECK (public.has_dept(auth.uid(), 'accounting'));

CREATE POLICY "accounting manage tax_strategies" ON public.tax_strategies
    FOR ALL TO authenticated
    USING (public.has_dept(auth.uid(), 'accounting'))
    WITH CHECK (public.has_dept(auth.uid(), 'accounting'));

CREATE POLICY "accounting manage tax_filings" ON public.tax_filings
    FOR ALL TO authenticated
    USING (public.has_dept(auth.uid(), 'accounting'))
    WITH CHECK (public.has_dept(auth.uid(), 'accounting'));

-- Branding: branding_projects
CREATE POLICY "branding manage branding_projects" ON public.branding_projects
    FOR ALL TO authenticated
    USING (public.has_dept(auth.uid(), 'branding'))
    WITH CHECK (public.has_dept(auth.uid(), 'branding'));

-- ---------------------------------------------------------
-- 6. client_queries — any internal can SELECT/INSERT/UPDATE
--    (analysts must be able to SEND queries to clients per
--    user's clarification 2026-05-02)
-- ---------------------------------------------------------
CREATE POLICY "internal staff manage queries" ON public.client_queries
    FOR ALL TO authenticated
    USING (public.is_internal_user(auth.uid()))
    WITH CHECK (public.is_internal_user(auth.uid()));

-- ---------------------------------------------------------
-- 7. Allow internal staff to INSERT/UPDATE common operational
--    tables (so analysts can move kanban cards, upload docs,
--    log discovery sessions, etc.).
-- ---------------------------------------------------------

CREATE POLICY "internal staff manage tasks" ON public.tasks
    FOR ALL TO authenticated
    USING (public.is_internal_user(auth.uid()))
    WITH CHECK (public.is_internal_user(auth.uid()));

CREATE POLICY "internal staff manage subtasks" ON public.subtasks
    FOR ALL TO authenticated
    USING (public.is_internal_user(auth.uid()))
    WITH CHECK (public.is_internal_user(auth.uid()));

CREATE POLICY "internal staff manage task_attachments" ON public.task_attachments
    FOR ALL TO authenticated
    USING (public.is_internal_user(auth.uid()))
    WITH CHECK (public.is_internal_user(auth.uid()));

CREATE POLICY "internal staff manage task_comments" ON public.task_comments
    FOR ALL TO authenticated
    USING (public.is_internal_user(auth.uid()))
    WITH CHECK (public.is_internal_user(auth.uid()));

CREATE POLICY "internal staff manage time_entries" ON public.time_entries
    FOR ALL TO authenticated
    USING (public.is_internal_user(auth.uid()))
    WITH CHECK (public.is_internal_user(auth.uid()));

CREATE POLICY "internal staff manage documents" ON public.documents
    FOR ALL TO authenticated
    USING (public.is_internal_user(auth.uid()))
    WITH CHECK (public.is_internal_user(auth.uid()));

CREATE POLICY "internal staff manage discovery_sessions" ON public.discovery_sessions
    FOR ALL TO authenticated
    USING (public.is_internal_user(auth.uid()))
    WITH CHECK (public.is_internal_user(auth.uid()));

-- ---------------------------------------------------------
-- 8. Notes on tables intentionally NOT broadened:
--   - invoices, invoice_items, payments → admin-only (Abner finance)
--   - legal_cases, advisory_cases, advisory_checkins → admin only (Abner SOPs)
--   - client_insurance → admin only (Abner SOP-06)
--   - intake_submissions → admin only (Abner SOP-00)
--   - user_roles → admin manage / users see own
--
-- These tables retain their existing admin-only policies; no
-- new SELECT/manage policy is added for non-admin staff.
-- ---------------------------------------------------------
