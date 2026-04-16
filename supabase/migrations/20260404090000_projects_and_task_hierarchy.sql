-- Migration: Add projects table and update tasks for Client → Project → Task hierarchy
-- Timestamp: 20260404090000

-- ============================================================
-- STEP 1: Create projects table (client_id FK → clients.id)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  client_id  UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  description TEXT,
  status     TEXT NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- STEP 2: Add project_id column to tasks (FK → projects.id)
-- ============================================================
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- ============================================================
-- STEP 3: Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id   ON public.tasks(project_id);

-- ============================================================
-- STEP 4: Enable RLS on projects
-- ============================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 5: RLS Policies for projects
-- ============================================================
DROP POLICY IF EXISTS "authenticated_all_projects" ON public.projects;
CREATE POLICY "authenticated_all_projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- STEP 6: Cleanup — nullify project_id on tasks that have
--         no matching project (orphan safety, non-destructive)
-- ============================================================
DO $$
BEGIN
  -- Tasks with a project_id that doesn't exist in projects → set to NULL
  UPDATE public.tasks
  SET project_id = NULL
  WHERE project_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = public.tasks.project_id
    );

  RAISE NOTICE 'Orphan task cleanup complete.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Cleanup step skipped: %', SQLERRM;
END $$;

-- ============================================================
-- STEP 7: updated_at trigger for projects
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_projects_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_projects_updated_at();
