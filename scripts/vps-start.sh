#!/bin/sh
# Dopo reboot VPS: avvio leggero (celery disabilitato di default su VPS 1GB).
set -e

REMOTE_PATH="${REMOTE_PATH:-/var/www/gare-appalto}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-gareappalto}"

cd "$REMOTE_PATH"
export COMPOSE_PROJECT_NAME

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "=== Gare Appalto - avvio VPS ==="
$COMPOSE up -d db redis minio minio-init backend frontend

echo "Attendo backend..."
sleep 15
$COMPOSE exec -T backend python manage.py migrate --noinput

HTTP_PORT="${FRONTEND_HTTP_PORT:-8080}"
DOMAIN="${APP_DOMAIN:-gare.fontanebianche.today}"
echo "Fatto. Sito: http://${DOMAIN}:${HTTP_PORT}"
