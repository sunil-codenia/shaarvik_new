-- Add missing fields to clients table for lead conversion flow
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'lead_conversion',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
