-- ─── API Keys Table ──────────────────────────────────────────────────────────
-- Stores third-party API credentials entered via Settings → API Keys.
-- Used by server-side services (renewal reminders, etc.) to read credentials.

CREATE TABLE IF NOT EXISTS public.api_keys (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id     TEXT NOT NULL UNIQUE,   -- e.g. 'resend', 'twilio_account_sid'
  value      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (admins) can read/write API keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'api_keys' AND policyname = 'api_keys_authenticated_access'
  ) THEN
    CREATE POLICY api_keys_authenticated_access ON public.api_keys
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Service role bypass for server-side reads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'api_keys' AND policyname = 'api_keys_service_role'
  ) THEN
    CREATE POLICY api_keys_service_role ON public.api_keys
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
