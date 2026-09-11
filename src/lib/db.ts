import mysql from "mysql2/promise";

declare global {
  var flatfolksPool: mysql.Pool | undefined;
}

// Reuse the pool across hot reloads in dev so we don't exhaust MariaDB connections.
const pool = global.flatfolksPool || mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "flatfolks",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});

if (process.env.NODE_ENV !== "production") global.flatfolksPool = pool;

export default pool;
