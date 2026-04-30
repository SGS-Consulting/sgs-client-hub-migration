-- =========================================================
-- 20260430164930_calendly_event_id_unique
--
-- Adds a partial unique index on discovery_sessions.calendly_event_id
-- so the Calendly webhook (supabase/functions/calendly-webhook) can be
-- idempotent: if Calendly retries the same invitee.created event, the
-- second insert is rejected with a unique-violation that the function
-- catches and reports as "already recorded".
--
-- Partial (WHERE calendly_event_id IS NOT NULL) keeps existing rows —
-- manually-logged sessions where the column is NULL — safe and lets
-- multiple manually-logged entries co-exist without conflict.
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_discovery_sessions_calendly_event_id
    ON public.discovery_sessions(calendly_event_id)
    WHERE calendly_event_id IS NOT NULL;
