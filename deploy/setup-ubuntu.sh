#!/usr/bin/env bash
# Provisions FlatFolks on a fresh Ubuntu 24.04 LTS server: Node.js, Postgres,
# the app itself under the given Linux user's home directory (built and run
# under systemd), and Nginx as a reverse proxy on port 80. No domain/TLS —
# the app is reached at http://<server-ip>/ over plain HTTP.
#
# Usage: run this FROM INSIDE a clone of the repo on the server, as root:
#   git clone https://github.com/cognifytech894/flatfolks.git
#   cd flatfolks
#   sudo bash deploy/setup-ubuntu.sh
#
# By default the app is installed under /home/ankit/flatfolks, owned by the
# Linux user "ankit". Override with env vars if you want a different user:
#   sudo APP_USER=someuser bash deploy/setup-ubuntu.sh
#
# Re-running is safe: it skips steps that are already done and redeploys the
# latest code in the current directory.

set -euo pipefail

APP_USER="${APP_USER:-ankit}"
APP_DIR="${APP_DIR:-/home/${APP_USER}/flatfolks}"
DB_NAME=flatfolks
DB_USER=flatfolks
DB_CREDS_FILE=/root/flatfolks-db-credentials.txt
NODE_MAJOR=22
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ $EUID -ne 0 ]]; then
  echo "Run this as root (e.g. sudo bash deploy/setup-ubuntu.sh)." >&2
  exit 1
fi

echo "==> Installing system packages"
apt-get update -y
apt-get install -y ca-certificates curl gnupg postgresql postgresql-contrib nginx ufw rsync psmisc

echo "==> Installing Node.js ${NODE_MAJOR}.x"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v${NODE_MAJOR}.* ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
node -v

echo "==> Ensuring Linux user '${APP_USER}' exists"
if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "${APP_USER}"
fi

echo "==> Configuring Postgres role and database"
systemctl enable --now postgresql

if [[ -f "${DB_CREDS_FILE}" ]]; then
  DB_PASSWORD="$(grep '^DB_PASSWORD=' "${DB_CREDS_FILE}" | cut -d= -f2-)"
else
  DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=')"
fi

# DB_USER/DB_NAME are fixed constants and DB_PASSWORD is alnum-only (generated
# above), so plain interpolation into the SQL text below is safe. psql's own
# :'var' substitution does NOT reach inside $$...$$ dollar-quoted bodies, so
# that approach (tried earlier) fails with a syntax error — hence bash does
# the substitution here instead, before the heredoc ever reaches psql.
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')
\gexec
SQL

cat > "${DB_CREDS_FILE}" <<EOF
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
EOF
chmod 600 "${DB_CREDS_FILE}"

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"

echo "==> Deploying app code to ${APP_DIR}"
mkdir -p "${APP_DIR}"
if [[ "$(cd "${REPO_DIR}" && pwd -P)" == "$(cd "${APP_DIR}" && pwd -P)" ]]; then
  # The repo is already checked out directly at APP_DIR (e.g. it was cloned
  # as ~/flatfolks) — rsyncing it onto itself with --delete would be
  # destructive, so just use it in place instead of copying.
  echo "    (repo is already at ${APP_DIR}; deploying in place)"
else
  rsync -a --delete \
    --exclude 'node_modules' --exclude '.next' --exclude '.git' --exclude '.env.local' \
    "${REPO_DIR}/" "${APP_DIR}/"
fi

cat > "${APP_DIR}/.env" <<EOF
DATABASE_URL=${DATABASE_URL}
EOF
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
chmod 600 "${APP_DIR}/.env"

echo "==> Loading schema (safe to re-run; uses IF NOT EXISTS / ON CONFLICT)"
# Load it as the flatfolks role itself (not the postgres superuser), so the
# tables it creates are owned by flatfolks and the app can actually use them.
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${APP_DIR}/data/schema.sql"

echo "==> Installing dependencies and building"
sudo -u "${APP_USER}" bash -lc "cd '${APP_DIR}' && npm ci && npm run build"

echo "==> Installing systemd service"
cat > /etc/systemd/system/flatfolks.service <<EOF
[Unit]
Description=FlatFolks Next.js app
After=network.target postgresql.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "==> Freeing port 3000 in case a stray process (e.g. a manual 'npm run start') is holding it"
systemctl stop flatfolks 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
sleep 1

systemctl daemon-reload
systemctl enable --now flatfolks
systemctl restart flatfolks
sleep 2
systemctl status flatfolks --no-pager || true

echo "==> Configuring Nginx as a reverse proxy on port 80"
cat > /etc/nginx/sites-available/flatfolks <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    # The app accepts up to 3 base64-encoded photos per listing (~2MB each as
    # a JSON string), so the default 1MB nginx limit rejects real submissions
    # with a 413 the frontend can't parse as JSON. Give it real headroom.
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/flatfolks /etc/nginx/sites-enabled/flatfolks
nginx -t
systemctl enable --now nginx
systemctl reload nginx

if ss -tlnp 2>/dev/null | grep -q ':80 .*users:.*"nginx"'; then
  : # nginx holds port 80, as expected
else
  echo
  echo "WARNING: something other than nginx already holds port 80, so nginx could" >&2
  echo "not bind it (the app may not actually be reachable on port 80 yet)." >&2
  echo "Check with: sudo ss -tlnp | grep ':80'" >&2
  echo "If it's an unused Apache install, free the port with:" >&2
  echo "  sudo systemctl stop apache2 && sudo systemctl disable apache2 && sudo systemctl restart nginx" >&2
  echo
fi

echo "==> Configuring firewall"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx HTTP' >/dev/null
# Port 3000 is now only reached via Nginx's proxy, not directly from outside.
ufw delete allow 3000/tcp >/dev/null 2>&1 || true
ufw --force enable >/dev/null

SERVER_IP="$(hostname -I | awk '{print $1}')"

echo
echo "Done. FlatFolks should be running at: http://${SERVER_IP}/"
echo "App code:   ${APP_DIR} (owned by ${APP_USER})"
echo "Database credentials saved at: ${DB_CREDS_FILE} (root-only)"
echo "Check app status with:   systemctl status flatfolks"
echo "Tail app logs with:      journalctl -u flatfolks -f"
echo "Check Nginx status with: systemctl status nginx"
