-- Ensure "Website Leads" default campaign exists for website contact form submissions
-- This campaign is used when inserting leads from the public website contact form

-- Step 1: Add contact fields to leads table (needed for website form submissions)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT;

-- Step 2: Create "Website Leads" campaign for the default company
DO $$
DECLARE
  v_company_id UUID;
  v_campaign_id UUID;
BEGIN
  -- Get the first/default company
  SELECT id INTO v_company_id FROM public.companies ORDER BY created_at ASC LIMIT 1;

  -- If no company exists yet, skip (will be handled at runtime)
  IF v_company_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if "Website Leads" campaign already exists
  SELECT id INTO v_campaign_id
  FROM public.campaigns
  WHERE name = 'Website Leads' AND company_id = v_company_id
  LIMIT 1;

  -- Create it if it doesn't exist
  IF v_campaign_id IS NULL THEN
    INSERT INTO public.campaigns (name, platform, company_id, status)
    VALUES ('Website Leads', 'Website', v_company_id, 'active')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Step 3: Allow public (unauthenticated) users to insert into leads table
-- This is needed for the website contact form which runs without auth
DROP POLICY IF EXISTS "public_can_insert_website_leads_to_leads" ON public.leads;
CREATE POLICY "public_can_insert_website_leads_to_leads"
ON public.leads
FOR INSERT
TO public
WITH CHECK (true);
