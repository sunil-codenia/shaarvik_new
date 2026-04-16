-- ============================================================
-- Enforce leads.name NOT NULL + clean bad data + trigger guard
-- ============================================================

-- Step 1: Clean existing bad data — replace NULL or empty names with 'Unknown Lead'
UPDATE public.leads
SET name = 'Unknown Lead'
WHERE name IS NULL OR TRIM(name) = '';

-- Also sync title if it mirrors name and is bad
UPDATE public.leads
SET title = 'Unknown Lead'
WHERE title IS NULL OR TRIM(title) = '';

-- Step 2: Enforce NOT NULL constraint on leads.name
-- Use DO block to add constraint only if not already NOT NULL
DO $$
BEGIN
  -- Check if the column is currently nullable
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'name'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.leads ALTER COLUMN name SET NOT NULL;
    RAISE NOTICE 'leads.name set to NOT NULL';
  ELSE
    RAISE NOTICE 'leads.name is already NOT NULL — skipping';
  END IF;
END $$;

-- Also set a DEFAULT so any insert that omits name entirely gets 'Unknown Lead'
ALTER TABLE public.leads ALTER COLUMN name SET DEFAULT 'Unknown Lead';

-- Step 3: Create a BEFORE INSERT/UPDATE trigger to trim and guard empty names
CREATE OR REPLACE FUNCTION public.leads_enforce_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Trim whitespace
  IF NEW.name IS NOT NULL THEN
    NEW.name := TRIM(NEW.name);
  END IF;

  -- Default to 'Unknown Lead' if still empty or null
  IF NEW.name IS NULL OR NEW.name = '' THEN
    NEW.name := 'Unknown Lead';
  END IF;

  -- Keep title in sync with name if title is also empty/null
  IF NEW.title IS NULL OR TRIM(NEW.title) = '' THEN
    NEW.title := NEW.name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_enforce_name ON public.leads;
CREATE TRIGGER trg_leads_enforce_name
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.leads_enforce_name();
