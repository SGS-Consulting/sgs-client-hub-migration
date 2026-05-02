-- =========================================================
-- Every client gets a workspace
--
-- Decisions (2026-05-02):
--   - Strict 1:1 between active clients and workspaces
--     (partial UNIQUE index on workspaces.client_id)
--   - Auto-create via DB trigger on client INSERT or status flip
--     to 'active' (so converting a prospect → active also creates)
--   - Backfill: every existing active client gets a workspace + the
--     5 default kanban columns (seeded by the existing
--     seed_workspace_defaults trigger that fires on INSERT)
--   - Tasks: BEFORE INSERT trigger auto-fills workspace_id and
--     column_id from client_id, so service-template/recurring tasks
--     no longer land orphaned. Existing tasks are backfilled.
--   - Workspace name = client.company_name (one-shot at creation;
--     does not auto-rename if company_name changes — admin can
--     edit the workspace name manually).
-- =========================================================

-- ---------------------------------------------------------
-- 1. Enforce 1:1 (allow multiple NULL client_ids — non-client
--    workspaces stay possible)
-- ---------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_client_id_unique
    ON public.workspaces(client_id)
    WHERE client_id IS NOT NULL;

-- ---------------------------------------------------------
-- 2. ensure_client_workspace() — creates the workspace row.
--    The existing seed_workspace_defaults() trigger on
--    workspaces INSERT seeds the 5 default columns automatically.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_client_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'active' AND NOT EXISTS (
        SELECT 1 FROM public.workspaces WHERE client_id = NEW.id
    ) THEN
        INSERT INTO public.workspaces (client_id, name, status, visibility, color, icon)
        VALUES (
            NEW.id,
            NEW.company_name,
            'active',
            'private',
            '#3b82f6',
            'briefcase'
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_ensure_workspace ON public.clients;
CREATE TRIGGER trg_clients_ensure_workspace
    AFTER INSERT OR UPDATE OF status ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_client_workspace();

-- ---------------------------------------------------------
-- 3. tasks_set_workspace_from_client() — every new task with a
--    client_id automatically lands in that client's workspace,
--    placed into the column matching its status (or 'New' for
--    open/blocked/etc.). Service-template and recurring tasks
--    benefit without code changes.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tasks_set_workspace_from_client()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_target_column TEXT;
BEGIN
    IF NEW.workspace_id IS NULL AND NEW.client_id IS NOT NULL THEN
        SELECT id INTO NEW.workspace_id
        FROM public.workspaces
        WHERE client_id = NEW.client_id
        LIMIT 1;
    END IF;

    IF NEW.column_id IS NULL AND NEW.workspace_id IS NOT NULL THEN
        v_target_column := CASE
            WHEN NEW.status = 'in_progress' THEN 'In Progress'
            WHEN NEW.status = 'closed' THEN 'Published'
            ELSE 'New'
        END;
        SELECT id INTO NEW.column_id
        FROM public.workspace_columns
        WHERE workspace_id = NEW.workspace_id
          AND name = v_target_column
        LIMIT 1;
        -- Fallback to whatever the first column is, if naming differs
        IF NEW.column_id IS NULL THEN
            SELECT id INTO NEW.column_id
            FROM public.workspace_columns
            WHERE workspace_id = NEW.workspace_id
            ORDER BY sort_order
            LIMIT 1;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_set_workspace ON public.tasks;
CREATE TRIGGER trg_tasks_set_workspace
    BEFORE INSERT ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.tasks_set_workspace_from_client();

-- ---------------------------------------------------------
-- 4. Backfill: every active client without a workspace gets one
--    (the seed_workspace_defaults trigger fires on each INSERT
--    and seeds the 5 default columns).
-- ---------------------------------------------------------
INSERT INTO public.workspaces (client_id, name, status, visibility, color, icon)
SELECT c.id, c.company_name, 'active', 'private', '#3b82f6', 'briefcase'
FROM public.clients c
WHERE c.status = 'active'
  AND NOT EXISTS (
      SELECT 1 FROM public.workspaces w WHERE w.client_id = c.id
  );

-- ---------------------------------------------------------
-- 5. Backfill: existing tasks with a client_id but no workspace_id
--    get linked to that client's workspace, placed in the column
--    matching their status.
-- ---------------------------------------------------------
UPDATE public.tasks t
SET workspace_id = w.id,
    column_id = COALESCE(
        t.column_id,
        (
            SELECT col.id
            FROM public.workspace_columns col
            WHERE col.workspace_id = w.id
              AND col.name = CASE
                  WHEN t.status = 'in_progress' THEN 'In Progress'
                  WHEN t.status = 'closed' THEN 'Published'
                  ELSE 'New'
              END
            LIMIT 1
        )
    )
FROM public.workspaces w
WHERE w.client_id = t.client_id
  AND t.client_id IS NOT NULL
  AND t.workspace_id IS NULL;
