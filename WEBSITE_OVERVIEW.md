# FlatFolks Website Overview

FlatFolks is a housing-discovery platform for finding rooms, flats, PGs, and compatible flatmates in India. SEO focus: Noida, Greater Noida (incl. Greater Noida West / Noida Extension), Gurgaon and Ghaziabad.

_Last updated: 23 October 2026. Items marked **(new, date)** changed recently; everything still to do is under [Pending](#pending)._

## Features (live)

### Home page

- Hero search bar, popular cities, featured rooms (property offers only, from the visitor's city) and "How FlatFolks works".
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
- "My Posts": edit or delete your own posts.

### Admin workspace

- `/admin` behind a username/password login set via `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars.
- Listing counts, real account count and recent signups, a views/saves table, and view/delete for any listing.

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

### In progress (local, not pushed)

- **Search filters upgrade**: flat configuration (1RK–3BHK), room type (private/shared), tenant preference (students / working professionals), min and max budget, near-metro search, and a sort dropdown (newest, rent low→high, high→low); replaces the old gender filter. Touches `data/schema.sql` and `src/lib/database.ts` — run the DB migration before deploying.

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
