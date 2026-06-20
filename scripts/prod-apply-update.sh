#!/bin/sh
set -e

REMOTE_PATH="${REMOTE_PATH:-/var/www/gare-appalto}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-gareappalto}"
BACKEND_TAR="${1:-/tmp/gareappalto-backend.tar}"
FRONTEND_TAR="${2:-/tmp/gareappalto-frontend.tar}"
BACKEND_IMAGE="${COMPOSE_PROJECT_NAME}-backend:latest"
FRONTEND_IMAGE="${COMPOSE_PROJECT_NAME}-frontend:latest"

cd "$REMOTE_PATH"
export COMPOSE_PROJECT_NAME

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
if [ -f docker-compose.prod.dedicated.yml ] && [ "${FRONTEND_HTTP_PORT:-8080}" = "80" ]; then
  COMPOSE="$COMPOSE -f docker-compose.prod.dedicated.yml"
fi

if [ -f "$BACKEND_TAR" ]; then
  echo "→ docker load backend ($BACKEND_TAR)"
  docker load -i "$BACKEND_TAR"
  rm -f "$BACKEND_TAR"
fi

if [ -f "$FRONTEND_TAR" ]; then
  echo "→ docker load frontend ($FRONTEND_TAR)"
  docker load -i "$FRONTEND_TAR"
  rm -f "$FRONTEND_TAR"
fi

if ! docker image inspect "$BACKEND_IMAGE" >/dev/null 2>&1; then
  echo "ERRORE: immagine $BACKEND_IMAGE assente sul VPS."
  echo "Dal PC esegui: .\\scripts\\deploy-to-vps.ps1 -SkipGitPush"
  exit 1
fi

if ! docker image inspect "$FRONTEND_IMAGE" >/dev/null 2>&1; then
  echo "ERRORE: immagine $FRONTEND_IMAGE assente sul VPS."
  echo "Dal PC esegui: .\\scripts\\deploy-to-vps.ps1 -FrontendOnly"
  exit 1
fi

chmod +x backend/entrypoint.sh frontend/docker-entrypoint.prod.sh scripts/*.sh 2>/dev/null || true
find backend/entrypoint.sh frontend/docker-entrypoint.prod.sh scripts -name '*.sh' -exec sed -i 's/\r$//' {} + 2>/dev/null || true

echo "→ pull immagini infrastruttura (db, redis, minio)"
$COMPOSE pull db redis minio minio-init

$COMPOSE up -d --no-build --pull never --force-recreate backend celery_worker frontend
sleep 20
$COMPOSE exec -T backend python manage.py migrate --noinput

HTTP_PORT="${FRONTEND_HTTP_PORT:-8080}"
DOMAIN="${APP_DOMAIN:-localhost}"
if [ "$HTTP_PORT" = "80" ]; then
  echo "Fatto. Sito: http://${DOMAIN}"
else
  echo "Fatto. Sito: http://${DOMAIN}:${HTTP_PORT}"
fi
