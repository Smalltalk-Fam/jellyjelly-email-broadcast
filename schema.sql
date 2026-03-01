-- JellyJelly Email Broadcast — Database Schema
-- Run this in Supabase SQL Editor

-- Table: email_campaigns (send history and logs)
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL DEFAULT 'default',
  body_html TEXT,
  body_preview TEXT,
  total_recipients INT DEFAULT 0,
  total_sent INT DEFAULT 0,
  total_failed INT DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
  sent_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS policy: only service role can access (server-side only)
CREATE POLICY "Service role full access" ON public.email_campaigns
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- V2 SCHEMA ADDITIONS
-- ============================================================

-- Table: email_sequences (multi-step campaign sequences, e.g. re-engagement drips)
CREATE TABLE IF NOT EXISTS public.email_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'reengagement',
  spacing_days INT DEFAULT 7,
  audit_data JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON public.email_sequences
  FOR ALL USING (true) WITH CHECK (true);

-- Alter email_campaigns: add sequence support and scheduling
ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS sequence_id UUID REFERENCES public.email_sequences(id),
  ADD COLUMN IF NOT EXISTS sequence_step INT,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preheader TEXT;

-- Table: campaign_variants (A/B test variants per campaign)
CREATE TABLE IF NOT EXISTS public.campaign_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL DEFAULT 'A',
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  template_name TEXT NOT NULL DEFAULT 'default',
  preheader TEXT,
  split_percentage INT NOT NULL DEFAULT 50,
  total_recipients INT DEFAULT 0,
  total_sent INT DEFAULT 0,
  total_failed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.campaign_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON public.campaign_variants
  FOR ALL USING (true) WITH CHECK (true);

-- Table: email_events (webhook-tracked delivery, open, click, bounce events)
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.email_campaigns(id),
  variant_id UUID REFERENCES public.campaign_variants(id),
  event_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  is_bot BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON public.email_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_events_recipient ON public.email_events(recipient);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON public.email_events(event_type);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON public.email_events
  FOR ALL USING (true) WITH CHECK (true);

-- Table: reengagement_outcomes (track whether re-engagement emails led to user return)
CREATE TABLE IF NOT EXISTS public.reengagement_outcomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.email_campaigns(id),
  sequence_id UUID REFERENCES public.email_sequences(id),
  variant_id UUID REFERENCES public.campaign_variants(id),
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  clicked_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  active_7d BOOLEAN DEFAULT false,
  active_30d BOOLEAN DEFAULT false,
  relapsed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reengagement_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON public.reengagement_outcomes
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- CTA URL SUPPORT
-- ============================================================
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS cta_url TEXT;
ALTER TABLE public.campaign_variants ADD COLUMN IF NOT EXISTS cta_url TEXT;
