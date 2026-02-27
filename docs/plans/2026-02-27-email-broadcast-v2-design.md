# JellyJelly Email Broadcast v2 — Design Document

**Date:** 2026-02-27
**Status:** Approved

---

## Overview

Upgrade the JellyJelly Email Broadcast tool with:
1. High-quality email templates matching the established JellyJelly email brand
2. A guided re-engagement campaign builder using the "Value-Proof" Product Evolution framework
3. A/B testing support for comparing email variants
4. Mailgun webhook-based tracking + Jelly API integration for full-funnel analytics
5. Light admin UI polish

---

## 1. Email Templates

### Brand Foundation (from existing notification emails in jelly-api-legacy)

All templates must match the established JellyJelly email design system:

- **Background:** `#4469B7` (JellyJelly brand blue)
- **Text:** `#ffffff` (white on blue)
- **CTA buttons:** `#89A9F4`, fully rounded (`border-radius: 999px`), uppercase, bold
- **Font:** `Roboto` via Google Fonts `<link>`, fallback `Helvetica, 'Helvetica Neue', Arial, sans-serif`
- **Logo:** White JellyJelly logo (56x56) from `https://static1.jellyjelly.com/jelly-logo-white.png`
- **Headings:** 48px desktop / 32px mobile, bold, uppercase, multi-line using `<span class="line">` blocks, letter-spacing -1px, line-height 0.8
- **Max width:** 600px
- **Layout:** Table-based (`<table role="presentation">`) for email client compatibility
- **VML:** Outlook conditional comments for background images
- **Footer:** Unsubscribe link + "JellyJelly Inc, 141 E Houston St, New York, NY 10002, US" in `#aaaaaa`
- **Responsive:** 3 breakpoints via `<style>` in `<head>` (default, max-width: 600px, max-width: 480px)
- **Video thumbnails:** Play button overlay (`https://static1.jellyjelly.com/play-button.png` 48x48) using absolute positioning with VML fallback

### Template Inventory

#### 1. Announcement (`announcement.html`)
- **Heading:** "BIG NEWS!" (multi-line uppercase)
- **Content:** Body paragraph with `{{body}}` placeholder
- **CTA:** "CHECK IT OUT" pill button
- **Use case:** Feature launches, app updates, company news

#### 2. Weekly Digest (`digest.html`)
- **Heading:** "THIS WEEK ON JELLYJELLY"
- **Content:** 3 content blocks, each with a video thumbnail (200x112 with play button) + title + excerpt, separated by subtle dividers (`border-bottom: 1px solid rgba(255,255,255,0.15)`)
- **CTA:** "OPEN JELLYJELLY" pill button
- **Use case:** Recurring weekly content roundups, trending highlights

#### 3. Product Spotlight (`spotlight.html`)
- **Heading:** "CHECK THIS OUT!"
- **Content:** Large feature image area (600x338 with play button overlay, same pattern as existing notification emails) + headline + description
- **CTA:** "WATCH NOW" pill button
- **Use case:** Showcasing new features, trending content, creator highlights

#### 4. Event Invite (`event.html`)
- **Heading:** "YOU'RE INVITED!"
- **Content:** Event details in a quote box (`background: rgba(255,255,255,0.1)`, `border-left: 4px solid #89A9F4` — same style as comment email's quote box) with event name, date/time, description
- **CTA:** "RSVP NOW" pill button
- **Use case:** Livestreams, AMAs, community events

#### 5. Re-engagement (`reengagement.html`)
- **Heading:** "THINGS HAVE CHANGED" (NOT "we miss you")
- **Content:** 1-3 feature update blocks, each structured as:
  - Feature name (bold)
  - Before/after framing ("Previously: X → Now: Y")
  - One-line user impact statement
  - Optional video thumbnail showing the feature
- **CTA:** "SEE WHAT'S NEW" pill button
- **Use case:** Value-Proof winback campaigns

#### 6. Minimal (`minimal.html`)
- **Heading:** None (just the logo)
- **Content:** Plain body text with `{{body}}` — looks like a personal email from the team
- **CTA:** Subtle text-link style CTA (not a pill button)
- **Use case:** Founder updates, personal notes, sensitive communications, "Direct-to-Expert" emails in re-engagement sequences

### Shared Template Placeholders

All templates use these placeholders:
- `{{body}}` — Main email body content
- `{{unsubscribe_url}}` — HMAC-signed unsubscribe link
- `{{subject}}` — Email subject (used in `<title>` tag)
- `{{preheader}}` — Preview text (hidden `<span>` at top of body)

### Email-Safe Font Strategy

```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
```

- Renders as Roboto on Apple Mail (~40% of opens), Gmail (natively supports Roboto)
- Falls back to `Helvetica, 'Helvetica Neue', Arial, sans-serif` on Outlook and others
- Body: Roboto 400 at 16px
- Headings: Roboto 700 at 48px (desktop) / 32px (mobile)

---

## 2. Re-engagement Campaign Builder

### The "Value-Proof" Framework

Based on B2X Growth Marketing research: instead of "we miss you" messaging, prove that the product the user left is not the product that exists today. This approach avoids Digital Fatigue cliches and uses Product Evolution Messaging.

### Guided Product Audit Flow

When the admin selects "Re-engagement" as campaign type, the compose page becomes a 3-step structured form:

**Step 1 — Feature Updates** (repeatable, 1-3 entries)
Each entry has:
- "What changed?" — text input
- "What did it replace/improve?" — text input
- "User impact in one sentence" — text input

**Step 2 — Pain Points**
- "What was the #1 frustration users had before?" — text input
- "How is it solved now?" — text input

**Step 3 — Speed-to-Value Metric** (optional)
- "Any before/after metric?" — text input (e.g., "Discovery went from scroll-based to AI-matched")

### AI-Generated 3-Email Sequence

The AI takes the audit data and generates:

| Email | Template | Subject Line Pattern | Tone | Content Strategy |
|---|---|---|---|---|
| **Step 1: "What You Missed"** | `reengagement.html` | "{Name}, the app you left isn't the app we have now" | Value-led, zero-click | Feature updates reframed as user impact. Video thumbnails of trending content. Provide value in the email itself. |
| **Step 2: "Direct-to-Expert"** | `minimal.html` | "A quick note from our team about what's changed" | Personal, empathetic, from a real person | Written as a PM/founder note. Addresses the specific pain point from audit. No heavy design. |
| **Step 3: "Insider Access"** | `announcement.html` | "We saved a spot for you" | Exclusive, slight urgency | Invite to beta group, early access, or strategy audit. Single strong CTA. |

### Sequence Scheduling

- All 3 emails saved as a linked sequence
- Default spacing: 7 days between emails (configurable)
- Admin sets start date
- System auto-sends Email 2 and 3 on schedule via cron/scheduler
- **Smart suppression:** If a user clicks or re-engages on Email 1 or 2, they are excluded from subsequent sequence emails

### Re-engagement Subject Line Research

Top-performing patterns (29% average open rate for win-back campaigns):

| Pattern | Example | Trigger |
|---|---|---|
| Product evolution | "{Name}, the app you left isn't the app we have now" | Curiosity |
| What you missed | "3 things that changed since you left" | FOMO + specificity |
| Social proof | "Your friends posted 12 new videos this week" | FOMO + social |
| Direct/honest | "Should we stop emailing you?" | Loss aversion |
| Insider access | "We saved a spot for you" | Exclusivity |

Optimal subject line length: **6-10 words (30-50 characters)**. Front-load important words for mobile truncation.

### Content Best Practices

- **50-125 words** optimal email body length (75-100 word sweet spot)
- **Single CTA button** gets 371% more clicks than multiple CTAs
- **Button-based CTAs** improve CTR by 127% vs text links
- **Zero-click optimization:** provide the value in the email itself — don't require clicking to see what's new
- **No generic "We miss you" or "Come back" cliches**
- Preheader text: 40-55 characters, extends the subject line story, never repeats it

### Timing Research

- **First email:** 30-45 days after last activity (highest open rate window at 12.7%)
- **Spacing:** 7-10 days between sequence emails
- **Best days:** Tuesday and Thursday
- **Best time:** 9-11 AM for opens, 3-4 PM for clicks
- **After 3 failed attempts:** Sunset the address (remove from active list)

---

## 3. A/B Testing

### How It Works

When creating any campaign (not just re-engagement), the admin can enable A/B testing:

1. **Create Variant A** — compose the email as normal
2. **Click "Add Variant B"** — a second editor appears. Can change subject line, body content, or template. Any element can differ.
3. **Set split ratio** — default 50/50 (configurable: 60/40, 70/30, etc.)
4. **On send:** Recipients are randomly split into groups. Each group receives their variant. Both variants share the same campaign ID for unified tracking.

### Database Schema

```sql
-- A/B test variants
CREATE TABLE campaign_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL DEFAULT 'A',  -- 'A' or 'B'
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  template_name TEXT NOT NULL DEFAULT 'default',
  preheader TEXT,
  split_percentage INT NOT NULL DEFAULT 50,  -- % of recipients who get this variant
  total_recipients INT DEFAULT 0,
  total_sent INT DEFAULT 0,
  total_failed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Variant Assignment

- When sending, shuffle the recipient list and split by percentage
- Each recipient is assigned a variant and tagged in Mailgun: `variant-A` or `variant-B` (in addition to the campaign tag)
- Assignment is stored in the events table for later analysis

### Dashboard View

The campaign detail page shows a **side-by-side comparison**:

| Metric | Variant A | Variant B | Winner |
|---|---|---|---|
| Subject | "3 things changed since you left" | "The app you left isn't the app we have now" | — |
| Open Rate | 31.2% | 27.8% | A |
| Click Rate | 4.1% | 5.9% | B |
| Returned to App | 2.3% | 3.7% | B |

Statistical significance indicator: shows when sample size is large enough for a confident winner (using a simple z-test for proportions).

---

## 4. Tracking & Analytics

### Mailgun Webhooks

**Webhook endpoint:** `POST /api/webhooks/mailgun`

Register for events: `delivered`, `opened`, `clicked`, `unsubscribed`, `complained`, `permanent_fail`

**Signature verification:** HMAC-SHA256 using Mailgun's Webhook Signing Key (separate from API key):
```
HMAC-SHA256(signing_key, timestamp + token) === signature
```

**Tags per email:**
- `campaign-{campaign_id}` — links to the campaign
- `sequence-{sequence_id}` — links to the sequence (if applicable)
- `variant-A` or `variant-B` — A/B test variant
- `step-{1|2|3}` — sequence step number

### Event Storage

```sql
CREATE TABLE email_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id),
  variant_id UUID REFERENCES campaign_variants(id),
  event_type TEXT NOT NULL,  -- delivered, opened, clicked, unsubscribed, complained, bounced
  recipient TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB,  -- url, device info, client-info.bot, ip, user-agent
  is_bot BOOLEAN DEFAULT false,  -- Mailgun bot detection flag
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_events_campaign ON email_events(campaign_id);
CREATE INDEX idx_email_events_recipient ON email_events(recipient);
CREATE INDEX idx_email_events_type ON email_events(event_type);
```

### Jelly API Integration

**Purpose:** Correlate email clicks with actual platform re-engagement.

After a `clicked` event, query the Jelly API for the user's subsequent activity:
- Did they return to the app?
- Did they watch a video, post content, interact with friends?
- Are they still active at 7 and 30 days?

```sql
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
  relapsed BOOLEAN DEFAULT false,  -- returned but went inactive again
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Dashboard Metrics

**Per-campaign view:**
- Delivered count, open rate, click rate, bounce rate, unsubscribe rate, complaint rate
- Open rate caveat: Apple Mail Privacy Protection inflates opens — click rate is the reliable engagement signal
- Time-series chart of events over first 7 days
- A/B comparison table (if variants exist)

**Per-sequence view:**
- Full funnel: Sent → Opened → Clicked → Returned to App → Active at 7d → Active at 30d
- Drop-off percentages between each step
- Which email in the sequence drove the most returns
- Relapse rate (returned but went inactive again)
- Smart suppression log (users excluded from later emails because they re-engaged)

**Overall dashboard:**
- Campaign list with inline stats (open rate, click rate per row)
- Active sequences with next scheduled send date
- Aggregate re-engagement rate across all campaigns

### Tracking Limitations

- **Open rate is unreliable** due to Apple Mail Privacy Protection (pre-fetches tracking pixels). Use Mailgun's `client-info.bot` flag to filter bot opens where possible.
- **Click rate is reliable** — requires actual user interaction.
- **Mailgun Events API** retains data for 1-30 days depending on plan. Webhooks + our own `email_events` table provide permanent storage.
- **Mailgun tag limit:** 4,000 unique tags per account. Use campaign IDs as tags (one per campaign, not per recipient).

---

## 5. Sequence Scheduling

### Database

```sql
CREATE TABLE email_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'reengagement',
  spacing_days INT DEFAULT 7,
  audit_data JSONB,  -- Product Audit inputs
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add sequence support to campaigns
ALTER TABLE email_campaigns
  ADD COLUMN sequence_id UUID REFERENCES email_sequences(id),
  ADD COLUMN sequence_step INT,
  ADD COLUMN scheduled_at TIMESTAMPTZ;
```

### Scheduling Mechanism

- A Vercel Cron job runs daily (or every 6 hours) checking for campaigns where `scheduled_at <= now()` and `status = 'draft'`
- When triggered, the cron job:
  1. Fetches the sequence and campaign
  2. Checks smart suppression (exclude users who already clicked/re-engaged from a previous step)
  3. Sends the campaign
  4. Updates status to 'sending' → 'completed'
  5. If this was the last step, marks the sequence as 'completed'

### Smart Suppression

Before sending step 2 or 3, query `email_events` for `clicked` events from previous steps in the same sequence. Exclude those recipients — they already re-engaged and don't need more emails.

---

## 6. Admin UI (Light Polish)

- Table rows: hover state with `background: rgba(255,255,255,0.03)`
- Status badges: pill style with background colors (draft: `#333`, sending: `#422006`, completed: `#052e16`, failed: `#2d0a0a`)
- Empty state: helpful message with quick-start links to create first campaign
- Template picker: visual card grid (6 cards) showing miniature template preview, name, and 1-line description. Selected card highlighted with `2px solid #89A9F4` border
- Campaign detail: A/B comparison table when variants exist
- Sequence view: timeline visualization showing the 3 steps with status indicators

---

## 7. Re-engagement Research Conclusions

### Key Findings

1. **Personalization is non-negotiable.** Personalized emails see 26% higher open rates and 2.8x-300x better conversion. Use friends' activity, trending content, creator updates.

2. **"Value-Proof" beats "We miss you."** Product Evolution Messaging (proving the product has changed) outperforms emotional appeals and discount-based winback.

3. **Keep it short.** 75-100 words, single CTA button, minimal design for personal-feel emails.

4. **3-email drip is optimal.** Start at 30-45 days inactive, 7-day spacing. After 3 unanswered emails, sunset the address.

5. **Tuesday/Thursday at 9-11 AM** are the highest-engagement send times.

6. **FOMO + social proof** is the most effective combination for social platforms. "Your friends posted 12 new videos" beats "We miss you."

7. **Click rate is the reliable metric** — open rate is inflated by Apple Mail Privacy Protection.

8. **Track relapse rate**, not just re-engagement rate. A user who returns once and leaves again was not truly re-engaged.

9. **A/B test everything** — subject lines, content length, templates, CTAs. Small differences in subject line wording can swing open rates by 10%+.

10. **Send to inactives in small batches** — max 10% of daily sending volume. Sudden spikes to inactive addresses damage sender reputation.

### Segmentation Strategy

| Segment | Timeframe | Messaging Strategy |
|---|---|---|
| At-Risk | 14-30 days | Increase relevance, personalized content |
| Lapsing | 30-60 days | Begin Value-Proof sequence |
| Dormant | 60-90 days | Aggressive re-engagement with insider access |
| Inactive | 90-180 days | Final attempt + sunset warning |
| Dead | 180+ days | Remove from list |

### Anti-patterns to Avoid

- Never send to entire inactive list at once (damages sender reputation)
- Never use misleading subject lines ("Re: Your account")
- Never continue emailing after 3 failed re-engagement attempts
- Keep spam complaint rate below 0.1% (Google/Yahoo requirement)
- No generic "We miss you" or "Come back" — every email must deliver concrete value

### Expected Performance

| Metric | Benchmark |
|---|---|
| Win-back open rate | ~29% |
| Win-back click rate | ~18% |
| Re-engagement rate | 10-15% (good), 20%+ (excellent) |
| Expected ROI | 32x-182x on campaign costs |

---

## Implementation Priority

1. **Email templates** (6 HTML files matching JellyJelly brand)
2. **A/B testing** (variant schema, random split, comparison dashboard)
3. **Re-engagement builder** (Product Audit flow, AI sequence generation)
4. **Tracking** (Mailgun webhooks, event storage, dashboard metrics)
5. **Sequence scheduling** (cron job, smart suppression)
6. **Jelly API integration** (re-engagement outcome tracking)
7. **Admin UI polish** (template picker, table refinements)
