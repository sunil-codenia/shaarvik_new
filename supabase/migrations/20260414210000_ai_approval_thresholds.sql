-- Add approval thresholds, daily spend limits, and manual override controls to ai_control_settings

ALTER TABLE public.ai_control_settings
  ADD COLUMN IF NOT EXISTS approval_threshold NUMERIC DEFAULT 75,
  ADD COLUMN IF NOT EXISTS daily_spend_limit NUMERIC DEFAULT 500,
  ADD COLUMN IF NOT EXISTS require_approval_above_spend BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS manual_override_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_required_for_launch BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_required_for_budget_change BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_budget_change_pct NUMERIC DEFAULT 20;
