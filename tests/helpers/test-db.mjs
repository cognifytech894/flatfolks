// Starts a throwaway Postgres in Docker, applies data/schema.sql, and hands back
// a pool. Tests never touch the real database: the URL is always localhost.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function startTestDb({ name = "flatfolks-test-pg", port = 55432 } = {}) {
  try { execFileSync("docker", ["rm", "-f", name], { stdio: "ignore" }); } catch {}
  execFileSync("docker", ["run", "-d", "--rm", "--name", name, "-p", `${port}:5432`, "-e", "POSTGRES_PASSWORD=test", "postgres:16-alpine"], { stdio: "ignore" });
  const url = `postgres://postgres:test@localhost:${port}/postgres`;
  if (!/@localhost:/.test(url)) throw new Error("Refusing to run tests against a non-local database.");
  const pool = new pg.Pool({ connectionString: url, max: 5 });
  for (let i = 0; i < 60; i++) {
    try { await pool.query("SELECT 1"); break; } catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
  await pool.query(readFileSync(path.join(root, "data", "schema.sql"), "utf8"));
  return {
    url,
    pool,
    async stop() {
      await pool.end().catch(() => {});
      try { execFileSync("docker", ["rm", "-f", name], { stdio: "ignore" }); } catch {}
    },
  };
}

let counter = 0;
const DAY = 24 * 60 * 60 * 1000;

/** Inserts a member last seen `daysAgo` days before `now`, with a full profile. */
export async function createUser(pool, now, daysAgo, overrides = {}) {
  counter++;
  const user = {
    id: crypto.randomUUID(), name: `Member ${counter}`, email: `member${counter}-${Date.now()}@example.test`,
    phone: `98765${String(counter).padStart(5, "0")}`, photo: `https://example.test/avatar-${counter}.jpg`, location: "Noida", gender: "Female",
    ...overrides,
  };
  await pool.query(
    "INSERT INTO users (id, name, email, phone, photo, location, gender, last_seen_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [user.id, user.name, user.email, user.phone, user.photo, user.location, user.gender, new Date(now.getTime() - daysAgo * DAY)],
  );
  return user;
}

/** Inserts a published post for `ownerId`. */
export async function createPost(pool, ownerId, overrides = {}) {
  counter++;
  const post = {
    id: crypto.randomUUID(), title: `Room in Gaur City 2 #${counter}`, location: "Gaur City 2, Greater Noida West",
    // An allowed next/image host (next.config.ts), never fetched in tests.
    images: [`https://images.unsplash.com/photo-test-${counter}-a`, `https://images.unsplash.com/photo-test-${counter}-b`], managed: false, contactPhone: "9999911111",
    ...overrides,
  };
  await pool.query(
    `INSERT INTO listings (id, title, location, rent, deposit, property_type, image, images, owner_id, contact_phone, managed_by_admin, status)
     VALUES ($1, $2, $3, 8000, 16000, 'Room', $4, $5, $6, $7, $8, 'published')`,
    [post.id, post.title, post.location, post.images[0], JSON.stringify(post.images), ownerId, post.contactPhone, post.managed],
  );
  return post;
}

export async function userRow(pool, id) {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0];
}

export async function postRow(pool, id) {
  const { rows } = await pool.query("SELECT * FROM listings WHERE id = $1", [id]);
  return rows[0];
}

export const days = (base, n) => new Date(base.getTime() + n * DAY);
