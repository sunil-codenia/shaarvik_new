-- Migration: Add company_id to activities, invoices, and support_tickets
-- Ensures all modules are fully company-scoped for multi-tenant SaaS

-- ─── 1. activities: add company_id ───────────────────────────────────────────
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Backfill from related client's company_id
UPDATE public.activities a
SET company_id = c.company_id
FROM public.clients c
WHERE a.client_id = c.id
  AND a.company_id IS NULL
  AND c.company_id IS NOT NULL;

-- Backfill from related lead's company_id (for activities linked to leads)
UPDATE public.activities a
SET company_id = l.company_id
FROM public.leads l
WHERE a.lead_id = l.id
  AND a.company_id IS NULL
  AND l.company_id IS NOT NULL;

-- ─── 2. invoices: add company_id ─────────────────────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Backfill from related client's company_id
UPDATE public.invoices i
SET company_id = c.company_id
FROM public.clients c
WHERE i.client_id = c.id
  AND i.company_id IS NULL
  AND c.company_id IS NOT NULL;

-- ─── 3. support_tickets: add company_id ──────────────────────────────────────
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Backfill from related client's company_id
UPDATE public.support_tickets st
SET company_id = c.company_id
FROM public.clients c
WHERE st.client_id = c.id
  AND st.company_id IS NULL
  AND c.company_id IS NOT NULL;

-- ─── 4. RLS policies for activities ──────────────────────────────────────────
-- Drop old permissive policies if they exist
DROP POLICY IF EXISTS "company_select_activities" ON public.activities;
DROP POLICY IF EXISTS "company_insert_activities" ON public.activities;
DROP POLICY IF EXISTS "company_update_activities" ON public.activities;
DROP POLICY IF EXISTS "company_delete_activities" ON public.activities;
DROP POLICY IF EXISTS "authenticated_manage_activities" ON public.activities;

CREATE POLICY "company_select_activities" ON public.activities
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "company_insert_activities" ON public.activities
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "company_update_activities" ON public.activities
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "company_delete_activities" ON public.activities
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- ─── 5. RLS policies for invoices ────────────────────────────────────────────
DROP POLICY IF EXISTS "company_select_invoices" ON public.invoices;
DROP POLICY IF EXISTS "company_insert_invoices" ON public.invoices;
DROP POLICY IF EXISTS "company_update_invoices" ON public.invoices;
DROP POLICY IF EXISTS "company_delete_invoices" ON public.invoices;
DROP POLICY IF EXISTS "authenticated_manage_invoices" ON public.invoices;

CREATE POLICY "company_select_invoices" ON public.invoices
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "company_insert_invoices" ON public.invoices
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "company_update_invoices" ON public.invoices
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "company_delete_invoices" ON public.invoices
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- ─── 6. RLS policies for support_tickets ─────────────────────────────────────
DROP POLICY IF EXISTS "company_select_support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "company_insert_support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "company_update_support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "company_delete_support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "authenticated_manage_support_tickets" ON public.support_tickets;

CREATE POLICY "company_select_support_tickets" ON public.support_tickets
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "company_insert_support_tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "company_update_support_tickets" ON public.support_tickets
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "company_delete_support_tickets" ON public.support_tickets
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );
