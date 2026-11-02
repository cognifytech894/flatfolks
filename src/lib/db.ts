import { Pool, types } from "pg";
import { supabaseRootCa } from "@/lib/supabase-ca";

// Return DATE columns as plain "YYYY-MM-DD" strings instead of JS Date objects,
// matching the string format the rest of the app already uses for availableFrom.
types.setTypeParser(1082, (value) => value);

declare global {
  var flatfolksPool: Pool | undefined;
}

// Reuse the pool across hot reloads in dev so we don't exhaust Supabase's connection limit.
// The database's certificate is checked against Supabase's own root, so nobody
// between the server and Supabase can pose as the database.
const pool = global.flatfolksPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { ca: supabaseRootCa, rejectUnauthorized: true },
});

if (process.env.NODE_ENV !== "production") global.flatfolksPool = pool;

export default pool;
