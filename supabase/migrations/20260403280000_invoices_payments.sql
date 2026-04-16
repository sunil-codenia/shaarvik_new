-- ============================================================
-- Invoices & Payments Module
-- ============================================================

-- 1. INVOICE STATUS ENUM
DROP TYPE IF EXISTS public.invoice_status CASCADE;
CREATE TYPE public.invoice_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');

-- 2. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.client_subscriptions(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.product_plans(id) ON DELETE SET NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_amount NUMERIC(12,2) GENERATED ALWAYS AS (final_amount - paid_amount) STORED,
  status public.invoice_status NOT NULL DEFAULT 'pending'::public.invoice_status,
  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON public.invoice_payments(invoice_id);

-- 5. INVOICE NUMBER SEQUENCE FUNCTION
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_str TEXT := to_char(CURRENT_DATE, 'YYYY');
  seq_num INT;
  inv_number TEXT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-\d{4}-(\d+)') AS INT)
  ), 0) + 1
  INTO seq_num
  FROM public.invoices
  WHERE invoice_number LIKE 'INV-' || year_str || '-%';

  inv_number := 'INV-' || year_str || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN inv_number;
END;
$$;

-- 6. AUTO-UPDATE INVOICE STATUS FUNCTION
CREATE OR REPLACE FUNCTION public.update_invoice_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Recalculate paid_amount from all payments
  SELECT COALESCE(SUM(amount), 0)
  INTO NEW.paid_amount
  FROM public.invoice_payments
  WHERE invoice_id = NEW.id;

  -- Update status based on paid amount and due date
  IF NEW.paid_amount >= NEW.final_amount THEN
    NEW.status := 'paid'::public.invoice_status;
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.paid_amount < NEW.final_amount THEN
    NEW.status := 'overdue'::public.invoice_status;
  ELSE
    NEW.status := 'pending'::public.invoice_status;
  END IF;

  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- 7. FUNCTION TO REFRESH INVOICE AFTER PAYMENT
CREATE OR REPLACE FUNCTION public.refresh_invoice_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  total_paid NUMERIC(12,2);
  inv RECORD;
  new_status public.invoice_status;
BEGIN
  -- Get invoice details
  SELECT * INTO inv FROM public.invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Calculate total paid
  SELECT COALESCE(SUM(amount), 0)
  INTO total_paid
  FROM public.invoice_payments
  WHERE invoice_id = inv.id;

  -- Determine new status
  IF total_paid >= inv.final_amount THEN
    new_status := 'paid'::public.invoice_status;
  ELSIF inv.due_date < CURRENT_DATE AND total_paid < inv.final_amount THEN
    new_status := 'overdue'::public.invoice_status;
  ELSE
    new_status := 'pending'::public.invoice_status;
  END IF;

  -- Update invoice
  UPDATE public.invoices
  SET paid_amount = total_paid,
      status = new_status,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = inv.id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 8. AUTO-OVERDUE CHECK FUNCTION
CREATE OR REPLACE FUNCTION public.check_invoice_overdue()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'pending'::public.invoice_status AND NEW.due_date < CURRENT_DATE THEN
    NEW.status := 'overdue'::public.invoice_status;
  END IF;
  RETURN NEW;
END;
$$;

-- 9. ENABLE RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- 10. RLS POLICIES
DROP POLICY IF EXISTS "authenticated_manage_invoices" ON public.invoices;
CREATE POLICY "authenticated_manage_invoices"
ON public.invoices FOR ALL TO authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_manage_invoice_payments" ON public.invoice_payments;
CREATE POLICY "authenticated_manage_invoice_payments"
ON public.invoice_payments FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- 11. TRIGGERS
DROP TRIGGER IF EXISTS trg_refresh_invoice_on_payment_insert ON public.invoice_payments;
CREATE TRIGGER trg_refresh_invoice_on_payment_insert
AFTER INSERT OR DELETE ON public.invoice_payments
FOR EACH ROW EXECUTE FUNCTION public.refresh_invoice_on_payment();

DROP TRIGGER IF EXISTS trg_check_invoice_overdue ON public.invoices;
CREATE TRIGGER trg_check_invoice_overdue
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.check_invoice_overdue();
