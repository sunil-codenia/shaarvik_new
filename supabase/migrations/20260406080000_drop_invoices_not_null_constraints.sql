-- Make blocking columns optional on invoices table
-- Drops NOT NULL constraints so invoice creation works without all fields

ALTER TABLE public.invoices
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.invoices
  ALTER COLUMN invoice_number DROP NOT NULL;

ALTER TABLE public.invoices
  ALTER COLUMN paid_amount DROP NOT NULL;

ALTER TABLE public.invoices
  ALTER COLUMN final_amount DROP NOT NULL;
