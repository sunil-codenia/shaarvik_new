-- Lead Conversion: add converted_to_client_id to leads, display_name to clients, create records table

-- 1. Add converted_to_client_id to leads (tracks which client was created from this lead)
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS converted_to_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- 2. Add display_name to clients (stores company_name from lead for UI display)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 3. Create records table (contact records linked to a client)
CREATE TABLE IF NOT EXISTS public.records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name        TEXT,
  email       TEXT,
  phone       TEXT,
  created_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- 4. Index for fast lookup by client_id
CREATE INDEX IF NOT EXISTS idx_records_client_id ON public.records(client_id);
