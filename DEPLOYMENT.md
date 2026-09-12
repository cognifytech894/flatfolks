**Deployment (Vercel + Supabase, free tier)**

Prerequisites

- A GitHub repo with this code pushed (already done: https://github.com/cognifytech894/flatfolks).
- A free [Supabase](https://supabase.com) account.
- A free [Vercel](https://vercel.com) account.
- (Optional) A purchased domain to point at the Vercel deployment.

1. Database setup (Supabase)

1. Create a new Supabase project (choose a region close to your users, e.g. Mumbai/Singapore for India).
2. Open **SQL Editor** in the Supabase dashboard, paste the contents of `data/schema.sql`, and run it. This creates the tables and seeds the demo listings/testimonials.
3. Go to **Project Settings → Database → Connection string → URI**. Use the **Transaction pooler** connection string (port 6543) — this is required for serverless hosts like Vercel, which open many short-lived connections.

2. App deployment (Vercel)

1. Go to [vercel.com/new](https://vercel.com/new), import the `cognifytech894/flatfolks` GitHub repo.
2. In the import screen (or later under **Settings → Environment Variables**), add:
   - `DATABASE_URL` = the Supabase connection string from step 1.3.
3. Deploy. Vercel builds and hosts the app on a free `*.vercel.app` URL.

3. Connect your domain

1. In the Vercel project, go to **Settings → Domains** and add your purchased domain.
2. Vercel shows the exact DNS records to add (usually an `A` record or `CNAME`) — add them in your domain registrar's DNS settings.
3. Vercel automatically issues a free SSL certificate once DNS propagates (can take up to a few hours).

Local development

```powershell
npm.cmd ci
```

Copy `.env.example` to `.env.local` and set `DATABASE_URL` to a Supabase connection string (or a local Postgres instance for offline testing), then:

```powershell
npm.cmd run dev
```

Notes

- Listings, users, feedback, and OTP codes all persist in Postgres via Supabase — this works correctly across Vercel's stateless serverless instances (OTPs auto-expire after 10 minutes via `expires_at`).
- If photo uploads fail, check Supabase's request size limits — base64-encoded images are capped at ~2MB each in the app already (`src/app/api/listings/route.ts`).
