**Deployment & Local Testing (Windows)**

Prerequisites

- Install Node.js (v18 or newer) and Git on Windows 11.

Data storage

No environment variables or external services are required. The application uses local demo data, which resets when the server restarts. It is suitable for local testing only.

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
- The local demo store is not suitable for production because listings and accounts are reset whenever the server restarts.
