-- Add title and description to campaign_creatives
ALTER TABLE public.campaign_creatives
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'image';

-- Create storage bucket for campaign creatives
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-creatives',
  'campaign-creatives',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DROP POLICY IF EXISTS "authenticated_upload_creatives" ON storage.objects;
CREATE POLICY "authenticated_upload_creatives"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'campaign-creatives');

DROP POLICY IF EXISTS "public_read_creatives" ON storage.objects;
CREATE POLICY "public_read_creatives"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'campaign-creatives');

DROP POLICY IF EXISTS "authenticated_delete_creatives" ON storage.objects;
CREATE POLICY "authenticated_delete_creatives"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'campaign-creatives');

-- RLS for campaign_creatives table
ALTER TABLE public.campaign_creatives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_manage_campaign_creatives" ON public.campaign_creatives;
CREATE POLICY "authenticated_manage_campaign_creatives"
ON public.campaign_creatives
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
