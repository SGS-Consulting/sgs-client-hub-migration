-- =========================================================
-- get_workers_w9_status — surface W-9 status to the client portal
--
-- The client portal needs to render a per-worker badge ("No solicitado" /
-- "Solicitado" / "Recibido" / "Verificado") on the Workers page.
--
-- The underlying tables are admin-only by RLS:
--   - worker_w9_invites (admin manage policy; clients have NO SELECT)
--   - client_workers_w9_data (admin manage policy; clients have NO SELECT)
--
-- This SECURITY DEFINER function returns ONLY the derived status per
-- worker for the calling client's own workers. No tokens, no W-9 fields,
-- no PII — just the boolean-ish status string per worker_id.
--
-- Returns rows for ALL workers belonging to the caller's client_id,
-- including those with no invite yet (status='none').
--
-- Status precedence:
--   verified  > submitted > sent/viewed > expired > none
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_workers_w9_status()
RETURNS TABLE (worker_id UUID, w9_status TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH my_client AS (
        SELECT id FROM public.clients WHERE user_id = auth.uid() LIMIT 1
    ),
    my_workers AS (
        SELECT w.id AS worker_id
        FROM public.client_workers w
        WHERE w.client_id = (SELECT id FROM my_client)
    ),
    -- W-9 data presence + verification (highest precedence)
    w9_data_status AS (
        SELECT
            d.worker_id,
            CASE WHEN d.verified_at IS NOT NULL THEN 'verified' ELSE 'submitted' END AS s
        FROM public.client_workers_w9_data d
        WHERE d.worker_id IN (SELECT worker_id FROM my_workers)
    ),
    -- Latest live invite (sent / viewed) for workers without W-9 data yet
    latest_live_invite AS (
        SELECT DISTINCT ON (i.worker_id)
            i.worker_id,
            i.status
        FROM public.worker_w9_invites i
        WHERE i.worker_id IN (SELECT worker_id FROM my_workers)
          AND i.status IN ('sent', 'viewed')
          AND i.expires_at > now()
        ORDER BY i.worker_id, i.sent_at DESC NULLS LAST, i.created_at DESC
    )
    SELECT
        mw.worker_id,
        COALESCE(
            (SELECT s FROM w9_data_status WHERE worker_id = mw.worker_id),
            (SELECT 'sent' FROM latest_live_invite WHERE worker_id = mw.worker_id),
            'none'
        ) AS w9_status
    FROM my_workers mw;
$$;

GRANT EXECUTE ON FUNCTION public.get_workers_w9_status() TO authenticated;
