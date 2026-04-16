-- ============================================================
-- Add relationship_manager_id to clients
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS relationship_manager_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_rm_id ON public.clients(relationship_manager_id);

-- Backfill: set relationship_manager_id = created_by for existing clients
UPDATE public.clients
SET relationship_manager_id = created_by
WHERE relationship_manager_id IS NULL AND created_by IS NOT NULL;
