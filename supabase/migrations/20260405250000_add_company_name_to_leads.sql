-- ============================================================
-- Add company_name to leads table and ensure all contact fields exist
-- ============================================================

-- Add company_name column if not exists
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS company_name TEXT DEFAULT NULL;

-- Ensure name, phone, email columns exist (they should already, but be safe)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL;

-- Index for company_name lookups
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON public.leads(company_name);
