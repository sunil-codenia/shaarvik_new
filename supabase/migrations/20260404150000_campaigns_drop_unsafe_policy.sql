-- Migration: Drop unsafe authenticated_manage_campaigns policy from campaigns table
-- This ensures no user can access another user's campaign data
-- Timestamp: 20260404150000

-- Drop the unsafe policy that allowed all authenticated users to access all campaigns
DROP POLICY IF EXISTS "authenticated_manage_campaigns" ON public.campaigns;

-- Also drop any other potentially unsafe catch-all policies
DROP POLICY IF EXISTS "campaigns_all_authenticated" ON public.campaigns;
DROP POLICY IF EXISTS "allow_authenticated_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_open_access" ON public.campaigns;

-- Ensure RLS is still enabled (idempotent)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Re-affirm the correct scoped policies exist (idempotent via DROP IF EXISTS + CREATE)

-- SELECT: users see only their own campaigns
DROP POLICY IF EXISTS "campaigns_select_own" ON public.campaigns;
CREATE POLICY "campaigns_select_own"
ON public.campaigns
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: users can only insert campaigns with their own user_id
DROP POLICY IF EXISTS "campaigns_insert_own" ON public.campaigns;
CREATE POLICY "campaigns_insert_own"
ON public.campaigns
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: users can only update their own campaigns
DROP POLICY IF EXISTS "campaigns_update_own" ON public.campaigns;
CREATE POLICY "campaigns_update_own"
ON public.campaigns
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: users can only delete their own campaigns
DROP POLICY IF EXISTS "campaigns_delete_own" ON public.campaigns;
CREATE POLICY "campaigns_delete_own"
ON public.campaigns
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
