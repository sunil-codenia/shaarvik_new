-- Website contact form leads table
CREATE TABLE IF NOT EXISTS public.website_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT DEFAULT 'contact_form',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_leads_email ON public.website_leads(email);
CREATE INDEX IF NOT EXISTS idx_website_leads_created_at ON public.website_leads(created_at);

ALTER TABLE public.website_leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit a contact form (public insert)
DROP POLICY IF EXISTS "public_can_insert_website_leads" ON public.website_leads;
CREATE POLICY "public_can_insert_website_leads"
ON public.website_leads
FOR INSERT
TO public
WITH CHECK (true);

-- Only authenticated users can read leads
DROP POLICY IF EXISTS "authenticated_can_read_website_leads" ON public.website_leads;
CREATE POLICY "authenticated_can_read_website_leads"
ON public.website_leads
FOR SELECT
TO authenticated
USING (true);
