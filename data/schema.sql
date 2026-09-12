-- FlatFolks MariaDB schema.
-- Run once on the server: mysql -u root -p flatfolks < data/schema.sql

CREATE DATABASE IF NOT EXISTS flatfolks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE flatfolks;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL
);

CREATE TABLE IF NOT EXISTS listings (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  location VARCHAR(200) NOT NULL,
  rent INT NOT NULL,
  deposit INT NOT NULL DEFAULT 0,
  bedrooms INT NOT NULL DEFAULT 1,
  bathrooms INT NOT NULL DEFAULT 1,
  property_type ENUM('Room', 'Apartment', 'Flat', 'PG') NOT NULL,
  description TEXT NULL,
  image VARCHAR(2048) NOT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  tags JSON NOT NULL,
  match_score INT NOT NULL DEFAULT 0,
  min_budget INT NOT NULL DEFAULT 0,
  max_budget INT NOT NULL DEFAULT 0,
  images JSON NULL,
  status ENUM('draft', 'published', 'moderation') NOT NULL DEFAULT 'published',
  views INT NOT NULL DEFAULT 0,
  saves INT NOT NULL DEFAULT 0,
  owner_id CHAR(36) NULL,
  available_from DATE NULL,
  gender_preference ENUM('Boy', 'Girl', 'Any') NOT NULL DEFAULT 'Any',
  listing_kind ENUM('flat-offer', 'flat-requirement') NOT NULL DEFAULT 'flat-offer',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_listing_kind (listing_kind),
  INDEX idx_owner (owner_id)
);

CREATE TABLE IF NOT EXISTS listing_reviews (
  id CHAR(36) PRIMARY KEY,
  listing_id CHAR(36) NOT NULL,
  author VARCHAR(120) NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_listing (listing_id)
);

-- Site-wide testimonials shown on the landing page ("Loved by Thousands").
CREATE TABLE IF NOT EXISTS feedback (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  city VARCHAR(120) NOT NULL,
  rating TINYINT NOT NULL DEFAULT 5,
  message VARCHAR(500) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO feedback (id, name, city, rating, message) VALUES
  ('feedback-001', 'Priya Sharma', 'Bangalore', 5, 'Found my flatmate in three days. Amazing platform!'),
  ('feedback-002', 'Aman Verma', 'Noida', 5, 'Finally a platform better than Facebook groups.'),
  ('feedback-003', 'Kunal Mehta', 'Pune', 5, 'Clean interface, genuine listings and quick responses.');

-- Seed data matching the original in-memory demo listings.
INSERT IGNORE INTO listings (id, title, location, rent, deposit, bedrooms, bathrooms, property_type, image, verified, tags, match_score, min_budget, max_budget, listing_kind) VALUES
  ('room-001', 'Private Room in 2BHK', 'Sector 63, Noida', 9500, 19000, 1, 1, 'Room', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80', 1, '["WiFi", "AC", "Parking"]', 96, 8500, 11000, 'flat-offer'),
  ('room-002', '1 Room in 3BHK Flat', 'Sector 137, Noida', 8000, 16000, 1, 1, 'Flat', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80', 1, '["WiFi", "AC", "Kitchen"]', 93, 7000, 9500, 'flat-offer'),
  ('room-003', 'Private Room in 2BHK', 'Gurugram, Haryana', 11000, 22000, 1, 1, 'Room', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80', 1, '["WiFi", "AC", "Parking"]', 91, 10000, 12500, 'flat-offer'),
  ('room-004', '1 Room in 2BHK Flat', 'HSR Layout, Bangalore', 10000, 20000, 1, 1, 'Flat', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', 1, '["WiFi", "AC", "Kitchen"]', 90, 9000, 12000, 'flat-offer'),
  ('room-005', 'Modern Studio Near Metro', 'Indirapuram, Ghaziabad', 13500, 27000, 1, 1, 'Apartment', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80', 1, '["Lift", "WiFi", "Parking"]', 88, 12000, 15000, 'flat-offer'),
  ('room-006', 'Shared Premium PG', 'Koramangala, Bangalore', 12000, 24000, 1, 1, 'PG', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80', 1, '["Meals", "Laundry", "WiFi"]', 87, 10000, 13500, 'flat-offer');
