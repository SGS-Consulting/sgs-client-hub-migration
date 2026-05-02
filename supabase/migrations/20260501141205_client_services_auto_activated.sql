-- =========================================================
-- client_services.auto_activated
--
-- Distinguishes SOP-04 client_services rows that were created by
-- the SOP-03 → SOP-04 cascade (bundled, free) from those created
-- manually by an admin (standalone, with a price_override).
--
-- The cascade-deactivation logic only fires when:
--   - the deactivating service is a SOP-03 recurring tier, AND
--   - no other recurring SOP-03 tier remains active for the client, AND
--   - the SOP-04 row to be deactivated has auto_activated=TRUE.
--
-- Standalone SOP-04 (auto_activated=FALSE) keeps its own lifecycle.
-- =========================================================

ALTER TABLE public.client_services
    ADD COLUMN IF NOT EXISTS auto_activated BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.client_services.auto_activated IS
    'TRUE for rows created by an automatic cascade (e.g., SOP-04 spawned when SOP-03 recurring tier was activated). FALSE for rows created by direct admin action. The deactivation cascade only auto-deactivates rows where this is TRUE.';

CREATE INDEX IF NOT EXISTS idx_client_services_auto_activated
    ON public.client_services(client_id, service_id)
    WHERE auto_activated = TRUE;
