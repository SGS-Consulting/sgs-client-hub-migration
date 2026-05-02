-- =========================================================
-- SOP-02 Delaware Infrastructure — schema additions
--
-- Pure enum extensions; no new tables, no new columns.
-- All net-new functionality lives in the seed file
-- (supabase/seeds/sop02_delaware_infrastructure.sql) +
-- the SOP-02 service card in ClientServices.tsx.
--
-- See Processos_internos/_specs/client_dashboard/sop02_design.md
-- for the locked design.
-- =========================================================

ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'delaware_formation_docs';
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'corporate_address_confirmation';
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'registered_agent_confirmation';
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'gl_insurance_certificate';
