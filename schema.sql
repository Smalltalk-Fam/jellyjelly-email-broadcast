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
