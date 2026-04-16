-- Fix RLS policies for invoices table
-- Add INSERT and SELECT policies for authenticated users

-- Drop existing policies if they exist to ensure idempotency
DROP POLICY IF EXISTS "Allow insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow delete invoices" ON public.invoices;

-- Ensure RLS is enabled
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert invoices
CREATE POLICY "Allow insert invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to read invoices
CREATE POLICY "Allow read invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update invoices
CREATE POLICY "Allow update invoices"
ON public.invoices
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete invoices
CREATE POLICY "Allow delete invoices"
ON public.invoices
FOR DELETE
TO authenticated
USING (true);
