#!/usr/bin/env bash
# provision-ec2.sh
#
# Run ONCE on a fresh Ubuntu EC2 to set up the Amori backend environment.
# After this completes, run ./deploy.sh api from your local machine.
#
# Usage (from your local machine):
#   ssh -i ~/.ssh/AmoriKey.pem ubuntu@13.51.251.5 'bash -s' < scripts/provision-ec2.sh
#
# What it does:
#   1. Installs Docker + Docker Compose plugin
#   2. Installs nginx + Certbot (Let's Encrypt TLS for amori.ycare.org)
#   3. Creates ~/amori/{backend,backups} folder structure
#   4. Writes the nginx reverse-proxy config (HTTP → HTTPS, HTTPS → :5001)
#   5. Writes the log-pruning cron job
#   6. Prints a checklist of manual steps (env file, TLS cert)
#
# Prerequisites on the EC2:
#   - Ubuntu 22.04 or 24.04 or 26.04 (amd64)
#   - Security group allows inbound 22 (SSH), 80 (HTTP), 443 (HTTPS)
#   - The domain amori.ycare.org already points to this instance's IP (13.51.251.5)

set -euo pipefail

log()  { printf '\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m[OK] %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[warn] %s\033[0m\n' "$*"; }

# ── 1. System packages ────────────────────────────────────────────────────────
log "Updating apt and installing dependencies ..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
  ca-certificates curl gnupg lsb-release \
  nginx certbot python3-certbot-nginx \
  jq unzip

ok "System packages installed"

# ── 2. Docker ─────────────────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
  warn "Docker already installed ($(docker --version)), skipping"
else
  log "Installing Docker ..."
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  sudo apt-get update -qq
  sudo apt-get install -y -qq \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  # Let ubuntu run docker without sudo
  sudo usermod -aG docker ubuntu
  ok "Docker installed"
fi

# ── 3. Folder structure ───────────────────────────────────────────────────────
log "Creating ~/amori directory structure ..."
mkdir -p ~/amori/backend
mkdir -p ~/amori/backups
ok "Directories created"

# ── 4. nginx config ───────────────────────────────────────────────────────────
# Write an HTTP-only config first so nginx starts cleanly before the TLS cert
# exists. Certbot will replace this with the full HTTPS config when it runs.
log "Writing nginx config (HTTP only — Certbot will upgrade to HTTPS) ..."
sudo tee /etc/nginx/sites-available/amori > /dev/null <<'NGINX'
# Amori API — nginx reverse proxy (HTTP only until Certbot issues the cert)
server {
    listen 80;
    server_name amori.ycare.org;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Proxy to the API container until TLS is set up, then Certbot will add
    # the redirect and the HTTPS server block automatically.
    location / {
        proxy_pass         http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 10M;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/amori /etc/nginx/sites-enabled/amori
# Remove the default site so it doesn't conflict on port 80
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
ok "nginx configured (HTTP — run Certbot next to enable HTTPS)"

# ── 5. Log-pruning cron ───────────────────────────────────────────────────────
log "Installing Docker log pruning cron ..."
sudo tee /usr/local/bin/prune-docker-logs.sh > /dev/null <<'PRUNE'
#!/usr/bin/env bash
# Truncate container log files older than 2 days to prevent disk fill.
find /var/lib/docker/containers -name "*.log" -mtime +2 -exec truncate -s 0 {} \;
PRUNE
sudo chmod +x /usr/local/bin/prune-docker-logs.sh

# Write cron jobs to a temp file and install with crontab — avoids the
# interactive tty requirement of piping into crontab over a non-interactive
# SSH session.
CRON_TMP="$(mktemp)"
# Preserve any existing root cron jobs (ignore error if none exist yet)
sudo crontab -l 2>/dev/null > "$CRON_TMP" || true
# Add log pruning at 3am UTC (5am SAST) if not already present
grep -qF "prune-docker-logs" "$CRON_TMP" \
  || echo "0 3 * * * /usr/local/bin/prune-docker-logs.sh" >> "$CRON_TMP"
sudo crontab "$CRON_TMP"
rm -f "$CRON_TMP"
ok "Log pruning cron installed"

# ── 6. Backup cron ────────────────────────────────────────────────────────────
log "Installing daily DB backup cron ..."
sudo tee /usr/local/bin/amori-db-backup.sh > /dev/null <<'BACKUP'
#!/usr/bin/env bash
# Daily Postgres backup — runs before the EventBridge stop at 8pm UTC (10pm SAST).
# Keeps the last 7 backups; older ones are pruned automatically.
set -euo pipefail
BACKUP_DIR="/home/ubuntu/amori/backups"
ENV_FILE="/home/ubuntu/amori/.env"

[[ -f "$ENV_FILE" ]] || exit 0   # No env file = not provisioned yet

source "$ENV_FILE"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
DEST="$BACKUP_DIR/daily-${TIMESTAMP}.sql.gz"

docker exec amori-postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' \
  | gzip > "$DEST"

# Keep only the 7 most recent daily backups
ls -t "$BACKUP_DIR"/daily-*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm -f

echo "Backup written to $DEST"
BACKUP
sudo chmod +x /usr/local/bin/amori-db-backup.sh

# Same approach — write to temp file, install, clean up
CRON_TMP="$(mktemp)"
sudo crontab -l 2>/dev/null > "$CRON_TMP" || true
grep -qF "amori-db-backup" "$CRON_TMP" \
  || echo "0 19 * * * /usr/local/bin/amori-db-backup.sh" >> "$CRON_TMP"
sudo crontab "$CRON_TMP"
rm -f "$CRON_TMP"
ok "Daily backup cron installed"

# ── Done ──────────────────────────────────────────────────────────────────────
cat <<CHECKLIST

╔══════════════════════════════════════════════════════════════════════════════╗
║  Provision complete — manual steps remaining                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  1. Create the .env file on the server:                                      ║
║     ssh -i ~/.ssh/AmoriKey.pem ubuntu@13.51.251.5                            ║
║     nano ~/amori/.env                                                        ║
║                                                                              ║
║     Required variables:                                                      ║
║       POSTGRES_USER=amori                                                    ║
║       POSTGRES_PASSWORD=<strong password>                                    ║
║       POSTGRES_DB=amori                                                      ║
║       JWT_SECRET_KEY=<at least 32 random chars>                              ║
║       JWT_ISSUER=https://amori.ycare.org                                     ║
║       JWT_AUDIENCE=AmoriApp                                                  ║
║       AWS_ACCESS_KEY_ID=<for S3>                                             ║
║       AWS_SECRET_ACCESS_KEY=<for S3>                                         ║
║       AWS_S3_BUCKET_NAME=<your bucket>                                       ║
║       AWS_REGION=eu-north-1                                                  ║
║                                                                              ║
║  2. Issue the TLS certificate (nginx must already be running on port 80):    ║
║     sudo certbot --nginx -d amori.ycare.org --non-interactive --agree-tos    ║
║            -m your@email.com                                                 ║
║                                                                              ║
║  3. LOG OUT AND BACK IN so the docker group takes effect:                    ║
║     exit  (then ssh back in)                                                 ║
║                                                                              ║
║  4. From your local machine, deploy the app:                                 ║
║     ./deploy.sh api                                                          ║
║                                                                              ║
║  5. Run the EventBridge schedule script:                                     ║
║     bash scripts/setup-eventbridge.sh                                        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
CHECKLIST
