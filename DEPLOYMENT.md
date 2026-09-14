**Deployment**

Two supported options: a self-hosted Ubuntu server (below), or Vercel + Supabase (further down).

---

**Option A — Self-hosted (Ubuntu 24.04 LTS)**

Runs the app under your own Linux user's home directory with a local Postgres database, fronted by Nginx on port 80 — reachable at `http://<server-ip>/` (no port number, no domain).

Prerequisites

- A fresh Ubuntu 24.04 LTS server (VPS or bare metal) with root/sudo access.
- Port 80 reachable from wherever you'll access the site (the script opens it via `ufw`).

Steps

1. On the server, clone the repo and run the provisioning script:

   ```bash
   git clone https://github.com/cognifytech894/flatfolks.git
   cd flatfolks
   sudo bash deploy/setup-ubuntu.sh
   ```

   By default this installs the app under `/home/ankit/flatfolks`, owned by the Linux user `ankit`. To use a different user, set `APP_USER` (its home directory is used automatically):

   ```bash
   sudo APP_USER=someuser bash deploy/setup-ubuntu.sh
   ```

2. The script (`deploy/setup-ubuntu.sh`) does everything in one pass:
   - Installs Node.js 22.x, Postgres, and Nginx.
   - Creates the target Linux user if it doesn't already exist, and a Postgres role/database with a randomly generated password (saved to `/root/flatfolks-db-credentials.txt`, root-only).
   - Copies the app to `<user's home>/flatfolks`, writes `.env` with the local `DATABASE_URL`, runs `data/schema.sql`, then `npm ci && npm run build`.
   - Installs and starts a `flatfolks` systemd service (auto-restarts on crash and on reboot) listening on `127.0.0.1:3000`.
   - Configures Nginx to reverse-proxy port 80 to that service, and opens port 80 in `ufw` (explicitly allowing OpenSSH first, so you don't get locked out). Port 3000 itself is not exposed externally.

3. When it finishes, it prints the URL — `http://<server-ip>/`.

Operating it afterwards

```bash
systemctl status flatfolks     # check the app is running
journalctl -u flatfolks -f     # tail app logs
sudo systemctl restart flatfolks
systemctl status nginx         # check the reverse proxy
```

To deploy a code update: `git pull` inside your original clone, then re-run `sudo bash deploy/setup-ubuntu.sh` — it's safe to run again (rebuilds and restarts the service, reuses the existing database and password).

Adding a domain + HTTPS later: point the domain's DNS at the server, add `server_name yourdomain.com;` to `/etc/nginx/sites-available/flatfolks`, then run `certbot --nginx` to get a free certificate.

---

**Option B — Vercel + Supabase (free tier)**

Prerequisites

- A GitHub repo with this code pushed (already done: https://github.com/cognifytech894/flatfolks).
- A free [Supabase](https://supabase.com) account.
- A free [Vercel](https://vercel.com) account.
- (Optional) A purchased domain to point at the Vercel deployment.

1. Database setup (Supabase)

1. Create a new Supabase project (choose a region close to your users, e.g. Mumbai/Singapore for India).
2. Open **SQL Editor** in the Supabase dashboard, paste the contents of `data/schema.sql`, and run it. This creates the tables and seeds the demo listings/testimonials.
3. Go to **Project Settings → Database → Connection string → URI**. Use the **Transaction pooler** connection string (port 6543) — this is required for serverless hosts like Vercel, which open many short-lived connections.

2. App deployment (Vercel)

1. Go to [vercel.com/new](https://vercel.com/new), import the `cognifytech894/flatfolks` GitHub repo.
2. In the import screen (or later under **Settings → Environment Variables**), add:
   - `DATABASE_URL` = the Supabase connection string from step 1.3.
3. Deploy. Vercel builds and hosts the app on a free `*.vercel.app` URL.

3. Connect your domain

1. In the Vercel project, go to **Settings → Domains** and add your purchased domain.
2. Vercel shows the exact DNS records to add (usually an `A` record or `CNAME`) — add them in your domain registrar's DNS settings.
3. Vercel automatically issues a free SSL certificate once DNS propagates (can take up to a few hours).

Local development

```powershell
npm.cmd ci
```

Copy `.env.example` to `.env.local` and set `DATABASE_URL` to a Supabase connection string (or a local Postgres instance for offline testing), then:

```powershell
npm.cmd run dev
```

Notes

- Listings, users, feedback, and OTP codes all persist in Postgres via Supabase — this works correctly across Vercel's stateless serverless instances (OTPs auto-expire after 10 minutes via `expires_at`).
- If photo uploads fail, check Supabase's request size limits — base64-encoded images are capped at ~2MB each in the app already (`src/app/api/listings/route.ts`).
