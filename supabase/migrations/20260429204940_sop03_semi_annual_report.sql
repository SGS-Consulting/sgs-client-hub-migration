-- =========================================================
-- SOP-03: separate document_category for semi-annual reports
--
-- Smoke test surfaced that semi-annual clients (per Germain's
-- per-client tax_firm_cadence) need their own report category
-- distinct from `quarterly_report`. Otherwise the upload-dialog
-- dropdown forces Germain to file a half-year report under
-- "Quarterly Report" which is misleading.
-- =========================================================

ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'semi_annual_report';
