# FlatFolks Feature Review

## Purpose

This document is a single checklist for reviewing the current FlatFolks website locally.

## Run locally on Windows

```powershell
npm.cmd run dev
```

Open `http://localhost:3000`.

## Global navigation

- The header remains visible on all pages.
- Navigation includes Home, Find Rooms, Find Flatmates, Post Property, About Us, Blog, and Help.
- **One-to-One Chat** is hidden by default.
- **One-to-One Chat** appears only after the user submits an interest request for an owner.
- The footer is displayed across the site.

## Home page

- Hero search area for rooms and flatmates.
- Popular city cards.
- Featured room listings.
- Platform benefits, testimonials, and navigation links.

## Room search and filters

- Search rooms by city, budget, property type, and amenities.
- City input supports typing a city name or PIN code.
- Suggestions use a FlatFolks-styled white panel, not the browser's default dropdown.
- Every city suggestion shows a representative PIN code.
- Users can add multiple locations (one, two, three, or more).
- Selected locations appear as removable chips.
- Results match listings in any selected location.
- Users can select one, multiple, or all amenities.
- Multiple amenity selections match listings containing every chosen amenity.
- Reset clears all selected filters.
- List-view and map-view toggle are available.

## Listings and property flow

- Room cards display image, rent, location, type, and amenities.
- Property details page displays listing information and owner information.
- Post Property page allows a user to add a listing in the local demo session.
- Newly added listings are available during the current server session.

## Flatmates

- "Looking for a flatmate" mode.
- "Upload flatmate details" mode.
- Mode switch remains visible while the upload form is open.
- Upload form accepts basic flatmate preferences and shows a saved confirmation.

## Interest and private chat flow

1. Open a room listing and select **Interested**.
2. Select **Submit Interest & message owner**.
3. A request is saved for that owner.
4. The One-to-One Chat link appears in the main navigation.
5. Open chat and select the requested owner.
6. Send messages in the private local chat.

- Before an interest request, the Chat page shows a locked state.
- Users cannot select or message arbitrary owners.
- Only owners from submitted interest requests are shown in the contacts list.
- Chat messages are stored locally in the browser for the active conversation.

## Account and profile

- Sign-up and login work in the local demo session.
- OTP registration flow is available for testing.
- Profile page supports editing profile details.
- Profile photo can be uploaded and is stored locally in the browser.

## Local demo data and limitations

- No Supabase, external database, API keys, or environment variables are required.
- Listings and user accounts are held in server memory and reset when the server restarts.
- Chat requests, chat messages, and profile photos use browser local storage.
- This version is for local testing and feature review. A real database, secure authentication, owner acceptance workflow, and persistent storage are required before production deployment.

## Verification status

- `npm.cmd run lint`: passes with no errors (three Next.js image optimization warnings remain).
- `npm.cmd run build`: passes.
