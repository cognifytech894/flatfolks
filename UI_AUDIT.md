# FlatFolks UI Audit — 23 October 2026

## Re-audit after the fixes

The same audit, re-run after Phases 1–3 against a local **production** build (`next build && next start`, view tracking disabled):

| | Critical | High | Medium | Low |
|---|---|---|---|---|
| First audit (dev server) | 4 | 110 | 173 | 35 |
| After Phases 1–3 (production build) | **0** | **0** | **0** | **4** |

The 4 Low issues:
- 404 page city links were 4px apart. Fixed after the run (now 8px).
- The only listing with photos has one photo, so the carousel arrows couldn't be exercised (×2, informational).

What changed:
- Phase 1: logged-out `/dashboard` redirects to login; API routes return 401/403 with tests; unproven claims removed; demo listings deleted (backed up).
- Phase 2: contrast, 12px minimum text, tap targets, search suggestions, aria-labels, "Find Flatmates".
- Phase 3: image `sizes`, custom 404, inline form errors.
- Also: pill-link sections removed, place-page intro copy removed, Google Analytics added.

**Lighthouse (mobile, local production build):**

| Page | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` | 32–55 | 100 | 81 | 100 |
| `/search` | 60–77 | 98 | 81 | 63 (noindex on purpose) |
| `/noida` | 61–64 | 100 | 81 | 100 |
| Listing | 43–68 | 98 | 81 | 100 |

Accessibility went from 94–96 to 98–100. Performance swings between runs: the local server queries Supabase in `ap-northeast-2` on every request ("Reduce initial server response time" ~770 ms on the listing page) and shares the machine with the audit. The remaining opportunity is "Reduce unused JavaScript" (~250–450 ms). Measure on https://flatfolks.in (Vercel, closer to the database) for real numbers.

The original report follows.

---

Automated Playwright + axe-core + Lighthouse audit of 21 pages × 4 viewports (390, 360, 768, 1440), run against the local dev server with listing view tracking disabled. Nothing was submitted or written: every non-GET request from the browser was blocked. Re-run any time with `npm run ui-audit` (script: `ui-audit/audit.mjs`, screenshots: `ui-audit/screenshots/`).

**Result: 4 Critical · 110 High · 173 Medium · 35 Low.** Most of the counts repeat one problem on every page and viewport: it's in the shared footer, header or bottom nav. The 10 fixes below cover almost all of them.

## What passed

- No page scrolls sideways at any viewport, including 360px.
- All 144 internal links resolve; no broken images; no failed network requests.
- Listing page hides Call / WhatsApp from logged-out visitors (no phone number exposed).
- Unknown URLs return a real 404 with a message.
- Home search: suggestions, Filters open/close on mobile, dropdowns and the Search URL all work.
- Search filter updates the URL and results; empty state shows "No rooms match these filters yet".
- Both post forms block an empty submit with validation messages.
- Header and bottom-nav links go to the right pages; the Post menu opens both flows.
- Bottom nav: body padding clears it, safe-area padding and `viewport-fit=cover` are in place.

## Top 10 fixes (priority order)

1. **Logged-out `/dashboard` shows the full dashboard (Critical).** No redirect and no login prompt. It also shows invented placeholder content ("New message from a verified room owner in Noida", "Verified • Ready to connect", "AI roommate recommendations are available"). File: `src/app/dashboard/page.tsx` (client component, no auth check). Fix: check the session cookie on the server and `redirect("/auth?next=/dashboard")`. Also remove the fake "Recent activity" / "Profile status" text.
2. **Remove unproven claims (every page, blocks Google Ads).** Where they are:
   - Footer `src/components/layout/footer.tsx`: "Trusted by 25k+ renters and landlords", "Verified listings", "24/7 support", "AI-powered housing discovery".
   - Home `src/app/page.tsx:102-106`: "10,000+ Flatmates Already Joined" and "Smart Matching — AI recommends your best fit".
   - Elsewhere: About page "verified listings", the OG share image `src/app/opengraph-image.tsx:49` ("Verified listings"), and "Verified" badges on home cards. New listings are always `verified=false` and no code ever sets it to true, so the badges come from manually-set rows, probably demo data.
3. **Colour contrast fails on every page (84 axe "serious").** Two main offenders:
   - White text on `bg-emerald-500` buttons ("List a property", "Post your flat", "Find Flatmates").
   - `text-slate-400` text (photo placeholders "No photos", counts, hints). `text-emerald-500/600` on white also fails.
   
   Fix: use `bg-emerald-600`/`700` behind white text, and `text-slate-500` or darker for body text.
4. **Text under 12px on mobile (every page).** Sources: bottom-nav labels (10–11px), home search labels, card metadata, and `text-[10px]`/`text-[11px]` across the home page. Fix: minimum `text-xs` (12px) below `sm`. Files: `src/components/layout/navbar.tsx`, `src/components/home/search-card.tsx`, `src/app/page.tsx`.
5. **Tap targets under 44×44px on mobile (every page).** Examples:
   - Logo link (152×40)
   - Area chips (≈80×30)
   - Back button (91×38)
   - Sort select (125×18)
   - Footer link lists
   - Bottom-nav tabs, whose height is about 40px
   
   Fix: `min-h-11` / larger padding on chips, buttons and footer links; `py-2.5` on nav tabs.
6. **Home search suggestion list covers the Search and Filters buttons (mobile).** While typing, a tap meant for Search picks a suggestion instead. File: `src/components/home/search-card.tsx`. Fix: cap the list height (`max-h-48`), or close it once a suggestion is picked or the input blurs.
7. **"Sector 1371" bug on `/noida`.** The listing count is glued to the area name in the "Popular areas" pills. The visual gap is only `ml-1.5`, so the text, screen readers and Google read "Sector 1371". File: `src/components/seo/landing-page.tsx:198`. Fix: add a real separator, e.g. `<span className="sr-only">, </span>` plus `aria-label` such as "Sector 137, 1 listing", or render the count as a badge with text " · 1".
8. **Accessible names.**
   - Dashboard icon buttons (chat, bell, settings) have no label (axe critical). File: `src/app/dashboard/page.tsx:29-31`. Fix: add `aria-label`s.
   - On every desktop page, the "India" country button has `aria-label="Choose country"`, which doesn't include its visible text. File: `src/components/layout/navbar.tsx`. Fix: `aria-label="Country: India"`, or drop the non-functional button.
9. **Inconsistent naming.** The desktop header says "Find Room Mate" while the rest of the site says "Flatmates". File: `src/components/layout/navbar.tsx`. Fix: rename to "Find Flatmates".
10. **Image sizes and real performance numbers.**
    - On tablet, home city cards load 768px images for 167px slots. Fix: give the city-card `next/image` an accurate `sizes` prop (`src/app/page.tsx`).
    - The Lighthouse performance scores below come from the dev server (unminified JS: "Minify JavaScript" tops every list), so treat them as worst-case. Re-run Lighthouse with `BASE_URL=https://flatfolks.in npm run ui-audit` for production numbers. Note that this counts one view on each listing page it opens.

## Notes on reading the full report

- `/search` scores 66 for SEO in Lighthouse because it is `noindex` on purpose; that is expected.
- In full-page mobile screenshots the fixed bottom nav sometimes appears in the middle of the image. That's how Playwright stitches full-page captures, not a layout bug.
- "Empty submit is blocked by browser validation" (Low) is informational: validation works, but native bubbles show one field at a time.
- The listing page audited has a single photo, so the carousel arrows and swipe weren't exercised. Re-test once a listing has 2+ photos.
- These were false positives in the first run, and the script has been fixed so they no longer appear:
  - Regex matching "Sector 137 and…" as glued counts
  - `sr-only` labels flagged as clipped text
  - The 404 page's own 404 in the console
  - The Next.js dev indicator blocking the Home tab
- The script's bottom-nav check failed in this run because "Looking for a flat" also matched "Looking for a flatmate". The script is fixed now; the site is fine. Manually: both Post menu items are present with the right links.
- Some intro paragraphs were removed from the place pages while this run was in progress. That doesn't affect the layout or accessibility findings.

---

# Full automated report


- Target: `http://localhost:3100` (local `next dev`, view tracking disabled)
- Run: 2026-10-23T12:52:37.034Z · 8.7 min · 21 pages × 4 viewports · 144 internal links checked
- Totals: **Critical** 4 · **High** 110 · **Medium** 173 · **Low** 35
- Screenshots: `.ui-audit/screenshots/<viewport>_<page>.png` (regenerated by `npm run ui-audit`)
- Performance scores come from the dev server (unminified, no caching) and will be lower than production. Re-run with `BASE_URL=https://flatfolks.in` for real numbers.

### Summary

| Page | Viewport | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| /about | desktop-1440 |  | 2 | 4 | 1 |
| /about | mobile-360 |  | 1 | 2 |  |
| /about | mobile-390 |  | 1 | 2 |  |
| /about | tablet-768 |  | 1 |  |  |
| /admin | desktop-1440 |  | 2 | 4 | 1 |
| /admin | mobile-360 |  | 1 | 2 |  |
| /admin | mobile-390 |  | 1 | 2 |  |
| /admin | tablet-768 |  | 1 |  |  |
| /auth | desktop-1440 |  | 2 | 4 | 1 |
| /auth | mobile-360 |  | 1 | 2 |  |
| /auth | mobile-390 |  | 1 | 2 |  |
| /auth | tablet-768 |  | 1 |  |  |
| /blog/sharing-flat-in-noida | desktop-1440 |  | 2 | 4 | 1 |
| /blog/sharing-flat-in-noida | mobile-360 |  | 1 | 2 |  |
| /blog/sharing-flat-in-noida | mobile-390 |  | 1 | 2 |  |
| /blog/sharing-flat-in-noida | tablet-768 |  | 1 |  |  |
| /blog | desktop-1440 |  | 2 | 4 | 1 |
| /blog | mobile-360 |  | 1 | 2 |  |
| /blog | mobile-390 |  | 1 | 2 |  |
| /blog | tablet-768 |  | 1 |  |  |
| /contact | desktop-1440 |  | 2 | 4 | 1 |
| /contact | mobile-360 |  | 1 | 2 |  |
| /contact | mobile-390 |  | 1 | 2 |  |
| /contact | tablet-768 |  | 1 |  |  |
| /dashboard | desktop-1440 | 1 | 3 | 4 | 1 |
| /dashboard | mobile-360 | 1 | 2 | 2 |  |
| /dashboard | mobile-390 | 1 | 2 | 2 |  |
| /dashboard | tablet-768 | 1 | 2 |  |  |
| /flatmates | desktop-1440 |  | 2 | 4 | 1 |
| /flatmates | mobile-360 |  | 1 | 2 |  |
| /flatmates | mobile-390 |  | 1 | 2 |  |
| /flatmates | tablet-768 |  | 1 |  |  |
| /ghaziabad | desktop-1440 |  | 2 | 4 | 1 |
| /ghaziabad | mobile-360 |  | 1 | 2 | 1 |
| /ghaziabad | mobile-390 |  | 1 | 2 |  |
| /ghaziabad | tablet-768 |  | 1 |  |  |
| /greater-noida/noida-extension/gaur-city-2 | desktop-1440 |  | 2 | 4 | 1 |
| /greater-noida/noida-extension/gaur-city-2 | mobile-360 |  | 1 | 2 | 1 |
| /greater-noida/noida-extension/gaur-city-2 | mobile-390 |  | 1 | 2 | 1 |
| /greater-noida/noida-extension/gaur-city-2 | tablet-768 |  | 1 |  |  |
| /greater-noida | desktop-1440 |  | 2 | 4 | 1 |
| /greater-noida | mobile-360 |  | 1 | 2 |  |
| /greater-noida | mobile-390 |  | 1 | 2 | 1 |
| /greater-noida | tablet-768 |  | 1 |  |  |
| /gurgaon | desktop-1440 |  | 2 | 4 | 1 |
| /gurgaon | mobile-360 |  | 1 | 2 |  |
| /gurgaon | mobile-390 |  | 1 | 2 |  |
| /gurgaon | tablet-768 |  | 1 |  |  |
| /noida | desktop-1440 |  | 2 | 5 | 1 |
| /noida | mobile-360 |  | 1 | 2 |  |
| /noida | mobile-390 |  | 1 | 2 |  |
| /noida | tablet-768 |  | 1 |  |  |
| /privacy-policy | desktop-1440 |  | 2 | 4 | 1 |
| /privacy-policy | mobile-360 |  | 1 | 2 |  |
| /privacy-policy | mobile-390 |  | 1 | 2 |  |
| /privacy-policy | tablet-768 |  | 1 |  |  |
| /property?intent=flatmate | desktop-1440 |  | 2 | 4 | 1 |
| /property?intent=flatmate | mobile-360 |  | 1 | 2 | 1 |
| /property?intent=flatmate | mobile-390 |  | 1 | 2 |  |
| /property?intent=flatmate | tablet-768 |  | 1 |  |  |
| /property?intent=flat | desktop-1440 |  | 2 | 4 | 1 |
| /property?intent=flat | mobile-360 |  | 1 | 2 | 1 |
| /property?intent=flat | mobile-390 |  | 1 | 2 |  |
| /property?intent=flat | tablet-768 |  | 1 |  |  |
| /search | desktop-1440 |  | 2 | 4 | 1 |
| /search | mobile-360 |  | 1 | 2 |  |
| /search | mobile-390 |  | 1 | 2 |  |
| /search | tablet-768 |  | 1 |  |  |
| /terms | desktop-1440 |  | 2 | 4 | 1 |
| /terms | mobile-360 |  | 1 | 2 |  |
| /terms | mobile-390 |  | 1 | 2 |  |
| /terms | tablet-768 |  | 1 |  |  |
| /this-page-does-not-exist-404 | desktop-1440 |  | 2 | 4 | 1 |
| /this-page-does-not-exist-404 | mobile-360 |  | 1 | 2 |  |
| /this-page-does-not-exist-404 | mobile-390 |  | 1 | 2 |  |
| /this-page-does-not-exist-404 | tablet-768 |  | 1 |  |  |
| / | desktop-1440 |  | 2 | 6 | 1 |
| / | mobile-360 |  | 1 | 2 |  |
| / | mobile-390 |  | 1 | 2 |  |
| / | tablet-768 |  | 1 | 1 |  |
| interaction: bottom nav | mobile-390 |  | 1 |  |  |
| interaction: home search | mobile-390 |  |  | 1 |  |
| interaction: listing | desktop-1440 |  |  |  | 1 |
| interaction: listing | mobile-390 |  |  |  | 1 |
| interaction: post form (flat) | desktop-1440 |  |  |  | 1 |
| interaction: post form (flat) | mobile-390 |  |  |  | 1 |
| interaction: post form (flatmate) | desktop-1440 |  |  |  | 1 |
| interaction: post form (flatmate) | mobile-390 |  |  |  | 1 |
| listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8) | desktop-1440 |  | 2 | 4 | 1 |
| listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8) | mobile-360 |  | 1 | 2 | 1 |
| listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8) | mobile-390 |  | 1 | 2 | 1 |
| listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8) | tablet-768 |  | 1 |  |  |

### Critical (4)

- **/dashboard** · mobile-390 — Logged-out /dashboard renders the full dashboard (final URL /dashboard) without redirecting to or asking for login. Content: "BackDashboardYour housing hubListing Views0Saved Listings0Messages0Interests0My postsEdit your posted flat requirement or available-flat details anytime.You hav…"
  - Screenshot: `mobile-390_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: Redirect logged-out users to /auth?next=/dashboard on the server (cookies() + redirect in the page or proxy).
- **/dashboard** · mobile-360 — Logged-out /dashboard renders the full dashboard (final URL /dashboard) without redirecting to or asking for login. Content: "BackDashboardYour housing hubListing Views0Saved Listings0Messages0Interests0My postsEdit your posted flat requirement or available-flat details anytime.You hav…"
  - Screenshot: `mobile-360_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: Redirect logged-out users to /auth?next=/dashboard on the server (cookies() + redirect in the page or proxy).
- **/dashboard** · tablet-768 — Logged-out /dashboard renders the full dashboard (final URL /dashboard) without redirecting to or asking for login. Content: "BackDashboardYour housing hubListing Views0Saved Listings0Messages0Interests0My postsEdit your posted flat requirement or available-flat details anytime.You hav…"
  - Screenshot: `tablet-768_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: Redirect logged-out users to /auth?next=/dashboard on the server (cookies() + redirect in the page or proxy).
- **/dashboard** · desktop-1440 — Logged-out /dashboard renders the full dashboard (final URL /dashboard) without redirecting to or asking for login. Content: "BackDashboardYour housing hubListing Views0Saved Listings0Messages0Interests0My postsEdit your posted flat requirement or available-flat details anytime.You hav…"
  - Screenshot: `desktop-1440_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: Redirect logged-out users to /auth?next=/dashboard on the server (cookies() + redirect in the page or proxy).

### High (110)

- **/** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (4 node(s), e.g. `.text-slate-400`, `.text-base > .text-emerald-500`, `.inline-flex.bg-emerald-500[href$="search"]`, … (+1 more))
  - Screenshot: `mobile-390_home.png` · File: `src/app/page.tsx (+ src/components/home/*)`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/search** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (12 node(s), e.g. `.bg-slate-100.text-slate-400.place-items-center`, `article:nth-child(1) > .p-4.flex-1.flex-col > .text-emerald-600.mt-2.font-medium`, `article:nth-child(1) > .p-4.flex-1.flex-col > .mt-auto.pt-4.justify-between > .gap-2.items-center.flex > .bg-emerald-500.text-white.py-2`, … (+9 more))
  - Screenshot: `mobile-390_search.png` · File: `src/app/search/page.tsx, src/components/search/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/flatmates** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (2 node(s), e.g. `.self-start`, `a[href$="property"]`)
  - Screenshot: `mobile-390_flatmates.png` · File: `src/app/flatmates/page.tsx, src/components/flatmates/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/noida** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (2 node(s), e.g. `.self-start`, `a[href$="property"]`)
  - Screenshot: `mobile-390_noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/greater-noida** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (4 node(s), e.g. `.self-start`, `section:nth-child(2) > .lg\:grid-cols-3.sm\:grid-cols-2.mt-4 > article > .h-40.bg-slate-100.w-full > .text-slate-400.w-full.h-full`, `section:nth-child(3) > .lg\:grid-cols-3.sm\:grid-cols-2.mt-4 > article > .h-40.bg-slate-100.w-full > .text-slate-400.w-full.h-full`, … (+1 more))
  - Screenshot: `mobile-390_greater-noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/greater-noida/noida-extension/gaur-city-2** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (4 node(s), e.g. `.self-start`, `section:nth-child(3) > .lg\:grid-cols-3.sm\:grid-cols-2.mt-4 > article > .h-40.bg-slate-100.w-full > .text-slate-400.w-full.h-full`, `section:nth-child(4) > .lg\:grid-cols-3.sm\:grid-cols-2.mt-4 > article > .h-40.bg-slate-100.w-full > .text-slate-400.w-full.h-full`, … (+1 more))
  - Screenshot: `mobile-390_gaur-city-2.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/gurgaon** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (2 node(s), e.g. `.self-start`, `a[href$="property"]`)
  - Screenshot: `mobile-390_gurgaon.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/ghaziabad** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (2 node(s), e.g. `.self-start`, `a[href$="property"]`)
  - Screenshot: `mobile-390_ghaziabad.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8)** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-390_listing.png` · File: `src/components/listing/listing-detail.tsx, photo-carousel.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/property?intent=flat** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (5 node(s), e.g. `.block.text-slate-700:nth-child(1) > .font-normal.text-slate-400`, `.space-y-4:nth-child(2) > .block.text-slate-700:nth-child(3) > .font-normal.text-slate-400`, `legend > .font-normal.text-slate-400`, … (+2 more))
  - Screenshot: `mobile-390_post-flat.png` · File: `src/app/property/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/property?intent=flatmate** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (9 node(s), e.g. `.block.text-slate-700:nth-child(1) > .font-normal.text-slate-400`, `.block.text-slate-700:nth-child(2) > .font-normal.text-slate-400`, `.gap-y-4 > .block.text-slate-700:nth-child(5) > .font-normal.text-slate-400`, … (+6 more))
  - Screenshot: `mobile-390_post-flatmate.png` · File: `src/app/property/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/about** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-390_about.png` · File: `src/app/about/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/blog** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-390_blog.png` · File: `src/app/blog/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/blog/sharing-flat-in-noida** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-390_blog-post.png` · File: `src/app/blog/[slug]/page.tsx, src/data/blog.ts`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/privacy-policy** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-390_privacy-policy.png` · File: `src/app/privacy-policy/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/terms** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-390_terms.png` · File: `src/app/terms/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/contact** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-390_contact.png` · File: `src/app/contact/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/auth** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-390_login.png` · File: `src/app/auth/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/admin** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-390_admin.png` · File: `src/app/admin/login/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/this-page-does-not-exist-404** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-390_not-found.png` · File: `src/app/not-found.tsx (missing → Next default)`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/dashboard** · mobile-390 — axe critical: button-name — Buttons must have discernible text (3 node(s), e.g. `.text-slate-700.p-3:nth-child(1)`, `.text-slate-700.p-3:nth-child(2)`, `.text-slate-700.p-3:nth-child(3)`)
  - Screenshot: `mobile-390_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/button-name?application=playwright
- **/dashboard** · mobile-390 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-390_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (4 node(s), e.g. `.text-slate-400`, `.text-base > .text-emerald-500`, `.inline-flex.bg-emerald-500[href$="search"]`, … (+1 more))
  - Screenshot: `mobile-360_home.png` · File: `src/app/page.tsx (+ src/components/home/*)`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/search** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (12 node(s), e.g. `.bg-slate-100.text-slate-400.place-items-center`, `article:nth-child(1) > .p-4.flex-1.flex-col > .text-emerald-600.mt-2.font-medium`, `article:nth-child(1) > .p-4.flex-1.flex-col > .mt-auto.pt-4.justify-between > .gap-2.items-center.flex > .bg-emerald-500.text-white.py-2`, … (+9 more))
  - Screenshot: `mobile-360_search.png` · File: `src/app/search/page.tsx, src/components/search/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/flatmates** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (2 node(s), e.g. `.self-start`, `a[href$="property"]`)
  - Screenshot: `mobile-360_flatmates.png` · File: `src/app/flatmates/page.tsx, src/components/flatmates/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/noida** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (2 node(s), e.g. `.self-start`, `a[href$="property"]`)
  - Screenshot: `mobile-360_noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/greater-noida** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (4 node(s), e.g. `.self-start`, `section:nth-child(2) > .lg\:grid-cols-3.sm\:grid-cols-2.mt-4 > article > .h-40.bg-slate-100.w-full > .text-slate-400.w-full.h-full`, `section:nth-child(3) > .lg\:grid-cols-3.sm\:grid-cols-2.mt-4 > article > .h-40.bg-slate-100.w-full > .text-slate-400.w-full.h-full`, … (+1 more))
  - Screenshot: `mobile-360_greater-noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/greater-noida/noida-extension/gaur-city-2** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (4 node(s), e.g. `.self-start`, `section:nth-child(3) > .lg\:grid-cols-3.sm\:grid-cols-2.mt-4 > article > .h-40.bg-slate-100.w-full > .text-slate-400.w-full.h-full`, `section:nth-child(4) > .lg\:grid-cols-3.sm\:grid-cols-2.mt-4 > article > .h-40.bg-slate-100.w-full > .text-slate-400.w-full.h-full`, … (+1 more))
  - Screenshot: `mobile-360_gaur-city-2.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/gurgaon** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (2 node(s), e.g. `.self-start`, `a[href$="property"]`)
  - Screenshot: `mobile-360_gurgaon.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/ghaziabad** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (2 node(s), e.g. `.self-start`, `a[href$="property"]`)
  - Screenshot: `mobile-360_ghaziabad.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8)** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-360_listing.png` · File: `src/components/listing/listing-detail.tsx, photo-carousel.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/property?intent=flat** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (5 node(s), e.g. `.block.text-slate-700:nth-child(1) > .font-normal.text-slate-400`, `.space-y-4:nth-child(2) > .block.text-slate-700:nth-child(3) > .font-normal.text-slate-400`, `legend > .font-normal.text-slate-400`, … (+2 more))
  - Screenshot: `mobile-360_post-flat.png` · File: `src/app/property/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/property?intent=flatmate** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (9 node(s), e.g. `.block.text-slate-700:nth-child(1) > .font-normal.text-slate-400`, `.block.text-slate-700:nth-child(2) > .font-normal.text-slate-400`, `.gap-y-4 > .block.text-slate-700:nth-child(5) > .font-normal.text-slate-400`, … (+6 more))
  - Screenshot: `mobile-360_post-flatmate.png` · File: `src/app/property/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/about** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-360_about.png` · File: `src/app/about/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/blog** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-360_blog.png` · File: `src/app/blog/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/blog/sharing-flat-in-noida** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-360_blog-post.png` · File: `src/app/blog/[slug]/page.tsx, src/data/blog.ts`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/privacy-policy** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-360_privacy-policy.png` · File: `src/app/privacy-policy/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/terms** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-360_terms.png` · File: `src/app/terms/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/contact** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-360_contact.png` · File: `src/app/contact/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/auth** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-360_login.png` · File: `src/app/auth/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/admin** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-360_admin.png` · File: `src/app/admin/login/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/this-page-does-not-exist-404** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-360_not-found.png` · File: `src/app/not-found.tsx (missing → Next default)`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/dashboard** · mobile-360 — axe critical: button-name — Buttons must have discernible text (3 node(s), e.g. `.text-slate-700.p-3:nth-child(1)`, `.text-slate-700.p-3:nth-child(2)`, `.text-slate-700.p-3:nth-child(3)`)
  - Screenshot: `mobile-360_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/button-name?application=playwright
- **/dashboard** · mobile-360 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `mobile-360_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (4 node(s), e.g. `.text-slate-400`, `.text-base > .text-emerald-500`, `.inline-flex.bg-emerald-500[href$="search"]`, … (+1 more))
  - Screenshot: `tablet-768_home.png` · File: `src/app/page.tsx (+ src/components/home/*)`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/search** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (12 node(s), e.g. `.bg-slate-100.text-slate-400.place-items-center`, `article:nth-child(1) > .p-4.flex-1.flex-col > .text-emerald-600.mt-2.font-medium`, `article:nth-child(1) > .p-4.flex-1.flex-col > .mt-auto.pt-4.justify-between > .gap-2.items-center.flex > .bg-emerald-500.text-white.py-2`, … (+9 more))
  - Screenshot: `tablet-768_search.png` · File: `src/app/search/page.tsx, src/components/search/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/flatmates** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (2 node(s), e.g. `.self-start`, `a[href$="property"]`)
  - Screenshot: `tablet-768_flatmates.png` · File: `src/app/flatmates/page.tsx, src/components/flatmates/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/noida** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (2 node(s), e.g. `.self-start`, `a[href$="property"]`)
  - Screenshot: `tablet-768_noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/greater-noida** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (4 node(s), e.g. `.self-start`, `section:nth-child(2) > .lg\:grid-cols-3.sm\:grid-cols-2.mt-4 > article > .h-40.bg-slate-100.w-full > .text-slate-400.w-full.h-full`, `section:nth-child(3) > .lg\:grid-cols-3.sm\:grid-cols-2.mt-4 > article > .h-40.bg-slate-100.w-full > .text-slate-400.w-full.h-full`, … (+1 more))
  - Screenshot: `tablet-768_greater-noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/greater-noida/noida-extension/gaur-city-2** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (4 node(s), e.g. `.self-start`, `section:nth-child(3) > .lg\:grid-cols-3.sm\:grid-cols-2.mt-4 > article > .h-40.bg-slate-100.w-full > .text-slate-400.w-full.h-full`, `section:nth-child(4) > .lg\:grid-cols-3.sm\:grid-cols-2.mt-4 > article > .h-40.bg-slate-100.w-full > .text-slate-400.w-full.h-full`, … (+1 more))
  - Screenshot: `tablet-768_gaur-city-2.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/gurgaon** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (2 node(s), e.g. `.self-start`, `a[href$="property"]`)
  - Screenshot: `tablet-768_gurgaon.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/ghaziabad** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (2 node(s), e.g. `.self-start`, `a[href$="property"]`)
  - Screenshot: `tablet-768_ghaziabad.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8)** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `tablet-768_listing.png` · File: `src/components/listing/listing-detail.tsx, photo-carousel.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/property?intent=flat** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (5 node(s), e.g. `.block.text-slate-700:nth-child(1) > .font-normal.text-slate-400`, `.space-y-4:nth-child(2) > .block.text-slate-700:nth-child(3) > .font-normal.text-slate-400`, `legend > .font-normal.text-slate-400`, … (+2 more))
  - Screenshot: `tablet-768_post-flat.png` · File: `src/app/property/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/property?intent=flatmate** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (9 node(s), e.g. `.block.text-slate-700:nth-child(1) > .font-normal.text-slate-400`, `.block.text-slate-700:nth-child(2) > .font-normal.text-slate-400`, `.gap-y-4 > .block.text-slate-700:nth-child(5) > .font-normal.text-slate-400`, … (+6 more))
  - Screenshot: `tablet-768_post-flatmate.png` · File: `src/app/property/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/about** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `tablet-768_about.png` · File: `src/app/about/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/blog** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `tablet-768_blog.png` · File: `src/app/blog/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/blog/sharing-flat-in-noida** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `tablet-768_blog-post.png` · File: `src/app/blog/[slug]/page.tsx, src/data/blog.ts`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/privacy-policy** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `tablet-768_privacy-policy.png` · File: `src/app/privacy-policy/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/terms** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `tablet-768_terms.png` · File: `src/app/terms/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/contact** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `tablet-768_contact.png` · File: `src/app/contact/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/auth** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `tablet-768_login.png` · File: `src/app/auth/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/admin** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `tablet-768_admin.png` · File: `src/app/admin/login/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/this-page-does-not-exist-404** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `tablet-768_not-found.png` · File: `src/app/not-found.tsx (missing → Next default)`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/dashboard** · tablet-768 — axe critical: button-name — Buttons must have discernible text (3 node(s), e.g. `.text-slate-700.p-3:nth-child(1)`, `.text-slate-700.p-3:nth-child(2)`, `.text-slate-700.p-3:nth-child(3)`)
  - Screenshot: `tablet-768_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/button-name?application=playwright
- **/dashboard** · tablet-768 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `tablet-768_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (4 node(s), e.g. `.text-slate-400`, `.text-base > .text-emerald-500`, `.inline-flex.bg-emerald-500[href$="search"]`, … (+1 more))
  - Screenshot: `desktop-1440_home.png` · File: `src/app/page.tsx (+ src/components/home/*)`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.text-slate-800`)
  - Screenshot: `desktop-1440_home.png` · File: `src/app/page.tsx (+ src/components/home/*)`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/search** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (12 node(s), e.g. `.bg-slate-100.text-slate-400.place-items-center`, `article:nth-child(1) > .p-4.flex-1.flex-col > .text-emerald-600.mt-2.font-medium`, `article:nth-child(1) > .p-4.flex-1.flex-col > .mt-auto.pt-4.justify-between > .gap-2.items-center.flex > .bg-emerald-500.text-white.py-2`, … (+9 more))
  - Screenshot: `desktop-1440_search.png` · File: `src/app/search/page.tsx, src/components/search/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/search** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.xl\:flex`)
  - Screenshot: `desktop-1440_search.png` · File: `src/app/search/page.tsx, src/components/search/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/flatmates** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (2 node(s), e.g. `.self-start`, `a[href$="property"]`)
  - Screenshot: `desktop-1440_flatmates.png` · File: `src/app/flatmates/page.tsx, src/components/flatmates/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/flatmates** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.text-slate-800`)
  - Screenshot: `desktop-1440_flatmates.png` · File: `src/app/flatmates/page.tsx, src/components/flatmates/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/noida** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (2 node(s), e.g. `.self-start`, `a[href$="property"]`)
  - Screenshot: `desktop-1440_noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/noida** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.xl\:flex`)
  - Screenshot: `desktop-1440_noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/greater-noida** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (4 node(s), e.g. `.self-start`, `section:nth-child(2) > .lg\:grid-cols-3.sm\:grid-cols-2.mt-4 > article > .h-40.bg-slate-100.w-full > .text-slate-400.w-full.h-full`, `section:nth-child(3) > .lg\:grid-cols-3.sm\:grid-cols-2.mt-4 > article > .h-40.bg-slate-100.w-full > .text-slate-400.w-full.h-full`, … (+1 more))
  - Screenshot: `desktop-1440_greater-noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/greater-noida** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.xl\:flex`)
  - Screenshot: `desktop-1440_greater-noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/greater-noida/noida-extension/gaur-city-2** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (4 node(s), e.g. `.self-start`, `section:nth-child(3) > .lg\:grid-cols-3.sm\:grid-cols-2.mt-4 > article > .h-40.bg-slate-100.w-full > .text-slate-400.w-full.h-full`, `section:nth-child(4) > .lg\:grid-cols-3.sm\:grid-cols-2.mt-4 > article > .h-40.bg-slate-100.w-full > .text-slate-400.w-full.h-full`, … (+1 more))
  - Screenshot: `desktop-1440_gaur-city-2.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/greater-noida/noida-extension/gaur-city-2** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.xl\:flex`)
  - Screenshot: `desktop-1440_gaur-city-2.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/gurgaon** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (2 node(s), e.g. `.self-start`, `a[href$="property"]`)
  - Screenshot: `desktop-1440_gurgaon.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/gurgaon** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.xl\:flex`)
  - Screenshot: `desktop-1440_gurgaon.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/ghaziabad** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (2 node(s), e.g. `.self-start`, `a[href$="property"]`)
  - Screenshot: `desktop-1440_ghaziabad.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/ghaziabad** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.xl\:flex`)
  - Screenshot: `desktop-1440_ghaziabad.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8)** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `desktop-1440_listing.png` · File: `src/components/listing/listing-detail.tsx, photo-carousel.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8)** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.xl\:flex`)
  - Screenshot: `desktop-1440_listing.png` · File: `src/components/listing/listing-detail.tsx, photo-carousel.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/property?intent=flat** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (5 node(s), e.g. `.block.text-slate-700:nth-child(1) > .font-normal.text-slate-400`, `.space-y-4:nth-child(2) > .block.text-slate-700:nth-child(3) > .font-normal.text-slate-400`, `legend > .font-normal.text-slate-400`, … (+2 more))
  - Screenshot: `desktop-1440_post-flat.png` · File: `src/app/property/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/property?intent=flat** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.text-slate-800`)
  - Screenshot: `desktop-1440_post-flat.png` · File: `src/app/property/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/property?intent=flatmate** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (9 node(s), e.g. `.block.text-slate-700:nth-child(1) > .font-normal.text-slate-400`, `.block.text-slate-700:nth-child(2) > .font-normal.text-slate-400`, `.gap-y-4 > .block.text-slate-700:nth-child(5) > .font-normal.text-slate-400`, … (+6 more))
  - Screenshot: `desktop-1440_post-flatmate.png` · File: `src/app/property/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/property?intent=flatmate** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.text-slate-800`)
  - Screenshot: `desktop-1440_post-flatmate.png` · File: `src/app/property/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/about** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `desktop-1440_about.png` · File: `src/app/about/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/about** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.text-slate-800`)
  - Screenshot: `desktop-1440_about.png` · File: `src/app/about/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/blog** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `desktop-1440_blog.png` · File: `src/app/blog/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/blog** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.text-slate-800`)
  - Screenshot: `desktop-1440_blog.png` · File: `src/app/blog/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/blog/sharing-flat-in-noida** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `desktop-1440_blog-post.png` · File: `src/app/blog/[slug]/page.tsx, src/data/blog.ts`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/blog/sharing-flat-in-noida** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.text-slate-800`)
  - Screenshot: `desktop-1440_blog-post.png` · File: `src/app/blog/[slug]/page.tsx, src/data/blog.ts`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/privacy-policy** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `desktop-1440_privacy-policy.png` · File: `src/app/privacy-policy/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/privacy-policy** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.text-slate-800`)
  - Screenshot: `desktop-1440_privacy-policy.png` · File: `src/app/privacy-policy/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/terms** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `desktop-1440_terms.png` · File: `src/app/terms/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/terms** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.text-slate-800`)
  - Screenshot: `desktop-1440_terms.png` · File: `src/app/terms/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/contact** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `desktop-1440_contact.png` · File: `src/app/contact/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/contact** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.text-slate-800`)
  - Screenshot: `desktop-1440_contact.png` · File: `src/app/contact/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/auth** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `desktop-1440_login.png` · File: `src/app/auth/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/auth** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.text-slate-800`)
  - Screenshot: `desktop-1440_login.png` · File: `src/app/auth/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/admin** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `desktop-1440_admin.png` · File: `src/app/admin/login/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/admin** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.text-slate-800`)
  - Screenshot: `desktop-1440_admin.png` · File: `src/app/admin/login/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/this-page-does-not-exist-404** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `desktop-1440_not-found.png` · File: `src/app/not-found.tsx (missing → Next default)`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/this-page-does-not-exist-404** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.text-slate-800`)
  - Screenshot: `desktop-1440_not-found.png` · File: `src/app/not-found.tsx (missing → Next default)`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **/dashboard** · desktop-1440 — axe critical: button-name — Buttons must have discernible text (3 node(s), e.g. `.text-slate-700.p-3:nth-child(1)`, `.text-slate-700.p-3:nth-child(2)`, `.text-slate-700.p-3:nth-child(3)`)
  - Screenshot: `desktop-1440_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/button-name?application=playwright
- **/dashboard** · desktop-1440 — axe serious: color-contrast — Elements must meet minimum color contrast ratio thresholds (1 node(s), e.g. `.bg-emerald-500`)
  - Screenshot: `desktop-1440_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
- **/dashboard** · desktop-1440 — axe serious: label-content-name-mismatch — Elements must have their visible text as part of their accessible name (1 node(s), e.g. `.text-slate-800`)
  - Screenshot: `desktop-1440_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright
- **interaction: bottom nav** · mobile-390 — Interaction check failed: locator.isVisible: Error: strict mode violation: locator('nav[aria-label="Main"]').getByRole('link', { name: /Looking for a flat/ }) resolved to 2 elements:
  - Screenshot: `interaction_mobile-390_bottom nav.png` · File: `-`
  - Fix: See screenshot; reproduce manually.

### Medium (173)

- **/** · mobile-390 — 43 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<input#home-city.mt-1.w-full.bg-transparent> 298x20`, `<a.rounded-full.border.border-slate-200> "Gaur City 2" 87x30`, `<a.rounded-full.border.border-slate-200> "Noida Ext." 81x30`, `<a.rounded-full.border.border-slate-200> "Sector 62" 77x30`, `<a.rounded-full.border.border-slate-200> "Sector 137" 84x30`, … (+37 more)
  - Screenshot: `mobile-390_home.png` · File: `src/app/page.tsx (+ src/components/home/*)`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/** · mobile-390 — 54 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`, `<label.flex.items-center.gap-1.5> "Location" 11px`, … (+48 more)
  - Screenshot: `mobile-390_home.png` · File: `src/app/page.tsx (+ src/components/home/*)`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/search** · mobile-390 — 41 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<select.bg-transparent.outline-none> "Newest first Rent: low to high Rent: hig" 125x18`, `<a.flex.items-center.gap-2> "Map View" 117x36`, `<input#keyword-search.w-full.bg-transparent.py-2.5> 216x40`, `<button.mt-3.flex.w-full> "Filters" 266x42`, … (+35 more)
  - Screenshot: `mobile-390_search.png` · File: `src/app/search/page.tsx, src/components/search/*`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/search** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_search.png` · File: `src/app/search/page.tsx, src/components/search/*`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/flatmates** · mobile-390 — 39 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<input#budget-filter.w-24.bg-transparent.text-sm> 96x20`, `<button.grid.h-7.w-7> "Search with this budget" 28x28`, `<a.rounded-full.border.px-3> "Any gender" 98x34`, `<a.rounded-full.border.px-3> "Male" 56x34`, … (+33 more)
  - Screenshot: `mobile-390_flatmates.png` · File: `src/app/flatmates/page.tsx, src/components/flatmates/*`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/flatmates** · mobile-390 — 8 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`, `<dt.text-[11px].text-slate-500> "Budget" 11px`, … (+2 more)
  - Screenshot: `mobile-390_flatmates.png` · File: `src/app/flatmates/page.tsx, src/components/flatmates/*`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/noida** · mobile-390 — 52 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, `<a.after:absolute.after:inset-0> "1 Room in 3BHK Flat" 158x17`, `<a.after:absolute.after:inset-0> "Private Room in 2BHK" 170x17`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, … (+46 more)
  - Screenshot: `mobile-390_noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/noida** · mobile-390 — 8 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`, `<dt.text-[11px].text-slate-500> "Budget" 11px`, … (+2 more)
  - Screenshot: `mobile-390_noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/greater-noida** · mobile-390 — 49 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, `<a.after:absolute.after:inset-0> "1 Room in 3BHK Flat" 158x17`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, `<a.after:absolute.after:inset-0> "1 Room in 3BHK Flat" 158x17`, … (+43 more)
  - Screenshot: `mobile-390_greater-noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/greater-noida** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_greater-noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/greater-noida/noida-extension/gaur-city-2** · mobile-390 — 81 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<a.hover:text-blue-600.hover:underline> "Greater Noida" 88x20`, `<a.hover:text-blue-600.hover:underline> "Greater Noida West" 123x20`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, `<a.after:absolute.after:inset-0> "1 Room in 3BHK Flat" 158x17`, … (+75 more)
  - Screenshot: `mobile-390_gaur-city-2.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/greater-noida/noida-extension/gaur-city-2** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_gaur-city-2.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/gurgaon** · mobile-390 — 50 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, `<a.after:absolute.after:inset-0> "Private Room in 2BHK" 170x17`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, … (+44 more)
  - Screenshot: `mobile-390_gurgaon.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/gurgaon** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_gurgaon.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/ghaziabad** · mobile-390 — 48 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, `<a.after:absolute.after:inset-0> "Modern Studio Near Metro" 200x17`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, … (+42 more)
  - Screenshot: `mobile-390_ghaziabad.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/ghaziabad** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_ghaziabad.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8)** · mobile-390 — 37 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<a.hover:text-blue-600.hover:underline> "Greater Noida" 88x20`, `<a.hover:text-blue-600.hover:underline> "Greater Noida West" 123x20`, `<a.hover:text-blue-600.hover:underline> "Gaur City 2" 71x20`, `<a.hover:text-blue-600.hover:underline> "Sharing Flat" 75x20`, … (+31 more)
  - Screenshot: `mobile-390_listing.png` · File: `src/components/listing/listing-detail.tsx, photo-carousel.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8)** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_listing.png` · File: `src/components/listing/listing-detail.tsx, photo-carousel.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/property?intent=flat** · mobile-390 — 36 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<input.w-full.bg-transparent.outline-none> 251x20`, `<input.w-full.bg-transparent.outline-none> 251x20`, `<input> 13x13`, `<input> 13x13`, … (+30 more)
  - Screenshot: `mobile-390_post-flat.png` · File: `src/app/property/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/property?intent=flat** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_post-flat.png` · File: `src/app/property/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/property?intent=flatmate** · mobile-390 — 36 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<input.w-full.bg-transparent.outline-none> 251x20`, `<input.w-full.bg-transparent.outline-none> 251x20`, `<input> 13x13`, `<input> 13x13`, … (+30 more)
  - Screenshot: `mobile-390_post-flatmate.png` · File: `src/app/property/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/property?intent=flatmate** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_post-flatmate.png` · File: `src/app/property/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/about** · mobile-390 — 27 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<a.mt-4.inline-block.text-sm> "Renting guides & tips" 132x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "About Us" 358x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Privacy Policy" 358x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Terms" 358x20`, … (+21 more)
  - Screenshot: `mobile-390_about.png` · File: `src/app/about/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/about** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_about.png` · File: `src/app/about/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/blog** · mobile-390 — 31 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<a.text-sm.font-semibold.text-blue-600> "Flats & flatmates in Noida" 171x20`, `<a.text-sm.font-semibold.text-blue-600> "Flats & flatmates in Greater Noida" 215x40`, `<a.text-sm.font-semibold.text-blue-600> "Flats & flatmates in Gurgaon" 191x20`, `<a.text-sm.font-semibold.text-blue-600> "Flats & flatmates in Ghaziabad" 203x20`, … (+25 more)
  - Screenshot: `mobile-390_blog.png` · File: `src/app/blog/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/blog** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_blog.png` · File: `src/app/blog/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/blog/sharing-flat-in-noida** · mobile-390 — 32 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<a.hover:text-blue-600.hover:underline> "Blog" 28x20`, `<a.text-sm.font-semibold.text-blue-600> "View all" 51x20`, `<a.after:absolute.after:inset-0> "Single Room" 98x17`, `<a.after:absolute.after:inset-0> "1 Room in 3BHK Flat" 158x17`, … (+26 more)
  - Screenshot: `mobile-390_blog-post.png` · File: `src/app/blog/[slug]/page.tsx, src/data/blog.ts`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/blog/sharing-flat-in-noida** · mobile-390 — 8 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`, `<dt.text-[11px].text-slate-500> "Budget" 11px`, … (+2 more)
  - Screenshot: `mobile-390_blog-post.png` · File: `src/app/blog/[slug]/page.tsx, src/data/blog.ts`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/privacy-policy** · mobile-390 — 27 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<a.mt-4.inline-block.text-sm> "Renting guides & tips" 132x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "About Us" 358x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Privacy Policy" 358x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Terms" 358x20`, … (+21 more)
  - Screenshot: `mobile-390_privacy-policy.png` · File: `src/app/privacy-policy/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/privacy-policy** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_privacy-policy.png` · File: `src/app/privacy-policy/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/terms** · mobile-390 — 27 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<a.mt-4.inline-block.text-sm> "Renting guides & tips" 132x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "About Us" 358x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Privacy Policy" 358x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Terms" 358x20`, … (+21 more)
  - Screenshot: `mobile-390_terms.png` · File: `src/app/terms/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/terms** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_terms.png` · File: `src/app/terms/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/contact** · mobile-390 — 27 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<a.mt-4.inline-block.text-sm> "Renting guides & tips" 132x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "About Us" 358x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Privacy Policy" 358x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Terms" 358x20`, … (+21 more)
  - Screenshot: `mobile-390_contact.png` · File: `src/app/contact/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/contact** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_contact.png` · File: `src/app/contact/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/auth** · mobile-390 — 28 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<input.w-full.bg-transparent.outline-none> 251x20`, `<a.mt-4.inline-block.text-sm> "Renting guides & tips" 132x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "About Us" 358x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Privacy Policy" 358x20`, … (+22 more)
  - Screenshot: `mobile-390_login.png` · File: `src/app/auth/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/auth** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_login.png` · File: `src/app/auth/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/admin** · mobile-390 — 27 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<input.w-full.bg-transparent.outline-none> 235x20`, `<a.mt-4.inline-block.text-sm> "Renting guides & tips" 132x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "About Us" 358x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Privacy Policy" 358x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Terms" 358x20`, … (+21 more)
  - Screenshot: `mobile-390_admin.png` · File: `src/app/admin/login/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/admin** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_admin.png` · File: `src/app/admin/login/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/this-page-does-not-exist-404** · mobile-390 — 26 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.mt-4.inline-block.text-sm> "Renting guides & tips" 132x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "About Us" 358x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Privacy Policy" 358x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Terms" 358x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Contact" 358x20`, … (+20 more)
  - Screenshot: `mobile-390_not-found.png` · File: `src/app/not-found.tsx (missing → Next default)`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/this-page-does-not-exist-404** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_not-found.png` · File: `src/app/not-found.tsx (missing → Next default)`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/dashboard** · mobile-390 — 28 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<button.text-sm.font-semibold.text-blue-600> "View all" 51x20`, `<a.mt-4.inline-block.text-sm> "Renting guides & tips" 132x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "About Us" 358x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Privacy Policy" 358x20`, … (+22 more)
  - Screenshot: `mobile-390_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/dashboard** · mobile-390 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-390_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/** · mobile-360 — 43 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<input#home-city.mt-1.w-full.bg-transparent> 268x20`, `<a.rounded-full.border.border-slate-200> "Gaur City 2" 87x30`, `<a.rounded-full.border.border-slate-200> "Noida Ext." 81x30`, `<a.rounded-full.border.border-slate-200> "Sector 62" 77x30`, `<a.rounded-full.border.border-slate-200> "Sector 137" 84x30`, … (+37 more)
  - Screenshot: `mobile-360_home.png` · File: `src/app/page.tsx (+ src/components/home/*)`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/** · mobile-360 — 54 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`, `<label.flex.items-center.gap-1.5> "Location" 11px`, … (+48 more)
  - Screenshot: `mobile-360_home.png` · File: `src/app/page.tsx (+ src/components/home/*)`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/search** · mobile-360 — 41 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<select.bg-transparent.outline-none> "Newest first Rent: low to high Rent: hig" 125x18`, `<a.flex.items-center.gap-2> "Map View" 117x36`, `<input#keyword-search.w-full.bg-transparent.py-2.5> 186x40`, `<button.mt-3.flex.w-full> "Filters" 236x42`, … (+35 more)
  - Screenshot: `mobile-360_search.png` · File: `src/app/search/page.tsx, src/components/search/*`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/search** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_search.png` · File: `src/app/search/page.tsx, src/components/search/*`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/flatmates** · mobile-360 — 39 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<input#budget-filter.w-24.bg-transparent.text-sm> 96x20`, `<button.grid.h-7.w-7> "Search with this budget" 28x28`, `<a.rounded-full.border.px-3> "Any gender" 98x34`, `<a.rounded-full.border.px-3> "Male" 56x34`, … (+33 more)
  - Screenshot: `mobile-360_flatmates.png` · File: `src/app/flatmates/page.tsx, src/components/flatmates/*`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/flatmates** · mobile-360 — 8 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`, `<dt.text-[11px].text-slate-500> "Budget" 11px`, … (+2 more)
  - Screenshot: `mobile-360_flatmates.png` · File: `src/app/flatmates/page.tsx, src/components/flatmates/*`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/noida** · mobile-360 — 52 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, `<a.after:absolute.after:inset-0> "1 Room in 3BHK Flat" 158x17`, `<a.after:absolute.after:inset-0> "Private Room in 2BHK" 170x17`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, … (+46 more)
  - Screenshot: `mobile-360_noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/noida** · mobile-360 — 8 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`, `<dt.text-[11px].text-slate-500> "Budget" 11px`, … (+2 more)
  - Screenshot: `mobile-360_noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/greater-noida** · mobile-360 — 49 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, `<a.after:absolute.after:inset-0> "1 Room in 3BHK Flat" 158x17`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, `<a.after:absolute.after:inset-0> "1 Room in 3BHK Flat" 158x17`, … (+43 more)
  - Screenshot: `mobile-360_greater-noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/greater-noida** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_greater-noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/greater-noida/noida-extension/gaur-city-2** · mobile-360 — 79 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<a.hover:text-blue-600.hover:underline> "Greater Noida" 88x20`, `<a.hover:text-blue-600.hover:underline> "Greater Noida West" 123x20`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, `<a.after:absolute.after:inset-0> "1 Room in 3BHK Flat" 158x17`, … (+73 more)
  - Screenshot: `mobile-360_gaur-city-2.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/greater-noida/noida-extension/gaur-city-2** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_gaur-city-2.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/gurgaon** · mobile-360 — 49 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, `<a.after:absolute.after:inset-0> "Private Room in 2BHK" 170x17`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, … (+43 more)
  - Screenshot: `mobile-360_gurgaon.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/gurgaon** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_gurgaon.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/ghaziabad** · mobile-360 — 46 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, `<a.after:absolute.after:inset-0> "Modern Studio Near Metro" 200x17`, `<a.inline-flex.shrink-0.items-center> "View all" 71x20`, … (+40 more)
  - Screenshot: `mobile-360_ghaziabad.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/ghaziabad** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_ghaziabad.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8)** · mobile-360 — 37 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<a.hover:text-blue-600.hover:underline> "Greater Noida" 88x20`, `<a.hover:text-blue-600.hover:underline> "Greater Noida West" 123x20`, `<a.hover:text-blue-600.hover:underline> "Gaur City 2" 71x20`, `<a.hover:text-blue-600.hover:underline> "Sharing Flat" 75x20`, … (+31 more)
  - Screenshot: `mobile-360_listing.png` · File: `src/components/listing/listing-detail.tsx, photo-carousel.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8)** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_listing.png` · File: `src/components/listing/listing-detail.tsx, photo-carousel.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/property?intent=flat** · mobile-360 — 36 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<input.w-full.bg-transparent.outline-none> 221x20`, `<input.w-full.bg-transparent.outline-none> 221x20`, `<input> 13x13`, `<input> 13x13`, … (+30 more)
  - Screenshot: `mobile-360_post-flat.png` · File: `src/app/property/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/property?intent=flat** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_post-flat.png` · File: `src/app/property/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/property?intent=flatmate** · mobile-360 — 36 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<input.w-full.bg-transparent.outline-none> 221x20`, `<input.w-full.bg-transparent.outline-none> 221x20`, `<input> 13x13`, `<input> 13x13`, … (+30 more)
  - Screenshot: `mobile-360_post-flatmate.png` · File: `src/app/property/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/property?intent=flatmate** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_post-flatmate.png` · File: `src/app/property/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/about** · mobile-360 — 27 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<a.mt-4.inline-block.text-sm> "Renting guides & tips" 132x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "About Us" 328x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Privacy Policy" 328x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Terms" 328x20`, … (+21 more)
  - Screenshot: `mobile-360_about.png` · File: `src/app/about/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/about** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_about.png` · File: `src/app/about/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/blog** · mobile-360 — 31 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<a.text-sm.font-semibold.text-blue-600> "Flats & flatmates in Noida" 171x20`, `<a.text-sm.font-semibold.text-blue-600> "Flats & flatmates in Greater Noida" 196x40`, `<a.text-sm.font-semibold.text-blue-600> "Flats & flatmates in Gurgaon" 191x20`, `<a.text-sm.font-semibold.text-blue-600> "Flats & flatmates in Ghaziabad" 203x20`, … (+25 more)
  - Screenshot: `mobile-360_blog.png` · File: `src/app/blog/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/blog** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_blog.png` · File: `src/app/blog/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/blog/sharing-flat-in-noida** · mobile-360 — 32 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.hover:text-blue-600.hover:underline> "Home" 37x20`, `<a.hover:text-blue-600.hover:underline> "Blog" 28x20`, `<a.text-sm.font-semibold.text-blue-600> "View all" 51x20`, `<a.after:absolute.after:inset-0> "Single Room" 98x17`, `<a.after:absolute.after:inset-0> "1 Room in 3BHK Flat" 158x17`, … (+26 more)
  - Screenshot: `mobile-360_blog-post.png` · File: `src/app/blog/[slug]/page.tsx, src/data/blog.ts`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/blog/sharing-flat-in-noida** · mobile-360 — 8 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`, `<dt.text-[11px].text-slate-500> "Budget" 11px`, … (+2 more)
  - Screenshot: `mobile-360_blog-post.png` · File: `src/app/blog/[slug]/page.tsx, src/data/blog.ts`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/privacy-policy** · mobile-360 — 27 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<a.mt-4.inline-block.text-sm> "Renting guides & tips" 132x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "About Us" 328x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Privacy Policy" 328x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Terms" 328x20`, … (+21 more)
  - Screenshot: `mobile-360_privacy-policy.png` · File: `src/app/privacy-policy/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/privacy-policy** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_privacy-policy.png` · File: `src/app/privacy-policy/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/terms** · mobile-360 — 27 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<a.mt-4.inline-block.text-sm> "Renting guides & tips" 132x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "About Us" 328x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Privacy Policy" 328x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Terms" 328x20`, … (+21 more)
  - Screenshot: `mobile-360_terms.png` · File: `src/app/terms/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/terms** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_terms.png` · File: `src/app/terms/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/contact** · mobile-360 — 27 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<a.mt-4.inline-block.text-sm> "Renting guides & tips" 132x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "About Us" 328x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Privacy Policy" 328x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Terms" 328x20`, … (+21 more)
  - Screenshot: `mobile-360_contact.png` · File: `src/app/contact/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/contact** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_contact.png` · File: `src/app/contact/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/auth** · mobile-360 — 28 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<input.w-full.bg-transparent.outline-none> 221x20`, `<a.mt-4.inline-block.text-sm> "Renting guides & tips" 132x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "About Us" 328x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Privacy Policy" 328x20`, … (+22 more)
  - Screenshot: `mobile-360_login.png` · File: `src/app/auth/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/auth** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_login.png` · File: `src/app/auth/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/admin** · mobile-360 — 27 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<input.w-full.bg-transparent.outline-none> 206x20`, `<a.mt-4.inline-block.text-sm> "Renting guides & tips" 132x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "About Us" 328x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Privacy Policy" 328x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Terms" 328x20`, … (+21 more)
  - Screenshot: `mobile-360_admin.png` · File: `src/app/admin/login/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/admin** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_admin.png` · File: `src/app/admin/login/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/this-page-does-not-exist-404** · mobile-360 — 26 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<a.mt-4.inline-block.text-sm> "Renting guides & tips" 132x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "About Us" 328x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Privacy Policy" 328x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Terms" 328x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Contact" 328x20`, … (+20 more)
  - Screenshot: `mobile-360_not-found.png` · File: `src/app/not-found.tsx (missing → Next default)`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/this-page-does-not-exist-404** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_not-found.png` · File: `src/app/not-found.tsx (missing → Next default)`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/dashboard** · mobile-360 — 28 tap target(s) smaller than 44×44px: `<a.flex.items-center.gap-3> "FlatFolks" 152x40`, `<button.mb-6.inline-flex.items-center> "Back" 91x38`, `<button.text-sm.font-semibold.text-blue-600> "View all" 51x20`, `<a.mt-4.inline-block.text-sm> "Renting guides & tips" 132x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "About Us" 328x20`, `<a.text-sm.text-slate-600.hover:text-blue-600> "Privacy Policy" 328x20`, … (+22 more)
  - Screenshot: `mobile-360_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile.
- **/dashboard** · mobile-360 — 5 text element(s) under 12px on mobile: `<a.flex.min-w-0.flex-1> "Home" 10px`, `<span.truncate> "Find Room" 10px`, `<button.flex.min-w-0.flex-1> "Post" 11px`, `<a.flex.min-w-0.flex-1> "Flatmates" 10px`, `<a.flex.min-w-0.flex-1> "Login" 10px`
  - Screenshot: `mobile-360_dashboard-logged-out.png` · File: `src/app/dashboard/page.tsx`
  - Fix: Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm.
- **/** · tablet-768 — 8 image(s) loaded much larger than displayed: `http://localhost:3100/_next/image?url=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1486406146926-c627a92ad1ab%3Fauto%3Dformat%26fit%3Dcrop%26w% natural 768px vs shown 167px @1x`, `http://localhost:3100/_next/image?url=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1449824913935-59a10b8d2000%3Fauto%3Dformat%26fit%3Dcrop%26w% natural 768px vs shown 167px @1x`, `http://localhost:3100/_next/image?url=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1587474260584-136574528ed5%3Fauto%3Dformat%26fit%3Dcrop%26w% natural 768px vs shown 167px @1x`, … (+5 more)
  - Screenshot: `tablet-768_home.png` · File: `src/app/page.tsx (+ src/components/home/*)`
  - Fix: Pass an accurate `sizes` prop to next/image (or a smaller width param) for cards/thumbnails.
- **interaction: home search** · mobile-390 — While typing a location, the suggestion list covers the Search (and Filters) button, so a tap meant for Search picks a suggestion instead.
  - Screenshot: `-` · File: `src/components/home/search-card.tsx`
  - Fix: Cap the list height (e.g. max-h-48), or close it when the input loses focus / on scroll; keep Search reachable.
- **/** · desktop-1440 — Unproven claim "verified" ×7: `01009 ₹7,000 /month WiFi Kitchen Lift Verified 1 Room in 3BHK Flat Sector 137, Noida`, `, Noida ₹8,000 /month WiFi AC Kitchen Verified Modern Studio Near Metro Indirapuram,`, … (+5 more)
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/** · desktop-1440 — Unproven claim "10,000+" ×1: `ed on lifestyle, preferences & budget. 10,000+ Flatmates Already Joined Find Flatmate`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/** · desktop-1440 — Unproven claim "25k+" ×1: `I recommends your best fit. Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×2: `arent pricing, always. Smart Matching AI recommends your best fit. Trusted by 25k+ renters`, `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/** · desktop-1440 — Unproven claim "Smart Matching" ×1: `Charges Transparent pricing, always. Smart Matching AI recommends your best fit. Trusted`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/search** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/search** · desktop-1440 — Unproven claim "25k+" ×1: `oom Interested View details Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/search** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/search** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/flatmates** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/flatmates** · desktop-1440 — Unproven claim "25k+" ×1: `gaon Flatmates in Ghaziabad Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/flatmates** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/flatmates** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/noida** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/noida** · desktop-1440 — Unproven claim "25k+" ×1: `(and Avoid the Wrong Ones) Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/noida** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/noida** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/noida** · desktop-1440 — Count glued to an area name ("Sector 1371" bug): `ular areas in Noida Sector 1371 More (8) ▾ Also bro`
  - Screenshot: `-` · File: `src/components/seo/landing-page.tsx (child place list)`
  - Fix: Render the count in its own element with a space or badge, e.g. `Sector 137 · 1`.
- **/greater-noida** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/greater-noida** · desktop-1440 — Unproven claim "25k+" ×1: `as to Live in Greater Noida Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/greater-noida** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/greater-noida** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/greater-noida/noida-extension/gaur-city-2** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/greater-noida/noida-extension/gaur-city-2** · desktop-1440 — Unproven claim "25k+" ×1: `as to Live in Greater Noida Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/greater-noida/noida-extension/gaur-city-2** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/greater-noida/noida-extension/gaur-city-2** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/gurgaon** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/gurgaon** · desktop-1440 — Unproven claim "25k+" ×1: `on: Rent, Bills and Commute Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/gurgaon** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/gurgaon** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/ghaziabad** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/ghaziabad** · desktop-1440 — Unproven claim "25k+" ×1: `ad: Rent, Bills and Commute Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/ghaziabad** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/ghaziabad** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8)** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8)** · desktop-1440 — Unproven claim "25k+" ×1: `ryana ₹11,000/month · Room Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8)** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8)** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/property?intent=flat** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/property?intent=flat** · desktop-1440 — Unproven claim "25k+" ×1: `ion (optional) Publish post Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/property?intent=flat** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/property?intent=flat** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/property?intent=flatmate** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/property?intent=flatmate** · desktop-1440 — Unproven claim "25k+" ×1: `ion (optional) Publish post Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/property?intent=flatmate** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/property?intent=flatmate** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/about** · desktop-1440 — Unproven claim "verified" ×5: `home, FlatFolks helps you connect with verified listings and compatible roommates—all i`, `accessible for everyone. What We Offer Verified room and flat listings Compatible flatm`, … (+3 more)
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/about** · desktop-1440 — Unproven claim "25k+" ×1: `nd Flatmates. Move Smarter. Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/about** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/about** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/blog** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/blog** · desktop-1440 — Unproven claim "25k+" ×1: `tting it wrong. Read guide Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/blog** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/blog** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/blog/sharing-flat-in-noida** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/blog/sharing-flat-in-noida** · desktop-1440 — Unproven claim "25k+" ×1: `(and Avoid the Wrong Ones) Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/blog/sharing-flat-in-noida** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/blog/sharing-flat-in-noida** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/privacy-policy** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/privacy-policy** · desktop-1440 — Unproven claim "25k+" ×1: `or visit our Contact page. Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/privacy-policy** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/privacy-policy** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/terms** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/terms** · desktop-1440 — Unproven claim "25k+" ×1: `ankitsingh74569@gmail.com. Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/terms** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/terms** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/contact** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/contact** · desktop-1440 — Unproven claim "25k+" ×1: `cy Policy and Terms of Use. Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/contact** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/contact** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/auth** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/auth** · desktop-1440 — Unproven claim "25k+" ×1: `ly. Email address Send OTP Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/auth** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/auth** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/admin** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/admin** · desktop-1440 — Unproven claim "25k+" ×1: `a Username Password Log in Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/admin** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/admin** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/this-page-does-not-exist-404** · desktop-1440 — Unproven claim "verified" ×1: `and professionals across India. TRUST Verified listings Secure messaging 24/7 support`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/this-page-does-not-exist-404** · desktop-1440 — Unproven claim "25k+" ×1: `is page could not be found. Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/this-page-does-not-exist-404** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/this-page-does-not-exist-404** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/dashboard** · desktop-1440 — Unproven claim "verified" ×3: `nt activity View all New message from a verified room owner in Noida. Your saved listing`, `ble for a viewing tour. Profile status Verified • Ready to connect AI roommate recomme`, … (+1 more)
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.
- **/dashboard** · desktop-1440 — Unproven claim "25k+" ×1: `available for your profile. Trusted by 25k+ renters and landlords Your next room,`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/dashboard** · desktop-1440 — Unproven claim "24/7 support" ×1: `UST Verified listings Secure messaging 24/7 support Renting guides & tips About Us Privacy`
  - Screenshot: `-` · File: `src/components/layout/footer.tsx / src/app/page.tsx`
  - Fix: Remove or replace with something verifiable.
- **/dashboard** · desktop-1440 — Unproven claim "AI recommends / AI-powered" ×1: `e to live starts here. List a property AI-powered housing discovery for students and prof`
  - Screenshot: `-` · File: `grep the phrase in src/`
  - Fix: Remove or replace with something verifiable.

### Low (35)

- **/greater-noida** · mobile-390 — 3 pair(s) of small tap targets closer than 8px: `<a.flex.min-w-0.flex-1> "Home" ↔ <a.after:absolute.after:inset-0> "1 Room in 3BHK Flat" (6px)`, `<a.flex.min-w-0.flex-1> "Find Room" ↔ <a.after:absolute.after:inset-0> "1 Room in 3BHK Flat" (6px)`, `<button.flex.min-w-0.flex-1> "Post" ↔ <a.after:absolute.after:inset-0> "1 Room in 3BHK Flat" (6px)`
  - Screenshot: `mobile-390_greater-noida.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Increase gap between adjacent small links/buttons on mobile.
- **/greater-noida/noida-extension/gaur-city-2** · mobile-390 — 3 pair(s) of small tap targets closer than 8px: `<a.rounded-full.border.border-slate-200> ↔ <summary.cursor-pointer.list-none.text-sm> "Show all (33) ▾" (4px)`, `<a.rounded-full.border.border-slate-200> ↔ <a.rounded-full.border.border-slate-200> (1px)`, `<a.rounded-full.border.border-slate-200> ↔ <a.inline-flex.items-center.gap-2> "List a property" (0px)`
  - Screenshot: `mobile-390_gaur-city-2.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Increase gap between adjacent small links/buttons on mobile.
- **listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8)** · mobile-390 — 4 pair(s) of small tap targets closer than 8px: `<a.hover:text-blue-600.hover:underline> "Home" ↔ <a.hover:text-blue-600.hover:underline> "Gaur City 2" (6px)`, `<a.hover:text-blue-600.hover:underline> "Greater Noida" ↔ <a.hover:text-blue-600.hover:underline> "Gaur City 2" (6px)`, `<a.hover:text-blue-600.hover:underline> "Greater Noida" ↔ <a.hover:text-blue-600.hover:underline> "Sharing Flat" (6px)`, `<a.hover:text-blue-600.hover:underline> "Greater Noida West" ↔ <a.hover:text-blue-600.hover:underline> "Sharing Flat" (6px)`
  - Screenshot: `mobile-390_listing.png` · File: `src/components/listing/listing-detail.tsx, photo-carousel.tsx`
  - Fix: Increase gap between adjacent small links/buttons on mobile.
- **/greater-noida/noida-extension/gaur-city-2** · mobile-360 — 6 pair(s) of small tap targets closer than 8px: `<a.rounded-full.border.border-slate-200> ↔ <summary.cursor-pointer.list-none.text-sm> "Show all (33) ▾" (4px)`, `<a.rounded-full.border.border-slate-200> ↔ <a.rounded-full.border.border-slate-200> (1px)`, `<a.rounded-full.border.border-slate-200> ↔ <a.rounded-full.border.border-slate-200> "Best Areas to Live in Greater Noida" (4px)`, `<a.rounded-full.border.border-slate-200> ↔ <a.inline-flex.items-center.gap-2> "List a property" (6px)`, … (+2 more)
  - Screenshot: `mobile-360_gaur-city-2.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Increase gap between adjacent small links/buttons on mobile.
- **/ghaziabad** · mobile-360 — 2 pair(s) of small tap targets closer than 8px: `<button.flex.min-w-0.flex-1> "Post" ↔ <a.font-semibold.text-blue-600> "Post yours" (2px)`, `<a.flex.min-w-0.flex-1> "Flatmates" ↔ <a.font-semibold.text-blue-600> "Post yours" (2px)`
  - Screenshot: `mobile-360_ghaziabad.png` · File: `src/components/seo/landing-page.tsx, src/lib/seo/*`
  - Fix: Increase gap between adjacent small links/buttons on mobile.
- **listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8)** · mobile-360 — 4 pair(s) of small tap targets closer than 8px: `<a.hover:text-blue-600.hover:underline> "Home" ↔ <a.hover:text-blue-600.hover:underline> "Gaur City 2" (6px)`, `<a.hover:text-blue-600.hover:underline> "Greater Noida" ↔ <a.hover:text-blue-600.hover:underline> "Gaur City 2" (6px)`, `<a.hover:text-blue-600.hover:underline> "Greater Noida" ↔ <a.hover:text-blue-600.hover:underline> "Sharing Flat" (6px)`, `<a.hover:text-blue-600.hover:underline> "Greater Noida West" ↔ <a.hover:text-blue-600.hover:underline> "Sharing Flat" (6px)`
  - Screenshot: `mobile-360_listing.png` · File: `src/components/listing/listing-detail.tsx, photo-carousel.tsx`
  - Fix: Increase gap between adjacent small links/buttons on mobile.
- **/property?intent=flat** · mobile-360 — 1 pair(s) of small tap targets closer than 8px: `<a.flex.min-w-0.flex-1> "Home" ↔ <input.w-full.bg-transparent.outline-none> (6px)`
  - Screenshot: `mobile-360_post-flat.png` · File: `src/app/property/page.tsx`
  - Fix: Increase gap between adjacent small links/buttons on mobile.
- **/property?intent=flatmate** · mobile-360 — 5 pair(s) of small tap targets closer than 8px: `<a.flex.min-w-0.flex-1> "Home" ↔ <input.w-full.bg-transparent.outline-none> (7px)`, `<a.flex.min-w-0.flex-1> "Find Room" ↔ <input.w-full.bg-transparent.outline-none> (7px)`, `<button.flex.min-w-0.flex-1> "Post" ↔ <input.w-full.bg-transparent.outline-none> (7px)`, `<a.flex.min-w-0.flex-1> "Flatmates" ↔ <input.w-full.bg-transparent.outline-none> (7px)`, … (+1 more)
  - Screenshot: `mobile-360_post-flatmate.png` · File: `src/app/property/page.tsx`
  - Fix: Increase gap between adjacent small links/buttons on mobile.
- **interaction: listing** · mobile-390 — Listing has no 'Next photo' control (single or no photo), carousel not tested.
  - Screenshot: `-` · File: `src/components/listing/photo-carousel.tsx`
  - Fix: Pick a listing with 2+ photos to test.
- **interaction: post form (flat)** · mobile-390 — Empty submit is blocked by browser validation on 4 field(s) (first: INPUT — "Please fill out this field."). Native bubbles show one field at a time.
  - Screenshot: `-` · File: `src/app/property/page.tsx`
  - Fix: Optional: show inline per-field errors instead of native bubbles.
- **interaction: post form (flatmate)** · mobile-390 — Empty submit is blocked by browser validation on 4 field(s) (first: Sector 62, Noida — "Please fill out this field."). Native bubbles show one field at a time.
  - Screenshot: `-` · File: `src/app/property/page.tsx`
  - Fix: Optional: show inline per-field errors instead of native bubbles.
- **interaction: listing** · desktop-1440 — Listing has no 'Next photo' control (single or no photo), carousel not tested.
  - Screenshot: `-` · File: `src/components/listing/photo-carousel.tsx`
  - Fix: Pick a listing with 2+ photos to test.
- **interaction: post form (flat)** · desktop-1440 — Empty submit is blocked by browser validation on 4 field(s) (first: INPUT — "Please fill out this field."). Native bubbles show one field at a time.
  - Screenshot: `-` · File: `src/app/property/page.tsx`
  - Fix: Optional: show inline per-field errors instead of native bubbles.
- **interaction: post form (flatmate)** · desktop-1440 — Empty submit is blocked by browser validation on 4 field(s) (first: Sector 62, Noida — "Please fill out this field."). Native bubbles show one field at a time.
  - Screenshot: `-` · File: `src/app/property/page.tsx`
  - Fix: Optional: show inline per-field errors instead of native bubbles.
- **/** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/search** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/flatmates** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/noida** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/greater-noida** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/greater-noida/noida-extension/gaur-city-2** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/gurgaon** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/ghaziabad** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **listing (/greater-noida/noida-extension/gaur-city-2/1-room-in-3bhk-flat-124dc8b8)** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/property?intent=flat** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/property?intent=flatmate** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/about** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/blog** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/blog/sharing-flat-in-noida** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/privacy-policy** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/terms** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/contact** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/auth** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/admin** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/this-page-does-not-exist-404** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".
- **/dashboard** · desktop-1440 — Inconsistent naming: "Room Mate" used (1×) while the rest of the site says "Flatmates".
  - Screenshot: `-` · File: `src/components/layout/navbar.tsx (desktop header)`
  - Fix: Rename to "Find Flatmates".

### Lighthouse (mobile)

| Page | Perf | A11y | Best Pr. | SEO | LCP | LCP element | Top opportunities |
|---|---|---|---|---|---|---|---|
| / | 31 | 96 | 81 | 100 | 11.7 s | n/a | Minify JavaScript (~1730 ms); Reduce unused JavaScript (~1580 ms); Reduce initial server response time (~935 ms) |
| /search | 57 | 94 | 77 | 66 | 3.8 s | n/a | Minify JavaScript (~600 ms); Reduce unused JavaScript (~450 ms) |
| /noida | 58 | 96 | 81 | 100 | 3.7 s | n/a | Reduce initial server response time (~602 ms); Minify JavaScript (~450 ms); Reduce unused JavaScript (~300 ms) |
| listing | 64 | 94 | 81 | 100 | 5.3 s | n/a | Minify JavaScript (~900 ms); Reduce initial server response time (~654 ms); Reduce unused JavaScript (~600 ms) |

