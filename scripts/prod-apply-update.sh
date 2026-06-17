#!/bin/sh
set -e

REMOTE_PATH="${REMOTE_PATH:-/var/www/gare-appalto}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-gareappalto}"
BACKEND_TAR="${1:-/tmp/gareappalto-backend.tar}"
FRONTEND_TAR="${2:-/tmp/gareappalto-frontend.tar}"

cd "$REMOTE_PATH"
export COMPOSE_PROJECT_NAME

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

if [ -f "$BACKEND_TAR" ]; then
  echo "→ docker load backend ($BACKEND_TAR)"
  docker load -i "$BACKEND_TAR"
fi

if [ -f "$FRONTEND_TAR" ]; then
  echo "→ docker load frontend ($FRONTEND_TAR)"
  docker load -i "$FRONTEND_TAR"
fi

chmod +x backend/entrypoint.sh frontend/docker-entrypoint.prod.sh scripts/*.sh 2>/dev/null || true

$COMPOSE up -d --no-build
sleep 20
$COMPOSE exec -T backend python manage.py migrate --noinput

HTTP_PORT="${FRONTEND_HTTP_PORT:-8080}"
DOMAIN="${APP_DOMAIN:-gare.fontanebianche.today}"
echo "Fatto. Sito: http://${DOMAIN}:${HTTP_PORT}"
