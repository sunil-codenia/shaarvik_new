-- Onboarding / Signup Flow Migration
-- Adds signup_leads table for pre-auth onboarding and trial/subscription tracking

-- 1. signup_leads: stores form submissions before auth account creation
CREATE TABLE IF NOT EXISTS public.signup_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT, -- not stored; placeholder for flow tracking
  selected_plan TEXT, -- basic | pro | enterprise
  selected_plan_price NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | trial | paid | converted
  is_trial BOOLEAN NOT NULL DEFAULT FALSE,
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  payment_status TEXT DEFAULT NULL, -- null | pending | success | failed
  payment_reference TEXT,
  payment_method TEXT, -- upi | card | netbanking
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Unique email constraint to prevent duplicate accounts
CREATE UNIQUE INDEX IF NOT EXISTS idx_signup_leads_email ON public.signup_leads(email);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_signup_leads_status ON public.signup_leads(status);
CREATE INDEX IF NOT EXISTS idx_signup_leads_auth_user ON public.signup_leads(auth_user_id);

-- 4. RLS
ALTER TABLE public.signup_leads ENABLE ROW LEVEL SECURITY;

-- Allow public insert (signup form)
CREATE POLICY "Allow public signup insert"
  ON public.signup_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow read by authenticated users (admin)
CREATE POLICY "Allow authenticated read"
  ON public.signup_leads FOR SELECT
  TO authenticated
  USING (true);

-- Allow update by authenticated users
CREATE POLICY "Allow authenticated update"
  ON public.signup_leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_signup_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_signup_leads_updated_at ON public.signup_leads;
CREATE TRIGGER trg_signup_leads_updated_at
  BEFORE UPDATE ON public.signup_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_signup_leads_updated_at();
