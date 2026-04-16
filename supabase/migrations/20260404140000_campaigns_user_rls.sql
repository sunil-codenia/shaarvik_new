-- Migration: Add user_id to campaigns + RLS policies for multi-user SaaS isolation
-- Timestamp: 20260404140000

-- Step 1: Add user_id column to campaigns (FK → auth.users)
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 2: Backfill user_id from created_by via user_profiles for existing rows
UPDATE public.campaigns c
SET user_id = up.id
FROM public.user_profiles up
WHERE c.created_by = up.id
  AND c.user_id IS NULL;

-- Step 3: Index for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);

-- Step 4: Ensure RLS is enabled (idempotent)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop any existing campaigns policies to avoid conflicts
DROP POLICY IF EXISTS "campaigns_select_own" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_insert_own" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_update_own" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_delete_own" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_all_access" ON public.campaigns;
DROP POLICY IF EXISTS "allow_all_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "authenticated_campaigns_access" ON public.campaigns;

-- Step 6: Create RLS policies — users can only access their own campaigns

-- SELECT: users see only their own campaigns
CREATE POLICY "campaigns_select_own"
ON public.campaigns
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: users can only insert campaigns with their own user_id
CREATE POLICY "campaigns_insert_own"
ON public.campaigns
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: users can only update their own campaigns
CREATE POLICY "campaigns_update_own"
ON public.campaigns
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: users can only delete their own campaigns
CREATE POLICY "campaigns_delete_own"
ON public.campaigns
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
