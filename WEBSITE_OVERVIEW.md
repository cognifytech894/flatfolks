# FlatFolks Website Overview

FlatFolks is a housing-discovery platform for finding rooms, flats, PGs, and compatible flatmates in India.

## Website sections and features

### Home page

- Landing page with hero search bar, popular cities, featured rooms, trust stats, and a footer.

### Search and listings

- Browse verified listings by location, budget, property type, and amenities; switch between list and map-style views.
- Each listing's detail page shows a one-at-a-time photo carousel (prev/next + dots), real bedroom/bathroom counts, description, amenities, lifestyle-preference tags, the actual owner's name, and a working contact number (Call and WhatsApp links).
- Save a listing to a personal wishlist, or submit interest to unlock a private chat with that listing's real owner.

### Property posting

Posting a property covers two distinct flows, both requiring a contact number:

- **Looking for a flatmate** (a flat/room offer): title, flat type, bedrooms/bathrooms, rent, deposit, availability, preferred tenant gender, amenities, lifestyle-preference tags, description, and up to 3 photos (auto-compressed and center-cropped to 16:9, 9:16, or 1:1 in the browser before upload).
- **Looking for a flat** (a requirement): title, needed-from date, preferred gender, location, max budget, amenities, and lifestyle-preference tags — no photos.

The listings API validates input server-side and rate-limits requests.

### Flatmates

- Browse posted flat *requirements* (people looking for a flat, not standalone "profiles") on the Flatmates page.
- Each card shows the poster's real name, gender preference, location, budget, amenities, lifestyle tags, and contact number.
- "I have a suitable flat" links to that specific requirement's interest flow.

### Chat and interest

- Submitting interest on a listing adds that listing's real owner to your contacts list (no more placeholder names).
- Chat is a same-browser, cross-tab prototype built on `BroadcastChannel` and `localStorage` — it only syncs between tabs open in the same browser on the same device, with a browser notification on new messages. It is **not** a real server-backed messaging system between two different people's devices yet.
- Contacts can be removed from the list at any time.

### Wishlist

- Save and remove property listings from a personal wishlist; totals are reflected on the dashboard.

### Profile and settings

- Edit name, email, and phone number.
- Set a profile photo either by uploading one (compressed client-side) or picking one of 6 preset avatar icons.
- A separate "Preferences & settings" mini-form for preferred city, budget, and lifestyle text, plus a notifications toggle.
- A "Dashboard" quick-link card (this is currently the only way to reach `/dashboard` from the UI).

### Dashboard

- Stat cards for listing views, saved listings, messages, and interests.
- "My Posts": edit any of your own posts in place (title, description, location, budget, bedrooms/bathrooms, photos, contact number, availability, gender preference, lifestyle tags) or delete them outright.
- Placeholder "recent activity" and "profile status" panels.

### Admin workspace

- `/admin` shows total/pending-moderation listing counts and a per-listing view/save table — a starting point, not a full moderation system yet (no real user management or report queues).

### SEO, accessibility, and performance

- Search-engine metadata, Open Graph data, sitemap, and robots configuration are included.
- Semantic controls and ARIA labels are used where relevant, with keyboard-accessible form controls.
- Next.js production build supports route-level optimization and code splitting.

## Known gaps (honest state, not yet built)

- **Login is email/password or OTP-based, but OTP delivery is not real SMS/email yet** — the code (`requestPhoneLoginOtp`, `requestEmailLoginOtp`) generates a code and hands it straight back to the same browser to display, rather than actually texting or emailing it. A phone-only login option (via a real provider like Firebase Phone Auth) has been discussed but not implemented.
- **Chat has no real backend** — see above; it only works within one browser across its own tabs.
- Photo uploads are capped at 3 per listing, ~2MB each after compression.

## Deployment

Two documented paths — see `DEPLOYMENT.md` for both:

- **Self-hosted Ubuntu 24.04 LTS**: Node + local Postgres + Nginx reverse proxy, provisioned by `deploy/setup-ubuntu.sh`.
- **Vercel + Supabase** (free tier): Postgres-hosted, serverless.

Users, listings, reviews, and feedback all persist in Postgres either way. Before a real public launch, still worth adding: secure file/object storage for photos (instead of storing base64 in Postgres), a real SMS/email OTP provider, a real chat backend, server-side sessions (auth currently stores the logged-in user in `localStorage`, not a signed session/cookie), and error monitoring.
