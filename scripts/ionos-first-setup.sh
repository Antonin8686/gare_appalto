#!/bin/sh
# Primo avvio su VPS Ionos dedicato (Docker + clone repo + .env)
set -e

REMOTE_PATH="${REMOTE_PATH:-/var/www/gare-appalto}"
APP_DOMAIN="${APP_DOMAIN:-localhost}"
VPS_IP="${VPS_IP:-127.0.0.1}"
DEDICATED_VPS="${DEDICATED_VPS:-1}"
GIT_REPO="${GIT_REPO:-https://github.com/Antonin8686/gare_appalto.git}"

echo "=== Ionos first setup: Gare Appalto ==="

if ! command -v docker >/dev/null 2>&1; then
  echo "→ installo Docker"
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl git
  curl -fsSL https://get.docker.com | sh
fi

mkdir -p "$REMOTE_PATH"
if [ ! -d "$REMOTE_PATH/.git" ]; then
  git clone "$GIT_REPO" "$REMOTE_PATH"
fi

cd "$REMOTE_PATH"
git fetch origin main
git reset --hard origin/main
chmod +x scripts/*.sh backend/entrypoint.sh frontend/docker-entrypoint.prod.sh 2>/dev/null || true
find scripts backend/entrypoint.sh frontend/docker-entrypoint.prod.sh -name '*.sh' -exec sed -i 's/\r$//' {} + 2>/dev/null || true

export APP_DOMAIN VPS_IP DEDICATED_VPS
if [ ! -f backend/.env ]; then
  ./scripts/init-production-env.sh
else
  echo "backend/.env già presente, salto init-production-env"
fi

echo ""
echo "Setup base completato in $REMOTE_PATH"
df -h /
docker --version
