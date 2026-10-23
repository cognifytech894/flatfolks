# FlatFolks Website Overview

FlatFolks is a housing-discovery platform for finding rooms, flats, PGs, and compatible flatmates in India. SEO focus: Noida, Greater Noida (incl. Greater Noida West / Noida Extension), Gurgaon and Ghaziabad.

_Last updated: 23 October 2026. Items marked **(new, date)** changed recently; everything still to do is under [Pending](#pending)._

## Features (live)

### Home page

- Hero search: on mobile just Location + Search with budget, property type and gender behind a "Filters" button; one-tap area chips (Gaur City 2, Noida Ext., Sector 62, Sector 137). **(new, 23 Oct)**
- Mobile bottom nav: Home, Find Room, a raised **+ Post** button, Flatmates and Profile/Login; chat is an icon in the mobile header; About is in the footer. **(new, 23 Oct)**
- Popular cities, featured rooms (property offers only, from the visitor's city) and "How FlatFolks works".
- Trust stats row (10,000+ users, 5,000+ properties, etc.) is hidden on the home and About pages, not deleted — set `SHOW_STATS = true` in `src/components/home/stats-row.tsx` to show it again. **(new, 23 Oct)**

### Search and listings

- Browse listings by location, budget, property type, gender preference and amenities.
- Listing detail page: photo carousel, bedroom/bathroom counts, description, amenities, furnishing, nearest metro, lifestyle tags, owner's name, and Call / WhatsApp buttons.
- Contact details are shown only to signed-in users; saving a listing requires login.
- Clean listing URLs, e.g. `/greater-noida/noida-extension/gaur-city-2/<listing>`.

### Property posting

Two flows, both requiring a contact number:

- **Looking for a flatmate** (flat/room offer): title, flat type, bedrooms/bathrooms, rent, deposit, availability, preferred gender, optional furnishing and nearest metro, amenities, lifestyle tags, description, and up to 3 photos (compressed and cropped in the browser, stored in Supabase Storage).
- **Looking for a flat** (requirement): title, needed-from date, preferred gender, location, max budget, amenities and lifestyle tags — no photos.
- Server-side validation, rate limiting, and a check that uploaded image bytes match their claimed type.

### Flatmates

- Lists posted flat requirements (people looking for a flat) with name, gender preference, location, budget, amenities, lifestyle tags and contact number.
- "I have a suitable flat" opens that requirement's interest flow.

### Chat, interest and wishlist

- Submitting interest on a listing adds its owner to your contacts; contacts can be removed.
- Same-browser chat across tabs, with a browser notification on new messages.
- Save and remove listings in a wishlist; totals show on the dashboard.

### Login and profile

- Email OTP login/signup, sent via Resend from `otp@flatfolks.in`; codes expire in 10 minutes and requests are rate-limited. No passwords.
- Sessions use a secure, httpOnly cookie (30 days).
- Edit name, phone, location and gender; upload a profile photo (any format, with crop/adjust) or pick a preset avatar; Dashboard link card.

### Dashboard

- Stat cards for views, saved listings, messages and interests.
- "My Posts": edit or delete your own posts; removed posts show when they'll be deleted and a Restore button.

### Post lifecycle **(new, 23 Oct)**

- Signed-in activity (login, any signed-in request, a daily ping on page visits) updates `users.last_seen_at`.
- A daily Vercel Cron (`/api/cron/inactive-posts`, `vercel.json`) removes the posts of owners not seen for 30 days and sends one email per owner with a "Restore my post" link per post (signed, 30-day, single-post tokens; restoring takes a button press on `/restore`). Failed emails retry the next day. Optional 5-day warning email (`INACTIVITY_WARNING_EMAILS`).
- Removed posts disappear from search, place pages, sitemaps and counts; their URL says "This post is no longer available" (noindex, no phone). 30 days after removal they're permanently deleted with their photos, and the URL returns 410.
- Accounts are never deleted or changed by this. Admin-managed posts are never removed. Rules: `src/lib/inactive-posts.ts`; tests: `npm run test:inactive` and `npm run test:inactive:e2e` (Docker Postgres).

### Admin workspace

- `/admin` behind a username/password login set via `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars.
- Active / removed / permanently deleted post counts, real account count and recent signups, a views/saves table, view/delete for any listing, and an "Admin-managed" toggle (never removed for inactivity).

### Content and legal pages

- About (`/about`) and Blog (`/blog`, 3 renting guides).
- Privacy Policy (`/privacy-policy`), Terms of Use (`/terms`) and Contact (`/contact`, email only), linked in the footer under "Renting guides & tips". Contact email is set in `src/data/contact.ts`. **(new, 23 Oct)**

### SEO

- City, locality and society landing pages, each with intent pages (`/flats-for-rent`, `/flatmates`, `/sharing-flat`).
- A page is indexed only when it has enough real listings. Thin pages, filtered views (`?budget=`, `?gender=`), `/search` and non-target cities (Mumbai, Bangalore, Pune, etc.) are `noindex, follow` on purpose — this is why Search Console shows ~200 pages as "Excluded by noindex", which is expected.
- Split sitemaps under `/sitemap.xml` (pages, cities, localities, societies, listings, blog). Empty child sitemaps are left out of the index and return 404; the sitemap returns 503 if the database is down. **(new, 12–23 Oct)**
- Metadata, Open Graph, structured data (Organization/WebSite), and a robots.txt that blocks only private paths.
- Place copy contains no unverified claims (metro distances, landmarks, rent figures).

## Pending

### Setup on Vercel

- Set `CRON_SECRET` and `RESTORE_TOKEN_SECRET` (and optionally `INACTIVITY_WARNING_EMAILS=true`) in the Vercel project's environment variables. Until then the cron answers 500 and nothing is removed.

### Before running Google Ads

- Remove or verify unproven claims: "Trusted by 25k+ renters and landlords", "Verified listings" and "24/7 support" (footer), "10,000+ Flatmates Already Joined" (home), and "verified" wording on the About page. Google Ads can reject ads for these under its Misrepresentation policy.
- Add the Google tag and conversion tracking (needs the `AW-` ID from the Google Ads account).
- Only 2 live listings — start ads on posting/signup or on Greater Noida West only.

### Search Console

- "Redirect error" on 1 URL — needs the URL from the report.
- `sitemap-societies.xml` "1 error" clears once Google re-reads it.

### Product gaps

- Chat has no server backend: it only syncs between tabs in the same browser, not between two people's devices.
- Dashboard "recent activity" and "profile status" panels are placeholders.
- Admin has no user management, report queue or moderation workflow.
- Profile details are also cached in `localStorage` for the UI.
- No error monitoring.

## Deployment

See `DEPLOYMENT.md` for both paths:

- **Self-hosted Ubuntu 24.04 LTS**: Node + local Postgres + Nginx, provisioned by `deploy/setup-ubuntu.sh`.
- **Vercel + Supabase** (free tier): hosted Postgres, serverless.
