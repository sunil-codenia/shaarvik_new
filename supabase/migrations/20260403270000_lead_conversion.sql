-- ============================================================
-- Lead Conversion: Add conversion tracking fields to leads
-- ============================================================

-- Add conversion fields to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_converted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS converted_to_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Index for quick lookup of converted leads
CREATE INDEX IF NOT EXISTS idx_leads_is_converted ON public.leads(is_converted);
CREATE INDEX IF NOT EXISTS idx_leads_converted_to_client_id ON public.leads(converted_to_client_id);

-- Also add lead_id reference to clients table so we can trace which lead created a client
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS source_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_source_lead_id ON public.clients(source_lead_id);
