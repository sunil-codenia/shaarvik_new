-- Migration: Add user_id FK on clients → user_profiles.id
-- Fixes: "Could not find a relationship between clients and user_profiles"

-- Step 1: Add user_id column to clients (nullable first for backfill)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Step 2: Backfill user_id from created_by where created_by exists in user_profiles
UPDATE public.clients c
SET user_id = c.created_by
WHERE c.user_id IS NULL
  AND c.created_by IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.id = c.created_by
  );

-- Step 3: For any remaining null user_id, assign to first available user_profile
DO $$
DECLARE
  fallback_user_id UUID;
BEGIN
  SELECT id INTO fallback_user_id FROM public.user_profiles LIMIT 1;
  IF fallback_user_id IS NOT NULL THEN
    UPDATE public.clients
    SET user_id = fallback_user_id
    WHERE user_id IS NULL;
  END IF;
END $$;

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);

-- Step 5: Drop and recreate RLS policies to include user_id awareness
DROP POLICY IF EXISTS "clients_user_id_policy" ON public.clients;
