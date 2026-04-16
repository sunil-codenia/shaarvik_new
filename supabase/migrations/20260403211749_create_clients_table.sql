-- Create client status enum
DROP TYPE IF EXISTS public.client_status CASCADE;
CREATE TYPE public.client_status AS ENUM ('active', 'inactive');

-- Create client source enum
DROP TYPE IF EXISTS public.client_source CASCADE;
CREATE TYPE public.client_source AS ENUM ('reference', 'website', 'ads');

-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    email TEXT NOT NULL,
    address TEXT,
    gst_number TEXT,
    notes TEXT,
    status public.client_status DEFAULT 'active'::public.client_status NOT NULL,
    source public.client_source DEFAULT 'reference'::public.client_source NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.handle_clients_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "authenticated_users_manage_clients" ON public.clients;
CREATE POLICY "authenticated_users_manage_clients"
ON public.clients
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS clients_updated_at ON public.clients;
CREATE TRIGGER clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_clients_updated_at();
