
-- Helper: cualquier rol "staff interno" (admin, finance, operations, staff)
CREATE OR REPLACE FUNCTION public.is_internal_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','finance','operations','staff')
  )
$$;

-- ========== INVOICES (finance + admin) ==========
CREATE POLICY "finance manage invoices" ON public.invoices
  FOR ALL TO public
  USING (has_role(auth.uid(), 'finance'))
  WITH CHECK (has_role(auth.uid(), 'finance'));

CREATE POLICY "finance manage invoice_items" ON public.invoice_items
  FOR ALL TO public
  USING (has_role(auth.uid(), 'finance'))
  WITH CHECK (has_role(auth.uid(), 'finance'));

CREATE POLICY "finance manage payments" ON public.payments
  FOR ALL TO public
  USING (has_role(auth.uid(), 'finance'))
  WITH CHECK (has_role(auth.uid(), 'finance'));

-- ========== OPERATIONS (todo lo no-financiero) ==========
CREATE POLICY "operations manage clients" ON public.clients
  FOR ALL TO public
  USING (has_role(auth.uid(), 'operations'))
  WITH CHECK (has_role(auth.uid(), 'operations'));

CREATE POLICY "operations manage client_services" ON public.client_services
  FOR ALL TO public
  USING (has_role(auth.uid(), 'operations'))
  WITH CHECK (has_role(auth.uid(), 'operations'));

CREATE POLICY "operations manage tasks" ON public.tasks
  FOR ALL TO public
  USING (has_role(auth.uid(), 'operations'))
  WITH CHECK (has_role(auth.uid(), 'operations'));

CREATE POLICY "operations manage subtasks" ON public.subtasks
  FOR ALL TO public
  USING (has_role(auth.uid(), 'operations'))
  WITH CHECK (has_role(auth.uid(), 'operations'));

CREATE POLICY "operations manage task_comments" ON public.task_comments
  FOR ALL TO public
  USING (has_role(auth.uid(), 'operations'))
  WITH CHECK (has_role(auth.uid(), 'operations'));

CREATE POLICY "operations manage task_attachments" ON public.task_attachments
  FOR ALL TO public
  USING (has_role(auth.uid(), 'operations'))
  WITH CHECK (has_role(auth.uid(), 'operations'));

CREATE POLICY "operations manage workspaces" ON public.workspaces
  FOR ALL TO public
  USING (has_role(auth.uid(), 'operations'))
  WITH CHECK (has_role(auth.uid(), 'operations'));

CREATE POLICY "operations manage workspace_columns" ON public.workspace_columns
  FOR ALL TO public
  USING (has_role(auth.uid(), 'operations'))
  WITH CHECK (has_role(auth.uid(), 'operations'));

CREATE POLICY "operations manage workspace_members" ON public.workspace_members
  FOR ALL TO public
  USING (has_role(auth.uid(), 'operations'))
  WITH CHECK (has_role(auth.uid(), 'operations'));

CREATE POLICY "operations manage documents" ON public.documents
  FOR ALL TO public
  USING (has_role(auth.uid(), 'operations'))
  WITH CHECK (has_role(auth.uid(), 'operations'));

CREATE POLICY "operations manage services" ON public.services
  FOR ALL TO public
  USING (has_role(auth.uid(), 'operations'))
  WITH CHECK (has_role(auth.uid(), 'operations'));

CREATE POLICY "operations manage support_requests" ON public.support_requests
  FOR ALL TO public
  USING (has_role(auth.uid(), 'operations'))
  WITH CHECK (has_role(auth.uid(), 'operations'));

CREATE POLICY "operations manage time_entries" ON public.time_entries
  FOR ALL TO public
  USING (has_role(auth.uid(), 'operations'))
  WITH CHECK (has_role(auth.uid(), 'operations'));

-- ========== STAFF (sólo sus tareas y contexto mínimo) ==========
CREATE POLICY "staff view assigned tasks" ON public.tasks
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'staff') AND (assignee_id = auth.uid() OR created_by = auth.uid()));

CREATE POLICY "staff update assigned tasks" ON public.tasks
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'staff') AND (assignee_id = auth.uid() OR created_by = auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'staff') AND (assignee_id = auth.uid() OR created_by = auth.uid()));

CREATE POLICY "staff view subtasks of own tasks" ON public.subtasks
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'staff') AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = subtasks.task_id AND (t.assignee_id = auth.uid() OR t.created_by = auth.uid())
  ));

CREATE POLICY "staff manage subtasks of own tasks" ON public.subtasks
  FOR ALL TO public
  USING (has_role(auth.uid(), 'staff') AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = subtasks.task_id AND (t.assignee_id = auth.uid() OR t.created_by = auth.uid())
  ))
  WITH CHECK (has_role(auth.uid(), 'staff') AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = subtasks.task_id AND (t.assignee_id = auth.uid() OR t.created_by = auth.uid())
  ));

CREATE POLICY "staff view comments of own tasks" ON public.task_comments
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'staff') AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id AND (t.assignee_id = auth.uid() OR t.created_by = auth.uid())
  ));

CREATE POLICY "staff add comments to own tasks" ON public.task_comments
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), 'staff') AND author_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id AND (t.assignee_id = auth.uid() OR t.created_by = auth.uid())
  ));

CREATE POLICY "staff view attachments of own tasks" ON public.task_attachments
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'staff') AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_attachments.task_id AND (t.assignee_id = auth.uid() OR t.created_by = auth.uid())
  ));

CREATE POLICY "staff view workspaces of own tasks" ON public.workspaces
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'staff') AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.workspace_id = workspaces.id AND (t.assignee_id = auth.uid() OR t.created_by = auth.uid())
  ));

CREATE POLICY "staff view columns of own workspaces" ON public.workspace_columns
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'staff') AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.workspace_id = workspace_columns.workspace_id
      AND (t.assignee_id = auth.uid() OR t.created_by = auth.uid())
  ));

CREATE POLICY "staff view clients of own tasks" ON public.clients
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'staff') AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.client_id = clients.id AND (t.assignee_id = auth.uid() OR t.created_by = auth.uid())
  ));

-- Todos los roles internos pueden ver perfiles (para mostrar nombres de asignados, autores, etc.)
CREATE POLICY "internal users view profiles" ON public.profiles
  FOR SELECT TO public
  USING (public.is_internal_user(auth.uid()));

-- Todos los roles internos pueden ver miembros de workspace (para selector de asignación)
CREATE POLICY "internal users view workspace_members" ON public.workspace_members
  FOR SELECT TO public
  USING (public.is_internal_user(auth.uid()));
