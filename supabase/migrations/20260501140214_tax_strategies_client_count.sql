-- =========================================================
-- get_my_active_tax_strategies_count — surface tax-strategy count to client portal
--
-- The client portal renders an "N estrategias fiscales activas" badge on
-- the SOP-04 service card (per sop04_design.md §7.2 — high-level only;
-- specifics + rationale + savings remain admin-only).
--
-- The underlying tax_strategies table is admin-only RLS, so we expose
-- ONLY the count of active+implemented strategies to the calling client.
-- "Active" and "implemented" are the two statuses that count as "in place"
-- — proposed and retired do not.
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_my_active_tax_strategies_count()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::INT
    FROM public.tax_strategies ts
    JOIN public.clients c ON c.id = ts.client_id
    WHERE c.user_id = auth.uid()
      AND ts.status IN ('active', 'implemented');
$$;

GRANT EXECUTE ON FUNCTION public.get_my_active_tax_strategies_count() TO authenticated;
