# FlatFolks Website Overview

FlatFolks is a housing-discovery platform for finding rooms, flats, PGs, and compatible flatmates in India.

## Website sections and features

### Home page

- Main landing experience with FlatFolks branding and property-discovery entry points.
- The home page is intentionally preserved without visual changes.

### Search and listings

- Browse verified listings by location, budget, property type, and amenities.
- Switch between list and map-style result views.
- View property details, pricing, nearby landmarks, and owner information.
- Save listings and submit interest to unlock private one-to-one chat.

### Property posting

- Post a property with multiple images, save it as a draft, or publish it.
- Add title, location, property type, rent, deposit, and property images.
- Listing API includes server-side input validation and basic request rate limiting.

### Flatmates

- Create and browse flatmate profiles.
- Add preferred area, budget, food preference, and lifestyle information.
- FlatFolks can surface compatibility-oriented flatmate suggestions from profile preferences.

### Chat and interest

- Submit an interest request for a listing to unlock owner chat.
- Use one-to-one live chat across browser tabs, with browser notification support.

### Wishlist

- Save and remove property listings from a personal wishlist.
- Saved-listing totals are reflected on the dashboard.

### Profile and settings

- Manage profile details, photos, housing preferences, verification status, and notification settings.
- Track profile-completion preferences such as preferred city, monthly budget, and lifestyle.

### Dashboard

- Track listing views, saved listings, messages, and interests from the dashboard.
- Review recent activity and profile readiness.

### Admin workspace

- Review listing moderation status and listing-level analytics.
- Provides a foundation for future user management and reported-content workflows.

### SEO, accessibility, and performance

- Search-engine metadata, Open Graph data, sitemap, and robots configuration are included.
- Semantic controls and ARIA labels are used where relevant, with keyboard-accessible form controls.
- Next.js production build supports route-level optimization and code splitting.

## Admin capabilities

The `/admin` workspace provides a starting point for listing moderation, report handling, user management, and listing analytics.

## Current status

The application is ready to run locally and passes a production build. The homepage and existing authentication pages have not been changed.

Before public production deployment, connect persistent services for Supabase/PostgreSQL, secure file storage, maps/Places data, server-side sessions, rate limiting, and error monitoring. The current in-memory data store resets whenever the server restarts.
