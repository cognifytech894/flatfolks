// API authorization tests: logged-out requests get 401, and a signed-in user
// can't edit another user's post or profile (403). Runs against a dev server it
// starts itself (or BASE_URL). Every "forbidden" request carries a payload that
// would fail validation anyway, so even a broken auth check can't write to the
// database: the test would see 400 instead of 403 and fail.
//
//   npm run test:api

import { execFileSync, spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.TEST_PORT || 3200);
const BASE_URL = (process.env.BASE_URL || `http://localhost:${port}`).replace(/\/$/, "");
let server;

function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const line = readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    return line?.slice(name.length + 1).replace(/^"|"$/g, "");
  } catch { return undefined; }
}

// Same signing as src/lib/session.ts. A cookie only counts for a real member
// whose current users.session_version it carries (logging out bumps it).
function sessionCookie(userId, version) {
  const secret = env("SESSION_SECRET") || env("ADMIN_PASSWORD");
  if (!secret) throw new Error("SESSION_SECRET / ADMIN_PASSWORD not found");
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  return `flatfolks_session=${userId}.${version}.${expiresAt}.${createHmac("sha256", secret).update(`flatfolks-session:${userId}:${version}:${expiresAt}`).digest("hex")}`;
}

// Read-only: some member other than `ownerId`, and their current session
// version, so the test cookie is accepted.
async function otherMember(ownerId) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: env("DATABASE_URL"), ssl: /localhost|127\.0\.0\.1/.test(env("DATABASE_URL") || "") ? false : { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows } = await client.query("SELECT id, COALESCE(session_version, 0) AS version FROM users WHERE id <> $1 LIMIT 1", [ownerId]);
    return rows[0];
  } finally { await client.end(); }
}

const api = (route, init = {}) => fetch(BASE_URL + route, { redirect: "manual", ...init, headers: { "Content-Type": "application/json", ...init.headers } });

before(async () => {
  if (!process.env.BASE_URL) {
    server = spawn("npx", ["next", "dev", "-p", String(port)], { cwd: root, shell: true, stdio: "ignore", env: { ...process.env, DISABLE_VIEW_TRACKING: "1" } });
  }
  for (let i = 0; i < 120; i++) {
    try { await fetch(BASE_URL + "/api/listings"); return; } catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
  throw new Error(`Server at ${BASE_URL} did not start (Next allows one \`next dev\` per folder: stop any other dev server first)`);
}, { timeout: 180_000 });

after(() => {
  if (!server) return;
  // Synchronous, so the dev server is gone before the next run starts another in this folder.
    if (process.platform === "win32") { try { execFileSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); } catch {} }
  else server.kill("SIGTERM");
});

describe("logged-out requests return 401", () => {
  const someId = randomUUID();
  const cases = [
    ["POST /api/listings", "/api/listings", { method: "POST", body: JSON.stringify({ title: "x" }) }],
    ["PATCH /api/listings", "/api/listings", { method: "PATCH", body: JSON.stringify({ id: someId, description: "x" }) }],
    ["DELETE /api/listings", `/api/listings?id=${someId}`, { method: "DELETE" }],
    ["PATCH /api/users/:id", `/api/users/${someId}`, { method: "PATCH", body: JSON.stringify({ name: "" }) }],
    ["POST /api/upload", "/api/upload", { method: "POST", body: JSON.stringify({ image: "data:image/png;base64,AAAA" }) }],
  ];
  for (const [name, route, init] of cases) {
    test(name, { timeout: 120_000 }, async () => {
      const res = await api(route, init);
      assert.equal(res.status, 401, `${name} returned ${res.status}`);
    });
  }

  test("GET /dashboard redirects to login", { timeout: 120_000 }, async () => {
    const res = await api("/dashboard");
    assert.ok([303, 307, 308].includes(res.status), `status ${res.status}`);
    assert.equal(res.headers.get("location"), "/auth?next=/dashboard");
  });

  test("GET /api/listings hides contact phones", { timeout: 120_000 }, async () => {
    const listings = await (await api("/api/listings")).json();
    assert.ok(listings.every((listing) => !("contactPhone" in listing)), "a contactPhone leaked to a logged-out caller");
  });
});

describe("a signed-in user can't touch another user's data", () => {
  // Signed in as a real member, acting on another member's post or profile.
  let target, cookie;
  before(async () => {
    target = (await (await api("/api/listings")).json()).find((listing) => listing.ownerId);
    assert.ok(target, "no user-owned listing to test against");
    const intruder = await otherMember(target.ownerId);
    assert.ok(intruder, "need a second member to test with");
    cookie = sessionCookie(intruder.id, intruder.version);
  }, { timeout: 120_000 });

  test("editing another user's post returns 403", { timeout: 120_000 }, async () => {
    // A 2001-char description fails validation, so a broken auth check yields 400, never a write.
    const res = await api("/api/listings", { method: "PATCH", headers: { Cookie: cookie }, body: JSON.stringify({ id: target.id, description: "x".repeat(2001) }) });
    assert.equal(res.status, 403, `got ${res.status}`);
  });

  test("updating another user's profile returns 403", { timeout: 120_000 }, async () => {
    // An empty name fails validation, so a broken auth check yields 400, never a write.
    const res = await api(`/api/users/${randomUUID()}`, { method: "PATCH", headers: { Cookie: cookie }, body: JSON.stringify({ name: "" }) });
    assert.equal(res.status, 403, `got ${res.status}`);
  });
});
