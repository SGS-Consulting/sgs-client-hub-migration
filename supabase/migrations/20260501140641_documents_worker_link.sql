-- =========================================================
-- documents.worker_id + documents.tax_year
--
-- Links documents (specifically 1099_form documents) to a specific
-- worker on the client's roster + records which tax year the 1099
-- covers. Both columns are nullable because they only apply to a
-- subset of categories — most documents (corporate kit, quarterly
-- reports, contracts) have no worker association.
--
-- Per sop04_design.md §3.1 (1099 generation v1: manual upload by
-- Germain at year-end; client downloads from portal).
-- =========================================================

ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES public.client_workers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS tax_year INT;

CREATE INDEX IF NOT EXISTS idx_documents_worker ON public.documents(worker_id)
    WHERE worker_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_worker_tax_year
    ON public.documents(worker_id, tax_year DESC)
    WHERE worker_id IS NOT NULL AND tax_year IS NOT NULL;

COMMENT ON COLUMN public.documents.worker_id IS
    'For documents tied to a specific worker (e.g., 1099_form). NULL for client-level documents.';
COMMENT ON COLUMN public.documents.tax_year IS
    'Tax year this document covers (e.g., 2025 for a 1099 issued in early 2026). NULL for non-tax-year documents.';
