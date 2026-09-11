**Deployment & Local Testing**

Prerequisites

- Node.js (v18 or newer)
- A MariaDB server (10.5+) reachable from the app — see "Database setup" below.

Database setup (MariaDB)

1. Install MariaDB on the target (Linux) server: `sudo apt-get install mariadb-server`.
2. Create the database and an app user:
   ```sql
   CREATE DATABASE flatfolks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'flatfolks'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
   GRANT ALL PRIVILEGES ON flatfolks.* TO 'flatfolks'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. Load the schema and seed data: `mysql -u flatfolks -p flatfolks < data/schema.sql`.
4. Copy `.env.example` to `.env.local` (dev) or `.env` (server) and fill in `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
5. If photo uploads fail with a packet-size error, raise MariaDB's `max_allowed_packet` (e.g. `SET GLOBAL max_allowed_packet = 64*1024*1024;` and persist it in `my.cnf`).

Local development (quick start)

Install dependencies and start the dev server:

```powershell
npm.cmd ci
npm.cmd run dev
```

Production (build and run)

Build and start the app on Windows:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run start
```

The `start` script binds to `0.0.0.0:3000` by default; open `http://localhost:3000`.

Running as a background process

You can run the app under a process manager on Windows (for example, `pm2`):

```powershell
npm i -g pm2
pm2 start npm --name flatfolks -- start
pm2 save
```

Notes

- For HTTPS/SSL, terminate TLS at a reverse proxy or load balancer (IIS, Nginx on a reverse proxy server, or cloud LB).
- Listings and user accounts now persist in MariaDB. OTP codes and pending sign-ups still live in server memory (by design — they expire after 10 minutes) and reset on restart.
