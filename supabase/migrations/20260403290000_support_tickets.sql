-- Support Ticket Management System

-- 1. ENUMS
DROP TYPE IF EXISTS public.ticket_priority CASCADE;
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');

DROP TYPE IF EXISTS public.ticket_status CASCADE;
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- 2. TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.client_subscriptions(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  relationship_manager_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT,
  priority public.ticket_priority NOT NULL DEFAULT 'medium'::public.ticket_priority,
  status public.ticket_status NOT NULL DEFAULT 'open'::public.ticket_status,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. TICKET TECHNICAL ASSIGNEES (junction table)
CREATE TABLE IF NOT EXISTS public.ticket_assignees (
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ticket_id, user_id)
);

-- 4. TICKET COMMENTS
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_support_tickets_client_id ON public.support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_rm ON public.support_tickets(relationship_manager_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON public.support_tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_ticket_assignees_ticket ON public.ticket_assignees(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assignees_user ON public.ticket_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON public.ticket_comments(ticket_id);

-- 6. AUTO-GENERATE TICKET NUMBER FUNCTION
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  new_ticket_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.support_tickets;
  
  new_ticket_number := 'TKT' || LPAD(next_num::TEXT, 5, '0');
  NEW.ticket_number := new_ticket_number;
  RETURN NEW;
END;
$$;

-- 7. AUTO-UPDATE updated_at FUNCTION
CREATE OR REPLACE FUNCTION public.update_ticket_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- 8. ENABLE RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- 9. RLS POLICIES

-- support_tickets: all authenticated users can read/write
DROP POLICY IF EXISTS "authenticated_access_support_tickets" ON public.support_tickets;
CREATE POLICY "authenticated_access_support_tickets"
ON public.support_tickets
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ticket_assignees: all authenticated users can read/write
DROP POLICY IF EXISTS "authenticated_access_ticket_assignees" ON public.ticket_assignees;
CREATE POLICY "authenticated_access_ticket_assignees"
ON public.ticket_assignees
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ticket_comments: all authenticated users can read/write
DROP POLICY IF EXISTS "authenticated_access_ticket_comments" ON public.ticket_comments;
CREATE POLICY "authenticated_access_ticket_comments"
ON public.ticket_comments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 10. TRIGGERS
DROP TRIGGER IF EXISTS generate_ticket_number_trigger ON public.support_tickets;
CREATE TRIGGER generate_ticket_number_trigger
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.generate_ticket_number();

DROP TRIGGER IF EXISTS update_ticket_updated_at_trigger ON public.support_tickets;
CREATE TRIGGER update_ticket_updated_at_trigger
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_ticket_updated_at();
