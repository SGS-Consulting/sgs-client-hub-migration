-- Enums
CREATE TYPE public.workspace_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'archived');
CREATE TYPE public.workspace_visibility AS ENUM ('public', 'private');
CREATE TYPE public.workspace_member_role AS ENUM ('owner', 'editor', 'viewer');

-- Workspaces
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'folder',
  color TEXT NOT NULL DEFAULT '#6366f1',
  status workspace_status NOT NULL DEFAULT 'planning',
  visibility workspace_visibility NOT NULL DEFAULT 'private',
  due_date DATE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspace members
CREATE TABLE public.workspace_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role workspace_member_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- Workspace columns (Kanban configurable)
CREATE TABLE public.workspace_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#94a3b8',
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_done_column BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add workspace fields to tasks
ALTER TABLE public.tasks
  ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ADD COLUMN column_id UUID REFERENCES public.workspace_columns(id) ON DELETE SET NULL,
  ADD COLUMN start_date DATE,
  ADD COLUMN progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

CREATE INDEX idx_tasks_workspace ON public.tasks(workspace_id);
CREATE INDEX idx_tasks_column ON public.tasks(column_id);
CREATE INDEX idx_workspace_columns_ws ON public.workspace_columns(workspace_id, sort_order);
CREATE INDEX idx_workspace_members_ws ON public.workspace_members(workspace_id);

-- RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage workspaces" ON public.workspaces
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins manage workspace_members" ON public.workspace_members
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins manage workspace_columns" ON public.workspace_columns
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger for workspaces
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_workspaces_updated
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-seed default columns and owner membership when workspace is created
CREATE OR REPLACE FUNCTION public.seed_workspace_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.workspace_columns (workspace_id, name, color, icon, sort_order, is_done_column) VALUES
    (NEW.id, 'New', '#3b82f6', 'inbox', 0, false),
    (NEW.id, 'In Progress', '#a855f7', 'loader', 1, false),
    (NEW.id, 'In Review', '#ec4899', 'eye', 2, false),
    (NEW.id, 'Approved', '#22c55e', 'check-circle', 3, false),
    (NEW.id, 'Published', '#f59e0b', 'rocket', 4, true);

  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_workspace_seed_defaults
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.seed_workspace_defaults();