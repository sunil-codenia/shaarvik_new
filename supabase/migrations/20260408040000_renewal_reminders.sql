-- ─── Renewal Reminders ───────────────────────────────────────────────────────
-- Tracks auto-scheduled reminders sent 1 month before subscription expiry.
-- Channels: email (Resend), SMS (Twilio), internal notification to RM.

CREATE TABLE IF NOT EXISTS public.renewal_reminders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  remind_on       DATE NOT NULL,                  -- scheduled fire date (end_date - 30 days)
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  channels        TEXT[] NOT NULL DEFAULT ARRAY['email','sms','notification'],
  email_status    TEXT NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending','sent','failed','skipped')),
  sms_status      TEXT NOT NULL DEFAULT 'pending' CHECK (sms_status IN ('pending','sent','failed','skipped')),
  notif_status    TEXT NOT NULL DEFAULT 'pending' CHECK (notif_status IN ('pending','sent','failed','skipped')),
  email_error     TEXT,
  sms_error       TEXT,
  notif_error     TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient lookup of pending reminders due today or earlier
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_remind_on
  ON public.renewal_reminders (remind_on, status);

CREATE INDEX IF NOT EXISTS idx_renewal_reminders_subscription
  ON public.renewal_reminders (subscription_id);

CREATE INDEX IF NOT EXISTS idx_renewal_reminders_company
  ON public.renewal_reminders (company_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.renewal_reminders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'renewal_reminders' AND policyname = 'renewal_reminders_company_access'
  ) THEN
    CREATE POLICY renewal_reminders_company_access ON public.renewal_reminders
      FOR ALL
      TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ─── Service-role bypass (for API route) ─────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'renewal_reminders' AND policyname = 'renewal_reminders_service_role'
  ) THEN
    CREATE POLICY renewal_reminders_service_role ON public.renewal_reminders
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
