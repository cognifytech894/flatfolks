-- FlatFolks Postgres (Supabase) schema.
-- Run once: paste into Supabase SQL Editor, or `psql "$DATABASE_URL" -f data/schema.sql`

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(20) UNIQUE,
  location VARCHAR(200),
  gender VARCHAR(10) CHECK (gender IN ('Male', 'Female')),
  photo TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);
-- Login is email-OTP only now, so the password column is no longer used.
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
-- Adds onboarding fields on databases created before they existed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
-- Adds the profile photo (a Supabase Storage URL) on databases created before it existed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo TEXT;
-- Renames the gender options from Boy/Girl to Male/Female (constraint must
-- drop before the UPDATE, since the old constraint still only allows Boy/Girl).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_gender_check;
UPDATE users SET gender = 'Male' WHERE gender = 'Boy';
UPDATE users SET gender = 'Female' WHERE gender = 'Girl';
ALTER TABLE users ADD CONSTRAINT users_gender_check CHECK (gender IN ('Male', 'Female'));

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  location VARCHAR(200) NOT NULL,
  rent INT NOT NULL,
  deposit INT NOT NULL DEFAULT 0,
  bedrooms INT NOT NULL DEFAULT 1,
  bathrooms INT NOT NULL DEFAULT 1,
  property_type VARCHAR(20) NOT NULL CHECK (property_type IN ('Room', 'Apartment', 'Flat', 'PG')),
  description TEXT,
  image TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  tags JSONB NOT NULL DEFAULT '[]',
  match_score INT NOT NULL DEFAULT 0,
  min_budget INT NOT NULL DEFAULT 0,
  max_budget INT NOT NULL DEFAULT 0,
  images JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'moderation')),
  views INT NOT NULL DEFAULT 0,
  saves INT NOT NULL DEFAULT 0,
  owner_id UUID,
  available_from DATE,
  gender_preference VARCHAR(10) NOT NULL DEFAULT 'Any',
  listing_kind VARCHAR(20) NOT NULL DEFAULT 'flat-offer' CHECK (listing_kind IN ('flat-offer', 'flat-requirement')),
  contact_phone VARCHAR(20),
  preferences JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_listing_kind ON listings (listing_kind);
CREATE INDEX IF NOT EXISTS idx_owner ON listings (owner_id);
-- Widens `image` on databases created before it was TEXT (was VARCHAR(2048),
-- too short for an uploaded photo's base64 string); a no-op once already TEXT.
ALTER TABLE listings ALTER COLUMN image TYPE TEXT;
-- Adds the poster's contact number on databases created before it existed.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
-- Adds lifestyle-preference tags on databases created before they existed.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '[]';
-- Renames the gender preference options from Boy/Girl to Male/Female, and
-- (for databases created before it existed) allows the 'Family' option.
-- Constraint must drop before the UPDATE, since the old constraint (if any)
-- still only allows Boy/Girl/Any.
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_gender_preference_check;
UPDATE listings SET gender_preference = 'Male' WHERE gender_preference = 'Boy';
UPDATE listings SET gender_preference = 'Female' WHERE gender_preference = 'Girl';
ALTER TABLE listings ADD CONSTRAINT listings_gender_preference_check CHECK (gender_preference IN ('Male', 'Female', 'Family', 'Any'));
-- Furnishing and nearest metro, both optional (NULL on listings posted before
-- they existed). For a flat-requirement post, furnishing is the preference.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS furnishing VARCHAR(20);
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_furnishing_check;
ALTER TABLE listings ADD CONSTRAINT listings_furnishing_check CHECK (furnishing IS NULL OR furnishing IN ('furnished', 'semi-furnished', 'unfurnished'));
-- nearby_metro is the station name exactly as shown on the listing, typed in
-- free text for now. nearby_metro_station_id is reserved for a future, verified
-- metro_stations master table (id, name, line, city, source): the form will
-- then pick a station, set the id and copy its name into nearby_metro, so
-- display code never changes, and existing free-text rows can be matched to
-- stations and backfilled without losing what the poster wrote.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS nearby_metro VARCHAR(120);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS nearby_metro_station_id VARCHAR(64);
-- Flat size, private/shared room and preferred tenants, all optional and used
-- by the search filters (values match src/data/listing-attributes.ts). A NULL
-- tenant_preference means the poster is open to anyone.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS flat_configuration VARCHAR(10);
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_flat_configuration_check;
ALTER TABLE listings ADD CONSTRAINT listings_flat_configuration_check CHECK (flat_configuration IS NULL OR flat_configuration IN ('1rk', '1bhk', '2bhk', '3bhk'));
ALTER TABLE listings ADD COLUMN IF NOT EXISTS room_type VARCHAR(10);
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_room_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_room_type_check CHECK (room_type IS NULL OR room_type IN ('private', 'shared'));
ALTER TABLE listings ADD COLUMN IF NOT EXISTS tenant_preference VARCHAR(30);
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_tenant_preference_check;
ALTER TABLE listings ADD CONSTRAINT listings_tenant_preference_check CHECK (tenant_preference IS NULL OR tenant_preference IN ('students', 'working-professionals'));

CREATE TABLE IF NOT EXISTS listing_reviews (
  id UUID PRIMARY KEY,
  listing_id UUID NOT NULL,
  author VARCHAR(120) NOT NULL,
  rating SMALLINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_listing ON listing_reviews (listing_id);

-- Short-lived OTP codes (login + pending signups). `payload` carries the pending
-- registration details for the signup flow; NULL for plain login OTPs.
CREATE TABLE IF NOT EXISTS otps (
  id VARCHAR(190) NOT NULL,
  purpose VARCHAR(20) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  payload JSONB,
  expires_at TIMESTAMP NOT NULL,
  PRIMARY KEY (id, purpose)
);

-- Site-wide testimonials shown on the landing page ("Loved by Thousands").
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  city VARCHAR(120) NOT NULL,
  rating SMALLINT NOT NULL DEFAULT 5,
  message VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inactive-owner post removal (src/lib/inactive-posts.ts). Posts of owners not
-- seen for 30 days become 'removed_inactive' and are deleted 30 days later.
-- No foreign keys on purpose: deleting a post can never cascade to users.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
UPDATE users SET last_seen_at = NOW() WHERE last_seen_at IS NULL;
ALTER TABLE users ALTER COLUMN last_seen_at SET DEFAULT NOW();
ALTER TABLE users ALTER COLUMN last_seen_at SET NOT NULL;

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check CHECK (status IN ('draft', 'published', 'moderation', 'removed_inactive'));
ALTER TABLE listings ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS managed_by_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_removed_at_check;
ALTER TABLE listings ADD CONSTRAINT listings_removed_at_check CHECK ((status = 'removed_inactive') = (removed_at IS NOT NULL));
ALTER TABLE listings ADD COLUMN IF NOT EXISTS removal_email_sent_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS removal_email_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS removal_email_error TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS inactivity_warning_sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS listings_owner_idx ON listings (owner_id);
CREATE INDEX IF NOT EXISTS listings_removed_idx ON listings (status, removed_at);

-- Tombstones: a deleted post's URL answers 410 Gone, and admin counts them.
CREATE TABLE IF NOT EXISTS deleted_listings (
  id UUID PRIMARY KEY,
  owner_id UUID,
  title VARCHAR(200),
  reason VARCHAR(30) NOT NULL CHECK (reason IN ('inactive_owner', 'owner', 'admin')),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS deleted_listings_suffix_idx ON deleted_listings ((RIGHT(id::text, 8)));

-- Seed data matching the original demo listings.
INSERT INTO listings (id, title, location, rent, deposit, bedrooms, bathrooms, property_type, image, verified, tags, match_score, min_budget, max_budget, listing_kind) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Private Room in 2BHK', 'Sector 63, Noida', 9500, 19000, 1, 1, 'Room', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80', TRUE, '["WiFi", "AC", "Parking"]', 96, 8500, 11000, 'flat-offer'),
  ('a0000000-0000-4000-8000-000000000002', '1 Room in 3BHK Flat', 'Sector 137, Noida', 8000, 16000, 1, 1, 'Flat', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80', TRUE, '["WiFi", "AC", "Kitchen"]', 93, 7000, 9500, 'flat-offer'),
  ('a0000000-0000-4000-8000-000000000003', 'Private Room in 2BHK', 'Gurugram, Haryana', 11000, 22000, 1, 1, 'Room', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80', TRUE, '["WiFi", "AC", "Parking"]', 91, 10000, 12500, 'flat-offer'),
  ('a0000000-0000-4000-8000-000000000004', '1 Room in 2BHK Flat', 'HSR Layout, Bangalore', 10000, 20000, 1, 1, 'Flat', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', TRUE, '["WiFi", "AC", "Kitchen"]', 90, 9000, 12000, 'flat-offer'),
  ('a0000000-0000-4000-8000-000000000005', 'Modern Studio Near Metro', 'Indirapuram, Ghaziabad', 13500, 27000, 1, 1, 'Apartment', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80', TRUE, '["Lift", "WiFi", "Parking"]', 88, 12000, 15000, 'flat-offer'),
  ('a0000000-0000-4000-8000-000000000006', 'Shared Premium PG', 'Koramangala, Bangalore', 12000, 24000, 1, 1, 'PG', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80', TRUE, '["Meals", "Laundry", "WiFi"]', 87, 10000, 13500, 'flat-offer')
ON CONFLICT (id) DO NOTHING;

INSERT INTO feedback (id, name, city, rating, message) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'Priya Sharma', 'Bangalore', 5, 'Found my flatmate in three days. Amazing platform!'),
  ('b0000000-0000-4000-8000-000000000002', 'Aman Verma', 'Noida', 5, 'Finally a platform better than Facebook groups.'),
  ('b0000000-0000-4000-8000-000000000003', 'Kunal Mehta', 'Pune', 5, 'Clean interface, genuine listings and quick responses.')
ON CONFLICT (id) DO NOTHING;
