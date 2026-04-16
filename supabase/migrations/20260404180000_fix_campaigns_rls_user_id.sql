-- ============================================================
-- FIX: Restore user_id-based RLS policies for campaigns table
-- Migration 160000 replaced user_id policies with company_id policies,
-- but campaigns table uses user_id (not company_id) for data isolation.
-- This migration restores the correct user_id-scoped policies.
-- ============================================================

-- Drop company_id-based campaign policies added by migration 160000
DROP POLICY IF EXISTS "company_select_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "company_insert_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "company_update_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "company_delete_campaigns" ON public.campaigns;

-- Drop any other conflicting policies
DROP POLICY IF EXISTS "campaigns_select_own" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_insert_own" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_update_own" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_delete_own" ON public.campaigns;
DROP POLICY IF EXISTS "authenticated_manage_campaigns" ON public.campaigns;

-- Ensure RLS is enabled
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Restore correct user_id-scoped policies
CREATE POLICY "campaigns_select_own"
ON public.campaigns FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "campaigns_insert_own"
ON public.campaigns FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "campaigns_update_own"
ON public.campaigns FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "campaigns_delete_own"
ON public.campaigns FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Ensure index exists for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
