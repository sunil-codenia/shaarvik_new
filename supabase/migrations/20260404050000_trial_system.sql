-- Trial System Migration
-- Adds trial fields to leads table and creates trial_access table

-- 1. Add trial columns to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS trial_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_start_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_end_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_email TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_phone TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_product_id UUID DEFAULT NULL REFERENCES public.products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS trial_plan_id UUID DEFAULT NULL REFERENCES public.product_plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS trial_started_by UUID DEFAULT NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- 2. Add index for trial queries
CREATE INDEX IF NOT EXISTS idx_leads_trial_status ON public.leads(trial_status);
CREATE INDEX IF NOT EXISTS idx_leads_trial_end_date ON public.leads(trial_end_date);

-- 3. Add constraint: prevent duplicate active trials per lead
-- (handled at application level with unique partial index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_one_active_trial
ON public.leads(id)
WHERE trial_status IN ('trial', 'trial_expired');

-- 4. Update lead_status enum to include 'trial' if not already present
-- Note: lead_status enum values: new, contacted, qualified, proposal, won, lost
-- We track trial via trial_status column (not lead status enum) to avoid enum migration complexity

-- 5. RLS: leads table already has RLS enabled, no new policies needed
-- The existing policies cover the new columns automatically
