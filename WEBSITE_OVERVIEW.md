# FlatFolks Website Overview

FlatFolks is a housing-discovery platform for finding rooms, flats, PGs, and compatible flatmates in India. SEO focus: Delhi, Noida, Greater Noida (incl. Greater Noida West / Noida Extension), Gurgaon and Ghaziabad.

_Last updated: 26 October 2026. Items marked **(new, date)** changed recently; everything still to do is under [Pending](#pending)._

## Features (live)

### Home page

- Hero search: Location, Max budget (₹/month), property type and gender in one row; on mobile only Location + Search show, with the rest behind a "Filters" button. **(new, 24 Oct)**
- Popular cities (Noida, Greater Noida, Delhi, Gurgaon), each linking to its city page; featured rooms (property offers only, from the visitor's city) and "How FlatFolks works".
- Trust stats row (10,000+ users, 5,000+ properties, etc.) is hidden on the home and About pages, not deleted — set `SHOW_STATS = true` in `src/components/home/stats-row.tsx` to show it again.

### Navigation

- Desktop header: Home, Find Room, Find Flatmates and an "Add Listing" menu (Looking for a flat / Looking for a flatmate), each with an icon above the label; profile photo or Login on the right. **(new, 24 Oct)**
- Mobile bottom nav: Home, Find Room, a raised **+ Post** button, Flatmates and Profile/Login.
- Footer: logo with a "Trust" list (Free to list, Contact owners directly, No fees from FlatFolks), an "About" column (Company, Terms & Conditions, Privacy Policy, Contact), and "Popular searches" as `#keyword` chips grouped by city. **(new, 23–24 Oct)**

### Search and listings

- `/search` filters: locations (one or more cities or PIN codes), max budget, flat size, room type, preferred gender, preferred tenants, amenities (incl. furnished), near metro station, and sort (newest, rent low–high, high–low). No keyword search box. **(new, 26 Oct)**
- Listing detail page: photo carousel, fact cards (monthly rent, security deposit, room type, BHK, bathrooms, flatmate preference, available from, furnishing), description, amenities, nearest metro, lifestyle tags, owner's name, and Call / WhatsApp buttons. **(new, 24 Oct)**
- Contact details are shown only to signed-in users; saving a listing requires login.
- Clean listing URLs, e.g. `/greater-noida/noida-extension/gaur-city-2/<listing>`.

### Budget rules **(new, 24 Oct)**

- A budget is only ever what the visitor typed: never preset, guessed, prefilled from profile/location/previous visits, or widened. No budget chips or preset amounts.
- Room search uses one optional "Max budget (₹/month)", sent as `?budget=`, and shows only rent ≤ budget. Old `?budget=a-b` and `?maxBudget=` links keep their maximum; a min budget is ignored.
- No match: "No rooms up to ₹X right now", a "Change budget" button (focuses the field, keeps the value) and "Post requirement" carrying only the location and budget the visitor typed.
- Flatmates pages ask owners for "Your rent (₹/month)" (`?rent=`) and show requirements whose max budget ≥ that rent; no match offers "Post your flat".
- Amounts read "₹8,000/month" everywhere; requirements show "Max budget".
- Rules in `src/lib/budget.ts`; tests: `npm run test:budget`.

### Property posting

Two flows, both requiring a contact number:

- **Looking for a flatmate** (flat/room offer): title, flat type, bedrooms/bathrooms, monthly rent (₹/month, "for the room or bed you're offering, not the whole flat"), security deposit (₹), availability, preferred gender, optional furnishing and nearest metro, amenities, lifestyle tags, description, and up to 3 photos (compressed and cropped in the browser, stored in Supabase Storage).
- **Looking for a flat** (requirement): title, needed-from date, preferred gender, location, max budget (₹/month), amenities and lifestyle tags — no photos.
- No amount is prefilled; only the "Post requirement" link from an empty search carries the visitor's own location and budget.
- Server-side validation, rate limiting, and a check that uploaded image bytes match their claimed type. Phone numbers: 10+ digits, spaces, `+` and `-` allowed (the form's check was broken from 23 to 24 Oct and rejected every number). **(fixed, 24 Oct)**

### Flatmates

- Lists posted flat requirements (people looking for a flat) with name, photo, gender preference, location, max budget, amenities and lifestyle tags. The phone number is only on the requirement's own page, for signed-in users.
- Filters: preferred gender and "Your rent (₹/month)".

### Login and profile

- Email OTP login/signup, sent via Resend from `otp@flatfolks.in`; codes expire in 10 minutes and requests are rate-limited. No passwords.
- Sessions use a secure, httpOnly cookie (30 days).
- A new account gets a one-time welcome email ("Hi Folks," with Find a Room, List Your Room for Free and Complete My Profile buttons) from `hello@` on the Resend domain, sent after the login response so it never slows or blocks login. Template: `src/lib/welcome-email.ts`; tests: `npm run test:welcome`. **(new, 26 Oct)**
- Profile page: summary card with a large photo and name, preset avatars (illustrated, 2 male and 3 female), and a personal-details card with edit/save. Tapping the photo opens it large with Change and Remove. **(new, 24 Oct)**
- Dashboard and log out are linked from the profile.

### Dashboard

- Stat cards for listing views (not tracked yet, shows 0) and saved listings. Saved listings are kept in the browser; posts that were removed or deleted drop out of the list.
- "My Posts": edit or delete your own posts; removed posts show when they'll be deleted and a Restore button.

### Post lifecycle

- Signed-in activity (login, any signed-in request, a daily ping on page visits) updates `users.last_seen_at`.
- A daily Vercel Cron (`/api/cron/inactive-posts`, `vercel.json`) removes the posts of owners not seen for 30 days and sends one email per owner with a "Restore my post" link per post (signed, 30-day, single-post tokens; restoring takes a button press on `/restore`). Failed emails retry the next day. Optional 5-day warning email (`INACTIVITY_WARNING_EMAILS`).
- Removed posts disappear from search, place pages, sitemaps and counts; their URL says "This post is no longer available" (noindex, no phone). 30 days after removal they're permanently deleted with their photos, and the URL returns 410.
- Accounts are never deleted or changed by this. Admin-managed posts are never removed. Rules: `src/lib/inactive-posts.ts`; tests: `npm run test:inactive` and `npm run test:inactive:e2e` (Docker Postgres).

### Admin workspace

- `/admin` behind a username/password login set via `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars.
- Admin sessions don't persist: the cookie is a browser-session cookie (gone when the browser closes, `SameSite=strict`), and the signed token inside expires 30 minutes after login however busy the session is. Admin pages and APIs are `Cache-Control: no-store`, and an admin action after expiry goes back to the login page. Tests: `npm run test:admin-auth`. **(new, 26 Oct)**
- Active / removed / permanently deleted post counts, real account count and recent signups, a views/saves table, view/delete for any listing, and an "Admin-managed" toggle (never removed for inactivity).
- Login guard: 3 wrong passwords in a row block that IP from admin login for good (the rest of the site still works for it); a blocked IP is refused even with the right password. Attempts are counted in Postgres before the password is checked, so parallel requests get at most 3 guesses. "Blocked admin login IPs" on `/admin` lists blocks with an Unblock button; `DEPLOYMENT.md` has the SQL for a full lock-out. Tests: `npm run test:admin-login` (Docker Postgres). **(new, 24 Oct)**

### Content and legal pages

- About (`/about`), Privacy Policy (`/privacy-policy`), Terms of Use (`/terms`) and Contact (`/contact`, email only), linked in the footer's "About" column. Contact email is set in `src/data/contact.ts`.
- No blog or guides. They were removed because informational questions get answered directly in Google's AI answers. Old `/blog/...` and `/guides/...` URLs 308-redirect to the matching city page (e.g. `/blog/sharing-flat-in-noida` → `/noida/sharing-flat`) or home (`next.config.ts`). **(new, 26 Oct)**

### SEO

- City pages for Delhi, Noida, Greater Noida, Gurgaon and Ghaziabad, with locality and society pages below them, each with intent pages (`/flats-for-rent`, `/flatmates`, `/sharing-flat`). Delhi has 17 localities (Laxmi Nagar, North Campus, Hauz Khas, Dwarka, etc.); names that also exist elsewhere need "Delhi" in the address to match. **(new, 24 Oct)**
- Plain page titles with no site name: "Sharing Flat in Greater Noida", "Flatmates in Delhi", "Sharing Flat, Flats for Rent & Flatmates in Noida"; nationwide hubs read "… in Delhi NCR". Listing titles are the post title plus its place. Google may still append the site name on its own. **(new, 26 Oct)**
- A page is indexed only when it has enough real listings (city pages always). Thin pages, filtered views (`?budget=`, `?rent=`, `?gender=`), `/search` and non-target cities (Mumbai, Bangalore, Pune, etc.) are `noindex, follow` on purpose — this is why Search Console shows many pages as "Excluded by noindex", which is expected.
- Split sitemaps under `/sitemap.xml` (pages, cities, localities, societies, listings). Empty child sitemaps are left out of the index and return 404; the sitemap returns 503 if the database is down.
- Metadata, Open Graph, structured data (Organization/WebSite), Google Analytics 4, and a robots.txt that blocks only private paths.
- Place copy contains no unverified claims (metro distances, landmarks, rent figures).

## Pending

### Setup on Vercel

- Set `CRON_SECRET` and `RESTORE_TOKEN_SECRET` (and optionally `INACTIVITY_WARNING_EMAILS=true`) in the Vercel project's environment variables. Until then the cron answers 500 and nothing is removed.

### Search Console

- Resubmit `sitemap.xml`; remove `sitemap-blog.xml` if it was submitted on its own. Old blog URLs will show under "Page with redirect", which is expected.
- Request indexing for `/delhi`.
- "Redirect error" on 1 URL — needs the URL from the report.

### Before running Google Ads

- Check the remaining trust wording: the "Verified" badge on featured rooms and listings (shown only when a listing is marked verified), and "most trusted platform" in the About page's mission. Google Ads can reject ads for unproven claims under its Misrepresentation policy.
- Add the Google Ads tag and conversion tracking (needs the `AW-` ID from the Google Ads account).
- Few live listings — start ads on posting/signup, or on Greater Noida West only.

### Product gaps

- Seeing an owner's phone number needs a login, which is where most visitors who come to get something done drop off.
- Dashboard listing views aren't tracked (always 0).
- Admin has no user management, report queue or moderation workflow.
- Profile details are also cached in `localStorage` for the UI.
- No error monitoring.

## Deployment

See `DEPLOYMENT.md` for both paths:

- **Self-hosted Ubuntu 24.04 LTS**: Node + local Postgres + Nginx, provisioned by `deploy/setup-ubuntu.sh`.
- **Vercel + Supabase** (free tier): hosted Postgres, serverless.
