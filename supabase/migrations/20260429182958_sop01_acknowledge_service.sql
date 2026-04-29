-- =========================================================
-- SOP-01: client-side "Acknowledge & close" RPC
--
-- The client_services table's UPDATE policy is admin-only — we don't
-- want clients to be able to mutate service rows freely. But §6.1 of
-- sop01_design.md (locked with Abner 2026-04-29) requires a client
-- to confirm receipt by clicking "Acknowledge & close" in the portal.
--
-- This SECURITY DEFINER function lets a client acknowledge a single
-- service they own, sets acknowledged_at + is_active=false, and is
-- safely scoped — they cannot mutate any other field via this path.
-- =========================================================

CREATE OR REPLACE FUNCTION public.acknowledge_client_service(p_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_acknowledged_at TIMESTAMPTZ;
    v_owns BOOLEAN;
BEGIN
    -- Verify the caller is the client who owns this service.
    SELECT EXISTS (
        SELECT 1 FROM public.client_services cs
        JOIN public.clients c ON c.id = cs.client_id
        WHERE cs.id = p_id
          AND c.user_id = auth.uid()
    ) INTO v_owns;

    IF NOT v_owns THEN
        RAISE EXCEPTION 'Not authorized to acknowledge this service'
            USING ERRCODE = '42501';
    END IF;

    -- Idempotent: if already acknowledged, return the existing timestamp.
    SELECT acknowledged_at INTO v_acknowledged_at
    FROM public.client_services
    WHERE id = p_id;

    IF v_acknowledged_at IS NOT NULL THEN
        RETURN v_acknowledged_at;
    END IF;

    UPDATE public.client_services
    SET acknowledged_at = now(),
        is_active = FALSE
    WHERE id = p_id
    RETURNING acknowledged_at INTO v_acknowledged_at;

    RETURN v_acknowledged_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acknowledge_client_service(UUID) TO authenticated;
