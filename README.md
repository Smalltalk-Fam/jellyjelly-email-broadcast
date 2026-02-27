# JellyJelly Email Broadcast

Admin tool for composing and sending mass email campaigns to JellyJelly users. Built with SvelteKit, Mailgun, and Supabase.

## Features

- **Campaign Dashboard** — View all campaigns with status, delivery stats, and dates
- **Compose with AI Assist** — Write email HTML manually or use Claude to generate/refine content
- **Batch Sending** — Sends to all Supabase auth users in batches of 50, with Mailgun rate limiting
- **Suppression Management** — View and manage Mailgun unsubscribes, bounces, and complaints
- **CAN-SPAM Compliant** — HMAC-signed unsubscribe tokens, physical address in footer, one-click unsubscribe headers
- **Unsubscribe via Mailgun** — All unsubscribes are managed through Mailgun's suppression API. When users click unsubscribe, they're added to Mailgun's suppression list and automatically excluded from future sends
- **Digest Pipeline Integration** — The `/api/email/send` endpoint accepts Bearer token auth for automated sends from the [weekly digest bot](https://github.com/Smalltalk-Fam/jellyjelly-weekly-digest)
- **Email Templates** — Branded HTML email templates (default + weekly digest) with `{{body}}` and `{{unsubscribe_url}}` placeholders

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in all values in `.env`. See `.env.example` for descriptions.

### 3. Run database migration

Copy `schema.sql` into the Supabase SQL Editor and run it to create the `email_campaigns` table.

### 4. Start dev server

```bash
npm run dev
```

The admin dashboard will be at `http://localhost:5173`.

## Environment Variables

| Variable | Description |
|---|---|
| `PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `ADMIN_USER_IDS` | Comma-separated Supabase user UUIDs allowed to access admin |
| `MAILGUN_API_KEY` | Mailgun API key |
| `MAILGUN_DOMAIN` | Mailgun sending domain (default: `email.jellyjelly.com`) |
| `UNSUBSCRIBE_SECRET` | 32-byte hex key for HMAC unsubscribe tokens |
| `DIGEST_API_SECRET` | Shared secret for weekly digest pipeline auth |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI email composition |
| `SITE_URL` | Base URL for unsubscribe links (default: `https://jellyjelly.com`) |

## Architecture

```
src/
├── lib/
│   ├── email/
│   │   ├── mailgun.ts          # Mailgun API client (send, suppressions)
│   │   ├── sender.ts           # Batch campaign sending logic
│   │   ├── tokens.ts           # HMAC unsubscribe token signing/verification
│   │   └── ai-compose.ts       # AI email generation via Claude
│   ├── email-templates/
│   │   ├── default.html        # Standard campaign template
│   │   └── digest.html         # Weekly digest template
│   └── server/
│       ├── supabase.ts         # Supabase client singleton
│       └── admin.ts            # Admin auth (cookie + digest secret)
└── routes/
    ├── /                       # Campaign list dashboard
    ├── /compose                # New campaign composer with AI assist
    ├── /[id]                   # Campaign detail + send button
    ├── /suppression            # Mailgun suppression list manager
    ├── /api/email/send         # Campaign send API
    ├── /api/email/ai           # AI compose API
    └── /unsubscribe            # Public unsubscribe page
```

## Auth

- **Admin pages**: Authenticated via Supabase session cookie (`sb-access-token`). Only users whose UUID is in `ADMIN_USER_IDS` can access the admin dashboard.
- **Send API**: Accepts either admin session cookie or `Authorization: Bearer <DIGEST_API_SECRET>` for automated pipeline access.
- **Dev mode**: Auth is bypassed when running `npm run dev` for local testing.

## Deployment

Configured for Vercel via `@sveltejs/adapter-vercel`. Push to deploy.

## Related

- [jellyjelly-weekly-digest](https://github.com/Smalltalk-Fam/jellyjelly-weekly-digest) — Automated weekly digest bot that triggers email sends via this tool's API
- [jelly-api-legacy](https://github.com/Smalltalk-Fam/jelly-api-legacy) — JellyJelly backend API
