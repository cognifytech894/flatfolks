#!/usr/bin/env bash
# Provisions FlatFolks on a fresh Ubuntu 24.04 LTS server: Node.js, Postgres,
# a dedicated system user, the app itself (built and run under systemd), and
# a firewall rule for port 3000. No domain/reverse proxy — the app is reached
# directly at http://<server-ip>:3000.
#
# Usage: run this FROM INSIDE a clone of the repo on the server, as root:
#   git clone https://github.com/cognifytech894/flatfolks.git
#   cd flatfolks
#   sudo bash deploy/setup-ubuntu.sh
#
# Re-running is safe: it skips steps that are already done and redeploys the
# latest code in the current directory.

set -euo pipefail

APP_DIR=/opt/flatfolks
APP_USER=flatfolks
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
apt-get install -y ca-certificates curl gnupg postgresql postgresql-contrib ufw rsync

echo "==> Installing Node.js ${NODE_MAJOR}.x"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v${NODE_MAJOR}.* ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
node -v

echo "==> Creating system user '${APP_USER}'"
if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "${APP_DIR}" --shell /usr/sbin/nologin "${APP_USER}"
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
rsync -a --delete \
  --exclude 'node_modules' --exclude '.next' --exclude '.git' --exclude '.env.local' \
  "${REPO_DIR}/" "${APP_DIR}/"

cat > "${APP_DIR}/.env" <<EOF
DATABASE_URL=${DATABASE_URL}
EOF
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
chmod 600 "${APP_DIR}/.env"

echo "==> Loading schema (safe to re-run; uses IF NOT EXISTS / ON CONFLICT)"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -f "${APP_DIR}/data/schema.sql"

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

systemctl daemon-reload
systemctl enable --now flatfolks
systemctl restart flatfolks

echo "==> Configuring firewall"
ufw allow OpenSSH >/dev/null
ufw allow 3000/tcp >/dev/null
ufw --force enable >/dev/null

SERVER_IP="$(hostname -I | awk '{print $1}')"

echo
echo "Done. FlatFolks should be running at: http://${SERVER_IP}:3000"
echo "Database credentials saved at: ${DB_CREDS_FILE} (root-only)"
echo "Check status with: systemctl status flatfolks"
echo "Tail logs with:    journalctl -u flatfolks -f"
