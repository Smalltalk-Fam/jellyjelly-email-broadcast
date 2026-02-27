# Email Broadcast v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the full v2 design — 6 branded email templates, A/B testing, re-engagement builder, webhook tracking, sequence scheduling, and dashboard analytics.

**Architecture:** SvelteKit 5 (Svelte 5 runes) with Supabase for storage, Mailgun for sending/tracking, Claude AI via Bedrock for content generation. All email templates use table-based HTML matching the JellyJelly brand (`#4469B7` blue, Roboto font, `#89A9F4` CTA buttons). New DB tables for variants, events, sequences, and outcomes.

**Tech Stack:** SvelteKit 5, Svelte 5 ($props/$state/$derived/$effect), Supabase, Mailgun REST API, @anthropic-ai/bedrock-sdk, Vitest

---

## Task 1: Database Schema Migration

**Files:**
- Modify: `schema.sql`

**Step 1: Update schema.sql with all new tables**

Add the following tables and alterations after the existing `email_campaigns` table:

```sql
-- Email sequences (re-engagement drip campaigns)
CREATE TABLE email_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'reengagement',
  spacing_days INT DEFAULT 7,
  audit_data JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON email_sequences FOR ALL USING (true) WITH CHECK (true);

-- Add sequence support to campaigns
ALTER TABLE email_campaigns
  ADD COLUMN sequence_id UUID REFERENCES email_sequences(id),
  ADD COLUMN sequence_step INT,
  ADD COLUMN scheduled_at TIMESTAMPTZ,
  ADD COLUMN preheader TEXT;

-- A/B test variants
CREATE TABLE campaign_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
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

ALTER TABLE campaign_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON campaign_variants FOR ALL USING (true) WITH CHECK (true);

-- Email event tracking (from Mailgun webhooks)
CREATE TABLE email_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id),
  variant_id UUID REFERENCES campaign_variants(id),
  event_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  is_bot BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_events_campaign ON email_events(campaign_id);
CREATE INDEX idx_email_events_recipient ON email_events(recipient);
CREATE INDEX idx_email_events_type ON email_events(event_type);

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON email_events FOR ALL USING (true) WITH CHECK (true);

-- Re-engagement outcome tracking (Jelly API correlation)
CREATE TABLE reengagement_outcomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id),
  sequence_id UUID REFERENCES email_sequences(id),
  variant_id UUID REFERENCES campaign_variants(id),
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  clicked_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  active_7d BOOLEAN DEFAULT false,
  active_30d BOOLEAN DEFAULT false,
  relapsed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reengagement_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON reengagement_outcomes FOR ALL USING (true) WITH CHECK (true);
```

**Step 2: Commit**

```bash
git add schema.sql
git commit -m "feat: add v2 database schema — sequences, variants, events, outcomes"
```

---

## Task 2: Build 6 Email Templates

**Files:**
- Rewrite: `src/lib/email-templates/default.html` → rename to keep as fallback
- Create: `src/lib/email-templates/announcement.html`
- Create: `src/lib/email-templates/digest.html` (rewrite existing)
- Create: `src/lib/email-templates/spotlight.html`
- Create: `src/lib/email-templates/event.html`
- Create: `src/lib/email-templates/reengagement.html`
- Create: `src/lib/email-templates/minimal.html`

All templates must follow the JellyJelly email brand from the design doc:

**Shared structure for every template:**

```html
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{{subject}}</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0; mso-table-rspace: 0; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }

    /* Responsive */
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .heading { font-size: 36px !important; }
    }
    @media screen and (max-width: 480px) {
      .heading { font-size: 28px !important; }
      .cta-button { display: block !important; width: 100% !important; }
      .stack-column { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#4469B7;">
  <!-- Preheader (hidden preview text) -->
  <span style="display:none !important; visibility:hidden; mso-hide:all; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
    {{preheader}}
  </span>

  <center style="width:100%; background-color:#4469B7;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="margin:0 auto; max-width:600px;">
      <!-- LOGO -->
      <tr>
        <td style="padding:30px 40px 20px; text-align:center;">
          <img src="https://static1.jellyjelly.com/jelly-logo-white.png" width="56" height="56" alt="JellyJelly" style="display:block; margin:0 auto;">
        </td>
      </tr>

      <!-- TEMPLATE-SPECIFIC CONTENT GOES HERE -->

      <!-- FOOTER -->
      <tr>
        <td style="padding:30px 40px; text-align:center; font-family:Roboto, Helvetica, Arial, sans-serif; font-size:12px; color:#aaaaaa; line-height:1.5;">
          <a href="{{unsubscribe_url}}" style="color:#aaaaaa; text-decoration:underline;">Unsubscribe</a>
          <br>JellyJelly Inc, 141 E Houston St, New York, NY 10002, US
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
```

**Brand constants used throughout:**
- Background: `#4469B7`
- Text: `#ffffff`
- CTA bg: `#89A9F4`, border-radius: `999px`, uppercase, bold, padding `16px 40px`
- Font: `font-family: Roboto, Helvetica, 'Helvetica Neue', Arial, sans-serif`
- Heading: `font-size:48px; font-weight:700; text-transform:uppercase; letter-spacing:-1px; line-height:0.8; color:#ffffff;`
- Divider: `border-bottom: 1px solid rgba(255,255,255,0.15)`
- Quote box: `background: rgba(255,255,255,0.1); border-left: 4px solid #89A9F4; padding: 20px;`
- Footer text: `#aaaaaa`, 12px

**Step 1: Create announcement.html**

Heading: "BIG NEWS!", body via `{{body}}`, CTA: "CHECK IT OUT"

**Step 2: Rewrite digest.html**

Heading: "THIS WEEK ON JELLYJELLY", 3 video thumbnail blocks (200x112 with play overlay), CTA: "OPEN JELLYJELLY". The `{{body}}` placeholder contains the 3 blocks — the AI or author writes them.

**Step 3: Create spotlight.html**

Heading: "CHECK THIS OUT!", large image area (600x338 with play overlay), CTA: "WATCH NOW"

**Step 4: Create event.html**

Heading: "YOU'RE INVITED!", event details in styled quote box, CTA: "RSVP NOW"

**Step 5: Create reengagement.html**

Heading: "THINGS HAVE CHANGED", body area for 1-3 feature update blocks with before/after framing, CTA: "SEE WHAT'S NEW"

**Step 6: Create minimal.html**

No heading (just logo), plain body `{{body}}`, subtle text-link CTA (not a pill button)

**Step 7: Delete old default.html (wrong brand)**

The current `default.html` uses dark theme with purple gradients — completely off-brand. Delete it and make `announcement.html` the new default.

**Step 8: Update sender.ts template loading**

In `buildEmailHtml()`, ensure the template fallback uses `announcement` instead of `default`.

**Step 9: Update compose page server to load new template names**

In `src/routes/compose/+page.server.ts`, the existing glob should auto-discover the new templates.

**Step 10: Commit**

```bash
git add src/lib/email-templates/ src/lib/email/sender.ts
git commit -m "feat: add 6 branded email templates matching JellyJelly design system"
```

---

## Task 3: Template Picker UI on Compose Page

**Files:**
- Modify: `src/routes/compose/+page.svelte`
- Modify: `src/routes/compose/+page.server.ts`

**Step 1: Update +page.server.ts to return template metadata**

Instead of just template names, return an array of objects with name, display label, description, and a use-case tag. This is a static lookup based on the filename:

```typescript
const TEMPLATE_META: Record<string, { label: string; description: string; icon: string }> = {
  announcement: { label: 'Announcement', description: 'Feature launches, app updates', icon: 'megaphone' },
  digest: { label: 'Weekly Digest', description: 'Content roundups with video thumbnails', icon: 'newspaper' },
  spotlight: { label: 'Product Spotlight', description: 'Showcase features or content', icon: 'star' },
  event: { label: 'Event Invite', description: 'Livestreams, AMAs, community events', icon: 'calendar' },
  reengagement: { label: 'Re-engagement', description: 'Value-Proof winback campaigns', icon: 'refresh' },
  minimal: { label: 'Minimal', description: 'Personal notes, founder updates', icon: 'mail' },
};
```

**Step 2: Replace the `<select>` dropdown with a visual card grid**

6 cards in a 3x2 grid (2x3 on mobile). Each card shows: icon area, template name, 1-line description. Selected card has `border: 2px solid #89A9F4`. Clicking a card sets `templateName`.

**Step 3: Update the preview to render with the JellyJelly blue brand color**

Change the preview wrapper from dark theme (`#1a1a2e`) to `#4469B7` to match the actual email appearance.

**Step 4: Commit**

```bash
git add src/routes/compose/
git commit -m "feat: add visual template picker cards on compose page"
```

---

## Task 4: A/B Testing — Database & Variant Creation

**Files:**
- Modify: `src/routes/compose/+page.svelte`
- Modify: `src/routes/compose/+page.server.ts`

**Step 1: Add "Add Variant B" toggle to compose form**

Below the main compose form, add a button "Add Variant B". When clicked, it reveals a second subject + body + template picker section. Both variants share the same campaign but each gets its own content.

**Step 2: Update the create action in +page.server.ts**

When the form has variant B data, after creating the campaign:
1. Insert Variant A into `campaign_variants` (subject, body_html, template_name from main form, split_percentage from form or default 50)
2. Insert Variant B into `campaign_variants` (subject_b, body_html_b, template_name_b, split_percentage = 100 - variant_a_percentage)

**Step 3: Add split ratio selector**

A simple select or slider: 50/50, 60/40, 70/30. Default 50/50.

**Step 4: Commit**

```bash
git add src/routes/compose/
git commit -m "feat: A/B variant creation on compose page"
```

---

## Task 5: A/B Testing — Send Logic

**Files:**
- Modify: `src/lib/email/sender.ts`
- Create: `src/lib/email/sender-ab.test.ts`
- Modify: `src/routes/[id]/+page.server.ts`
- Modify: `src/routes/api/email/send/+server.ts`

**Step 1: Write tests for A/B split logic**

```typescript
// sender-ab.test.ts
import { describe, it, expect } from 'vitest';
import { splitRecipients } from './sender';

describe('splitRecipients', () => {
  it('splits 50/50 by default', () => {
    const recipients = Array.from({ length: 100 }, (_, i) => ({
      email: `user${i}@test.com`,
      userId: `u${i}`
    }));
    const { groupA, groupB } = splitRecipients(recipients, 50);
    expect(groupA.length).toBe(50);
    expect(groupB.length).toBe(50);
    // No overlap
    const allEmails = [...groupA, ...groupB].map(r => r.email);
    expect(new Set(allEmails).size).toBe(100);
  });

  it('splits 70/30', () => {
    const recipients = Array.from({ length: 100 }, (_, i) => ({
      email: `user${i}@test.com`,
      userId: `u${i}`
    }));
    const { groupA, groupB } = splitRecipients(recipients, 70);
    expect(groupA.length).toBe(70);
    expect(groupB.length).toBe(30);
  });

  it('handles empty list', () => {
    const { groupA, groupB } = splitRecipients([], 50);
    expect(groupA.length).toBe(0);
    expect(groupB.length).toBe(0);
  });
});
```

**Step 2: Run tests — expect FAIL**

```bash
npm test
```

**Step 3: Implement splitRecipients in sender.ts**

```typescript
export function splitRecipients(
  recipients: Recipient[],
  splitPercentageA: number
): { groupA: Recipient[]; groupB: Recipient[] } {
  // Fisher-Yates shuffle
  const shuffled = [...recipients];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const splitIndex = Math.round(shuffled.length * (splitPercentageA / 100));
  return {
    groupA: shuffled.slice(0, splitIndex),
    groupB: shuffled.slice(splitIndex)
  };
}
```

**Step 4: Run tests — expect PASS**

```bash
npm test
```

**Step 5: Update sendCampaign to accept variant tags**

Add optional `tags` parameter to `CampaignConfig`. When sending, include `o:tag` values for `campaign-{id}` and `variant-{A|B}`.

**Step 6: Update the send action in [id]/+page.server.ts**

When campaign has variants:
1. Load variants from `campaign_variants` table
2. Call `splitRecipients()` with variant A's `split_percentage`
3. Send group A with variant A's subject/body/template + tag `variant-A`
4. Send group B with variant B's subject/body/template + tag `variant-B`
5. Update each variant's `total_sent` and `total_failed` counts

When campaign has no variants, send normally as before.

**Step 7: Update API send endpoint with same logic**

Mirror the variant-aware sending in `src/routes/api/email/send/+server.ts`.

**Step 8: Commit**

```bash
git add src/lib/email/sender.ts src/lib/email/sender-ab.test.ts src/routes/
git commit -m "feat: A/B split sending with variant tagging"
```

---

## Task 6: Mailgun Webhook Receiver

**Files:**
- Create: `src/routes/api/webhooks/mailgun/+server.ts`
- Create: `src/lib/server/tracking.ts`

**Step 1: Create tracking.ts with webhook signature verification**

```typescript
import crypto from 'crypto';

export function verifyMailgunSignature(
  signingKey: string,
  timestamp: string,
  token: string,
  signature: string
): boolean {
  const encodedToken = crypto
    .createHmac('sha256', signingKey)
    .update(timestamp + token)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(encodedToken),
    Buffer.from(signature)
  );
}
```

**Step 2: Create webhook endpoint**

```typescript
// src/routes/api/webhooks/mailgun/+server.ts
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { verifyMailgunSignature } from '$lib/server/tracking';
import { getSupabaseClient } from '$lib/server/supabase';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const sig = body.signature;

  // Verify webhook signature
  const signingKey = env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey || !verifyMailgunSignature(signingKey, sig.timestamp, sig.token, sig.signature)) {
    return json({ error: 'Invalid signature' }, { status: 403 });
  }

  const eventData = body['event-data'];
  const eventType = eventData.event; // delivered, opened, clicked, unsubscribed, complained, failed
  const recipient = eventData.recipient;
  const timestamp = new Date(eventData.timestamp * 1000).toISOString();
  const tags = eventData.tags || [];
  const isBot = eventData['client-info']?.bot === true;

  // Extract campaign ID and variant from tags
  const campaignTag = tags.find((t: string) => t.startsWith('campaign-'));
  const variantTag = tags.find((t: string) => t.startsWith('variant-'));
  const campaignId = campaignTag?.replace('campaign-', '') || null;
  const variantLabel = variantTag?.replace('variant-', '') || null;

  // Look up variant ID if we have a label
  const supabase = getSupabaseClient();
  let variantId = null;
  if (campaignId && variantLabel) {
    const { data } = await supabase
      .from('campaign_variants')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('variant_label', variantLabel)
      .single();
    variantId = data?.id || null;
  }

  // Store event
  await supabase.from('email_events').insert({
    campaign_id: campaignId,
    variant_id: variantId,
    event_type: eventType === 'failed' ? 'bounced' : eventType,
    recipient,
    timestamp,
    metadata: {
      url: eventData.url,
      ip: eventData.ip,
      userAgent: eventData['user-agent'],
      tags,
    },
    is_bot: isBot,
  });

  // Handle unsubscribe: Mailgun already adds to suppression list
  // Just log it — no additional action needed

  return json({ success: true });
};
```

**Step 3: Commit**

```bash
git add src/lib/server/tracking.ts src/routes/api/webhooks/
git commit -m "feat: Mailgun webhook receiver with signature verification and event storage"
```

---

## Task 7: Campaign Detail Page — Metrics & A/B Comparison

**Files:**
- Modify: `src/routes/[id]/+page.server.ts`
- Modify: `src/routes/[id]/+page.svelte`

**Step 1: Update page.server.ts to load events and variants**

Add to the load function:
- Query `campaign_variants` for this campaign
- Query `email_events` grouped by event_type for aggregate counts
- If variants exist, query events grouped by variant_id + event_type
- Calculate rates: open rate = opened/delivered, click rate = clicked/delivered, etc.

**Step 2: Update +page.svelte with metrics dashboard**

Replace the simple stats grid with:
- **Delivery stats:** Sent, Delivered, Bounced, Complaints
- **Engagement stats:** Opens (with bot-filtered note), Clicks, Unsubscribes
- **Rates:** Open rate, Click rate, Bounce rate, Unsubscribe rate

**Step 3: Add A/B comparison table**

When variants exist, show side-by-side:

| Metric | Variant A | Variant B | Winner |
|--------|-----------|-----------|--------|
| Subject | ... | ... | — |
| Open Rate | X% | Y% | A/B |
| Click Rate | X% | Y% | A/B |

Winner is determined by higher rate. Add a "significance" note if sample size < 100.

**Step 4: Commit**

```bash
git add src/routes/[id]/
git commit -m "feat: campaign metrics dashboard with A/B comparison"
```

---

## Task 8: Re-engagement Campaign Builder — Product Audit Flow

**Files:**
- Create: `src/routes/compose/reengagement/+page.svelte`
- Create: `src/routes/compose/reengagement/+page.server.ts`

**Step 1: Create the server load + actions**

Load function: return template metadata (same as compose page).

Actions:
- `generate`: Takes audit form data, calls AI to generate 3-email sequence, returns the generated content
- `save`: Creates an `email_sequences` row, then creates 3 `email_campaigns` rows linked to it (with `sequence_step` 1/2/3 and `scheduled_at` based on start date + spacing)

**Step 2: Create the Svelte page with 3-step audit form**

**Step 1 — Feature Updates** (1-3 repeatable entries):
- "What changed?" input
- "What did it replace/improve?" input
- "User impact in one sentence" input
- [+ Add another] button (max 3)

**Step 2 — Pain Points:**
- "What was the #1 frustration users had before?" input
- "How is it solved now?" input

**Step 3 — Speed-to-Value Metric (optional):**
- "Any before/after metric?" input

**Generate button**: Calls the `generate` action, which sends audit data to Claude. Claude returns 3 emails with subjects, bodies, and assigned templates.

**Review step**: Shows the 3 generated emails side by side for review/editing. Each shows: email number, subject, template name, body preview. Admin can edit any of them.

**Schedule step**: Start date picker + spacing selector (3/5/7/10 days). "Create Sequence" button.

**Step 3: Update AI compose to support sequence generation**

Add a new function `aiGenerateSequence(config, auditData)` in `ai-compose.ts` that takes the audit inputs and returns 3 email objects. The system prompt instructs Claude to generate:
- Email 1 ("What You Missed") using reengagement template
- Email 2 ("Direct-to-Expert") using minimal template
- Email 3 ("Insider Access") using announcement template

Each returned as: `{ subject, preheader, bodyHtml, templateName }`

**Step 4: Add nav link to re-engagement builder**

In the compose page or dashboard, add a "New Re-engagement Sequence" link that goes to `/compose/reengagement`.

**Step 5: Commit**

```bash
git add src/routes/compose/reengagement/ src/lib/email/ai-compose.ts
git commit -m "feat: guided re-engagement builder with Product Audit flow and AI sequence generation"
```

---

## Task 9: Sequence Management Pages

**Files:**
- Create: `src/routes/sequences/+page.svelte`
- Create: `src/routes/sequences/+page.server.ts`
- Create: `src/routes/sequences/[id]/+page.svelte`
- Create: `src/routes/sequences/[id]/+page.server.ts`

**Step 1: Create sequence list page**

Load all sequences from DB with their campaigns. Display:
- Sequence name, status, created date
- Number of steps sent vs total
- Next scheduled send date
- Link to detail page

**Step 2: Create sequence detail page**

Load sequence + its 3 campaigns + events for each campaign. Display:
- Timeline visualization: 3 steps with status indicators (pending/sent/completed)
- Funnel metrics: Sent → Opened → Clicked → Returned → Active 7d → Active 30d
- Per-step metrics (which email drove the most returns)
- Smart suppression log (users excluded from later steps)

**Step 3: Add sequences link to root layout navigation**

Add a nav bar or links at the top of the layout: Campaigns | Sequences | Suppressions

**Step 4: Commit**

```bash
git add src/routes/sequences/ src/routes/+layout.svelte
git commit -m "feat: sequence list and detail pages with funnel visualization"
```

---

## Task 10: Sequence Scheduler (Cron Endpoint)

**Files:**
- Create: `src/routes/api/cron/send-scheduled/+server.ts`
- Create: `vercel.json` (if not exists)

**Step 1: Create cron endpoint**

```typescript
// Checks for campaigns where scheduled_at <= now() and status = 'draft'
// For each: loads sequence, checks smart suppression, triggers send
```

The endpoint:
1. Queries campaigns where `scheduled_at <= now()` AND `status = 'draft'`
2. For each campaign:
   a. If it has a `sequence_id` and `sequence_step > 1`, check smart suppression: query `email_events` for `clicked` events from earlier steps in same sequence — exclude those recipients
   b. Trigger the send (reuse send logic from the send API)
   c. Update campaign status
   d. If this was the last step, mark sequence as `completed`

Auth: Verify via a cron secret header or Vercel's cron auth.

**Step 2: Add Vercel cron config**

```json
{
  "crons": [{
    "path": "/api/cron/send-scheduled",
    "schedule": "0 */6 * * *"
  }]
}
```

**Step 3: Commit**

```bash
git add src/routes/api/cron/ vercel.json
git commit -m "feat: scheduled send cron job with smart suppression"
```

---

## Task 11: Jelly API Integration

**Files:**
- Create: `src/lib/server/jelly-api.ts`
- Modify: `src/lib/server/tracking.ts`

**Step 1: Create Jelly API client**

```typescript
// jelly-api.ts
export async function checkUserActivity(
  apiUrl: string,
  userId: string
): Promise<{ returned: boolean; lastActiveAt: string | null }> {
  const res = await fetch(`${apiUrl}/v3/user/${userId}/activity`, {
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) return { returned: false, lastActiveAt: null };
  const data = await res.json();
  return {
    returned: data.active === true,
    lastActiveAt: data.lastActiveAt || null,
  };
}
```

**Step 2: Add outcome tracking to webhook handler**

When a `clicked` event is received for a campaign that has a sequence:
1. Look up the user by email in Supabase auth
2. Insert/update a row in `reengagement_outcomes` with `clicked_at`
3. Schedule a delayed check (or mark for the cron to check) at 7d and 30d

**Step 3: Add outcome checking to the cron endpoint**

Check `reengagement_outcomes` where `clicked_at` is 7+ days ago and `active_7d` is null. Query Jelly API for each. Similarly for 30d.

**Step 4: Commit**

```bash
git add src/lib/server/jelly-api.ts src/lib/server/tracking.ts src/routes/api/cron/
git commit -m "feat: Jelly API integration for re-engagement outcome tracking"
```

---

## Task 12: Dashboard Enhancements

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/routes/+page.server.ts`

**Step 1: Update dashboard load to include inline metrics**

For each campaign, query `email_events` to get delivered/opened/clicked counts. Calculate rates inline. Also load active sequences with next scheduled date.

**Step 2: Update dashboard UI**

- Add inline stats columns: Open Rate, Click Rate
- Status badges: pill style with background colors (draft: `#333`, sending: `#422006`, completed: `#052e16`, failed: `#2d0a0a`)
- Table hover state: `background: rgba(255,255,255,0.03)`
- Active sequences section below campaigns table
- Empty state with helpful message when no campaigns exist

**Step 3: Add navigation**

Simple nav at top of layout: **Campaigns** | **Sequences** | **Suppressions** | **New Campaign**

**Step 4: Commit**

```bash
git add src/routes/+page.svelte src/routes/+page.server.ts src/routes/+layout.svelte
git commit -m "feat: enhanced dashboard with inline metrics, nav, and status badges"
```

---

## Task 13: Mailgun Send Tags & List-Unsubscribe-Post Header

**Files:**
- Modify: `src/lib/email/sender.ts`
- Modify: `src/lib/email/mailgun.ts`

**Step 1: Add campaign/variant/sequence tags to every send**

Update `sendCampaign` to accept `campaignId`, `sequenceId`, `sequenceStep`, and `variantLabel`. Construct tags array:
- `campaign-{campaignId}` (always)
- `variant-{label}` (if A/B test)
- `sequence-{sequenceId}` (if part of sequence)
- `step-{N}` (if part of sequence)

Pass tags to `mailgun.send()`.

**Step 2: Add List-Unsubscribe-Post header**

RFC 8058 one-click unsubscribe. Add header:
```
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

This is already partially supported by the existing `List-Unsubscribe` header. Add the POST header for Gmail/Yahoo compliance.

**Step 3: Commit**

```bash
git add src/lib/email/sender.ts src/lib/email/mailgun.ts
git commit -m "feat: add campaign/variant/sequence tags and List-Unsubscribe-Post header"
```

---

## Task 14: Final Integration Test & Cleanup

**Step 1: Run all tests**

```bash
npm test
```

Fix any failures.

**Step 2: Run TypeScript check**

```bash
npm run check
```

Fix any type errors.

**Step 3: Test dev server manually**

```bash
npm run dev
```

Verify:
- Dashboard loads with nav
- Compose page shows template picker cards
- AI generate works (needs Bedrock keys)
- A/B variant toggle works
- Re-engagement builder loads at /compose/reengagement
- Sequences page loads
- Suppression page loads
- Unsubscribe page loads

**Step 4: Final commit and push**

```bash
git add -A
git commit -m "chore: v2 integration cleanup and final fixes"
git push
```

---

## Implementation Order Summary

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1 | Database schema | None |
| 2 | 6 email templates | None |
| 3 | Template picker UI | Task 2 |
| 4 | A/B variant creation | Task 1 |
| 5 | A/B send logic | Task 4 |
| 6 | Webhook receiver | Task 1 |
| 7 | Campaign metrics + A/B comparison | Tasks 5, 6 |
| 8 | Re-engagement builder | Tasks 1, 2, 3 |
| 9 | Sequence pages | Tasks 1, 8 |
| 10 | Sequence scheduler | Tasks 1, 9 |
| 11 | Jelly API integration | Tasks 6, 10 |
| 12 | Dashboard enhancements | Tasks 6, 7 |
| 13 | Send tags + headers | Task 5 |
| 14 | Integration test | All |

Tasks 1 and 2 can run in parallel. Tasks 3, 4, and 6 can run in parallel after 1+2.
