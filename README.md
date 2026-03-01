# JellyJelly Email Broadcast

Admin tool for composing and sending mass email campaigns to JellyJelly users. Built with SvelteKit, Mailgun, Supabase, and Claude AI.

## Features

### Campaign Management
- **Campaign Dashboard** — View all campaigns with status, delivery stats, open/click rates
- **Compose with AI Assist** — Write email content manually or use Claude to generate/refine
- **Batch Sending** — Sends to all Supabase auth users in batches of 50 with Mailgun rate limiting
- **Suppression Management** — View and manage Mailgun unsubscribes, bounces, and complaints
- **CAN-SPAM Compliant** — HMAC-signed unsubscribe tokens, physical address in footer, one-click unsubscribe headers
- **Unsubscribe via Mailgun** — All unsubscribes go through Mailgun's suppression API and are auto-excluded from future sends

### Email Templates (11 Pre-built)

All templates match the established JellyJelly email brand from the notification emails (`#4469B7` blue background, Roboto font, white text, `#89A9F4` rounded CTA buttons). CTA buttons use `{{cta_url}}` placeholders — set a custom link per campaign or default to `https://jellyjelly.com`.

| Template | Use Case | Key Feature |
|---|---|---|
| **Announcement** | Feature launches, app updates | Bold "BIG NEWS!" heading, single CTA |
| **Weekly Digest** | Content roundups, trending highlights | "THIS WEEK ON JELLYJELLY" heading |
| **Product Spotlight** | Showcasing features/content | Large feature image (600x338) with play overlay |
| **Event Invite** | Livestreams, AMAs, community events | Styled event details quote box |
| **Re-engagement** | Value-Proof winback campaigns | 1-3 feature update blocks with before/after framing |
| **Minimal** | Personal notes, founder updates | Logo + plain text, no heavy design |
| **Glass** | Dark glassmorphism | Frosted card with blur backdrop |
| **Tactile** | Neo-brutalist | Bold borders and shadows |
| **Newsletter** | Editorial style | Serif typography |
| **Noir** | Dark cinematic | Gold accents on dark background |
| **Gradient** | Vibrant mesh | Gradient mesh background |

### Re-engagement Campaign Builder

A guided "Product Audit" flow for building Value-Proof winback campaigns:

1. **Product Audit** — Structured prompts ask the author about feature changes, pain points, and speed-to-value metrics
2. **AI Sequence Generation** — Claude generates a 3-email sequence from the audit data:
   - **Email 1: "What You Missed"** — Value-led, features product evolution (reengagement template)
   - **Email 2: "Direct-to-Expert"** — Personal PM/founder note (minimal template)
   - **Email 3: "Insider Access"** — Beta invite or exclusive access (announcement template)
3. **Sequence Scheduling** — All 3 emails linked with configurable spacing (default 7 days). Auto-sends on schedule.
4. **Smart Suppression** — Users who click/re-engage on earlier emails are excluded from later sequence emails

### A/B Testing

- Create Variant A and Variant B of any campaign (different subject, body, or template)
- Set split ratio (default 50/50, configurable)
- Recipients randomly assigned to variants on send
- Dashboard shows side-by-side comparison: open rate, click rate, returns to app
- Statistical significance indicator for confident winner detection

### Tracking & Analytics

- **Mailgun Webhooks** — Real-time tracking of delivered, opened, clicked, bounced, complained, unsubscribed events
- **Event Storage** — All events stored in Supabase for permanent analytics (Mailgun retains 1-30 days)
- **Jelly API Integration** — Correlates email clicks with actual platform returns. Tracks: returned to app, active at 7d, active at 30d, relapse rate
- **Campaign Metrics** — Delivered count, open rate, click rate, bounce rate, unsubscribe rate
- **Sequence Funnel** — Sent → Opened → Clicked → Returned → Active at 7d → Active at 30d
- **A/B Comparison** — Per-variant metrics with winner detection

---

## Re-engagement Strategy Guide

### The "Value-Proof" Framework

Instead of "we miss you" messaging, prove that the product the user left is not the product that exists today. This is called Product Evolution Messaging.

**Why it works:** Re-engagement campaigns average a 29% open rate (vs 21.5% general). Users don't respond to guilt — they respond to value they're missing.

**The 3 principles:**
1. **Zero-click optimization** — Provide the value in the email itself, don't gate it behind a click
2. **Product evolution, not emotional appeal** — "Here's what changed" beats "We miss you"
3. **Social proof + FOMO** — "Your friends posted 12 new videos" is the strongest hook for social platforms

### Subject Line Best Practices

**Top-performing patterns:**

| Pattern | Example | Open Rate Lift |
|---|---|---|
| Product evolution | "{Name}, the app you left isn't the app we have now" | High (curiosity) |
| What you missed | "3 things that changed since you left" | High (FOMO + specificity) |
| Social proof | "Your friends posted 12 new videos this week" | Highest for social platforms |
| Direct/honest | "Should we stop emailing you?" | High (loss aversion) |
| Insider access | "We saved a spot for you" | Medium-high (exclusivity) |

**Rules:**
- **6-10 words (30-50 characters)** — optimal length for open rates
- Front-load important words for mobile truncation
- Never repeat the subject line in the preheader — extend the story instead
- Emojis provide ~4.7% higher open rate but test for your audience
- Preheader: 40-55 characters, e.g., Subject: "Things have changed" / Preheader: "Here's what your friends have been up to"

### Email Content Best Practices

- **75-100 words** — optimal body length (50% response rate range)
- **Single CTA button** — gets 371% more clicks than multiple CTAs
- **Button CTAs** — improve CTR by 127% vs text links
- **Tone:** Casual, value-driven, like a friend nudging you
- **No generic cliches:** No "We miss you", "Come back", "It's been a while"
- **Structure:** Personal greeting → Acknowledge absence (1 line) → Value proposition (2-3 bullets) → Single CTA

### Effective CTAs for Social/Video Platforms

- "SEE WHAT'S NEW" (curiosity-driven)
- "WATCH NOW" (action-oriented, platform-specific)
- "JUMP BACK IN" (casual, low-friction)
- "SEE WHAT YOU MISSED" (FOMO)

### Timing & Cadence

| Parameter | Recommendation |
|---|---|
| First email after inactivity | 30-45 days |
| Spacing between sequence emails | 7-10 days |
| Best send days | Tuesday and Thursday |
| Best send time (opens) | 9-11 AM recipient local time |
| Best send time (clicks) | 3-4 PM |
| Max re-engagement attempts | 3 emails, then sunset |
| Max % of daily volume to inactives | 10% |

### Segmentation Strategy

| Segment | Timeframe | Strategy |
|---|---|---|
| At-Risk | 14-30 days inactive | Increase relevance, personalized content |
| Lapsing | 30-60 days inactive | Begin Value-Proof sequence |
| Dormant | 60-90 days inactive | Aggressive re-engagement + insider access |
| Inactive | 90-180 days inactive | Final attempt + sunset warning |
| Dead | 180+ days inactive | Remove from list |

### What NOT to Do

- Never send to entire inactive list at once (damages sender reputation)
- Never use misleading subject lines ("Re: Your account", "Fwd: Important")
- Never continue emailing after 3 failed re-engagement attempts
- Keep spam complaint rate below 0.1% (Google/Yahoo requirement since 2024)
- Don't rely on open rate alone — Apple Mail Privacy Protection inflates it
- Don't send re-engagement emails to more than 10% of daily volume

### Expected Performance Benchmarks

| Metric | Benchmark |
|---|---|
| Win-back open rate | ~29% |
| Win-back click rate | ~18% |
| Re-engagement rate | 10-15% (good), 20%+ (excellent) |
| Relapse rate (goal) | < 40% at 30 days |
| Spam complaint rate (max) | < 0.1% |
| Expected ROI | 32x-182x on campaign costs |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in all values. See `.env.example` for descriptions.

### 3. Run database migration

Copy `schema.sql` into the Supabase SQL Editor and run it.

### 4. Configure Mailgun webhooks

In Mailgun Dashboard > Sending > Webhooks, register your endpoint for these events:
- `delivered`, `opened`, `clicked`, `unsubscribed`, `complained`, `permanent_fail`
- Webhook URL: `https://your-domain.com/api/webhooks/mailgun`

### 5. Start dev server

```bash
npm run dev
```

Admin dashboard at `http://localhost:5173`.

## Environment Variables

| Variable | Description |
|---|---|
| `PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `ADMIN_USER_IDS` | Comma-separated Supabase user UUIDs allowed to access admin |
| `MAILGUN_API_KEY` | Mailgun API key |
| `MAILGUN_DOMAIN` | Mailgun sending domain (default: `email.jellyjelly.com`) |
| `MAILGUN_WEBHOOK_SIGNING_KEY` | Mailgun webhook signing key (separate from API key) |
| `UNSUBSCRIBE_SECRET` | 32-byte hex key for HMAC unsubscribe tokens |
| `DIGEST_API_SECRET` | Shared secret for weekly digest pipeline auth |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI email composition |
| `SITE_URL` | Base URL for unsubscribe links (default: `https://jellyjelly.com`) |
| `JELLY_API_URL` | Jelly API base URL for re-engagement outcome tracking |

## Architecture

```
src/
├── lib/
│   ├── email/
│   │   ├── mailgun.ts            # Mailgun API client (send, suppressions, stats)
│   │   ├── sender.ts             # Batch campaign sending with A/B split logic
│   │   ├── tokens.ts             # HMAC unsubscribe token signing/verification
│   │   └── ai-compose.ts         # AI email generation via Claude
│   ├── email-templates/
│   │   ├── announcement.html     # Bold announcement template
│   │   ├── digest.html           # Weekly digest with "THIS WEEK" heading
│   │   ├── spotlight.html        # Product/feature spotlight
│   │   ├── event.html            # Event invite with details box
│   │   ├── reengagement.html     # Value-Proof winback template
│   │   ├── minimal.html          # Plain-text-feel personal note
│   │   ├── glass.html            # Dark glassmorphism with frosted card
│   │   ├── tactile.html          # Neo-brutalist with bold borders
│   │   ├── newsletter.html       # Editorial style with serif typography
│   │   ├── noir.html             # Dark cinematic with gold accents
│   │   └── gradient.html         # Vibrant gradient mesh background
│   └── server/
│       ├── supabase.ts           # Supabase client singleton
│       ├── admin.ts              # Admin auth (cookie + digest secret)
│       └── tracking.ts           # Mailgun event processing + Jelly API
├── routes/
│   ├── /                         # Campaign list dashboard with stats
│   ├── /compose                  # Campaign composer (standard + re-engagement flows)
│   ├── /compose/reengagement     # Guided Product Audit + AI sequence builder
│   ├── /[id]                     # Campaign detail + A/B comparison + send
│   ├── /sequences                # Sequence list and management
│   ├── /sequences/[id]           # Sequence funnel view
│   ├── /suppression              # Mailgun suppression list manager
│   ├── /api/email/send           # Campaign send API (with A/B split)
│   ├── /api/email/ai             # AI compose API
│   ├── /api/webhooks/mailgun     # Mailgun webhook receiver
│   └── /unsubscribe              # Public unsubscribe page
```

## Email Template Design System

All templates are built on the established JellyJelly email brand:

| Property | Value |
|---|---|
| Background | `#4469B7` (JellyJelly blue) |
| Text | `#ffffff` |
| CTA button color | `#89A9F4` |
| CTA border-radius | `999px` (full pill) |
| CTA style | Uppercase, bold, full-width on mobile |
| Font | Roboto (Google Fonts) → Helvetica → Arial → sans-serif |
| Heading size | 48px desktop / 32px mobile |
| Heading style | Bold, uppercase, multi-line with tight line-height (0.8) |
| Max width | 600px |
| Layout | Table-based with VML Outlook fallback |
| Logo | White JellyJelly (56x56) from `static1.jellyjelly.com` |
| Footer | Unsubscribe + physical address in `#aaaaaa` |
| Video thumbnails | Play button overlay (48x48) with background-image + VML |

## Auth

- **Admin pages**: Supabase session cookie (`sb-access-token`). Only UUIDs in `ADMIN_USER_IDS` can access.
- **Send API**: Admin session cookie OR `Authorization: Bearer <DIGEST_API_SECRET>` for pipeline access.
- **Webhook API**: Verified via Mailgun's HMAC-SHA256 signature (separate signing key).
- **Dev mode**: Auth bypassed when running `npm run dev`.

## Deployment

Configured for Vercel via `@sveltejs/adapter-vercel`. Push to deploy.

Vercel Cron required for sequence scheduling (check `scheduled_at` campaigns every 6 hours).

## Weekly Digest Integration

The [jellyjelly-weekly-digest](https://github.com/Smalltalk-Fam/jellyjelly-weekly-digest) bot sends weekly digest emails via this tool's `/api/email/send` endpoint using `DIGEST_API_SECRET` for auth. The digest generates body content HTML and the broadcast system wraps it in the branded `digest` template with proper unsubscribe tokens, List-Unsubscribe headers, suppression filtering, rate limiting, and campaign tracking.

**Required setup**: Set the same `DIGEST_API_SECRET` value in both:
- This project's `.env` (or Vercel env vars)
- The weekly digest repo's GitHub Actions secrets

## Related

- [jellyjelly-weekly-digest](https://github.com/Smalltalk-Fam/jellyjelly-weekly-digest) — Automated weekly digest bot that sends emails via this tool's API
- [jellyjelly-website](https://github.com/Smalltalk-Fam/jellyjelly-website) — Production deployment (admin broadcast routes live at `jellyjelly.com/admin_broadcast`)
- [jelly-api-legacy](https://github.com/Smalltalk-Fam/jelly-api-legacy) — JellyJelly backend API + existing notification email templates
