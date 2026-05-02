-- =========================================================
-- Task scoping: tasks belong to a department via the service
-- they were spawned from, then to an assignee once a head
-- distributes them.
--
-- Decisions (2026-05-02):
--   Q1=A: head sees ALL their dept's tasks (assigned, unassigned,
--         and assigned to others in their dept). Analyst sees
--         only tasks with assignee_id = themselves.
--   Q2=A: tasks without service_id are admin-only (no dept fallback).
--
-- Implementation:
--   - services.department TEXT (accounting | branding | it | admin)
--   - tasks SELECT/manage RLS replaced with a scoped policy:
--       admin → everything
--       head_X / analyst_X → tasks where the task's service is
--           in their dept OR the task is assigned to them
-- =========================================================

-- ---------------------------------------------------------
-- 1. services.department column + backfill
-- ---------------------------------------------------------
ALTER TABLE public.services
    ADD COLUMN IF NOT EXISTS department TEXT
    CHECK (department IN ('accounting', 'branding', 'it', 'admin') OR department IS NULL);

-- Backfill from category — Accounting + Tax → accounting; Branding → branding;
-- everything else → admin (Abner-led SOPs: Formation, Delaware, Legal, Insurance,
-- Advisory, Onboarding, Compliance, Internal).
UPDATE public.services SET department = 'accounting'
    WHERE department IS NULL AND category IN ('Accounting', 'Tax');

UPDATE public.services SET department = 'branding'
    WHERE department IS NULL AND (category = 'Branding' OR name ILIKE '%brand%');

UPDATE public.services SET department = 'admin'
    WHERE department IS NULL;

-- ---------------------------------------------------------
-- 2. Replace the broad tasks RLS with a dept-scoped policy.
--    The previous "internal staff view/manage tasks" policies
--    let any internal user see/edit every task. We narrow that
--    to: admin all, dept members for their dept's services,
--    or own assigned tasks.
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "internal staff view tasks" ON public.tasks;
DROP POLICY IF EXISTS "internal staff manage tasks" ON public.tasks;

CREATE POLICY "scoped view tasks" ON public.tasks
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin')
        OR (
            tasks.service_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.services s
                WHERE s.id = tasks.service_id
                  AND s.department IS NOT NULL
                  AND s.department != 'admin'
                  AND public.is_head(auth.uid(), s.department)
            )
        )
        OR tasks.assignee_id = auth.uid()
    );

CREATE POLICY "scoped manage tasks" ON public.tasks
    FOR ALL TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin')
        OR (
            tasks.service_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.services s
                WHERE s.id = tasks.service_id
                  AND s.department IS NOT NULL
                  AND s.department != 'admin'
                  AND public.is_head(auth.uid(), s.department)
            )
        )
        OR tasks.assignee_id = auth.uid()
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'admin')
        OR (
            tasks.service_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.services s
                WHERE s.id = tasks.service_id
                  AND s.department IS NOT NULL
                  AND s.department != 'admin'
                  AND public.is_head(auth.uid(), s.department)
            )
        )
        OR tasks.assignee_id = auth.uid()
    );

-- ---------------------------------------------------------
-- 3. Same scoping for subtasks and task_attachments — they
--    follow the parent task's visibility.
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "internal staff view subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "internal staff manage subtasks" ON public.subtasks;

CREATE POLICY "subtasks follow parent task" ON public.subtasks
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = subtasks.task_id)
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = subtasks.task_id)
    );

DROP POLICY IF EXISTS "internal staff view task_attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "internal staff manage task_attachments" ON public.task_attachments;

CREATE POLICY "task_attachments follow parent task" ON public.task_attachments
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_attachments.task_id)
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_attachments.task_id)
    );

DROP POLICY IF EXISTS "internal staff view task_comments" ON public.task_comments;
DROP POLICY IF EXISTS "internal staff manage task_comments" ON public.task_comments;

CREATE POLICY "task_comments follow parent task" ON public.task_comments
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_comments.task_id)
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_comments.task_id)
    );
