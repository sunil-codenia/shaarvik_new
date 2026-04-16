-- Disable RLS on invoices (temporary for testing)
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;

-- Ensure required columns exist
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS company_id uuid,
ADD COLUMN IF NOT EXISTS amount numeric;

-- Drop any conflicting policy first, then create allow-all policy
DROP POLICY IF EXISTS "allow_all_invoices" ON public.invoices;
CREATE POLICY "allow_all_invoices"
ON public.invoices
FOR ALL
USING (true)
WITH CHECK (true);
