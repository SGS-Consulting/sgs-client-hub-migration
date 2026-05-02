-- =========================================================
-- Auto-update tasks.progress from kanban column position
--
-- Decision (2026-05-02):
--   - Progress is driven by the column the task is in:
--       progress = is_done_column ? 100 : (sort_order * 100) / max_sort_order
--   - Standard 5-column setup yields: 0 / 25 / 50 / 75 / 100
--   - Generalised to any column count (e.g., a 3-col workspace
--     would produce 0 / 50 / 100).
--   - Manual edits to progress are not preserved — the column
--     is the source of truth (matches the user model: dragging
--     a card "advances" it).
-- =========================================================

CREATE OR REPLACE FUNCTION public.tasks_sync_progress_from_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_sort_order INT;
    v_max_sort INT;
    v_is_done BOOLEAN;
BEGIN
    IF NEW.column_id IS NULL THEN
        IF NEW.progress IS NULL THEN NEW.progress := 0; END IF;
        RETURN NEW;
    END IF;

    SELECT sort_order, is_done_column
      INTO v_sort_order, v_is_done
    FROM public.workspace_columns
    WHERE id = NEW.column_id;

    SELECT MAX(sort_order) INTO v_max_sort
    FROM public.workspace_columns
    WHERE workspace_id = NEW.workspace_id;

    IF v_is_done OR v_sort_order = v_max_sort THEN
        NEW.progress := 100;
    ELSIF v_max_sort IS NULL OR v_max_sort = 0 THEN
        NEW.progress := 0;
    ELSE
        NEW.progress := ROUND((v_sort_order * 100.0) / v_max_sort)::INT;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_sync_progress ON public.tasks;
CREATE TRIGGER trg_tasks_sync_progress
    BEFORE INSERT OR UPDATE OF column_id, workspace_id ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.tasks_sync_progress_from_column();

-- ---------------------------------------------------------
-- Backfill: recompute progress for every existing task that
-- has a column. The trigger fires on UPDATE so we just touch
-- the column_id with itself.
-- ---------------------------------------------------------
UPDATE public.tasks
SET column_id = column_id
WHERE column_id IS NOT NULL;
