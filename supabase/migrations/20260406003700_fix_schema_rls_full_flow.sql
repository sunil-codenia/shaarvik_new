-- Fix missing columns on company_subscriptions and invoices
-- Fix RLS policies on all four billing tables

-- ─── 1. Add missing columns to company_subscriptions ─────────────────────────
ALTER TABLE public.company_subscriptions
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- ─── 2. Add missing columns to invoices ──────────────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS invoice_date date,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'paid';

-- ─── 3. Enable RLS on all four tables ────────────────────────────────────────
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- ─── 4. RLS policies — drop existing then recreate (idempotent) ──────────────

DROP POLICY IF EXISTS "allow all companies" ON public.companies;
CREATE POLICY "allow all companies"
  ON public.companies FOR ALL
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow all subscriptions" ON public.company_subscriptions;
CREATE POLICY "allow all subscriptions"
  ON public.company_subscriptions FOR ALL
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow all invoices" ON public.invoices;
CREATE POLICY "allow all invoices"
  ON public.invoices FOR ALL
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow all payments" ON public.invoice_payments;
CREATE POLICY "allow all payments"
  ON public.invoice_payments FOR ALL
  USING (true) WITH CHECK (true);
